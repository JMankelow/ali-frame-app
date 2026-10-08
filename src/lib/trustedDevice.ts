// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { cookies, headers } from "next/headers";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export const TRUSTED_COOKIE = "af_trusted";
export const TRUST_DAYS = 30;
const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** "Remember this device": after a successful code, this browser skips the code step for 30 days (the password is still always required). */
export async function trustThisDevice(userId: string) {
  const raw = randomBytes(32).toString("hex");
  const ua = ((await headers()).get("user-agent") ?? "").slice(0, 200);
  await prisma.trustedDevice.create({ data: { userId, tokenHash: hashToken(raw), label: describeDevice(ua), expiresAt: new Date(Date.now() + TRUST_DAYS * 864e5) } });
  (await cookies()).set(TRUSTED_COOKIE, raw, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: TRUST_DAYS * 86400 });
}

/** True if this browser holds a valid trusted-device token for exactly this user. */
export async function isTrustedDevice(userId: string): Promise<boolean> {
  const raw = (await cookies()).get(TRUSTED_COOKIE)?.value;
  if (!raw) return false;
  const rec = await prisma.trustedDevice.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!rec || rec.userId !== userId || rec.expiresAt < new Date()) return false;
  await prisma.trustedDevice.update({ where: { id: rec.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return true;
}

export async function currentTrustedDeviceId(userId: string): Promise<string | null> {
  const raw = (await cookies()).get(TRUSTED_COOKIE)?.value;
  if (!raw) return null;
  const rec = await prisma.trustedDevice.findUnique({ where: { tokenHash: hashToken(raw) } });
  return rec && rec.userId === userId ? rec.id : null;
}

/** Forget every remembered device for a person (done whenever their password changes). */
export async function revokeAllTrustedDevices(userId: string) {
  await prisma.trustedDevice.deleteMany({ where: { userId } });
}

function describeDevice(ua: string): string {
  const os = /iPhone|iPad/.test(ua) ? "iPhone/iPad" : /Android/.test(ua) ? "Android" : /Windows/.test(ua) ? "Windows" : /Mac OS/.test(ua) ? "Mac" : "Device";
  const br = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : /Firefox\//.test(ua) ? "Firefox" : "browser";
  return `${os} · ${br}`;
}
