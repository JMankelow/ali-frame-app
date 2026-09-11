import { redirect } from "next/navigation";
import { getPendingLoginUserId } from "@/lib/pendingLogin";
import { ResetPasswordForm } from "./ResetPasswordForm";

export default async function ResetPasswordPage() {
  const userId = await getPendingLoginUserId();
  if (!userId) redirect("/login");

  return <ResetPasswordForm />;
}
