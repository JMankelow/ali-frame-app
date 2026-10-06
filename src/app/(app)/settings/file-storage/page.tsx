// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireSuperUser } from "@/lib/session";
import { StorageTest } from "./StorageTest";

const clean = (v: string | undefined) => v?.trim().replace(/^["']|["']$/g, "").trim() ?? "";
const mask = (v: string) => (v.length > 10 ? `${v.slice(0, 4)}…${v.slice(-4)}` : "");

interface Row {
  name: string;
  ok: boolean;
  shows: string;
  fix: string;
}

/** Checks each file-storage setting's *shape* only — secret values are never shown. */
function inspect(): Row[] {
  const acc = clean(process.env.R2_ACCOUNT_ID);
  const key = clean(process.env.R2_ACCESS_KEY_ID);
  const sec = clean(process.env.R2_SECRET_ACCESS_KEY);
  const bucket = clean(process.env.R2_BUCKET_NAME);
  const hex32 = (v: string) => /^[0-9a-f]{32}$/i.test(v);
  const accHex = acc.match(/[0-9a-fA-F]{32}/)?.[0] ?? "";

  return [
    {
      name: "R2_ACCOUNT_ID",
      ok: !!accHex,
      shows: !acc ? "not set" : accHex ? `OK — ${mask(accHex)} (32 characters)` : `${acc.length} characters — not a 32-character id`,
      fix: "Cloudflare → R2 → Overview → copy the Account ID (32 letters/numbers, no https://, no spaces).",
    },
    {
      name: "R2_ACCESS_KEY_ID",
      ok: hex32(key),
      shows: !key ? "not set" : hex32(key) ? `OK — ${mask(key)} (32 characters)` : `${key.length} characters — should be 32`,
      fix: "Cloudflare → R2 → Manage API Tokens → your token → Access Key ID (32 characters).",
    },
    {
      name: "R2_SECRET_ACCESS_KEY",
      ok: /^[0-9a-f]{64}$/i.test(sec),
      shows: !sec ? "not set" : /^[0-9a-f]{64}$/i.test(sec) ? "OK — 64 characters (hidden)" : `${sec.length} characters — should be 64`,
      fix: "The Secret Access Key shown once when the token was created (64 characters). If lost, make a new token.",
    },
    {
      name: "R2_BUCKET_NAME",
      ok: !!bucket && !/[\s/:]/.test(bucket),
      shows: !bucket ? "not set" : /[\s/:]/.test(bucket) ? `"${bucket}" — contains spaces or slashes` : `OK — ${bucket}`,
      fix: "The bucket's name exactly as in Cloudflare, e.g. ali-frame-files.",
    },
  ];
}

export default async function FileStoragePage() {
  await requireSuperUser();
  const rows = inspect();
  const allOk = rows.every((r) => r.ok);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>File Storage Check</h2>
          <div className="subtitle">Photos, measure sheets, QA photos and note attachments are stored in Cloudflare R2. This checks the settings and does a real test upload.</div>
        </div>
      </div>

      <div className="card">
        <div className="label">1. Settings on this server (Render → Environment)</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr><th>Setting</th><th>What the server has</th><th>If it's wrong</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td style={{ fontFamily: "monospace", fontWeight: 700 }}>{r.name}</td>
                <td><span className={`status ${r.ok ? "green" : "orange"}`}>{r.shows}</span></td>
                <td className="hint">{r.ok ? "—" : r.fix}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {!allOk && <div className="authError" style={{ marginTop: 10 }}>Fix the orange rows in Render (Environment tab), save, let it redeploy, then reload this page.</div>}
      </div>

      <StorageTest settingsOk={allOk} />
    </div>
  );
}
