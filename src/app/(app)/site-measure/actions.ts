"use server";

import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getObjectBuffer } from "@/lib/storage";
import { sendSiteMeasureEmail } from "@/lib/email";

export interface SendSiteMeasureState {
  error?: string;
}

/**
 * Emails the finished sheet's sketch images (already uploaded to R2 as FileAssets)
 * to a supplier contact. The recipient is only ever looked up from the real
 * Supplier table for the job's own supplier — never an address the caller
 * supplies directly — so this can't be turned into an arbitrary email relay.
 */
export async function sendSiteMeasureSheetEmail(params: {
  jobNumber: string;
  supplierEmail: string;
  pageCount: number;
  storageKeys: string[];
  subject?: string;
  body?: string;
}): Promise<SendSiteMeasureState> {
  const user = await requireNotInstaller();
  const { jobNumber, supplierEmail, pageCount, storageKeys } = params;
  const subject = (params.subject ?? "").trim().slice(0, 200) || undefined;
  const body = (params.body ?? "").trim().slice(0, 5000) || undefined;

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  // Any contact on the real Supplier list may be chosen (Sales can search all
  // of them), but never an address typed in freehand — so this still can't
  // be used as an open email relay.
  const contact = await prisma.supplier.findFirst({ where: { email: supplierEmail } });
  if (!contact) return { error: "That address isn't a known supplier contact." };

  if (storageKeys.length === 0) return { error: "Draw at least one opening before emailing the sheet." };

  const files = await prisma.fileAsset.findMany({
    where: { jobNumber, storageKey: { in: storageKeys } },
  });
  if (files.length !== storageKeys.length) return { error: "One or more sketches could not be found." };

  const attachments = await Promise.all(
    files.map(async (f) => ({ filename: f.fileName, content: await getObjectBuffer(f.storageKey) }))
  );

  await sendSiteMeasureEmail({
    to: supplierEmail,
    jobNumber,
    jobTitle: job.title,
    fromName: user.name,
    pageCount,
    attachments,
    subject,
    body,
  });

  await logAudit({
    userId: user.id,
    action: "site_measure_emailed",
    entityType: "Job",
    entityId: jobNumber,
    metadata: { to: contact.email, pageCount, fileCount: files.length },
  });

  return {};
}
