import "server-only";
import { randomInt, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { sendTwoFactorCodeEmail } from "@/lib/email";

const CODE_LENGTH = 6;
const CODE_TTL_MINUTES = 10;
const MAX_VERIFY_ATTEMPTS = 5;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function generateCode(): string {
  // 6-digit numeric code, zero-padded, using a CSPRNG (not Math.random()).
  return randomInt(0, 1_000_000).toString().padStart(CODE_LENGTH, "0");
}

/** Creates a fresh 2FA code for the user and emails it. Codes are stored hashed, never in plaintext. */
export async function issueTwoFactorCode(userId: string, email: string) {
  const code = generateCode();
  const codeHash = hashCode(code);
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  // Invalidate any earlier unconsumed codes for this user so only the latest is valid.
  await prisma.twoFactorCode.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: new Date() },
  });

  await prisma.twoFactorCode.create({ data: { userId, codeHash, expiresAt } });
  await sendTwoFactorCodeEmail(email, code);
}

export type TwoFactorVerifyResult =
  | { ok: true }
  | { ok: false; reason: "no_active_code" | "expired" | "too_many_attempts" | "incorrect" };

/** Verifies a submitted 2FA code, enforcing expiry and a per-code attempt limit. */
export async function verifyTwoFactorCode(userId: string, submitted: string): Promise<TwoFactorVerifyResult> {
  const record = await prisma.twoFactorCode.findFirst({
    where: { userId, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "no_active_code" };
  if (record.attempts >= MAX_VERIFY_ATTEMPTS) return { ok: false, reason: "too_many_attempts" };
  if (record.expiresAt < new Date()) return { ok: false, reason: "expired" };

  const matches = hashCode(submitted) === record.codeHash;

  if (!matches) {
    await prisma.twoFactorCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "incorrect" };
  }

  await prisma.twoFactorCode.update({
    where: { id: record.id },
    data: { consumedAt: new Date() },
  });
  return { ok: true };
}
