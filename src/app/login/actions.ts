"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { verifyPassword, hashPassword } from "@/lib/password";
import { getRequestIp } from "@/lib/session";
import { isLoginLocked, recordLoginAttempt } from "@/lib/rateLimit";
import { createPendingLogin, clearPendingLogin } from "@/lib/pendingLogin";
import { issueTwoFactorCode } from "@/lib/twoFactor";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

// Temporary escape hatch, set via a Render env var only — leaves password
// hashing, rate limiting and the forced first-login password reset fully
// intact, and skips only the emailed 2FA code step. Defaults to 2FA required;
// must be explicitly turned on, and should be turned back off once whatever
// today's rush is settles down.
const TWO_FACTOR_DISABLED = process.env.DISABLE_2FA === "true";

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
  await logAudit({ userId: user.id, action: "login_password_verified", entityType: "User", entityId: user.id });

  if (TWO_FACTOR_DISABLED) {
    await logAudit({ userId: user.id, action: "login_2fa_skipped_disabled", entityType: "User", entityId: user.id });
    if (user.mustResetPassword) {
      redirect("/reset-password");
    }
    await clearPendingLogin();
    await createSession(user.id);
    await logAudit({ userId: user.id, action: "login_success", entityType: "User", entityId: user.id });
    redirect("/dashboard");
  }

  await issueTwoFactorCode(user.id, user.email);
  redirect("/login/verify");
}
