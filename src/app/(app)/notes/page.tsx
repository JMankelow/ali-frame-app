import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { NoteForm } from "./NoteForm";
import { resolveNote, reopenNote } from "./actions";

export default async function NotesPage() {
  await requireUser();

  const [notes, users] = await Promise.all([
    prisma.note.findMany({
      include: { author: true, assignedTo: true },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

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

      <div className="card">
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
                  <td style={{ whiteSpace: "pre-wrap" }}>{n.text}</td>
                  <td>{n.author.name}</td>
                  <td>{n.assignedTo?.name ?? "—"}</td>
                  <td>{n.createdAt.toLocaleDateString("en-NZ")}</td>
                  <td>
                    <form action={resolveNote.bind(null, n.id)}>
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

      <NoteForm users={users} />

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
                  <td style={{ whiteSpace: "pre-wrap", color: "#94a3b8", textDecoration: "line-through" }}>{n.text}</td>
                  <td>{n.author.name}</td>
                  <td>{n.assignedTo?.name ?? "—"}</td>
                  <td>{n.resolvedAt?.toLocaleDateString("en-NZ") ?? "—"}</td>
                  <td>
                    <form action={reopenNote.bind(null, n.id)}>
                      <button type="submit" className="btn light">
                        Reopen
                      </button>
                    </form>
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
