import "server-only";
import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_WINDOW_MINUTES = 15;

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Checks whether login attempts for this email OR this IP should be blocked
 * right now, based on failed attempts within the trailing lockout window.
 * Keying on both dimensions means a distributed attack against one account
 * from many IPs still gets locked out, and a single IP spraying many
 * accounts still gets locked out too.
 */
export async function isLoginLocked(
  email: string,
  ip: string,
): Promise<{ locked: boolean; retryAfterMinutes: number }> {
  const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
  const normalizedEmail = normalizeEmail(email);

  const [emailFailures, ipFailures] = await Promise.all([
    prisma.loginAttempt.count({
      where: { emailAttempted: normalizedEmail, success: false, createdAt: { gte: since } },
    }),
    prisma.loginAttempt.count({
      where: { ip, success: false, createdAt: { gte: since } },
    }),
  ]);

  const locked = emailFailures >= MAX_FAILED_ATTEMPTS || ipFailures >= MAX_FAILED_ATTEMPTS;
  return { locked, retryAfterMinutes: LOCKOUT_WINDOW_MINUTES };
}

export async function recordLoginAttempt(email: string, ip: string, success: boolean) {
  await prisma.loginAttempt.create({
    data: { emailAttempted: normalizeEmail(email), ip, success },
  });

  // Successful login clears the slate for this email so a genuine user
  // isn't punished by earlier mistyped-password attempts.
  if (success) {
    const since = new Date(Date.now() - LOCKOUT_WINDOW_MINUTES * 60 * 1000);
    await prisma.loginAttempt.deleteMany({
      where: { emailAttempted: normalizeEmail(email), success: false, createdAt: { gte: since } },
    });
  }
}
