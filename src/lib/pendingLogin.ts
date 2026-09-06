import "server-only";
import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";

export const PENDING_LOGIN_COOKIE = "af_pending_login";
const PENDING_LOGIN_TTL_MINUTES = 10;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Marks that this browser just passed the password check for a user, ahead
 * of 2FA. Deliberately does NOT create a Session — createSession() only
 * happens after verifyTwoFactorCode() succeeds in the verify action.
 */
export async function createPendingLogin(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + PENDING_LOGIN_TTL_MINUTES * 60 * 1000);

  // Clear out any earlier pending logins for this user first.
  await prisma.pendingLogin.deleteMany({ where: { userId } });
  await prisma.pendingLogin.create({ data: { userId, tokenHash, expiresAt } });

  const cookieStore = await cookies();
  cookieStore.set(PENDING_LOGIN_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: PENDING_LOGIN_TTL_MINUTES * 60,
  });
}

/** Returns the userId awaiting 2FA for this browser, or null if none/expired. */
export async function getPendingLoginUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PENDING_LOGIN_COOKIE)?.value;
  if (!rawToken) return null;

  const pending = await prisma.pendingLogin.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  if (!pending || pending.expiresAt < new Date()) return null;
  return pending.userId;
}

export async function clearPendingLogin() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(PENDING_LOGIN_COOKIE)?.value;
  if (rawToken) {
    await prisma.pendingLogin.deleteMany({ where: { tokenHash: hashToken(rawToken) } }).catch(() => {});
  }
  cookieStore.delete(PENDING_LOGIN_COOKIE);
}
