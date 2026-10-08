"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPendingLoginUserId, clearPendingLogin } from "@/lib/pendingLogin";
import { issueTwoFactorCode, verifyTwoFactorCode } from "@/lib/twoFactor";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getRequestIp } from "@/lib/session";
import { isLoginLocked, recordLoginAttempt } from "@/lib/rateLimit";
import { openSecret } from "@/lib/secretBox";
import { verifyTotp } from "@/lib/totp";
import { consumeRecoveryCode } from "@/lib/recoveryCodes";
import { trustThisDevice } from "@/lib/trustedDevice";

export interface VerifyState {
  error?: string;
}

const REASON_MESSAGES: Record<string, string> = {
  no_active_code: "That code has expired. Request a new one below.",
  expired: "That code has expired. Request a new one below.",
  too_many_attempts: "Too many incorrect attempts. Request a new code below.",
  incorrect: "Incorrect code. Please try again.",
};

export async function verifyCode(_prevState: VerifyState, formData: FormData): Promise<VerifyState> {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  const code = String(formData.get("code") ?? "").trim();
  const remember = formData.get("remember") === "on";
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) redirect("/login");

  if (user.totpEnabledAt && user.totpSecretEnc) {
    // Authenticator-app code (or a one-time recovery code). Wrong guesses count toward the same lockout as wrong passwords.
    const ip = (await getRequestIp()) ?? "unknown";
    const { locked, retryAfterMinutes } = await isLoginLocked(user.email, ip);
    if (locked) return { error: `Too many attempts. Try again in ${retryAfterMinutes} minutes.` };

    let ok = false;
    let how = "app";
    const totp = verifyTotp(openSecret(user.totpSecretEnc), code, user.totpLastStep);
    if (totp.ok && totp.step != null) {
      ok = true;
      await prisma.user.update({ where: { id: user.id }, data: { totpLastStep: totp.step } });
    } else if (await consumeRecoveryCode(user.id, code)) {
      ok = true;
      how = "recovery_code";
    }
    if (!ok) {
      await recordLoginAttempt(user.email, ip, false);
      await logAudit({ userId, action: "login_2fa_failed", entityType: "User", entityId: userId, metadata: { reason: "incorrect_app_code" } });
      return { error: "That code isn't right. Check the code in your authenticator app (it changes every 30 seconds)." };
    }
    await logAudit({ userId: user.id, action: "login_2fa_success", entityType: "User", entityId: user.id, metadata: { method: how } });
  } else {
    const result = await verifyTwoFactorCode(userId, code);
    if (!result.ok) {
      await logAudit({ userId, action: "login_2fa_failed", entityType: "User", entityId: userId, metadata: { reason: result.reason } });
      return { error: REASON_MESSAGES[result.reason] ?? "Incorrect code. Please try again." };
    }
    await logAudit({ userId: user.id, action: "login_2fa_success", entityType: "User", entityId: user.id });
  }

  if (remember) await trustThisDevice(user.id);

  if (user.mustResetPassword) {
    // Keep the pending-login cookie alive — /reset-password needs it to know
    // who's resetting, and only creates the real session once that's done.
    redirect("/reset-password");
  }

  await clearPendingLogin();
  await createSession(user.id);
  await logAudit({ userId: user.id, action: "login_success", entityType: "User", entityId: user.id });
  redirect("/dashboard");
}

export async function resendCode(): Promise<void> {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) redirect("/login");
  if (user.totpEnabledAt) return; // authenticator users don't get emailed codes

  await issueTwoFactorCode(user.id, user.email);
  await logAudit({ userId: user.id, action: "login_2fa_resent", entityType: "User", entityId: user.id });
}
