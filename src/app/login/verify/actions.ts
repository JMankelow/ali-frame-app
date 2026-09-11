"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPendingLoginUserId, clearPendingLogin } from "@/lib/pendingLogin";
import { issueTwoFactorCode, verifyTwoFactorCode } from "@/lib/twoFactor";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

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
  const result = await verifyTwoFactorCode(userId, code);

  if (!result.ok) {
    await logAudit({ userId, action: "login_2fa_failed", entityType: "User", entityId: userId, metadata: { reason: result.reason } });
    return { error: REASON_MESSAGES[result.reason] ?? "Incorrect code. Please try again." };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) redirect("/login");

  await logAudit({ userId: user.id, action: "login_2fa_success", entityType: "User", entityId: user.id });

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

  await issueTwoFactorCode(user.id, user.email);
  await logAudit({ userId: user.id, action: "login_2fa_resent", entityType: "User", entityId: user.id });
}
