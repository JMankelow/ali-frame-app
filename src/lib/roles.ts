import type { Role } from "@prisma/client";

export const ROLE_OPTIONS: Role[] = [
  "ADMIN_MANAGEMENT",
  "OFFICE_SCHEDULING",
  "SALES",
  "SENIOR_INSTALLER",
  "INTERMEDIATE_INSTALLER",
  "JUNIOR_INSTALLER",
  "CREW_MOBILE",
  "CONTRACTOR",
  "READ_ONLY",
];

export const ROLE_LABELS: Record<string, string> = {
  ADMIN_MANAGEMENT: "Admin / Management",
  OFFICE_SCHEDULING: "Office / Scheduling",
  SALES: "Sales",
  SENIOR_INSTALLER: "Senior Installer",
  INTERMEDIATE_INSTALLER: "Intermediate Installer",
  JUNIOR_INSTALLER: "Junior Installer",
  CREW_MOBILE: "Crew Mobile",
  CONTRACTOR: "Contractor",
  READ_ONLY: "Read Only",
};
