"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function updateEmployeePhone(userId: string, formData: FormData) {
  const actor = await requireSuperUser();
  const phone = String(formData.get("phone") ?? "").trim();

  await prisma.user.update({ where: { id: userId }, data: { phone: phone || null } });
  await logAudit({ userId: actor.id, action: "employee_phone_updated", entityType: "User", entityId: userId });
  revalidatePath("/employees");
}
