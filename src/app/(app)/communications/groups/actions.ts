// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export interface GroupFormState {
  error?: string;
  saved?: string;
}

/** Add a group (no id) or change one (id): its name and exactly who is in it. */
export async function saveGroup(_prev: GroupFormState, formData: FormData): Promise<GroupFormState> {
  const actor = await requireNotInstaller();
  const id = String(formData.get("id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim().slice(0, 60);
  const memberIds = [...new Set(formData.getAll("memberIds").map((v) => String(v)).filter(Boolean))];
  if (!name) return { error: "Give the group a name." };

  const clash = await prisma.communicationGroup.findFirst({ where: { name: { equals: name, mode: "insensitive" }, ...(id ? { NOT: { id } } : {}) }, select: { id: true } });
  if (clash) return { error: `There's already a group called "${name}".` };

  const valid = await prisma.user.findMany({ where: { id: { in: memberIds }, isActive: true }, select: { id: true } });
  const members = valid.map((u) => ({ id: u.id }));

  if (id) {
    await prisma.communicationGroup.update({ where: { id }, data: { name, members: { set: members } } });
  } else {
    await prisma.communicationGroup.create({ data: { name, members: { connect: members } } });
  }
  await logAudit({ userId: actor.id, action: id ? "comm_group_updated" : "comm_group_created", entityType: "CommunicationGroup", entityId: id || name, metadata: { name, members: members.length } });
  revalidatePath("/communications/groups");
  return { saved: id ? "Saved." : "Group added." };
}

export async function deleteGroup(id: string) {
  const actor = await requireNotInstaller();
  const g = await prisma.communicationGroup.findUnique({ where: { id }, select: { name: true } });
  if (!g) return;
  await prisma.communicationGroup.delete({ where: { id } });
  await logAudit({ userId: actor.id, action: "comm_group_deleted", entityType: "CommunicationGroup", entityId: id, metadata: { name: g.name } });
  revalidatePath("/communications/groups");
}
