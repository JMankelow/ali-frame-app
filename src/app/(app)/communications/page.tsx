import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const EMAIL_ACTION_LABELS: Record<string, string> = {
  site_measure_emailed: "Site Measure sheet emailed to supplier",
  vehicle_mechanic_emailed: "Vehicle mechanic booking email",
  vehicle_checklist_overdue_alert: "Overdue vehicle checklist alert",
  remedial_created: "Remedial raised — notified Tanya",
  xero_connected: "Xero connected",
};

export default async function CommunicationsHubPage() {
  const user = await requireUser();

  const [myTasks, recentNotes, sentComms] = await Promise.all([
    prisma.note.findMany({
      where: { assignedToId: user.id, status: { not: "Done" } },
      include: { author: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.note.findMany({
      include: { author: true, assignedTo: true },
      orderBy: { createdAt: "desc" },
      take: 15,
    }),
    prisma.auditLog.findMany({
      where: {
        OR: Object.keys(EMAIL_ACTION_LABELS).map((action) => ({ action })),
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Communications Hub</h2>
          <div className="subtitle">Everything communication-related in one place — your tasks, the team&apos;s notes, and a log of emails the app has sent.</div>
        </div>
      </div>

      <div className="cards">
        <Link href="/tasks" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">My Open Tasks</div>
          <div className="metric">{myTasks.length}</div>
        </Link>
        <Link href="/notes" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Notes</div>
          <div className="hint">Open the full backlog →</div>
        </Link>
        <Link href="/templates" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Email Templates</div>
          <div className="hint">Manage reusable wording →</div>
        </Link>
        <Link href="/leads" className="card" style={{ textDecoration: "none", color: "inherit" }}>
          <div className="label">Leads</div>
          <div className="hint">Assign and follow up →</div>
        </Link>
      </div>

      <div className="card">
        <div className="label">My Open Tasks</div>
        {myTasks.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>Nothing assigned to you right now.</div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Note</th>
                <th>From</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map((n) => (
                <tr key={n.id}>
                  <td>{n.text}</td>
                  <td>{n.author.name}</td>
                  <td>{n.createdAt.toLocaleDateString("en-NZ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="label">Recent Notes (Team)</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>Note</th>
              <th>From</th>
              <th>To</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentNotes.map((n) => (
              <tr key={n.id}>
                <td>{n.text}</td>
                <td>{n.author.name}</td>
                <td>{n.assignedTo?.name ?? "—"}</td>
                <td>
                  <span className={`status ${n.status === "Done" ? "green" : "orange"}`}>{n.status}</span>
                </td>
                <td>{n.createdAt.toLocaleDateString("en-NZ")}</td>
              </tr>
            ))}
            {recentNotes.length === 0 && (
              <tr>
                <td colSpan={5} className="hint">
                  No notes yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="label">Sent Communications Log</div>
        <div className="hint" style={{ marginBottom: 8 }}>Emails the app has actually sent — remedial alerts, site measure sheets, vehicle bookings, and more.</div>
        <table>
          <thead>
            <tr>
              <th>What</th>
              <th>By</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {sentComms.map((c) => (
              <tr key={c.id}>
                <td>{EMAIL_ACTION_LABELS[c.action] ?? c.action}</td>
                <td>{c.user?.name ?? "System"}</td>
                <td>{c.createdAt.toLocaleString("en-NZ")}</td>
              </tr>
            ))}
            {sentComms.length === 0 && (
              <tr>
                <td colSpan={3} className="hint">
                  No communications logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
