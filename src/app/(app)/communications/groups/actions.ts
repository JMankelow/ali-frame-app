"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function toggleGroupMember(groupId: string, userId: string, formData: FormData) {
  const actor = await requireUser();
  const shouldBeMember = formData.get("member") === "on";

  await prisma.communicationGroup.update({
    where: { id: groupId },
    data: {
      members: shouldBeMember ? { connect: { id: userId } } : { disconnect: { id: userId } },
    },
  });

  await logAudit({
    userId: actor.id,
    action: shouldBeMember ? "comm_group_member_added" : "comm_group_member_removed",
    entityType: "CommunicationGroup",
    entityId: groupId,
    metadata: { userId },
  });
  revalidatePath("/communications/groups");
}
