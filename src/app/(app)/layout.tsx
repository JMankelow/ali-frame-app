import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSessionUser } from "@/lib/session";
import { logout } from "./actions";
import { AppShell } from "@/components/AppShell";
import { prisma } from "@/lib/prisma";
import { NAV_TREE, findAllSectionsForPath } from "@/components/navTree";
import { hasSectionAccess, SECTIONS, type Section } from "@/lib/permissions";

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

  // Real, server-side section enforcement — not just a hidden nav item.
  // /jobs/[number] pages intentionally aren't gated by this (a job can be
  // reached from more than one section, e.g. Sales and Operations both link
  // into it), matching how findSectionForPath already treats job detail
  // pages as outside the tree.
  const pathname = (await headers()).get("x-pathname") ?? "";
  const sections = findAllSectionsForPath(NAV_TREE, pathname).filter((s): s is Section => SECTIONS.includes(s as Section));
  if (sections.length > 0 && !sections.some((s) => hasSectionAccess(user, s))) {
    redirect("/dashboard");
  }

  const openTaskCount = await prisma.note.count({ where: { assignedToId: user.id, status: { not: "Done" } } });
  const visibleSections: string[] = SECTIONS.filter((s) => hasSectionAccess(user, s));

  return (
    <AppShell
      isSuperUser={user.isSuperUser}
      visibleSections={visibleSections}
      openTaskCount={openTaskCount}
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
