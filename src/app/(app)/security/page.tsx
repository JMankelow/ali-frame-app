import { requireSuperUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function SecurityPage() {
  await requireSuperUser();

  const now = new Date();
  const [activeSessions, failedLogins24h, pendingReset, recentAudit, disable2fa] = await Promise.all([
    prisma.session.count({ where: { expiresAt: { gt: now } } }),
    prisma.loginAttempt.count({ where: { success: false, createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
    prisma.user.findMany({ where: { mustResetPassword: true, isActive: true }, select: { name: true, email: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 25, include: { user: true } }),
    Promise.resolve(process.env.DISABLE_2FA === "true"),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Security</h2>
          <div className="subtitle">Master User only — session activity, login attempts and the audit trail.</div>
        </div>
      </div>

      {disable2fa && (
        <div className="authError">
          DISABLE_2FA is currently set on this deployment — every login skips the emailed code step. Turn this off
          once everyone&apos;s confirmed 2FA works for them.
        </div>
      )}

      <div className="cards">
        <div className="card">
          <div className="label">Active Sessions</div>
          <div className="metric">{activeSessions}</div>
        </div>
        <div className="card">
          <div className="label">Failed Logins (24h)</div>
          <div className="metric">{failedLogins24h}</div>
          <span className={`status ${failedLogins24h > 5 ? "red" : "grey"}`}>{failedLogins24h > 5 ? "Worth checking" : "Normal"}</span>
        </div>
        <div className="card">
          <div className="label">Accounts Pending First-Login Reset</div>
          <div className="metric">{pendingReset.length}</div>
        </div>
      </div>

      {pendingReset.length > 0 && (
        <div className="card">
          <div className="label">Accounts Still On Their Temporary Password</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {pendingReset.map((u) => (
                <tr key={u.email}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card">
        <div className="label">Recent Audit Log</div>
        <table style={{ marginTop: 8 }}>
          <thead>
            <tr>
              <th>When</th>
              <th>Who</th>
              <th>Action</th>
              <th>Entity</th>
            </tr>
          </thead>
          <tbody>
            {recentAudit.map((a) => (
              <tr key={a.id}>
                <td>{a.createdAt.toLocaleString("en-NZ")}</td>
                <td>{a.user?.name ?? "System / unauthenticated"}</td>
                <td>{a.action}</td>
                <td>{a.entityType ?? "—"}</td>
              </tr>
            ))}
            {recentAudit.length === 0 && (
              <tr>
                <td colSpan={4} className="hint">
                  No audit log entries yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
