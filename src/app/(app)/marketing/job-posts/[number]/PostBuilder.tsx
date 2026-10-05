// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState } from "react";
import { sendPostToBuffer, type PostFormState } from "../actions";

interface Photo { id: string; name: string; url: string }
interface Channel { id: string; name: string; displayName: string | null; service: string }

const initial: PostFormState = {};

export function PostBuilder({
  jobNumber, photos, channels, channelError, initialCaption, canSend,
}: { jobNumber: string; photos: Photo[]; channels: Channel[]; channelError: string; initialCaption: string; canSend: boolean }) {
  const [state, formAction, pending] = useActionState(sendPostToBuffer.bind(null, jobNumber), initial);

  return (
    <form action={formAction} style={{ marginTop: 12 }}>
      <div className="card">
        <div className="label">1. Tick the photos to use (up to 10)</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10, marginTop: 10 }}>
          {photos.map((p) => (
            <label key={p.id} style={{ display: "block", cursor: "pointer", position: "relative" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt={p.name} style={{ width: "100%", height: 110, objectFit: "cover", borderRadius: 8, display: "block" }} />
              <input type="checkbox" name="fileId" value={p.id} style={{ position: "absolute", top: 8, left: 8, width: 20, height: 20 }} />
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">2. Caption</div>
        <textarea name="caption" defaultValue={initialCaption} rows={9} style={{ width: "100%", marginTop: 8 }} />
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">3. Buffer channels</div>
        {channelError && <div className="authError" style={{ marginTop: 8 }}>{channelError}</div>}
        {channels.length === 0 && !channelError && <div className="hint" style={{ marginTop: 8 }}>No channels loaded — connect Buffer (see the setup note above).</div>}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 8 }}>
          {channels.map((c) => (
            <label key={c.id} style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <input type="checkbox" name="channelId" value={c.id} /> {c.displayName || c.name} <span className="hint">({c.service})</span>
            </label>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input type="checkbox" name="consent" style={{ marginTop: 3 }} />
          <span>The customer is happy for these photos to be shared, and none show identifiable people, the street address or other private details.</span>
        </label>
        {state.error && <div className="authError" style={{ marginTop: 10 }}>{state.error}</div>}
        {state.done && <div className="status green" style={{ marginTop: 10, display: "inline-block" }}>{state.done}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending || !canSend}>{pending ? "Sending to Buffer…" : "Save as draft in Buffer"}</button>
        </div>
        <div className="hint" style={{ marginTop: 6 }}>Drafts only — nothing is published until it&apos;s approved inside Buffer.</div>
      </div>
    </form>
  );
}
