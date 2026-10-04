// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const INVITE_TTL_HOURS = 72;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function appUrl(): string {
  return process.env.APP_URL || "https://ali-frame-app.onrender.com";
}

/** Creates a fresh one-time invite for a user and voids any earlier unused ones. Returns the raw token (only ever emailed, never stored). */
export async function createInviteToken(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.inviteToken.deleteMany({ where: { userId, usedAt: null } });
  await prisma.inviteToken.create({
    data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000) },
  });
  return token;
}

/** Returns the invite's user if the token is valid, unused and unexpired; otherwise null. */
export async function findValidInvite(token: string) {
  if (!token || token.length > 200) return null;
  const invite = await prisma.inviteToken.findUnique({ where: { tokenHash: hashToken(token) }, include: { user: true } });
  if (!invite || invite.usedAt || invite.expiresAt < new Date() || !invite.user.isActive) return null;
  return invite;
}
