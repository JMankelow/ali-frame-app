// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useMemo, useState } from "react";
import { submitPreStart, type PreStartState } from "../hsActions";
import { PRESTART_ITEMS, WEATHER_OPTIONS, COMMON_HAZARDS, RISK_LEVELS } from "@/lib/hsDocs";

type Answer = "Yes" | "No" | "N/A";
interface Hazard { hazard: string; risk: string; control: string }
interface Crew { name: string; userId?: string }

const initial: PreStartState = {};
const box = { border: "1px solid #cbd5e1", background: "#fff", padding: "10px 16px", fontWeight: 600, fontSize: 12, letterSpacing: ".08em", textTransform: "uppercase" as const, cursor: "pointer" };
const chip = (on: boolean) => ({ border: `1px solid ${on ? "#111827" : "#cbd5e1"}`, background: on ? "#111827" : "#fff", color: on ? "#fff" : "#111827", padding: "9px 14px", fontSize: 14, cursor: "pointer" });
const heading = { fontWeight: 700, fontSize: 13, letterSpacing: ".06em", textTransform: "uppercase" as const, marginBottom: 12 };

export function PreStartForm({
  jobs,
  staff,
  me,
}: {
  jobs: { number: string; title: string; address: string | null }[];
  staff: { id: string; name: string }[];
  me: { id: string; name: string };
}) {
  const [state, action, pending] = useActionState(submitPreStart, initial);
  const [jobNumber, setJobNumber] = useState("");
  const [pickedJob, setPickedJob] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [startTime, setStartTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [weather, setWeather] = useState<string[]>([]);
  const [weatherNote, setWeatherNote] = useState("");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [hazards, setHazards] = useState<Hazard[]>([]);
  const [workNotes, setWorkNotes] = useState("");
  const [crew, setCrew] = useState<Crew[]>([{ name: me.name, userId: me.id }]);
  const [search, setSearch] = useState("");

  const criticalNo = PRESTART_ITEMS.filter((i) => i.critical && answers[i.key] === "No");
  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return staff.filter((s) => s.name.toLowerCase().includes(q) && !crew.some((c) => c.userId === s.id)).slice(0, 6);
  }, [search, staff, crew]);

  function useThisJob() {
    setJobNumber(pickedJob);
    const j = jobs.find((x) => x.number === pickedJob);
    setSiteAddress(j?.address ?? "");
  }
  const toggleWeather = (w: string) => setWeather((cur) => (cur.includes(w) ? cur.filter((x) => x !== w) : [...cur, w]));
  const setAnswer = (key: string, a: Answer) => setAnswers((cur) => ({ ...cur, [key]: a }));
  const nonCriticalAllOk = () => setAnswers((cur) => ({ ...cur, ...Object.fromEntries(PRESTART_ITEMS.filter((i) => !i.critical).map((i) => [i.key, "Yes" as Answer])) }));
  const addHazard = (h = "") => setHazards((cur) => [...cur, { hazard: h, risk: "", control: "" }]);
  const updateHazard = (i: number, patch: Partial<Hazard>) => setHazards((cur) => cur.map((h, n) => (n === i ? { ...h, ...patch } : h)));

  function segmented(item: (typeof PRESTART_ITEMS)[number]) {
    const opts: Answer[] = item.critical ? ["Yes", "No"] : ["Yes", "No", "N/A"];
    return (
      <div style={{ display: "flex", flex: "0 0 auto" }}>
        {opts.map((o) => {
          const on = answers[item.key] === o;
          const bad = on && o === "No";
          return (
            <button
              type="button"
              key={o}
              onClick={() => setAnswer(item.key, o)}
              style={{ ...box, padding: "14px 20px", marginLeft: -1, background: bad ? "#b91c1c" : on ? "#111827" : "#fff", color: on ? "#fff" : "#111827", borderColor: bad ? "#b91c1c" : "#cbd5e1" }}
            >
              {o}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <form action={action}>
      <input type="hidden" name="jobNumber" value={jobNumber} />
      <input type="hidden" name="answers" value={JSON.stringify(answers)} />
      <input type="hidden" name="weather" value={JSON.stringify(weather)} />
      <input type="hidden" name="hazards" value={JSON.stringify(hazards)} />
      <input type="hidden" name="crew" value={JSON.stringify(crew)} />

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Which job?</div>
        <div style={{ display: "flex", gap: 12 }}>
          <select value={pickedJob} onChange={(e) => setPickedJob(e.target.value)} style={{ flex: 1, padding: 12 }}>
            <option value="">No job (other site)</option>
            {jobs.map((j) => (
              <option key={j.number} value={j.number}>{j.number} — {j.title}</option>
            ))}
          </select>
          <button type="button" style={box} onClick={useThisJob}>Use this job</button>
        </div>
        {jobNumber && <div className="hint" style={{ marginTop: 8 }}>Daily toolbox for job {jobNumber}.</div>}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={heading}>1 · Site &amp; weather</div>
        <div className="form">
          <div>
            <label>Site address</label>
            <input name="siteAddress" value={siteAddress} onChange={(e) => setSiteAddress(e.target.value)} />
          </div>
          <div>
            <label>Start time</label>
            <input type="time" name="startTime" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
        </div>
        <div style={{ fontWeight: 600, fontSize: 13, margin: "16px 0 8px" }}>Weather / conditions (tap all that apply)</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {WEATHER_OPTIONS.map((w) => (
            <button type="button" key={w} style={chip(weather.includes(w))} onClick={() => toggleWeather(w)}>{w}</button>
          ))}
        </div>
        <input name="weatherNote" value={weatherNote} onChange={(e) => setWeatherNote(e.target.value)} placeholder="Anything else? e.g. gusts 40 km/h after 2pm" style={{ marginTop: 12, width: "100%" }} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ ...heading, marginBottom: 0 }}>2 · Hazard check</div>
          <button type="button" style={box} onClick={nonCriticalAllOk}>Non-critical all OK</button>
        </div>
        <div className="hint" style={{ marginBottom: 12 }}>
          Critical checks need an answer. A <strong>No</strong> on a critical check means <strong>stop work</strong>: the app records it and opens a hazard report.
        </div>
        {PRESTART_ITEMS.map((item) => (
          <div key={item.key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 0 14px 14px", borderTop: "1px solid #e5e7eb", borderLeft: item.critical ? "4px solid #b91c1c" : "4px solid transparent", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 280px" }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>
                {item.label}
                {item.critical && <span style={{ color: "#b91c1c", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", marginLeft: 8 }}>CRITICAL</span>}
              </div>
              <div className="hint">{item.hint}</div>
            </div>
            {segmented(item)}
          </div>
        ))}
        {criticalNo.length > 0 && (
          <div style={{ marginTop: 14, background: "#fef2f2", border: "1px solid #fca5a5", color: "#991b1b", padding: 14, fontWeight: 700 }}>
            STOP WORK — do not start until this is fixed: {criticalNo.map((c) => c.label).join("; ")}. Submitting records this and notifies the H&amp;S representative.
          </div>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={heading}>3 · Today&apos;s site hazards &amp; controls</div>
        <div className="hint" style={{ marginBottom: 10 }}>Add anything specific to today, or tap a common hazard.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
          {COMMON_HAZARDS.map((h) => (
            <button type="button" key={h} style={chip(false)} onClick={() => addHazard(h)}>+ {h}</button>
          ))}
        </div>
        {hazards.map((h, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 110px 1.6fr auto", gap: 8, marginBottom: 8 }}>
            <input value={h.hazard} onChange={(e) => updateHazard(i, { hazard: e.target.value })} placeholder="Hazard" />
            <select value={h.risk} onChange={(e) => updateHazard(i, { risk: e.target.value })}>
              <option value="">Risk</option>
              {RISK_LEVELS.map((r) => <option key={r}>{r}</option>)}
            </select>
            <input value={h.control} onChange={(e) => updateHazard(i, { control: e.target.value })} placeholder="Control" />
            <button type="button" style={box} onClick={() => setHazards((cur) => cur.filter((_, n) => n !== i))}>Remove</button>
          </div>
        ))}
        <button type="button" style={box} onClick={() => addHazard()}>+ Add hazard</button>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={heading}>4 · Work discussion</div>
        <div className="hint" style={{ marginBottom: 8 }}>What are we doing today, who is doing what, and anything the crew needs to know (access, deliveries, other trades, client).</div>
        <textarea name="workNotes" value={workNotes} onChange={(e) => setWorkNotes(e.target.value)} rows={4} style={{ width: "100%" }} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div style={heading}>5 · Crew sign-on</div>
        <div style={{ background: "#f1efe9", padding: 12, marginBottom: 12, fontSize: 14 }}>
          By signing on, workers and contractors confirm they understand the hazards, controls and key work discussion for this site.
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {crew.map((c, i) => (
            <span key={i} style={{ ...chip(true), display: "inline-flex", gap: 8, alignItems: "center" }}>
              {c.name}
              <button type="button" onClick={() => setCrew((cur) => cur.filter((_, n) => n !== i))} style={{ background: "none", border: "none", color: "#fff", cursor: "pointer" }} aria-label={`Remove ${c.name}`}>×</button>
            </span>
          ))}
        </div>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a name…" style={{ width: "100%" }} />
        {matches.map((m) => (
          <button type="button" key={m.id} onClick={() => { setCrew((cur) => [...cur, { name: m.name, userId: m.id }]); setSearch(""); }} style={{ ...chip(false), display: "block", width: "100%", textAlign: "left", marginTop: -1 }}>
            {m.name}
          </button>
        ))}
        {search.trim().length > 1 && matches.length === 0 && (
          <button type="button" onClick={() => { setCrew((cur) => [...cur, { name: search.trim() }]); setSearch(""); }} style={{ ...chip(false), display: "block", width: "100%", textAlign: "left", marginTop: 6 }}>
            Add &ldquo;{search.trim()}&rdquo; (contractor / visitor)
          </button>
        )}
      </div>

      {state.error && <div className="authError" style={{ marginTop: 16 }}>{state.error}</div>}
      <div className="actions" style={{ marginTop: 16 }}>
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : criticalNo.length ? "Record STOP WORK & submit" : "Complete daily toolbox"}</button>
      </div>
    </form>
  );
}
