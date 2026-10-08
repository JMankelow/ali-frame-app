// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { GroupsManager } from "./GroupsManager";

export default async function CommunicationGroupsPage() {
  const me = await requireUser();
  if (isInstallerProfile(me)) redirect("/communications"); // the staff roster / group lists are office-only

  const [groups, people] = await Promise.all([
    prisma.communicationGroup.findMany({ include: { members: { where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } } }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true, email: { not: { endsWith: ".local" } } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Groups</h2>
          <div className="subtitle">Add a group, then pick who&apos;s in it.</div>
        </div>
      </div>
      <GroupsManager groups={groups} people={people} />
    </div>
  );
}
