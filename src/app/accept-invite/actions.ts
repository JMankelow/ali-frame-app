// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashPassword, validatePasswordStrength } from "@/lib/password";
import { findValidInvite } from "@/lib/invite";
import { logAudit } from "@/lib/audit";

export interface AcceptInviteState {
  error?: string;
}

export async function acceptInvite(_prev: AcceptInviteState, formData: FormData): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const invite = await findValidInvite(token);
  if (!invite) return { error: "This link is invalid or has expired. Ask for a new invite." };

  const strengthError = validatePasswordStrength(password);
  if (strengthError) return { error: strengthError };
  if (password !== confirmPassword) return { error: "Passwords do not match." };

  const passwordHash = await hashPassword(password);
  // Single transaction so a link can never set a password twice.
  const used = await prisma.inviteToken.updateMany({
    where: { id: invite.id, usedAt: null },
    data: { usedAt: new Date() },
  });
  if (used.count !== 1) return { error: "This link has already been used." };

  await prisma.user.update({ where: { id: invite.userId }, data: { passwordHash, mustResetPassword: false } });
  await logAudit({ userId: invite.userId, action: "invite_accepted", entityType: "User", entityId: invite.userId });

  redirect("/login");
}
