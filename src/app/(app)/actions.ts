"use server";

import { redirect } from "next/navigation";
import { destroySession, getSessionUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function logout() {
  const user = await getSessionUser();
  await destroySession();
  if (user) {
    await logAudit({ userId: user.id, action: "logout", entityType: "User", entityId: user.id });
  }
  redirect("/login");
}
