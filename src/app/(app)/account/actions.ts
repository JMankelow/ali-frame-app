// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { verifyPassword } from "@/lib/password";
import { logAudit } from "@/lib/audit";
import { sealSecret, openSecret } from "@/lib/secretBox";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "@/lib/totp";
import { issueRecoveryCodes } from "@/lib/recoveryCodes";
import { revokeAllTrustedDevices } from "@/lib/trustedDevice";

export interface SetupStart {
  error?: string;
  secret?: string;
  qr?: string;
}
export interface SetupDone {
  error?: string;
  recoveryCodes?: string[];
}

/** Step 1: make a fresh key and show it as a QR code. Nothing is switched on until a code from the app is entered. */
export async function beginTotpSetup(): Promise<SetupStart> {
  const user = await requireUser();
  const secret = generateTotpSecret();
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: sealSecret(secret), totpEnabledAt: null, totpLastStep: null } });
  const qr = await QRCode.toDataURL(otpauthUrl(secret, user.email), { margin: 1, width: 220 });
  return { secret, qr };
}

/** Step 2: the person types the 6-digit code their app now shows — proves it's set up properly, then it's switched on. */
export async function confirmTotpSetup(code: string): Promise<SetupDone> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { totpSecretEnc: true, totpEnabledAt: true } });
  if (!row?.totpSecretEnc) return { error: "Start the setup again." };
  const r = verifyTotp(openSecret(row.totpSecretEnc), code);
  if (!r.ok) return { error: "That code isn't right — check the code in your app and try again." };
  await prisma.user.update({ where: { id: user.id }, data: { totpEnabledAt: new Date(), totpLastStep: r.step ?? null } });
  const recoveryCodes = await issueRecoveryCodes(user.id);
  await logAudit({ userId: user.id, action: "totp_enabled", entityType: "User", entityId: user.id });
  revalidatePath("/account");
  return { recoveryCodes };
}

/** Turn the authenticator off (needs the password). Sign-in goes back to emailed codes. */
export async function disableTotp(password: string): Promise<{ error?: string }> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!row || !(await verifyPassword(String(password ?? ""), row.passwordHash))) return { error: "Password isn't right." };
  await prisma.user.update({ where: { id: user.id }, data: { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null } });
  await prisma.recoveryCode.deleteMany({ where: { userId: user.id } });
  await revokeAllTrustedDevices(user.id);
  await logAudit({ userId: user.id, action: "totp_disabled", entityType: "User", entityId: user.id });
  revalidatePath("/account");
  return {};
}

/** A new set of 8 recovery codes (the old ones stop working). Needs the password. */
export async function newRecoveryCodes(password: string): Promise<SetupDone> {
  const user = await requireUser();
  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true, totpEnabledAt: true } });
  if (!row?.totpEnabledAt) return { error: "Set up the authenticator app first." };
  if (!(await verifyPassword(String(password ?? ""), row.passwordHash))) return { error: "Password isn't right." };
  const recoveryCodes = await issueRecoveryCodes(user.id);
  await logAudit({ userId: user.id, action: "recovery_codes_regenerated", entityType: "User", entityId: user.id });
  return { recoveryCodes };
}

export async function forgetDevice(id: string) {
  const user = await requireUser();
  await prisma.trustedDevice.deleteMany({ where: { id, userId: user.id } });
  await logAudit({ userId: user.id, action: "trusted_device_removed", entityType: "User", entityId: user.id });
  revalidatePath("/account");
}

export async function forgetAllDevices() {
  const user = await requireUser();
  await revokeAllTrustedDevices(user.id);
  await logAudit({ userId: user.id, action: "trusted_devices_cleared", entityType: "User", entityId: user.id });
  revalidatePath("/account");
}
