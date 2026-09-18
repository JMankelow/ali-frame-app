import "server-only";
import { prisma } from "./prisma";
import { putObjectBuffer, listObjects, getDownloadUrl } from "./storage";

const BACKUP_PREFIX = "backups/";

/** Builds a business-data snapshot for disaster recovery / export.
 *
 * This deliberately excludes anything that is an authentication secret
 * (passwordHash, session tokens, 2FA code hashes, login-attempt history) —
 * Render's own Postgres backups (enabled on the paid plan tier) are the
 * authoritative full-database restore mechanism for those. This snapshot is
 * a secondary, human-readable export of the actual business records, so a
 * downloaded backup file is never itself a way to take over an account. */
async function buildSnapshot() {
  const [
    users,
    clients,
    leads,
    jobs,
    fileAssets,
    notes,
    timesheetEntries,
    purchaseOrders,
    remedialItems,
    acceptances,
    vehicles,
    vehicleIssues,
    vehicleChecklists,
    assets,
    assetIssues,
    installerAssessments,
  ] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isSuperUser: true, isActive: true, createdAt: true } }),
    prisma.client.findMany(),
    prisma.lead.findMany(),
    prisma.job.findMany(),
    prisma.fileAsset.findMany(),
    prisma.note.findMany(),
    prisma.timesheetEntry.findMany(),
    prisma.purchaseOrder.findMany(),
    prisma.remedialItem.findMany(),
    prisma.acceptance.findMany(),
    prisma.vehicle.findMany(),
    prisma.vehicleIssue.findMany(),
    prisma.vehicleChecklist.findMany(),
    prisma.asset.findMany(),
    prisma.assetIssue.findMany(),
    prisma.installerAssessment.findMany(),
  ]);

  return {
    generatedAt: new Date().toISOString(),
    note: "Business data export. Does not include password hashes, sessions, or 2FA codes — see Render's own Postgres backups for a full database restore.",
    users,
    clients,
    leads,
    jobs,
    fileAssets,
    notes,
    timesheetEntries,
    purchaseOrders,
    remedialItems,
    acceptances,
    vehicles,
    vehicleIssues,
    vehicleChecklists,
    assets,
    assetIssues,
    installerAssessments,
  };
}

function keyFor(date: Date): string {
  const stamp = date.toISOString().replace(/[:.]/g, "-");
  return `${BACKUP_PREFIX}ali-frame-backup-${stamp}.json`;
}

/** Generates a snapshot and stores it in R2, returning the object key. Called
 * both by the on-demand "Download Backup" button and the daily cron job. */
export async function createBackup(): Promise<string> {
  const snapshot = await buildSnapshot();
  const key = keyFor(new Date());
  const body = Buffer.from(JSON.stringify(snapshot, null, 2), "utf-8");
  await putObjectBuffer(key, body, "application/json");
  return key;
}

const MAX_RETAINED_BACKUPS = 60;

/** Deletes older backups beyond the retention count so R2 storage doesn't grow forever from daily crons. */
export async function pruneOldBackups(): Promise<void> {
  const { deleteObject } = await import("./storage");
  const existing = await listObjects(BACKUP_PREFIX);
  const stale = existing.slice(MAX_RETAINED_BACKUPS);
  await Promise.all(stale.map((o) => deleteObject(o.key)));
}

export async function listBackups() {
  return listObjects(BACKUP_PREFIX);
}

export async function getBackupDownloadUrl(key: string): Promise<string> {
  if (!key.startsWith(BACKUP_PREFIX)) throw new Error("Invalid backup key");
  const fileName = key.slice(BACKUP_PREFIX.length);
  return getDownloadUrl(key, fileName);
}
