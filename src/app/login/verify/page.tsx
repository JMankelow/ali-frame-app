import { redirect } from "next/navigation";
import { getPendingLoginUserId } from "@/lib/pendingLogin";
import { prisma } from "@/lib/prisma";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage() {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  const u = await prisma.user.findUnique({ where: { id: userId }, select: { totpEnabledAt: true } });
  return <VerifyForm mode={u?.totpEnabledAt ? "app" : "email"} />;
}
