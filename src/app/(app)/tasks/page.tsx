import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { resolveNote } from "../notes/actions";

export default async function TasksPage() {
  const user = await requireUser();

  const tasks = await prisma.note.findMany({
    where: { assignedToId: user.id, status: { not: "Done" } },
    include: { author: true },
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
                  <td style={{ whiteSpace: "pre-wrap" }}>{t.text}</td>
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
