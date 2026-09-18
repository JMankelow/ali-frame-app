"use server";

import { revalidatePath } from "next/cache";
import { requireSuperUser } from "@/lib/session";
import { createBackup, pruneOldBackups, getBackupDownloadUrl } from "@/lib/backup";
import { logAudit } from "@/lib/audit";

export async function runBackupNow() {
  const user = await requireSuperUser();
  const key = await createBackup();
  await pruneOldBackups();
  await logAudit({ userId: user.id, action: "backup.created", entityType: "Backup", entityId: key });
  revalidatePath("/backup");
  return { key };
}

export async function getBackupUrl(key: string): Promise<{ url?: string; error?: string }> {
  const user = await requireSuperUser();
  try {
    const url = await getBackupDownloadUrl(key);
    await logAudit({ userId: user.id, action: "backup.downloaded", entityType: "Backup", entityId: key });
    return { url };
  } catch {
    return { error: "Could not get a download link." };
  }
}
