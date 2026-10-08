import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveNote } from "../notes/actions";
import { NoteImages } from "../notes/NoteImages";
import Link from "next/link";
import { markAlertRead, markAllAlertsRead } from "./alertActions";

export default async function TasksPage() {
  const user = await requireUser();

  const alerts = await prisma.notification.findMany({ where: { userId: user.id, readAt: null }, orderBy: { createdAt: "desc" }, take: 30 });
  const tasks = await prisma.note.findMany({
    where: { assignedToId: user.id, status: { not: "Done" } },
    include: { author: true, attachments: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My Tasks</h2>
          <div className="subtitle">Notes assigned to you — including anything Claude finished and handed back for you to check.</div>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: 16, borderLeft: "6px solid #0057b8" }}>
          <div className="topbar" style={{ marginBottom: 8 }}>
            <div className="label">New alerts ({alerts.length})</div>
            <form action={markAllAlertsRead}><button type="submit" className="btn light">Mark all read</button></form>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {alerts.map((a) => (
              <div key={a.id} style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "space-between", padding: "8px 10px", borderRadius: 10, background: "#f6f8fb", border: "1px solid var(--line)" }}>
                <Link href={a.href} style={{ color: "inherit", textDecoration: "none", whiteSpace: "pre-wrap" }}>
                  <div>{a.text}</div>
                  <div className="hint">{a.createdAt.toLocaleString("en-NZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} · tap to open</div>
                </Link>
                <form action={markAlertRead.bind(null, a.id)}><button type="submit" className="btn light">Read</button></form>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        {tasks.length === 0 ? (
          <div className="hint">Nothing assigned to you right now.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Task</th>
                <th>From</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={{ whiteSpace: "pre-wrap" }}>
                    {t.text}
                    <NoteImages attachments={t.attachments} />
                  </td>
                  <td>{t.author.name}</td>
                  <td>{t.createdAt.toLocaleDateString("en-NZ")}</td>
                  <td>
                    <form action={resolveNote.bind(null, t.id)}>
                      <button type="submit" className="btn light">
                        Mark Done
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
