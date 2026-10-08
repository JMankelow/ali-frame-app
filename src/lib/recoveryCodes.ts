// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const hash = (c: string) => createHash("sha256").update(c.replace(/[\s-]/g, "").toLowerCase()).digest("hex");

/** Makes 8 one-time recovery codes (shown once, stored hashed), replacing any earlier set. */
export async function issueRecoveryCodes(userId: string): Promise<string[]> {
  const codes = Array.from({ length: 8 }, () => {
    const h = randomBytes(5).toString("hex");
    return `${h.slice(0, 5)}-${h.slice(5)}`;
  });
  await prisma.recoveryCode.deleteMany({ where: { userId } });
  await prisma.recoveryCode.createMany({ data: codes.map((c) => ({ userId, codeHash: hash(c) })) });
  return codes;
}

/** Uses up a recovery code if it's valid. */
export async function consumeRecoveryCode(userId: string, submitted: string): Promise<boolean> {
  const rec = await prisma.recoveryCode.findFirst({ where: { userId, codeHash: hash(submitted), usedAt: null } });
  if (!rec) return false;
  await prisma.recoveryCode.update({ where: { id: rec.id }, data: { usedAt: new Date() } });
  return true;
}
