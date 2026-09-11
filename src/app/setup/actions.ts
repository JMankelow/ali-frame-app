"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { createPendingLogin } from "@/lib/pendingLogin";
import { issueTwoFactorCode } from "@/lib/twoFactor";
import { logAudit } from "@/lib/audit";

export interface SetupState {
  error?: string;
}

export async function setupAdmin(_prevState: SetupState, formData: FormData): Promise<SetupState> {
  const token = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  // Never distinguish "wrong token" from "already set up" in the error shown
  // to the caller beyond what's necessary — this route must not be a way to
  // probe whether the app has been bootstrapped yet.
  if (!process.env.SETUP_TOKEN || token !== process.env.SETUP_TOKEN) {
    return { error: "This setup link is invalid." };
  }

  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    return { error: "Setup has already been completed for this app." };
  }

  if (!name) return { error: "Enter your name." };
  if (!email || !email.includes("@")) return { error: "Enter a valid email address." };

  const strengthError = validatePasswordStrength(password);
  if (strengthError) return { error: strengthError };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "ADMIN_MANAGEMENT",
      isSuperUser: true,
      isActive: true,
      mustResetPassword: false, // they just chose their own real password
    },
  });

  await logAudit({ userId: user.id, action: "setup_admin_created", entityType: "User", entityId: user.id });

  // Same as every other account from here on: password step done, now 2FA.
  await createPendingLogin(user.id);
  await issueTwoFactorCode(user.id, user.email);
  redirect("/login/verify");
}
