import { redirect } from "next/navigation";
import { getPendingLoginUserId } from "@/lib/pendingLogin";
import { VerifyForm } from "./VerifyForm";

export default async function VerifyPage() {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  return <VerifyForm />;
}
