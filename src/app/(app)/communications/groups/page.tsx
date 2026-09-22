import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { MemberCheckbox } from "./MemberCheckbox";

export default async function CommunicationGroupsPage() {
  await requireUser();

  const [groups, users] = await Promise.all([
    prisma.communicationGroup.findMany({
      include: { members: { select: { id: true } } },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, role: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Communication Groups</h2>
          <div className="subtitle">Tick who&apos;s in each group — saved instantly.</div>
        </div>
      </div>

      <div className="card" style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              {groups.map((g) => (
                <th key={g.id} style={{ textAlign: "center" }}>
                  {g.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                {groups.map((g) => (
                  <td key={g.id} style={{ textAlign: "center" }}>
                    <MemberCheckbox groupId={g.id} userId={u.id} checked={g.members.some((m) => m.id === u.id)} />
                  </td>
                ))}
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={groups.length + 1} className="hint">
                  No active users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
