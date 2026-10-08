// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export async function markAlertRead(id: string) {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { id, userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function markAllAlertsRead() {
  const user = await requireUser();
  await prisma.notification.updateMany({ where: { userId: user.id, readAt: null }, data: { readAt: new Date() } });
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
