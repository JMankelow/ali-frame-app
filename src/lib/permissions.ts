// Matches the sidebar's top-level nav groups (src/components/navTree.ts),
// excluding Notes which stays open to every signed-in user regardless of
// their section access.
export const SECTIONS = ["Sales", "Jobs", "Operations", "Human Resources", "Accounts", "Installers", "Settings"] as const;
export type Section = (typeof SECTIONS)[number];

interface PermissionUser {
  isSuperUser: boolean;
  permissions: string[];
}

/** Empty permissions list means unrestricted — the default for every account until an admin narrows it. */
export function hasSectionAccess(user: PermissionUser, section: Section): boolean {
  if (user.isSuperUser) return true;
  if (user.permissions.length === 0) return true;
  return user.permissions.includes(section);
}
