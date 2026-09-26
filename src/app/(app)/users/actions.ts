"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

export interface UserFormState {
  error?: string;
  createdTempPassword?: string;
  createdEmail?: string;
  createdUserId?: string;
}

const VALID_ROLES: Role[] = [
  "ADMIN_MANAGEMENT",
  "OFFICE_SCHEDULING",
  "SALES",
  "SENIOR_INSTALLER",
  "CREW_MOBILE",
  "READ_ONLY",
];

function generateTempPassword(): string {
  // Readable-ish random password, well above the 12-char minimum.
  return randomBytes(12).toString("base64url");
}

export async function createUser(_prevState: UserFormState, formData: FormData): Promise<UserFormState> {
  const actor = await requireSuperUser();

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const roleInput = String(formData.get("role") ?? "READ_ONLY");
  const role = VALID_ROLES.includes(roleInput as Role) ? (roleInput as Role) : "READ_ONLY";

  if (!name) return { error: "Name is required." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with that email already exists." };

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  const user = await prisma.user.create({
    data: { name, email, passwordHash, role, mustResetPassword: true, isActive: true },
  });

  await logAudit({
    userId: actor.id,
    action: "user_created",
    entityType: "User",
    entityId: user.id,
    metadata: { createdEmail: email, role },
  });

  revalidatePath("/users");
  return { createdTempPassword: tempPassword, createdEmail: email, createdUserId: user.id };
}

/** Replaces a user's whole section-access list in one call — the matrix's
 * checkboxes always send the complete new set, not one-at-a-time deltas. */
export async function setUserPermissions(userId: string, sections: string[]) {
  const actor = await requireSuperUser();
  await prisma.user.update({ where: { id: userId }, data: { permissions: sections } });
  await logAudit({ userId: actor.id, action: "user_permissions_updated", entityType: "User", entityId: userId, metadata: { sections } });
  revalidatePath("/users");
}

export async function setUserSuperUser(userId: string, isSuperUser: boolean) {
  const actor = await requireSuperUser();
  await prisma.user.update({ where: { id: userId }, data: { isSuperUser } });
  await logAudit({ userId: actor.id, action: "user_superuser_updated", entityType: "User", entityId: userId, metadata: { isSuperUser } });
  revalidatePath("/users");
}

export async function updateUserRole(userId: string, roleInput: string) {
  const actor = await requireSuperUser();
  if (!VALID_ROLES.includes(roleInput as Role)) return;
  await prisma.user.update({ where: { id: userId }, data: { role: roleInput as Role } });
  await logAudit({ userId: actor.id, action: "user_role_updated", entityType: "User", entityId: userId, metadata: { role: roleInput } });
  revalidatePath("/users");
}

export async function deactivateUser(userId: string) {
  const actor = await requireSuperUser();
  await prisma.user.update({ where: { id: userId }, data: { isActive: false } });
  await logAudit({ userId: actor.id, action: "user_deactivated", entityType: "User", entityId: userId });
  revalidatePath("/users");
}

export async function reactivateUser(userId: string) {
  const actor = await requireSuperUser();
  await prisma.user.update({ where: { id: userId }, data: { isActive: true } });
  await logAudit({ userId: actor.id, action: "user_reactivated", entityType: "User", entityId: userId });
  revalidatePath("/users");
}
