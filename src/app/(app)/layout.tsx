import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { logout } from "./actions";

const ROLE_LABELS: Record<string, string> = {
  ADMIN_MANAGEMENT: "Admin / Management",
  OFFICE_SCHEDULING: "Office / Scheduling",
  SALES: "Sales",
  SENIOR_INSTALLER: "Senior Installer",
  CREW_MOBILE: "Crew Mobile",
  READ_ONLY: "Read Only",
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // This is the real, per-request auth check (hits the database) — the
  // Edge middleware only ever does a cheap "cookie present" pre-filter.
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="side-logo">AF</div>
          <div>
            <h1>Ali-Frame</h1>
            <span>Job Management System</span>
          </div>
        </div>
        <nav className="nav">
          <a href="/dashboard">Dashboard</a>
          <a href="/jobs">Jobs</a>
          <a href="/leads">Leads</a>
          <a href="/files">Files</a>
          {user.isSuperUser && <a href="/users">Users</a>}
          <a href="/settings">Settings</a>
        </nav>
        <div className="navUnsorted">
          <div className="navUnsorted-label">Not yet migrated</div>
          <a
            href="https://claude.ai/code/artifact/c92f8bb2-9536-4b09-8104-2c8cd55ffb78"
            target="_blank"
            rel="noopener noreferrer"
          >
            Other tools (prototype) ↗
          </a>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <div>
            <span className="userBadge">
              {user.name} — {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <form action={logout}>
            <button type="submit" className="btn light">
              Sign out
            </button>
          </form>
        </div>
        {children}
      </main>
    </div>
  );
}
