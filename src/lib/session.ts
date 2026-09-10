import "server-only";
import { cookies, headers } from "next/headers";
import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import type { Role, User } from "@prisma/client";

export const SESSION_COOKIE = "af_session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 14; // 14 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function getRequestIp(): Promise<string | null> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return h.get("x-real-ip");
}

export async function getRequestUserAgent(): Promise<string | null> {
  const h = await headers();
  return h.get("user-agent");
}

/**
 * Creates a new DB-backed session for a user and sets the session cookie.
 * The cookie only ever holds an opaque random token — the raw token is
 * never stored server-side, only its SHA-256 hash, so a leaked DB row
 * (e.g. via a backup) cannot be replayed as a cookie value.
 */
export async function createSession(userId: string) {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);
  const ip = await getRequestIp();
  const userAgent = await getRequestUserAgent();

  await prisma.session.create({
    data: { userId, tokenHash, expiresAt, ip, userAgent },
  });

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, rawToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export type SessionUser = Pick<
  User,
  "id" | "name" | "email" | "role" | "isSuperUser" | "isActive" | "mustResetPassword"
>;

/**
 * Validates the session cookie against the database and returns the
 * signed-in user, or null. This is the real enforcement point — every
 * Server Action and route handler that needs an authenticated user calls
 * this (directly or via requireUser/requireRole), not just the Edge
 * middleware, which only does a cheap "cookie present" pre-check.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (!rawToken) return null;

  const tokenHash = hashToken(rawToken);
  const session = await prisma.session.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!session || session.expiresAt < new Date() || !session.user.isActive) {
    return null;
  }

  // Best-effort activity timestamp; failures here must never block the request.
  prisma.session
    .update({ where: { id: session.id }, data: { lastSeenAt: new Date() } })
    .catch(() => {});

  const { id, name, email, role, isSuperUser, isActive, mustResetPassword } = session.user;
  return { id, name, email, role, isSuperUser, isActive, mustResetPassword };
}

export async function destroySession() {
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (rawToken) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(rawToken) } }).catch(() => {});
  }
  cookieStore.delete(SESSION_COOKIE);
}

export class AuthError extends Error {}

/** Throws if there is no valid session. Use at the top of every protected Server Action/route. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AuthError("Not signed in.");
  return user;
}

/** Throws if there is no valid session, or the session's role isn't in the allowed list. */
export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role) && !user.isSuperUser) {
    throw new AuthError("You do not have permission to do that.");
  }
  return user;
}

/** Throws unless the session belongs to a super user (mirrors the prototype's Accounts gate). */
export async function requireSuperUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isSuperUser) throw new AuthError("Accounts is restricted to the Master User.");
  return user;
}
