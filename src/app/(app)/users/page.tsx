import { requireSuperUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UserForm } from "./UserForm";
import { PermissionsMatrix } from "./PermissionsMatrix";
import { InviteAllButton } from "./InviteButtons";
import { UserTasksSection } from "./UserTasksSection";

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

      <InviteAllButton pendingCount={users.filter((u) => u.isActive && u.mustResetPassword && !u.email.endsWith(".local")).length} />

      <UserForm />

      <div style={{ marginTop: 16 }}>
        <PermissionsMatrix
          rows={users
            .filter((u) => !u.email.endsWith(".local"))
            .map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, isActive: u.isActive, mustResetPassword: u.mustResetPassword, isSuperUser: u.isSuperUser, permissions: u.permissions }))}
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
