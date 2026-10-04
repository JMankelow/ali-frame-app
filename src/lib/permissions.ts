// Matches the sidebar's top-level nav groups (src/components/navTree.ts)
// exactly, excluding Notes which stays open to every signed-in user
// regardless of their section access.
export const SECTIONS = [
  "Sales",
  "Jobs",
  "Operations",
  "Human Resources",
  "Accounts",
  "Marketing",
  "Communications",
  "Installers",
  "Settings",
] as const;
export type Section = (typeof SECTIONS)[number];

interface PermissionUser {
  isSuperUser: boolean;
  permissions: string[];
  role?: string;
}

/** Only super users may see these sections / pages — never grantable through the permissions matrix. */
export const SUPER_ONLY_SECTIONS: readonly string[] = ["Accounts"];
export const SUPER_ONLY_PATH_PREFIXES: readonly string[] = ["/payroll"];

/**
 * Field roles get a fixed, least-privilege profile: the Installers section only, and only the pages
 * below (timesheets, calendar, jobs, their assets/vehicles, Health & Safety, policies). An admin can
 * narrow it further through the permissions matrix but never widen it.
 */
export const INSTALLER_ROLES: readonly string[] = ["SENIOR_INSTALLER", "INTERMEDIATE_INSTALLER", "JUNIOR_INSTALLER", "CREW_MOBILE", "CONTRACTOR"];
export const INSTALLER_SECTIONS: readonly string[] = ["Installers"];
export const INSTALLER_PATH_PREFIXES: readonly string[] = [
  "/dashboard",
  "/calendar",
  "/jobs",
  "/crew",
  "/timesheets",
  "/assets",
  "/vehicles",
  "/health-safety",
  "/policies",
];

export function isInstallerProfile(user: { isSuperUser: boolean; role?: string }): boolean {
  return !user.isSuperUser && !!user.role && INSTALLER_ROLES.includes(user.role);
}

function pathMatches(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function isSuperOnlyPath(pathname: string): boolean {
  return pathMatches(pathname, SUPER_ONLY_PATH_PREFIXES);
}

export function isInstallerAllowedPath(pathname: string): boolean {
  return pathname !== "" && pathMatches(pathname, INSTALLER_PATH_PREFIXES);
}

/** Empty permissions list means unrestricted — the default for every account until an admin narrows it. */
export function hasSectionAccess(user: PermissionUser, section: Section): boolean {
  if (user.isSuperUser) return true;
  if (SUPER_ONLY_SECTIONS.includes(section)) return false;
  if (isInstallerProfile(user) && !INSTALLER_SECTIONS.includes(section)) return false;
  if (user.permissions.length === 0) return true;
  return user.permissions.includes(section);
}
