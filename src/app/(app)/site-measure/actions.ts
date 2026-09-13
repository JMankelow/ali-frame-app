"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { getObjectBuffer } from "@/lib/storage";
import { sendSiteMeasureEmail } from "@/lib/email";
import { SUPPLIER_CONTACTS } from "@/lib/supplierContacts";

export interface SendSiteMeasureState {
  error?: string;
}

/**
 * Emails the finished sheet's sketch images (already uploaded to R2 as FileAssets)
 * to a supplier contact. The recipient is only ever looked up from
 * SUPPLIER_CONTACTS for the job's own supplier — never an address the caller
 * supplies directly — so this can't be turned into an arbitrary email relay.
 */
export async function sendSiteMeasureSheetEmail(params: {
  jobNumber: string;
  supplierEmail: string;
  pageCount: number;
  storageKeys: string[];
}): Promise<SendSiteMeasureState> {
  const user = await requireUser();
  const { jobNumber, supplierEmail, pageCount, storageKeys } = params;

  const job = await prisma.job.findUnique({ where: { number: jobNumber } });
  if (!job) return { error: `Job ${jobNumber} not found.` };
  if (!job.supplier) return { error: "This job has no supplier set." };

  const contacts = SUPPLIER_CONTACTS[job.supplier] ?? [];
  const contact = contacts.find((c) => c.email === supplierEmail);
  if (!contact) return { error: "Unrecognized supplier contact for this job." };

  if (storageKeys.length === 0) return { error: "Draw at least one opening before emailing the sheet." };

  const files = await prisma.fileAsset.findMany({
    where: { jobNumber, storageKey: { in: storageKeys } },
  });
  if (files.length !== storageKeys.length) return { error: "One or more sketches could not be found." };

  const attachments = await Promise.all(
    files.map(async (f) => ({ filename: f.fileName, content: await getObjectBuffer(f.storageKey) }))
  );

  await sendSiteMeasureEmail({
    to: contact.email,
    jobNumber,
    jobTitle: job.title,
    fromName: user.name,
    pageCount,
    attachments,
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
