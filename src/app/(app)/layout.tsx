import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { logout } from "./actions";
import { AppShell } from "@/components/AppShell";

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
    <AppShell
      isSuperUser={user.isSuperUser}
      userBadge={
        <span className="userBadge">
          {user.name} — {ROLE_LABELS[user.role] ?? user.role}
        </span>
      }
      signOutForm={
        <form action={logout}>
          <button type="submit" className="btn light">
            Sign out
          </button>
        </form>
      }
    >
      {children}
    </AppShell>
  );
}
