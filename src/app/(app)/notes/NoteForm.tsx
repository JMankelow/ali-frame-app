"use client";

import { useActionState, useRef, useState } from "react";
import { createNote, requestNoteImageUpload, type NoteFormState } from "./actions";

const initialState: NoteFormState = {};

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

  /** Uploads each image straight to storage and keeps it in the list until the note is added. */
  async function addFiles(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter((f) => f.type.startsWith("image/"));
    if (list.length === 0) return;
    setBusy(true);
    setError("");
    for (const file of list) {
      const name = file.name && file.name !== "image.png" ? file.name : `screenshot-${Date.now()}.png`;
      const { error: reqError, storageKey, uploadUrl } = await requestNoteImageUpload(name, file.type, file.size);
      if (reqError || !storageKey || !uploadUrl) {
        setError(reqError ?? "Couldn't attach that image.");
        continue;
      }
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!put.ok) {
        setError(`Upload failed for ${name}.`);
        continue;
      }
      setShots((prev) => [...prev, { storageKey, fileName: name, mimeType: file.type, sizeBytes: file.size, preview: URL.createObjectURL(file) }]);
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
              placeholder="A bug, a request, something that still needs building... (you can paste a screenshot straight in here)"
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
            <label>Screenshots (optional)</label>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple disabled={busy} onChange={(e) => addFiles(e.target.files)} />
            <div className="hint" style={{ marginTop: 4 }}>Or click in the note box and press Ctrl+V to paste a screenshot you&apos;ve just taken.</div>
            {busy && <div className="hint">Uploading…</div>}
            {error && <div className="authError">{error}</div>}
            {shots.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {shots.map((s) => (
                  <div key={s.storageKey} style={{ position: "relative" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.preview} alt={s.fileName} style={{ height: 80, borderRadius: 6, border: "1px solid var(--line)" }} />
                    <button
                      type="button"
                      className="btn light"
                      style={{ position: "absolute", top: 2, right: 2, padding: "0 6px" }}
                      onClick={() => setShots((prev) => prev.filter((x) => x.storageKey !== s.storageKey))}
                      aria-label="Remove screenshot"
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
