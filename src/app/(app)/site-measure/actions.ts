"use server";

import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildStorageKey, getObjectBuffer, putObjectBuffer } from "@/lib/storage";
import { generateMeasureSheetPdf, type MeasureSheetPage } from "@/lib/measureSheetPdf";
import { sendSiteMeasureEmail } from "@/lib/email";

export interface SendSiteMeasureState {
  error?: string;
}

/** The form fields of the sheet, sent along with the sketches so the supplier gets ONE proper PDF. */
export interface SheetPayload {
  pages: { pageNum: number; header: Record<string, string>; openings: { index: number; storageKey: string; fields: Record<string, string> }[] }[];
}

const clip = (r: Record<string, string>) =>
  Object.fromEntries(Object.entries(r ?? {}).slice(0, 40).map(([k, v]) => [k.slice(0, 40), String(v ?? "").slice(0, 600)]));

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
  sheet?: SheetPayload;
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

  let attachments: { filename: string; content: Buffer }[];
  try {
    attachments = await Promise.all(files.map(async (f) => ({ filename: f.fileName, content: await getObjectBuffer(f.storageKey) })));
  } catch (e) {
    console.error("[site-measure] could not read the sketches from storage", e);
    return { error: `File storage problem — nothing was sent or saved. Please let an administrator know. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
  }

  // One professional PDF: customer/site details, then each opening's sketch beside its specification.
  let emailAttachments = attachments;
  if (params.sheet?.pages?.length) {
    const buf = new Map(files.map((f, n) => [f.storageKey, attachments[n].content]));
    const pages: MeasureSheetPage[] = params.sheet.pages.slice(0, 20).map((p) => ({
      pageNum: Number(p.pageNum) || 1,
      header: clip(p.header),
      openings: (p.openings ?? []).slice(0, 40).filter((o) => buf.has(o.storageKey)).map((o) => ({ index: Number(o.index) || 1, fields: clip(o.fields), sketch: buf.get(o.storageKey)! })),
    }));
    const pdfBuffer = await generateMeasureSheetPdf({ jobNumber, jobTitle: job.title, supplierName: contact.companyName, preparedBy: user.name, pages });
    const pdfName = `Measure Sheet ${jobNumber}.pdf`;
    const key = buildStorageKey(jobNumber, pdfName);
    try {
      await putObjectBuffer(key, pdfBuffer, "application/pdf");
      await prisma.fileAsset.create({ data: { jobNumber, storageKey: key, fileName: pdfName, fileType: "Site Measure", mimeType: "application/pdf", sizeBytes: pdfBuffer.length, uploadedById: user.id } });
    } catch (e) {
      console.error("[site-measure] could not store the measure sheet PDF", e);
      return { error: `File storage problem — the measure sheet couldn't be saved, so nothing was sent. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
    }
    emailAttachments = [{ filename: pdfName, content: pdfBuffer }];
  }

  await sendSiteMeasureEmail({
    to: supplierEmail,
    jobNumber,
    jobTitle: job.title,
    fromName: user.name,
    pageCount,
    attachments: emailAttachments,
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
