"use client";

import { useActionState, useRef, useState } from "react";
import { createNote, requestNoteImageUpload, type NoteFormState } from "./actions";

const initialState: NoteFormState = {};

// Windows/phones sometimes leave the type blank (e.g. HEIC) — fall back to the extension.
const EXT_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", gif: "image/gif", heic: "image/heic", heif: "image/heif",
  pdf: "application/pdf", txt: "text/plain", csv: "text/csv", doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
};
const typeOf = (f: File) => f.type || EXT_TYPES[(f.name.split(".").pop() ?? "").toLowerCase()] || "";
const canPreview = (t: string) => ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(t);

interface Shot {
  storageKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  preview: string;
}

export function NoteForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createNote, initialState);
  const [shots, setShots] = useState<Shot[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  /** Uploads each photo/file straight to storage and keeps it in the list until the note is added. */
  async function addFiles(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    if (list.length === 0) return;
    setBusy(true);
    setError("");
    for (const file of list) {
      const mime = typeOf(file);
      const name = file.name && file.name !== "image.png" ? file.name : `screenshot-${Date.now()}.png`;
      // Normal route: straight to file storage. If storage isn't reachable, keep the file in the app's database instead.
      let storageKey = "";
      try {
        const r = await requestNoteImageUpload(name, mime, file.size);
        if (r.storageKey && r.uploadUrl) {
          const put = await fetch(r.uploadUrl, { method: "PUT", headers: { "Content-Type": mime }, body: file });
          if (put.ok) storageKey = r.storageKey;
        } else if (r.error && /type can't|over 15 MB/i.test(r.error)) {
          setError(r.error);
          continue;
        }
      } catch {
        /* fall through to the backup route */
      }
      if (!storageKey) {
        try {
          const fd = new FormData();
          fd.set("file", file, name);
          fd.set("mimeType", mime);
          const res = await fetch("/api/notes/upload", { method: "POST", body: fd });
          const j = await res.json().catch(() => ({}));
          if (!res.ok || !j.blobId) {
            setError(j.error ?? `Couldn't attach ${name}.`);
            continue;
          }
          storageKey = `db:${j.blobId}`;
        } catch {
          setError(`Couldn't attach ${name}.`);
          continue;
        }
      }
      setShots((prev) => [...prev, { storageKey, fileName: name, mimeType: mime, sizeBytes: file.size, preview: canPreview(mime) ? URL.createObjectURL(file) : "" }]);
    }
    if (fileRef.current) fileRef.current.value = "";
    setBusy(false);
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add a Note</div>
      <form
        ref={formRef}
        action={(fd) => {
          formAction(fd);
          setShots([]);
        }}
        style={{ marginTop: 10 }}
      >
        <input type="hidden" name="attachments" value={JSON.stringify(shots.map(({ preview: _p, ...s }) => s))} />
        <div className="form">
          <div className="full">
            <label htmlFor="text">Note</label>
            <textarea
              id="text"
              name="text"
              rows={3}
              required
              placeholder="A bug, a request, something that still needs building... (you can paste a screenshot straight in here, or add photos and files below)"
              onPaste={(e) => {
                const imgs = Array.from(e.clipboardData.files).filter((f) => f.type.startsWith("image/"));
                if (imgs.length) {
                  e.preventDefault();
                  addFiles(imgs);
                }
              }}
            />
          </div>
          <div className="full">
            <label>Add photos or files (optional)</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt"
              multiple
              disabled={busy}
              onChange={(e) => addFiles(e.target.files)}
            />
            <div className="hint" style={{ marginTop: 4 }}>Photos, PDFs, Word, Excel and PowerPoint files (up to 15 MB each). You can also click in the note box and press Ctrl+V to paste a screenshot.</div>
            {busy && <div className="hint">Uploading…</div>}
            {error && <div className="authError">{error}</div>}
            {shots.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {shots.map((s) => (
                  <div key={s.storageKey} style={{ position: "relative" }}>
                    {s.preview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.preview} alt={s.fileName} style={{ height: 80, borderRadius: 6, border: "1px solid var(--line)" }} />
                    ) : (
                      <div style={{ height: 80, minWidth: 110, maxWidth: 170, display: "flex", alignItems: "center", padding: "0 26px 0 10px", borderRadius: 6, border: "1px solid var(--line)", background: "#f4f6fa", fontSize: 12, fontWeight: 600, overflow: "hidden", wordBreak: "break-all" }}>
                        {s.fileName}
                      </div>
                    )}
                    <button
                      type="button"
                      className="btn light"
                      style={{ position: "absolute", top: 2, right: 2, padding: "0 6px" }}
                      onClick={() => setShots((prev) => prev.filter((x) => x.storageKey !== s.storageKey))}
                      aria-label="Remove file"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label htmlFor="assignedToId">Assign To</label>
            <select id="assignedToId" name="assignedToId" defaultValue="">
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending || busy}>
            {pending ? "Adding…" : "Add Note"}
          </button>
        </div>
      </form>
    </div>
  );
}
