// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { beginTotpSetup, confirmTotpSetup, disableTotp, newRecoveryCodes } from "./actions";

export function AuthenticatorSetup({ enabled, codesLeft }: { enabled: boolean; codesLeft: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<"idle" | "scan" | "codes" | "off" | "regen">("idle");
  const [qr, setQr] = useState("");
  const [secret, setSecret] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [err, setErr] = useState("");

  const begin = () =>
    start(async () => {
      setErr("");
      const r = await beginTotpSetup();
      if (r.error || !r.qr) return setErr(r.error ?? "Couldn't start setup.");
      setQr(r.qr);
      setSecret(r.secret ?? "");
      setCode("");
      setStep("scan");
    });

  const confirm = () =>
    start(async () => {
      setErr("");
      const r = await confirmTotpSetup(code);
      if (r.error) return setErr(r.error);
      setCodes(r.recoveryCodes ?? []);
      setStep("codes");
    });

  const turnOff = () =>
    start(async () => {
      setErr("");
      const r = await disableTotp(password);
      if (r.error) return setErr(r.error);
      setPassword("");
      setStep("idle");
      router.refresh();
    });

  const regen = () =>
    start(async () => {
      setErr("");
      const r = await newRecoveryCodes(password);
      if (r.error) return setErr(r.error);
      setPassword("");
      setCodes(r.recoveryCodes ?? []);
      setStep("codes");
    });

  return (
    <div style={{ marginTop: 10 }}>
      {step === "idle" && (
        <>
          <div>
            <span className={`status ${enabled ? "green" : "orange"}`}>{enabled ? "On" : "Not set up"}</span>
            {enabled && <span className="hint" style={{ marginLeft: 8 }}>{codesLeft} recovery code{codesLeft === 1 ? "" : "s"} left</span>}
          </div>
          <div className="actions" style={{ marginTop: 10 }}>
            {!enabled ? (
              <button type="button" className="btn primary" disabled={pending} onClick={begin}>Set up authenticator app</button>
            ) : (
              <>
                <button type="button" className="btn light" onClick={() => { setErr(""); setStep("regen"); }}>New recovery codes</button>
                <button type="button" className="btn light" style={{ color: "#b91c1c" }} onClick={() => { setErr(""); setStep("off"); }}>Turn off</button>
              </>
            )}
          </div>
        </>
      )}

      {step === "scan" && (
        <div>
          <ol style={{ margin: "0 0 10px 18px" }}>
            <li>Open your authenticator app and choose <b>Add account → Scan QR code</b>.</li>
            <li>Scan this code (or type the key in by hand).</li>
            <li>Type the 6-digit code the app now shows, to finish.</li>
          </ol>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qr && <img src={qr} alt="QR code to scan with your authenticator app" width={220} height={220} style={{ border: "1px solid var(--line)", borderRadius: 8, background: "#fff" }} />}
          <div className="hint" style={{ marginTop: 6 }}>Can&apos;t scan? Key: <b style={{ fontFamily: "monospace", letterSpacing: 1 }}>{secret}</b></div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" maxLength={6} placeholder="6-digit code" style={{ width: 160 }} autoComplete="one-time-code" />
            <button type="button" className="btn primary" disabled={pending || code.replace(/\s/g, "").length !== 6} onClick={confirm}>{pending ? "Checking…" : "Turn on"}</button>
            <button type="button" className="btn light" onClick={() => setStep("idle")}>Cancel</button>
          </div>
        </div>
      )}

      {step === "codes" && (
        <div>
          <div className="status green" style={{ display: "inline-block" }}>Authenticator app is on</div>
          <div style={{ marginTop: 10, fontWeight: 700 }}>Save these recovery codes now — they&apos;re shown once.</div>
          <div className="hint">Each works one time if you lose your phone. Keep them somewhere safe (not on the same phone).</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 6, marginTop: 8, fontFamily: "monospace", fontSize: 15, fontWeight: 700 }}>
            {codes.map((c) => <div key={c} style={{ padding: "6px 8px", background: "#f6f8fb", border: "1px solid var(--line)", borderRadius: 6 }}>{c}</div>)}
          </div>
          <div className="actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn light" onClick={() => navigator.clipboard?.writeText(codes.join("\n"))}>Copy</button>
            <button type="button" className="btn primary" onClick={() => { setCodes([]); setStep("idle"); router.refresh(); }}>I&apos;ve saved them</button>
          </div>
        </div>
      )}

      {(step === "off" || step === "regen") && (
        <div>
          <div className="hint">{step === "off" ? "Enter your password to turn the authenticator app off (sign-in goes back to emailed codes)." : "Enter your password to make a new set of recovery codes (the old ones stop working)."}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" autoComplete="current-password" style={{ width: 220 }} />
            <button type="button" className="btn primary" disabled={pending || !password} onClick={step === "off" ? turnOff : regen}>{pending ? "Working…" : step === "off" ? "Turn off" : "Make new codes"}</button>
            <button type="button" className="btn light" onClick={() => { setPassword(""); setStep("idle"); }}>Cancel</button>
          </div>
        </div>
      )}
      {err && <div className="authError" style={{ marginTop: 10 }}>{err}</div>}
    </div>
  );
}
