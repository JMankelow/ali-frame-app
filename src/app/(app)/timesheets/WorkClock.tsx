// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { startClock, stopClock } from "./clockActions";

const WORK_TYPES = ["Install", "Check Measure", "Measure Up", "Remedial", "QA / Completion", "Travel / Pickup", "Other"];
const pad = (n: number) => String(n).padStart(2, "0");

export function WorkClock({
  active,
  jobs,
}: {
  active: { jobNumber: string; jobTitle: string; workType: string; startedAt: string; isRemedial?: boolean } | null;
  jobs: { number: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [job, setJob] = useState(jobs[0]?.number ?? "");
  const [workType, setWorkType] = useState("Install");
  const [remedial, setRemedial] = useState(false);
  const [breakMin, setBreakMin] = useState("0");
  const [stopping, setStopping] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [active]);

  const secs = active ? Math.max(0, Math.floor((now - new Date(active.startedAt).getTime()) / 1000)) : 0;
  const clockText = `${pad(Math.floor(secs / 3600))}:${pad(Math.floor((secs % 3600) / 60))}:${pad(secs % 60)}`;

  const run = (fn: () => Promise<{ error?: string; ok?: string }>) =>
    startTransition(async () => {
      setErr("");
      setMsg("");
      const r = await fn();
      if (r.error) setErr(r.error);
      else {
        setMsg(r.ok ?? "");
        setStopping(false);
        router.refresh();
      }
    });

  return (
    <div className="card" style={{ marginBottom: 16, borderLeft: `6px solid ${active ? "#1f8a4c" : "#0057b8"}` }}>
      <div className="label">Work clock</div>
      {active ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap", marginTop: 6 }}>
            <div style={{ fontSize: 34, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "#1f8a4c" }}>{clockText}</div>
            <div>
              <div style={{ fontWeight: 600 }}>{active.jobNumber} — {active.jobTitle}</div>
              <div className="hint">{active.workType}{active.isRemedial ? " · REMEDIAL" : ""} · started {new Date(active.startedAt).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit", timeZone: "Pacific/Auckland" })}</div>
            </div>
          </div>
          {!stopping ? (
            <div className="actions" style={{ marginTop: 10 }}>
              <button type="button" className="btn primary" style={{ background: "#c62828", borderColor: "#c62828", fontSize: 16, padding: "12px 22px" }} onClick={() => setStopping(true)}>
                Stop clock
              </button>
            </div>
          ) : (
            <div style={{ marginTop: 10 }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Break taken (minutes)</label>
              <input type="number" min={0} max={480} value={breakMin} onChange={(e) => setBreakMin(e.target.value)} style={{ width: 120 }} />
              <div className="actions" style={{ marginTop: 10 }}>
                <button type="button" className="btn primary" disabled={pending} onClick={() => run(() => stopClock(Number(breakMin), ""))}>
                  {pending ? "Saving…" : "Stop & save my time"}
                </button>
                <button type="button" className="btn light" disabled={pending} onClick={() => setStopping(false)}>Keep going</button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          <div className="hint" style={{ marginTop: 4 }}>Start when you begin work and stop when you finish — your hours are saved for you.</div>
          {jobs.length === 0 ? (
            <div className="hint" style={{ marginTop: 8 }}>You aren&apos;t booked on any jobs yet.</div>
          ) : (
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end", marginTop: 10 }}>
              <div style={{ flex: "1 1 240px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Job</label>
                <select value={job} onChange={(e) => setJob(e.target.value)} style={{ width: "100%" }}>
                  {jobs.map((j) => (
                    <option key={j.number} value={j.number}>{j.number} — {j.title}</option>
                  ))}
                </select>
              </div>
              <div style={{ flex: "0 1 180px" }}>
                <label style={{ display: "block", fontSize: 13, fontWeight: 700 }}>Work type</label>
                <select value={workType} onChange={(e) => setWorkType(e.target.value)} style={{ width: "100%" }}>
                  {WORK_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <label style={{ flex: "1 1 100%", display: "flex", gap: 8, alignItems: "center", fontWeight: 700, background: "#fff4e5", border: "1px solid #fed7aa", borderRadius: 10, padding: "8px 10px" }}>
                <input type="checkbox" checked={remedial} onChange={(e) => setRemedial(e.target.checked)} /> This is for <b>remedial</b> — not the usual install
              </label>
              <button type="button" className="btn primary" disabled={pending || !job} style={{ background: "#1f8a4c", borderColor: "#1f8a4c", fontSize: 16, padding: "12px 22px" }} onClick={() => run(() => startClock(job, workType, remedial))}>
                {pending ? "Starting…" : "Start clock"}
              </button>
            </div>
          )}
        </>
      )}
      {err && <div className="authError" style={{ marginTop: 10 }}>{err}</div>}
      {msg && <div className="status green" style={{ marginTop: 10, display: "inline-block" }}>{msg}</div>}
    </div>
  );
}
