"use server";

import { revalidatePath } from "next/cache";
import { requireSuperUser } from "@/lib/session";
import { postMonthlyWipSnapshot } from "@/lib/wip";
import { logAudit } from "@/lib/audit";

export interface PostWipState {
  error?: string;
  success?: boolean;
}

export async function postWipNow(_prevState: PostWipState): Promise<PostWipState> {
  const user = await requireSuperUser();
  try {
    const result = await postMonthlyWipSnapshot();
    await logAudit({ userId: user.id, action: "wip_snapshot_posted", entityType: "WipSnapshot", entityId: result.snapshotId });
    revalidatePath("/reports/monthly");
    return { success: true };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not post the WIP journal to Xero." };
  }
}
