// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { getDownloadUrl } from "@/lib/storage";

const isShowable = (name: string) => /\.(png|jpe?g|webp|gif)$/i.test(name);

/** Thumbnails of the photos attached to a note (click to open full size); other files show as a link. */
export async function NoteImages({ attachments }: { attachments: { id: string; storageKey: string; fileName: string }[] }) {
  if (attachments.length === 0) return null;
  const urls = await Promise.all(
    attachments.map(async (a) => {
      if (a.storageKey.startsWith("db:")) return `/api/notes/file/${a.id}`; // kept in the database
      try {
        return await getDownloadUrl(a.storageKey, a.fileName);
      } catch {
        return "";
      }
    }),
  );
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
      {attachments.map((a, i) =>
        urls[i] && !isShowable(a.fileName) ? (
          <a key={a.id} href={urls[i]} target="_blank" rel="noopener noreferrer" className="btn light" title={a.fileName}>
            &#128206; {a.fileName}
          </a>
        ) : urls[i] ? (
          <a key={a.id} href={urls[i]} target="_blank" rel="noopener noreferrer" title={a.fileName}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={urls[i]} alt={a.fileName} style={{ height: 90, maxWidth: 160, objectFit: "cover", borderRadius: 6, border: "1px solid var(--line)" }} />
          </a>
        ) : (
          <span key={a.id} className="hint">{a.fileName} (preview unavailable)</span>
        ),
      )}
    </div>
  );
}
