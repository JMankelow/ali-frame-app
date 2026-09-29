import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ROLE_LABELS } from "@/lib/roles";
import { PhoneCell } from "./PhoneCell";

export default async function EmployeesPage() {
  const user = await requireUser();

  const employees = await prisma.user.findMany({
    where: { isActive: true, email: { not: "claude@aliframe.local" } },
    orderBy: { name: "asc" },
    include: { vehiclesDriven: { select: { name: true } } },
  });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Employees</h2>
          <div className="subtitle">{employees.length} active employee(s) — every real staff account in the system.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Vehicle</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id}>
                <td style={{ fontWeight: 700 }}>
                  <Link href={`/employees/${e.id}`} style={{ color: "var(--blueDark)", textDecoration: "none" }}>
                    {e.name}
                  </Link>
                </td>
                <td>{ROLE_LABELS[e.role] ?? e.role}</td>
                <td>{e.email}</td>
                <td>
                  <PhoneCell userId={e.id} phone={e.phone} canEdit={user.isSuperUser} />
                </td>
                <td>{e.vehiclesDriven.map((v) => v.name).join(", ") || "—"}</td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={5} className="hint">
                  No employees yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
