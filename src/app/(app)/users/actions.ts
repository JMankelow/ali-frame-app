"use server";

import { randomBytes } from "crypto";
import { INSTALLER_ROLES, INSTALLER_SECTIONS, SECTIONS, clampSectionsForRole } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser } from "@/lib/session";
import { hashPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";
import { ROLE_OPTIONS as VALID_ROLES } from "@/lib/roles";
import { createInviteToken, appUrl } from "@/lib/invite";
import { sendInviteEmail } from "@/lib/email";

export interface UserFormState {
  error?: string;
  createdTempPassword?: string;
  createdEmail?: string;
  createdUserId?: string;
}

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
    data: { name, email, passwordHash, role, mustResetPassword: true, isActive: true, ...(INSTALLER_ROLES.includes(role) ? { permissions: [...INSTALLER_SECTIONS] } : {}) },
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
export async function setUserPermissions(userId: string, sectionsIn: string[]) {
  const actor = await requireSuperUser();
  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!target) return;
  const sections = clampSectionsForRole(target.role, (Array.isArray(sectionsIn) ? sectionsIn : []).map(String).filter((s) => (SECTIONS as readonly string[]).includes(s)));
  await prisma.user.update({ where: { id: userId }, data: { permissions: sections } });
  await logAudit({ userId: actor.id, action: "user_permissions_updated", entityType: "User", entityId: userId, metadata: { sections } });
  revalidatePath("/users");
}

export async function setUserSuperUser(userId: string, isSuperUser: boolean) {
  const actor = await requireSuperUser();
  const who = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (isSuperUser && who && INSTALLER_ROLES.includes(who.role)) return; // field staff are never super users
  await prisma.user.update({ where: { id: userId }, data: { isSuperUser } });
  await logAudit({ userId: actor.id, action: "user_superuser_updated", entityType: "User", entityId: userId, metadata: { isSuperUser } });
  revalidatePath("/users");
}

export async function updateUserRole(userId: string, roleInput: string) {
  const actor = await requireSuperUser();
  if (!VALID_ROLES.includes(roleInput as Role)) return;
  // Field roles are limited to Installers + Communications from the moment the role is set.
  await prisma.user.update({ where: { id: userId }, data: { role: roleInput as Role, ...(INSTALLER_ROLES.includes(roleInput) ? { permissions: [...INSTALLER_SECTIONS], isSuperUser: false } : {}) } });
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

/** Emails one person a one-time link to set their own password. No password is ever sent or shown. */
export async function sendInvite(userId: string): Promise<{ error?: string; sent?: boolean }> {
  const actor = await requireSuperUser();
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) return { error: "That account isn't active." };
  if (user.email.endsWith(".local")) return { error: "That account has no real email address." };

  // Invites go to the work address unless this person's details say to use their personal email.
  const detail = await prisma.employeeDetail.findUnique({ where: { userId: user.id }, select: { personalEmail: true, inviteTo: true } });
  const sendTo = detail?.inviteTo === "personal" && detail.personalEmail ? detail.personalEmail : user.email;

  const token = await createInviteToken(user.id);
  try {
    await sendInviteEmail({ to: sendTo, name: user.name, link: `${appUrl()}/accept-invite?token=${token}`, invitedBy: actor.name });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not send the invite email." };
  }

  await logAudit({ userId: actor.id, action: "user_invite_sent", entityType: "User", entityId: user.id, metadata: { email: sendTo } });
  revalidatePath("/users");
  return { sent: true };
}

/** Invites everyone who hasn't set their own password yet. */
export async function sendAllPendingInvites(): Promise<{ sent: number; failed: string[] }> {
  await requireSuperUser();
  const pending = await prisma.user.findMany({
    where: { isActive: true, mustResetPassword: true, NOT: { email: { endsWith: ".local" } } },
    select: { id: true, name: true },
  });
  let sent = 0;
  const failed: string[] = [];
  for (const u of pending) {
    const result = await sendInvite(u.id);
    if (result.sent) sent += 1;
    else failed.push(`${u.name}: ${result.error}`);
  }
  return { sent, failed };
}
