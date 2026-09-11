"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { getRequestIp } from "@/lib/session";
import { isLoginLocked, recordLoginAttempt } from "@/lib/rateLimit";
import { createPendingLogin } from "@/lib/pendingLogin";
import { issueTwoFactorCode } from "@/lib/twoFactor";
import { logAudit } from "@/lib/audit";

export interface LoginState {
  error?: string;
}

// Verified against a fixed dummy hash when the email doesn't match a real
// account, so a login attempt takes roughly the same time either way and an
// attacker can't use response timing to enumerate valid email addresses.
let dummyHashPromise: Promise<string> | null = null;
function getDummyHash(): Promise<string> {
  if (!dummyHashPromise) dummyHashPromise = hashPassword("not-a-real-account-000000");
  return dummyHashPromise;
}

const GENERIC_ERROR = "Incorrect email or password.";

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const ip = (await getRequestIp()) ?? "unknown";

  if (!email || !password) return { error: GENERIC_ERROR };

  const { locked, retryAfterMinutes } = await isLoginLocked(email, ip);
  if (locked) {
    return { error: `Too many failed attempts. Try again in ${retryAfterMinutes} minutes.` };
  }

  const user = await prisma.user.findUnique({ where: { email } });

  let passwordOk = false;
  if (user) {
    passwordOk = await verifyPassword(password, user.passwordHash);
  } else {
    // No such user — still run a verify against a dummy hash so this branch
    // takes about as long as the real one, then always treat it as a failure.
    await verifyPassword(password, await getDummyHash());
  }

  if (!user || !user.isActive || !passwordOk) {
    await recordLoginAttempt(email, ip, false);
    await logAudit({ action: "login_failed", entityType: "User", metadata: { email } });
    return { error: GENERIC_ERROR };
  }

  await recordLoginAttempt(email, ip, true);
  await createPendingLogin(user.id);
  await issueTwoFactorCode(user.id, user.email);
  await logAudit({ userId: user.id, action: "login_password_verified", entityType: "User", entityId: user.id });

  redirect("/login/verify");
}
