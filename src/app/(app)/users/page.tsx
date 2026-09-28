import { requireSuperUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { deactivateUser, reactivateUser } from "./actions";
import { UserForm } from "./UserForm";
import { PermissionsMatrix } from "./PermissionsMatrix";
import { UserTasksSection } from "./UserTasksSection";
import { ROLE_LABELS } from "@/lib/roles";

export default async function UsersPage() {
  // Real server-side gate — this page (and every action it calls) is
  // restricted to the Master User, matching the old prototype's Accounts
  // rule, but actually enforced server-side this time, not just a hidden tab.
  const actor = await requireSuperUser();
  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  const openTasks = await prisma.note.findMany({
    where: { assignedToId: { not: null }, status: { not: "Done" } },
    include: { author: true },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Users</h2>
          <div className="subtitle">Restricted to the Master User.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>First login</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{ROLE_LABELS[u.role] ?? u.role}</td>
                <td>
                  <span className={`status ${u.isActive ? "green" : "grey"}`}>
                    {u.isActive ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td>{u.mustResetPassword ? "Pending" : "Done"}</td>
                <td>
                  {u.isActive ? (
                    <form action={deactivateUser.bind(null, u.id)}>
                      <button type="submit" className="btn danger">
                        Deactivate
                      </button>
                    </form>
                  ) : (
                    <form action={reactivateUser.bind(null, u.id)}>
                      <button type="submit" className="btn light">
                        Reactivate
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <UserForm />

      <div style={{ marginTop: 16 }}>
        <PermissionsMatrix
          rows={users
            .filter((u) => u.isActive)
            .map((u) => ({ id: u.id, name: u.name, role: u.role, isSuperUser: u.isSuperUser, permissions: u.permissions }))}
          currentUserId={actor.id}
        />
      </div>

      <div style={{ marginTop: 16 }}>
        <UserTasksSection
          users={users
            .filter((u) => u.isActive)
            .map((u) => ({
              id: u.id,
              name: u.name,
              tasks: openTasks
                .filter((t) => t.assignedToId === u.id)
                .map((t) => ({ id: t.id, text: t.text, authorName: t.author.name, createdAt: t.createdAt.toISOString() })),
            }))}
        />
      </div>
    </div>
  );
}
