// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { INCIDENT_SPEC, type IncField, type IncSection } from "@/lib/incidentSpec";
import { bodyRegions, cond, fieldVisible, isEmpty, isRequired, regionLabel, validateIncident, type Answers, type Row } from "@/lib/incidentLogic";
import { submitIncidentReport } from "../actions";

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const chip = (on: boolean): CSSProperties => ({
  display: "inline-flex",
  alignItems: "center",
  minHeight: 40,
  padding: "6px 14px",
  border: `1.5px solid ${on ? "#0057b8" : "var(--line)"}`,
  borderRadius: 999,
  cursor: "pointer",
  background: on ? "#0057b8" : "#fff",
  color: on ? "#fff" : "inherit",
  fontWeight: on ? 700 : 500,
  userSelect: "none",
});

export function IncidentForm({ userName }: { userName: string }) {
  const router = useRouter();
  const [a, setA] = useState<Answers>(() => ({ date_reported: todayStr(), date_completed: todayStr(), completed_by_name: userName }));
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const set = (id: string, v: Answers[string]) => {
    setA((p) => ({ ...p, [id]: v }));
    if (bad.has(id)) setBad((p) => { const n = new Set(p); n.delete(id); return n; });
  };

  const visibleSections = useMemo(() => INCIDENT_SPEC.sections.filter((s) => cond(s.show_if, a)), [a]);
  const progress = useMemo(() => {
    const req = visibleSections.flatMap((s) => s.fields.filter((f) => f.type !== "notice" && fieldVisible(f, s, a) && isRequired(f, a)));
    return { done: req.filter((f) => !isEmpty(a[f.id])).length, total: req.length };
  }, [a, visibleSections]);

  async function submit() {
    const { problems } = validateIncident(a);
    setBad(new Set(problems.map((p) => p.id)));
    if (problems.length) {
      setError(`${problems.length} question${problems.length === 1 ? " needs" : "s need"} an answer before you can submit — they're outlined in red.`);
      const first = problems[0].id.split(".")[0];
      refs.current[first]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setError("");
    setBusy(true);
    const r = await submitIncidentReport(a);
    setBusy(false);
    if (r.error || !r.id) return setError(r.error ?? "Couldn't save the report.");
    router.push(`/health-safety/incident/${r.id}?submitted=1`);
  }

  return (
    <div>
      {visibleSections.map((s, n) => (
        <div key={s.id} className="card" style={{ marginTop: 12 }}>
          <div className="label">{n + 1}. {s.title}</div>
          {s.description && <div className="hint" style={{ marginTop: 2 }}>{s.description}</div>}
          {s.fields.map((f) => (fieldVisible(f, s, a) ? <FieldView key={f.id} f={f} s={s} a={a} set={set} bad={bad} setRef={(el) => { refs.current[f.id] = el; }} /> : null))}
        </div>
      ))}

      <div className="card" style={{ marginTop: 12, position: "sticky", bottom: 0, boxShadow: "0 -4px 14px rgba(0,0,0,.08)" }}>
        {error && <div className="authError">{error}</div>}
        <div className="actions" style={{ justifyContent: "space-between", alignItems: "center", display: "flex" }}>
          <span className="hint">{progress.done} of {progress.total} required answered</span>
          <button type="button" className="btn primary" disabled={busy} onClick={submit}>{busy ? "Submitting…" : "Submit report"}</button>
        </div>
      </div>
    </div>
  );
}

function FieldView({ f, s, a, set, bad, setRef }: { f: IncField; s: IncSection; a: Answers; set: (id: string, v: Answers[string]) => void; bad: Set<string>; setRef: (el: HTMLDivElement | null) => void }) {
  if (f.type === "notice") {
    const parts = (f.text ?? "").split("0800 030 040");
    return (
      <div ref={setRef} role="status" style={{ marginTop: 12, padding: "10px 12px", borderRadius: 8, background: "#fff4e0", borderLeft: "4px solid #f0a020", color: "#6b4100" }}>
        {parts[0]}
        {parts.length > 1 && <a href="tel:0800030040" style={{ fontWeight: 800, color: "inherit" }}>0800 030 040</a>}
        {parts[1]}
      </div>
    );
  }
  const invalid = bad.has(f.id);
  const req = isRequired(f, a);
  const val = a[f.id];
  const today = todayStr();
  const label = (
    <label style={{ display: "block", fontWeight: 700, marginBottom: 4 }}>
      {f.label}
      {req && <span style={{ color: "#dc2626" }}> *</span>}
    </label>
  );
  let control: React.ReactNode = null;

  switch (f.type) {
    case "text": case "tel": case "date": case "time": case "number":
      control = (
        <input
          type={f.type}
          value={(val as string) ?? ""}
          readOnly={f.readonly}
          placeholder={f.placeholder}
          min={f.min}
          step={f.step}
          max={f.max === "today" ? today : (f.max as number | undefined)}
          inputMode={f.type === "number" ? "decimal" : undefined}
          autoComplete={f.type === "tel" ? "tel" : "off"}
          onChange={(e) => set(f.id, e.target.value)}
          style={invalid ? { borderColor: "#dc2626" } : undefined}
        />
      );
      break;
    case "textarea":
      control = <textarea rows={f.rows ?? 3} value={(val as string) ?? ""} placeholder={f.placeholder} onChange={(e) => set(f.id, e.target.value)} style={invalid ? { borderColor: "#dc2626" } : undefined} />;
      break;
    case "radio": case "yesno": {
      const opts = f.type === "yesno" ? ["Yes", "No", ...(f.options_extra ?? [])] : f.options ?? [];
      control = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="radiogroup">
          {opts.map((o) => (
            <label key={o} style={{ ...chip(val === o), ...(invalid && val !== o ? { borderColor: "#dc2626" } : {}) }}>
              <input type="radio" name={f.id} checked={val === o} onChange={() => set(f.id, o)} style={{ position: "absolute", opacity: 0, pointerEvents: "none" }} />
              {o}
            </label>
          ))}
        </div>
      );
      break;
    }
    case "checkbox": {
      const sel = (Array.isArray(val) ? val : []) as string[];
      control = (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }} role="group">
          {(f.options ?? []).map((o) => {
            const on = sel.includes(o);
            return (
              <label key={o} style={{ ...chip(on), ...(invalid && !on ? { borderColor: "#dc2626" } : {}) }}>
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => {
                    let next = on ? sel.filter((x) => x !== o) : [...sel, o];
                    if (f.exclusive_option) next = o === f.exclusive_option && !on ? [o] : next.filter((x) => x !== f.exclusive_option);
                    set(f.id, next);
                  }}
                  style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
                />
                {o}
              </label>
            );
          })}
        </div>
      );
      break;
    }
    case "bodymap":
      control = <BodyMap value={(Array.isArray(val) ? val : []) as string[]} onChange={(v) => set(f.id, v)} />;
      break;
    case "signature":
      control = <SignaturePad value={(val as string) ?? ""} onChange={(v) => set(f.id, v)} invalid={invalid} />;
      break;
    case "repeater":
      control = <Repeater f={f} rows={(Array.isArray(val) ? val : []) as Row[]} onChange={(v) => set(f.id, v)} bad={bad} />;
      break;
  }

  return (
    <div ref={setRef} style={{ marginTop: 14 }}>
      {label}
      {f.help && <div className="hint" style={{ margin: "-2px 0 6px" }}>{f.help}</div>}
      {control}
      {invalid && f.type !== "repeater" && <div style={{ color: "#dc2626", fontSize: 13, marginTop: 4 }}>Please answer this question</div>}
      {void s}
    </div>
  );
}

function BodyMap({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <div>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {(["front", "back"] as const).map((view) => (
          <figure key={view} style={{ margin: 0, textAlign: "center", flex: 1, maxWidth: 220 }}>
            <svg viewBox="0 0 200 412" style={{ width: "100%", height: "auto", touchAction: "manipulation" }} role="group" aria-label={`Body, ${view} view`}>
              {bodyRegions(view).map((r) => {
                const on = value.includes(r.id);
                const common = {
                  fill: on ? "#e5671a" : "#e8ebef",
                  stroke: on ? "#e5671a" : "#9aa4af",
                  strokeWidth: 1.5,
                  style: { cursor: "pointer" } as CSSProperties,
                  role: "checkbox" as const,
                  "aria-checked": on,
                  "aria-label": regionLabel(r.id),
                  tabIndex: 0,
                  onClick: () => toggle(r.id),
                  onKeyDown: (e: React.KeyboardEvent) => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); toggle(r.id); } },
                };
                return r.shape === "ellipse" ? (
                  <ellipse key={r.id} cx={r.attrs.cx} cy={r.attrs.cy} rx={r.attrs.rx} ry={r.attrs.ry} {...common}><title>{regionLabel(r.id)}</title></ellipse>
                ) : (
                  <rect key={r.id} x={r.attrs.x} y={r.attrs.y} width={r.attrs.width} height={r.attrs.height} rx={r.attrs.rx} {...common}><title>{regionLabel(r.id)}</title></rect>
                );
              })}
              <text x={14} y={150} fontSize={13} fontWeight={700} fill="#5c6773" textAnchor="middle">{view === "front" ? "R" : "L"}</text>
              <text x={186} y={150} fontSize={13} fontWeight={700} fill="#5c6773" textAnchor="middle">{view === "front" ? "L" : "R"}</text>
            </svg>
            <figcaption style={{ fontWeight: 700, fontSize: 13, color: "#5c6773" }}>{view === "front" ? "Front" : "Back"}</figcaption>
          </figure>
        ))}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }} aria-live="polite">
        {value.length === 0 && <span className="hint">No areas selected yet</span>}
        {value.map((id) => (
          <span key={id} className="status blue" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
            {regionLabel(id)}
            <button type="button" aria-label={`Remove ${regionLabel(id)}`} onClick={() => toggle(id)} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", fontWeight: 800 }}>×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

function SignaturePad({ value, onChange, invalid }: { value: string; onChange: (v: string) => void; invalid: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const r = c.getBoundingClientRect();
    const d = window.devicePixelRatio || 1;
    c.width = r.width * d;
    c.height = r.height * d;
    const ctx = c.getContext("2d")!;
    ctx.scale(d, d);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0b1f4a";
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top] as const;
  };
  return (
    <div>
      <div style={{ position: "relative", border: `1.5px dashed ${invalid ? "#dc2626" : "var(--line)"}`, borderRadius: 8, background: "#fff" }}>
        <canvas
          ref={ref}
          aria-label="Signature pad"
          style={{ display: "block", width: "100%", height: 150, touchAction: "none", cursor: "crosshair" }}
          onPointerDown={(e) => {
            e.preventDefault();
            ref.current!.setPointerCapture(e.pointerId);
            drawing.current = true;
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + 0.1, y + 0.1);
            ctx.stroke();
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = ref.current!.getContext("2d")!;
            const [x, y] = pos(e);
            ctx.lineTo(x, y);
            ctx.stroke();
          }}
          onPointerUp={() => {
            if (!drawing.current) return;
            drawing.current = false;
            onChange(ref.current!.toDataURL("image/png"));
          }}
          onPointerCancel={() => { drawing.current = false; }}
        />
        {!value && <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#667085", pointerEvents: "none" }}>Sign here with your finger or mouse</div>}
      </div>
      <div style={{ textAlign: "right", marginTop: 6 }}>
        <button
          type="button"
          className="btn light"
          onClick={() => {
            const c = ref.current!;
            c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
            onChange("");
          }}
        >
          Clear signature
        </button>
      </div>
    </div>
  );
}

function Repeater({ f, rows, onChange, bad }: { f: IncField; rows: Row[]; onChange: (v: Row[]) => void; bad: Set<string> }) {
  const upd = (i: number, k: string, v: string) => onChange(rows.map((r, n) => (n === i ? { ...r, [k]: v } : r)));
  return (
    <div>
      {rows.map((row, i) => (
        <div key={i} style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 10, marginTop: 8 }}>
          <div className="topbar" style={{ marginBottom: 6 }}>
            <b>Action {i + 1}</b>
            <button type="button" className="btn light" onClick={() => onChange(rows.filter((_, n) => n !== i))}>Remove</button>
          </div>
          <div className="form">
            {(f.columns ?? []).map((c) => {
              const invalid = bad.has(`${f.id}.${i}.${c.id}`);
              return (
                <div key={c.id}>
                  <label>{c.label}{c.required && <span style={{ color: "#dc2626" }}> *</span>}</label>
                  <input type={c.type === "date" ? "date" : "text"} value={row[c.id] ?? ""} onChange={(e) => upd(i, c.id, e.target.value)} style={invalid ? { borderColor: "#dc2626" } : undefined} />
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" className="btn light" style={{ marginTop: 10 }} onClick={() => onChange([...rows, {}])}>+ {f.add_label ?? "Add row"}</button>
    </div>
  );
}
