// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useEffect, useRef, useState, type CSSProperties } from "react";
import { requestUpload, confirmUpload } from "../../../../files/actions";
import { SignaturePad } from "@/components/SignaturePad";
import { registerQaSheetPhotos, saveQaSheet, type SheetState } from "../../sheetActions";
import {
  COM_SECTIONS, RES_CHECKS, RES_CONFIRM, RES_FINAL, RES_REMEDIAL, checkKey, emptyComItem, itemName, itemProblems, itemStatus,
  resItemProblems, resItemStatus, emptyResItem, type PhotoMeta, type CommercialData, type ComItem, type ResidentialData, type ResItem, type Result,
} from "@/lib/qaSheets";

const initialState: SheetState = {};

interface Props {
  sheetId: string;
  kind: "RESIDENTIAL" | "COMMERCIAL";
  jobNumber: string;
  siteAddress: string;
  initial: ResidentialData | CommercialData;
  photoUrls: Record<string, string>;
  complete: boolean;
  canSign: boolean;
  staff: { id: string; name: string }[];
  userName: string;
}

const seg = (on: boolean, color: string): CSSProperties => ({
  flex: 1, textAlign: "center", border: `1.5px solid ${on ? color : "var(--line)"}`, borderRadius: 8, padding: "8px 10px", cursor: "pointer",
  fontWeight: 700, background: on ? color : "#fff", color: on ? "#fff" : "inherit", userSelect: "none",
});
const stampText = (iso: string) => (iso ? new Date(iso).toLocaleString("en-NZ", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "");

export function SheetEditor(p: Props) {
  const [data, setData] = useState(p.initial);
  const [urls, setUrls] = useState(p.photoUrls);
  const [state, formAction, pending] = useActionState(saveQaSheet.bind(null, p.sheetId), initialState);
  const locked = p.complete;
  const payload = JSON.stringify(data);

  // The sheet stays open until it's marked fully complete: everything typed or added is saved automatically a moment after
  // each change, so nothing is lost if the page is closed and items/photos can be added or edited later.
  const [autoMsg, setAutoMsg] = useState("");
  const first = useRef(true);
  useEffect(() => {
    if (locked) return;
    if (first.current) {
      first.current = false;
      return;
    }
    const t = setTimeout(async () => {
      const fd = new FormData();
      fd.set("payload", payload);
      try {
        const r = await saveQaSheet(p.sheetId, {}, fd);
        setAutoMsg(r.error ? `Couldn't auto-save: ${r.error}` : `Auto-saved ${new Date().toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}`);
      } catch {
        setAutoMsg("Couldn't auto-save — check your connection, then press Save.");
      }
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [payload]);

  return (
    <form action={formAction}>
      <input type="hidden" name="payload" value={payload} />
      {!locked && (
        <div className="hint" style={{ marginBottom: 10, padding: 8, background: "#eef6ff", borderRadius: 6 }}>
          This sheet stays open — come back any time to add items, edit them or add more photos. Changes save automatically. Only press <b>{p.kind === "COMMERCIAL" ? "Complete job QA" : "Mark fully complete"}</b> when the whole job is finished (it then locks).
        </div>
      )}
      {p.kind === "RESIDENTIAL" ? (
        <Residential p={p} d={data as ResidentialData} setD={(d) => setData(d)} urls={urls} addUrls={(x) => setUrls((u) => ({ ...u, ...x }))} locked={locked} />
      ) : (
        <Commercial p={p} d={data as CommercialData} setD={(d) => setData(d)} urls={urls} addUrls={(x) => setUrls((u) => ({ ...u, ...x }))} locked={locked} />
      )}

      <div className="card" style={{ marginTop: 12, position: "sticky", bottom: 0, boxShadow: "0 -4px 14px rgba(0,0,0,.08)" }}>
        {state.error && <div className="authError">{state.error}</div>}
        {state.problems && (
          <ul style={{ margin: "6px 0 8px 18px", color: "#b91c1c", fontSize: 13 }}>
            {state.problems.map((x, i) => <li key={i}>{x}</li>)}
          </ul>
        )}
        {state.saved && <div className="status green" style={{ display: "inline-block", marginBottom: 8 }}>{state.saved}</div>}
        <div className="actions">
          {!locked && <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>}
          {!locked && (
            <button
              type="submit"
              name="intent"
              value="complete"
              className="btn light"
              disabled={pending}
              onClick={(e) => {
                if (!window.confirm("Mark this sheet fully complete? It will be locked and can't be edited afterwards.")) e.preventDefault();
              }}
            >
              {p.kind === "COMMERCIAL" ? "Complete job QA" : "Mark fully complete"}
            </button>
          )}
          <a className="btn light" href={`/health-safety/qa/sheet/${p.sheetId}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>
          {autoMsg ? `${autoMsg}. ` : ""}The PDF is built from what&apos;s saved. {locked ? "This sheet is complete and can't be changed." : ""}
        </div>
      </div>
    </form>
  );
}

// ---------- photos ----------

function PhotoPicker({ sheetId, jobNumber, ids, urls, meta, onMeta, onAdd, onRemove, disabled, label }: {
  sheetId: string; jobNumber: string; ids: string[]; urls: Record<string, string>; meta: PhotoMeta; onMeta: (id: string, patch: { label?: string; description?: string }) => void;
  onAdd: (added: { id: string; url: string }[]) => void; onRemove: (id: string) => void; disabled: boolean; label: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef<HTMLInputElement>(null);

  async function handle(files: FileList | null) {
    if (!files || !files.length) return;
    setBusy(true);
    setError("");
    const keys: string[] = [];
    for (const file of Array.from(files)) {
      const { error: e1, storageKey, uploadUrl } = await requestUpload(jobNumber, file.name, file.type, file.size);
      if (e1 || !storageKey || !uploadUrl) { setError(e1 ?? `Could not upload ${file.name}.`); continue; }
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type || "application/octet-stream" }, body: file });
      if (!put.ok) { setError(`Upload failed for ${file.name}.`); continue; }
      const c = await confirmUpload({ jobNumber, storageKey, fileName: file.name, fileType: "Photos", mimeType: file.type || "application/octet-stream", sizeBytes: file.size });
      if (c.error) { setError(c.error); continue; }
      keys.push(storageKey);
    }
    if (keys.length) {
      const r = await registerQaSheetPhotos(sheetId, keys);
      if (r.error) setError(r.error);
      else if (r.photos) onAdd(r.photos);
    }
    if (ref.current) ref.current.value = "";
    setBusy(false);
  }

  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ fontWeight: 700 }}>{label}</div>
      {!disabled && <input ref={ref} type="file" accept="image/jpeg,image/png" multiple capture="environment" disabled={busy} onChange={(e) => handle(e.target.files)} style={{ marginTop: 4 }} />}
      {busy && <div className="hint">Uploading…</div>}
      {error && <div className="authError">{error}</div>}
      <div style={{ marginTop: 8 }}>
        {ids.map((id, n) => {
          const m = meta[id] ?? { label: "", description: "" };
          return (
            <div key={id} style={{ display: "flex", gap: 12, flexWrap: "wrap", border: "1px solid var(--line)", borderRadius: 8, padding: 8, marginBottom: 8 }}>
              <div style={{ flex: "0 0 150px" }}>
                {urls[id] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={urls[id]} alt={m.label || "QA photo"} style={{ width: 150, height: 112, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
                ) : (
                  <div className="hint" style={{ width: 150 }}>photo</div>
                )}
              </div>
              <div style={{ flex: "1 1 220px", minWidth: 200 }}>
                <label style={{ fontWeight: 700 }}>Photo {n + 1} label <span style={{ color: "#dc2626" }}>*</span></label>
                <input disabled={disabled} value={m.label} onChange={(e) => onMeta(id, { label: e.target.value })} placeholder="e.g. Lounge slider — head flashing" style={!m.label.trim() && !disabled ? { borderColor: "#dc2626" } : undefined} />
                <label style={{ fontWeight: 700, display: "block", marginTop: 6 }}>Description</label>
                <textarea rows={2} disabled={disabled} value={m.description} onChange={(e) => onMeta(id, { description: e.target.value })} placeholder="What the photo shows…" />
                {!disabled && <button type="button" className="btn light" style={{ marginTop: 6 }} onClick={() => onRemove(id)}>Remove photo</button>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------- residential ----------

function Residential({ p, d, setD, urls, addUrls, locked }: { p: Props; d: ResidentialData; setD: (d: ResidentialData) => void; urls: Record<string, string>; addUrls: (x: Record<string, string>) => void; locked: boolean }) {
  const [cur, setCur] = useState(d.items[0]?.id ?? "");
  const idx = Math.max(0, d.items.findIndex((i) => i.id === cur));
  const it = d.items[idx];
  const upd = (patch: (i: ResItem) => ResItem) => setD({ ...d, items: d.items.map((x, n) => (n === idx ? patch(x) : x)) });
  const set = (n: number, a: "Yes" | "No") => upd((x) => ({ ...x, answers: { ...x.answers, [`q${n}`]: { a, reason: x.answers[`q${n}`]?.reason ?? "" } } }));
  const reason = (n: number, v: string) => upd((x) => ({ ...x, answers: { ...x.answers, [`q${n}`]: { a: x.answers[`q${n}`]?.a ?? "", reason: v } } }));
  const probs = resItemProblems(it);

  const yn = (n: number, text: string, withReason: boolean) => {
    const x = it.answers[`q${n}`];
    return (
      <div key={n} className="card" style={{ marginTop: 10, ...(x?.a === "No" && withReason && !x.reason.trim() ? { borderColor: "#dc2626" } : {}) }}>
        <div style={{ fontWeight: 700 }}><span style={{ color: "#667085", marginRight: 8 }}>{n}</span>{text} <span style={{ color: "#f26a1b" }}>*</span></div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <label style={seg(x?.a === "Yes", "#1f8a4c")}><input type="radio" style={{ display: "none" }} disabled={locked} checked={x?.a === "Yes"} onChange={() => set(n, "Yes")} />Yes</label>
          <label style={seg(x?.a === "No", "#c62828")}><input type="radio" style={{ display: "none" }} disabled={locked} checked={x?.a === "No"} onChange={() => set(n, "No")} />No</label>
        </div>
        {withReason && x?.a === "No" && (
          <textarea rows={2} disabled={locked} value={x.reason} onChange={(e) => reason(n, e.target.value)} placeholder="Reason (required when No)…" style={{ width: "100%", marginTop: 8 }} />
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="card">
        <div className="label">Job details</div>
        <div className="form" style={{ marginTop: 8 }}>
          <div><label>Site / Job</label><input value={`${p.jobNumber} — ${p.siteAddress}`} readOnly /></div>
          <div><label>Date</label><input type="date" disabled={locked} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Items — one full check sheet per window/door/opening</div>
        <div className="hint" style={{ margin: "2px 0 8px" }}>Label the item, fill everything out, then add the next item.</div>
        {d.items.map((x, n) => {
          const st = resItemStatus(x);
          return (
            <button key={x.id} type="button" onClick={() => setCur(x.id)} className="btn light" style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, ...(x.id === it.id ? { outline: "2px solid #0057b8" } : {}) }}>
              <b>{x.label.trim() ? `Item ${n + 1}: ${x.label}` : `Item ${n + 1} (not labelled yet)`}</b> —{" "}
              <span className={`status ${st.label === "Complete" ? "green" : st.label === "In progress" ? "orange" : "grey"}`}>{st.label === "In progress" ? `${st.pct}%` : st.label}</span>
            </button>
          );
        })}
        {!locked && (
          <div className="actions">
            <button type="button" className="btn light" onClick={() => { const n = emptyResItem(); setD({ ...d, items: [...d.items, n] }); setCur(n.id); }}>+ Add new item</button>
            {d.items.length > 1 && resItemStatus(it).label === "Not started" && (
              <button type="button" className="btn light" onClick={() => { const rest = d.items.filter((x) => x.id !== it.id); setD({ ...d, items: rest }); setCur(rest[0].id); }}>Remove this item</button>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Item {idx + 1} label *</div>
        <input disabled={locked} value={it.label} onChange={(e) => upd((x) => ({ ...x, label: e.target.value }))} placeholder="e.g. Lounge slider, Bedroom 2 window" style={!it.label.trim() && !locked ? { borderColor: "#dc2626", marginTop: 6 } : { marginTop: 6 }} />
      </div>

      <div className="label" style={{ marginTop: 16 }}>2. QA Checks</div>
      {RES_CHECKS.map(([n, t]) => yn(n, t, true))}

      <div className="label" style={{ marginTop: 16 }}>13. Final Sign Off</div>
      {yn(RES_FINAL[0], RES_FINAL[1], true)}
      <div className="card" style={{ marginTop: 10 }}>
        <PhotoPicker
          sheetId={p.sheetId} jobNumber={p.jobNumber} ids={it.photoFileIds} urls={urls} disabled={locked}
          meta={it.photoMeta ?? {}} onMeta={(id, patch) => upd((x) => ({ ...x, photoMeta: { ...(x.photoMeta ?? {}), [id]: { ...(x.photoMeta?.[id] ?? { label: "", description: "" }), ...patch } } }))}
          label="15  Final Completion Photo Uploaded *"
          onAdd={(a) => { addUrls(Object.fromEntries(a.map((y) => [y.id, y.url]))); upd((x) => ({ ...x, photoFileIds: [...x.photoFileIds, ...a.map((y) => y.id)] })); }}
          onRemove={(id) => upd((x) => ({ ...x, photoFileIds: x.photoFileIds.filter((y) => y !== id) }))}
        />
      </div>
      {yn(RES_REMEDIAL[0], RES_REMEDIAL[1], false)}

      <div className="card" style={{ marginTop: 10 }}>
        <div style={{ fontWeight: 700 }}><span style={{ color: "#667085", marginRight: 8 }}>17</span>Team Leader Sign Off <span style={{ color: "#f26a1b" }}>*</span></div>
        <select
          disabled={locked}
          value={it.teamLeaderId}
          onChange={(e) => upd((x) => ({ ...x, teamLeaderId: e.target.value, teamLeaderName: p.staff.find((s) => s.id === e.target.value)?.name ?? "" }))}
          style={{ width: "100%", marginTop: 8 }}
        >
          <option value="">Select team leader…</option>
          {p.staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontWeight: 600 }}>
          <input type="checkbox" disabled={locked} checked={it.confirmed} onChange={(e) => upd((x) => ({ ...x, confirmed: e.target.checked }))} /> {RES_CONFIRM}
        </label>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="actions">
          <button type="button" className="btn light" disabled={idx === 0} onClick={() => setCur(d.items[idx - 1].id)}>‹ Previous item</button>
          <button type="button" className="btn light" disabled={idx >= d.items.length - 1} onClick={() => setCur(d.items[idx + 1].id)}>Next item ›</button>
          {!locked && idx === d.items.length - 1 && probs.length === 0 && (
            <button type="button" className="btn primary" onClick={() => { const n = emptyResItem(); setD({ ...d, items: [...d.items, n] }); setCur(n.id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>This item is done — add new item</button>
          )}
        </div>
        {probs.length > 0 ? (
          <details style={{ marginTop: 8 }}>
            <summary className="hint" style={{ cursor: "pointer" }}>{probs.length} thing{probs.length === 1 ? "" : "s"} still to do on this item</summary>
            <ul style={{ margin: "6px 0 0 18px", fontSize: 13 }}>{probs.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        ) : (
          <div className="status green" style={{ display: "inline-block", marginTop: 8 }}>This item is fully complete.</div>
        )}
      </div>
    </div>
  );
}

// ---------- commercial ----------

function Commercial({ p, d, setD, urls, addUrls, locked }: { p: Props; d: CommercialData; setD: (d: CommercialData) => void; urls: Record<string, string>; addUrls: (x: Record<string, string>) => void; locked: boolean }) {
  const [cur, setCur] = useState(d.items[0]?.id ?? "");
  const idx = Math.max(0, d.items.findIndex((i) => i.id === cur));
  const it = d.items[idx];
  const upd = (patch: (i: ComItem) => ComItem) => setD({ ...d, items: d.items.map((x, n) => (n === idx ? patch(x) : x)) });
  const probs = itemProblems(it);
  const senior = p.canSign;

  return (
    <div>
      <div className="card">
        <div className="label">Job details</div>
        <div className="form" style={{ marginTop: 8 }}>
          <div><label>Job</label><input value={`${p.jobNumber} — ${p.siteAddress}`} readOnly /></div>
          <div><label>Date</label><input type="date" disabled={locked} value={d.date} onChange={(e) => setD({ ...d, date: e.target.value })} /></div>
          <div className="full"><label>Installer(s) on site</label><input disabled={locked} value={d.installers} onChange={(e) => setD({ ...d, installers: e.target.value })} placeholder="Names, separated by commas" /></div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Job items — every window/door gets its own full QA</div>
        <div style={{ marginTop: 8 }}>
          {d.items.map((x, n) => {
            const st = itemStatus(x);
            return (
              <button
                key={x.id}
                type="button"
                onClick={() => setCur(x.id)}
                className="btn light"
                style={{ display: "block", width: "100%", textAlign: "left", marginBottom: 6, ...(x.id === it.id ? { outline: "2px solid #0057b8" } : {}) }}
              >
                <b>{itemName(x, n)}</b>{x.loc ? ` · ${x.loc}` : ""} —{" "}
                <span className={`status ${st.label === "Complete" ? "green" : st.label === "In progress" ? "orange" : "grey"}`}>{st.label === "In progress" ? `${st.pct}%` : st.label}</span>
                {st.fails > 0 && <span className="status red" style={{ marginLeft: 6 }}>{st.fails} fail{st.fails === 1 ? "" : "s"}</span>}
              </button>
            );
          })}
        </div>
        {!locked && (
          <div className="actions">
            <button type="button" className="btn light" onClick={() => { const n = emptyComItem(); setD({ ...d, items: [...d.items, n] }); setCur(n.id); }}>+ New item</button>
            {d.items.length > 1 && itemStatus(it).label === "Not started" && (
              <button type="button" className="btn light" onClick={() => { const rest = d.items.filter((x) => x.id !== it.id); setD({ ...d, items: rest }); setCur(rest[0].id); }}>Remove this item</button>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">{itemName(it, idx)}</div>
        <div className="form" style={{ marginTop: 8 }}>
          <div><label>Item #</label><input disabled={locked} value={it.n} onChange={(e) => upd((x) => ({ ...x, n: e.target.value }))} /></div>
          <div><label>Drawing ref (e.g. 2A.200.W10)</label><input disabled={locked} value={it.code} onChange={(e) => upd((x) => ({ ...x, code: e.target.value }))} /></div>
          <div className="full"><label>Location</label><input disabled={locked} value={it.loc} onChange={(e) => upd((x) => ({ ...x, loc: e.target.value }))} /></div>
        </div>
        {!senior && !locked && (
          <div className="hint" style={{ marginTop: 8, padding: 8, background: "#fff4e0", borderRadius: 6 }}>
            Only a senior leader can tick off the checks and sign this item off. You can still add photos and notes.
          </div>
        )}
      </div>

      {COM_SECTIONS.map((s) => (
        <details key={s.id} className="card" style={{ marginTop: 12 }} open>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>{s.title}</summary>
          {s.checks.map((c, i) => {
            const k = checkKey(s.id, i);
            const x = it.qa.checks[k] ?? { r: "" as Result, note: "", by: "", at: "" };
            const setR = (r: Result) => upd((q) => ({ ...q, qa: { ...q.qa, checks: { ...q.qa.checks, [k]: { ...x, r } } } }));
            return (
              <div key={k} style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <div style={{ fontWeight: 600 }}>{c}</div>
                <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                  <label style={seg(x.r === "Pass", "#1f8a4c")}><input type="radio" style={{ display: "none" }} disabled={!senior || locked} checked={x.r === "Pass"} onChange={() => setR("Pass")} />Pass</label>
                  <label style={seg(x.r === "Fail", "#c62828")}><input type="radio" style={{ display: "none" }} disabled={!senior || locked} checked={x.r === "Fail"} onChange={() => setR("Fail")} />Fail</label>
                  <label style={seg(x.r === "NA", "#667085")}><input type="radio" style={{ display: "none" }} disabled={!senior || locked} checked={x.r === "NA"} onChange={() => setR("NA")} />N/A</label>
                </div>
                {x.r === "Fail" && (
                  <textarea rows={2} disabled={!senior || locked} value={x.note} onChange={(e) => upd((q) => ({ ...q, qa: { ...q.qa, checks: { ...q.qa.checks, [k]: { ...x, note: e.target.value } } } }))} placeholder="Describe the issue and corrective action (required)…" style={{ width: "100%", marginTop: 6 }} />
                )}
                {x.by && <div className="hint" style={{ marginTop: 4 }}>Signed by {x.by} · {stampText(x.at)}</div>}
              </div>
            );
          })}
          <PhotoPicker
            sheetId={p.sheetId} jobNumber={p.jobNumber} ids={it.qa.photos[s.id] ?? []} urls={urls} disabled={locked} label={`${s.photo} *`}
            meta={it.qa.photoMeta ?? {}} onMeta={(id, patch) => upd((q) => ({ ...q, qa: { ...q.qa, photoMeta: { ...(q.qa.photoMeta ?? {}), [id]: { ...(q.qa.photoMeta?.[id] ?? { label: "", description: "" }), ...patch } } } }))}
            onAdd={(a) => { addUrls(Object.fromEntries(a.map((y) => [y.id, y.url]))); upd((q) => ({ ...q, qa: { ...q.qa, photos: { ...q.qa.photos, [s.id]: [...(q.qa.photos[s.id] ?? []), ...a.map((y) => y.id)] } } })); }}
            onRemove={(id) => upd((q) => ({ ...q, qa: { ...q.qa, photos: { ...q.qa.photos, [s.id]: (q.qa.photos[s.id] ?? []).filter((y) => y !== id) } } }))}
          />
          <div style={{ marginTop: 10 }}>
            <label style={{ fontWeight: 700 }}>{s.notes} * <span className="hint">(enter &ldquo;Nil&rdquo; if none)</span></label>
            <textarea rows={2} disabled={locked} value={it.qa.notes[s.id] ?? ""} onChange={(e) => upd((q) => ({ ...q, qa: { ...q.qa, notes: { ...q.qa.notes, [s.id]: e.target.value } } }))} style={{ width: "100%", marginTop: 4 }} />
          </div>
        </details>
      ))}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Team Leader Sign Off — {itemName(it, idx)}</div>
        <div className="form" style={{ marginTop: 8 }}>
          <div>
            <label>Team Leader name *</label>
            <input disabled={!senior || locked} value={it.qa.tl.name} onChange={(e) => upd((q) => ({ ...q, qa: { ...q.qa, tl: { ...q.qa.tl, name: e.target.value } } }))} list="tl-staff" />
            <datalist id="tl-staff">{p.staff.map((s) => <option key={s.id} value={s.name} />)}</datalist>
          </div>
          <div>
            <label>Date *</label>
            <input type="date" disabled={!senior || locked} value={it.qa.tl.date} onChange={(e) => upd((q) => ({ ...q, qa: { ...q.qa, tl: { ...q.qa.tl, date: e.target.value } } }))} />
          </div>
          <div className="full">
            <label>Comments</label>
            <textarea rows={2} disabled={!senior || locked} value={it.qa.tl.comments} onChange={(e) => upd((q) => ({ ...q, qa: { ...q.qa, tl: { ...q.qa.tl, comments: e.target.value } } }))} />
          </div>
          <div className="full">
            <label>Signature *</label>
            <SignaturePad key={it.id} value={it.qa.tl.sig} disabled={!senior || locked} onChange={(v) => upd((q) => ({ ...q, qa: { ...q.qa, tl: { ...q.qa.tl, sig: v } } }))} />
            {it.qa.tl.by && <div className="hint">Signed off by {it.qa.tl.by} · {stampText(it.qa.tl.at)}</div>}
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="actions">
          <button type="button" className="btn light" disabled={idx === 0} onClick={() => setCur(d.items[idx - 1].id)}>‹ Previous item</button>
          <button type="button" className="btn light" disabled={idx >= d.items.length - 1} onClick={() => setCur(d.items[idx + 1].id)}>Next item ›</button>
        </div>
        {probs.length > 0 ? (
          <details style={{ marginTop: 8 }}>
            <summary className="hint" style={{ cursor: "pointer" }}>{probs.length} thing{probs.length === 1 ? "" : "s"} still to do on this item</summary>
            <ul style={{ margin: "6px 0 0 18px", fontSize: 13 }}>{probs.map((x, i) => <li key={i}>{x}</li>)}</ul>
          </details>
        ) : (
          <div className="status green" style={{ display: "inline-block", marginTop: 8 }}>This item is fully complete.</div>
        )}
      </div>
    </div>
  );
}
