"use server";

import { revalidatePath } from "next/cache";
import { requireSuperUser } from "@/lib/session";
import { disconnectXero } from "@/lib/xero";
import { logAudit } from "@/lib/audit";

export async function disconnectXeroAction() {
  const user = await requireSuperUser();
  await disconnectXero();
  await logAudit({ userId: user.id, action: "xero_disconnected", entityType: "XeroConnection" });
  revalidatePath("/sync/xero");
}
