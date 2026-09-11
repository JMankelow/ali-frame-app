"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { getPendingLoginUserId, clearPendingLogin } from "@/lib/pendingLogin";
import { createSession } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface ResetPasswordState {
  error?: string;
}

export async function resetPassword(
  _prevState: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.isActive) redirect("/login");

  // Only reachable for an account still flagged for a forced reset — if
  // that's somehow no longer true, just finish signing them in normally
  // rather than erroring, since password+2FA have already both succeeded.
  if (!user.mustResetPassword) {
    await clearPendingLogin();
    await createSession(user.id);
    redirect("/dashboard");
  }

  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const strengthError = validatePasswordStrength(password);
  if (strengthError) return { error: strengthError };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const passwordHash = await hashPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash, mustResetPassword: false },
  });

  await logAudit({ userId: user.id, action: "password_reset_completed", entityType: "User", entityId: user.id });

  await clearPendingLogin();
  await createSession(user.id);
  redirect("/dashboard");
}
