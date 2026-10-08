import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { NoteForm } from "./NoteForm";
import { NoteImages } from "./NoteImages";
import { resolveNote, reopenNote, completeAndReturnToCreator } from "./actions";

export default async function NotesPage() {
  const me = await requireUser();
  const field = isInstallerProfile(me);

  const [notes, activeUsers, claudeUser] = await Promise.all([
    prisma.note.findMany({
      // field staff only ever see notes they wrote or that were assigned to them
      where: field ? { OR: [{ authorId: me.id }, { assignedToId: me.id }] } : {},
      include: { author: true, assignedTo: true, attachments: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    // Notes can only be assigned to Jo or Tanya (or Claude, below).
    // Field staff can assign to Tanya or Tristam only.
    prisma.user.findMany({ where: { isActive: true, email: { in: field ? ["tanya@aliframe.co.nz", "tristam@aliframe.co.nz"] : ["jo@aliframe.co.nz", "tanya@aliframe.co.nz"] } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    field ? Promise.resolve(null) : prisma.user.findUnique({ where: { email: "claude@aliframe.local" }, select: { id: true, name: true } }),
  ]);

  // Claude is a real (but never-login-able) User row purely so notes can be
  // assigned to it via the normal assignedToId relation — surfaced here
  // alongside real staff even though it's excluded from every other
  // active-user list (isActive: false) so it never leaks into Timesheets,
  // Remedial, etc.
  const users = claudeUser ? [...activeUsers, claudeUser] : activeUsers;

  const open = notes.filter((n) => n.status !== "Done");
  const done = notes.filter((n) => n.status === "Done");

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Notes</h2>
          <div className="subtitle">
            A running backlog — leave a note for anything that needs building, fixing or changing, and assign it to
            whoever should look at it.
          </div>
        </div>
      </div>

      <NoteForm users={users} />

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Open ({open.length})</div>
        {open.length === 0 ? (
          <div className="hint" style={{ marginTop: 8 }}>
            Nothing open right now.
          </div>
        ) : (
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Note</th>
                <th>By</th>
                <th>Assigned To</th>
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {open.map((n) => (
                <tr key={n.id}>
                  <td style={{ whiteSpace: "pre-wrap" }}>
                    {n.text}
                    <NoteImages attachments={n.attachments} />
                  </td>
                  <td>{n.author.name}</td>
                  <td>{n.assignedTo?.name ?? "—"}</td>
                  <td>{n.createdAt.toLocaleDateString("en-NZ")}</td>
                  <td>
                    {field ? null : n.assignedTo?.email === "claude@aliframe.local" ? (
                      <form action={completeAndReturnToCreator.bind(null, n.id)}>
                        <button type="submit" className="btn primary">
                          Complete → Return to {n.author.name}
                        </button>
                      </form>
                    ) : (
                      <form action={resolveNote.bind(null, n.id)}>
                        <button type="submit" className="btn light">
                          Mark Done
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {done.length > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Done ({done.length})</div>
          <table style={{ marginTop: 8 }}>
            <thead>
              <tr>
                <th>Note</th>
                <th>By</th>
                <th>Assigned To</th>
                <th>Resolved</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {done.map((n) => (
                <tr key={n.id}>
                  <td style={{ whiteSpace: "pre-wrap", color: "#94a3b8" }}>
                    <span style={{ textDecoration: "line-through" }}>{n.text}</span>
                    <NoteImages attachments={n.attachments} />
                  </td>
                  <td>{n.author.name}</td>
                  <td>{n.assignedTo?.name ?? "—"}</td>
                  <td>{n.resolvedAt?.toLocaleDateString("en-NZ") ?? "—"}</td>
                  <td>
                    {!field && (
                      <form action={reopenNote.bind(null, n.id)}>
                        <button type="submit" className="btn light">
                          Reopen
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
