// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { findValidInvite } from "@/lib/invite";
import { AuthCard } from "@/components/AuthCard";
import { AcceptInviteForm } from "./AcceptInviteForm";

export default async function AcceptInvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const invite = token ? await findValidInvite(token) : null;

  if (!invite || !token) {
    return (
      <AuthCard title="Link not valid" subtitle="This invite link is invalid, already used, or has expired. Ask Jo or Tanya to send you a new one.">
        <a href="/login" className="btn light">
          Go to sign in
        </a>
      </AuthCard>
    );
  }

  return <AcceptInviteForm token={token} name={invite.user.name} />;
}
