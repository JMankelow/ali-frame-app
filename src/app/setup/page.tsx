import { prisma } from "@/lib/prisma";
import { AuthCard } from "@/components/AuthCard";
import { SetupForm } from "./SetupForm";

export default async function SetupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const existingCount = await prisma.user.count();
  const tokenValid = Boolean(process.env.SETUP_TOKEN) && token === process.env.SETUP_TOKEN;

  if (existingCount > 0) {
    return (
      <AuthCard title="Setup already completed">
        <p>
          An admin account already exists for this app. Go to <a href="/login">sign in</a>{" "}
          instead.
        </p>
      </AuthCard>
    );
  }

  if (!tokenValid) {
    // Deliberately generic — this page must never confirm or deny anything
    // about setup state to a visitor without the correct token.
    return (
      <AuthCard title="Page not found">
        <p>This page isn&apos;t available.</p>
      </AuthCard>
    );
  }

  return <SetupForm token={token!} />;
}
