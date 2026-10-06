// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState } from "react";
import { finishStorageTest, requestStorageTest } from "./actions";

const PROOF = "ali-frame file storage test";
type Step = { text: string; state: "ok" | "bad" | "wait" };

export function StorageTest({ settingsOk }: { settingsOk: boolean }) {
  const [steps, setSteps] = useState<Step[]>([]);
  const [busy, setBusy] = useState(false);
  const [cors, setCors] = useState(false);
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function run() {
    setBusy(true);
    setCors(false);
    const log: Step[] = [];
    const push = (s: Step) => {
      log.push(s);
      setSteps([...log]);
    };
    const last = (state: Step["state"]) => {
      log[log.length - 1] = { ...log[log.length - 1], state };
      setSteps([...log]);
    };

    push({ text: "Server builds a secure upload link…", state: "wait" });
    const req = await requestStorageTest();
    if (req.error || !req.key || !req.uploadUrl) {
      last("bad");
      push({ text: `Failed: ${req.error ?? "no link returned"}`, state: "bad" });
      setBusy(false);
      return;
    }
    last("ok");

    push({ text: "This browser uploads a small test file straight to storage…", state: "wait" });
    try {
      const put = await fetch(req.uploadUrl, { method: "PUT", headers: { "Content-Type": "text/plain" }, body: PROOF });
      if (!put.ok) {
        last("bad");
        push({ text: `Storage refused the upload (HTTP ${put.status}). The access key may not have write permission to this bucket, or the bucket name is wrong.`, state: "bad" });
        setBusy(false);
        return;
      }
    } catch {
      last("bad");
      push({ text: "The browser was blocked from uploading. The bucket needs a CORS rule allowing this site (shown below).", state: "bad" });
      setCors(true);
      setBusy(false);
      return;
    }
    last("ok");

    push({ text: "Server reads the file back and tidies it away…", state: "wait" });
    const fin = await finishStorageTest(req.key);
    if (fin.error) {
      last("bad");
      push({ text: `Failed: ${fin.error}`, state: "bad" });
    } else {
      last("ok");
      push({ text: "File storage is working — photos and files can be uploaded.", state: "ok" });
    }
    setBusy(false);
  }

  const corsJson = JSON.stringify(
    [{ AllowedOrigins: [origin || "https://ali-frame-app.onrender.com"], AllowedMethods: ["GET", "PUT", "HEAD"], AllowedHeaders: ["*"], ExposeHeaders: ["ETag"], MaxAgeSeconds: 3600 }],
    null,
    2,
  );

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">2. Live test</div>
      <div className="hint" style={{ marginTop: 4 }}>Uploads a tiny text file, reads it back, then deletes it. Nothing of yours is touched.</div>
      <div className="actions" style={{ marginTop: 10 }}>
        <button type="button" className="btn primary" onClick={run} disabled={busy || !settingsOk}>
          {busy ? "Testing…" : "Run file storage test"}
        </button>
        {!settingsOk && <span className="hint">Fix the settings above first.</span>}
      </div>
      <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
        {steps.map((s, i) => (
          <div key={i}>
            <span className={`status ${s.state === "ok" ? "green" : s.state === "bad" ? "orange" : "grey"}`}>{s.state === "ok" ? "OK" : s.state === "bad" ? "Problem" : "…"}</span> {s.text}
          </div>
        ))}
      </div>
      {cors && (
        <div style={{ marginTop: 12 }}>
          <div className="label">CORS rule to add</div>
          <div className="hint">Cloudflare → R2 → your bucket → Settings → CORS Policy → Add/Edit → paste this, save, then run the test again.</div>
          <pre style={{ background: "#f4f6fa", border: "1px solid var(--line)", borderRadius: 8, padding: 10, overflow: "auto", fontSize: 12 }}>{corsJson}</pre>
        </div>
      )}
    </div>
  );
}
