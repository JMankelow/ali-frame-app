"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildStorageKey, putObjectBuffer, getObjectBuffer } from "@/lib/storage";
import { generateQuotePdf } from "@/lib/quotePdf";
import { buildQuotePack } from "@/lib/quotePack";
import { sendRepricingEmail } from "@/lib/email";

export interface QuoteSourceFile {
  id: string;
  fileName: string;
  fileType: string;
  mimeType: string;
  /** Can be merged into the quote PDF (PDF or JPG/PNG). */
  mergeable: boolean;
}
export interface QuoteSources {
  error?: string;
  measureSheets: QuoteSourceFile[];
  supplierSchedules: QuoteSourceFile[];
  prepared?: { total: number; supplierPrice: number; installAllowance: number };
}

/** What this job already has in the system for the quote: measure sheet, supplier schedule, and the Prepare Price figures. */
export async function getQuoteSources(jobNumber: string): Promise<QuoteSources> {
  await requireNotInstaller();
  const [files, inputs] = await Promise.all([
    prisma.fileAsset.findMany({ where: { jobNumber, fileType: { in: ["Site Measure", "Supplier Quote"] } }, orderBy: { createdAt: "asc" } }),
    prisma.jobQuoteInputs.findUnique({ where: { jobNumber } }),
  ]);
  const row = (f: (typeof files)[number]): QuoteSourceFile => ({
    id: f.id,
    fileName: f.fileName,
    fileType: f.fileType,
    mimeType: f.mimeType,
    mergeable: ["application/pdf", "image/png", "image/jpeg"].includes(f.mimeType),
  });
  let prepared: QuoteSources["prepared"];
  if (inputs) {
    const withMargin = inputs.marginIsPercent ? inputs.supplierPrice * (1 + inputs.marginValue / 100) : inputs.supplierPrice + inputs.marginValue;
    prepared = { total: Math.round((withMargin + inputs.installAllowance) * 1.025 * 100) / 100, supplierPrice: inputs.supplierPrice, installAllowance: inputs.installAllowance };
  }
  return { measureSheets: files.filter((f) => f.fileType === "Site Measure").map(row), supplierSchedules: files.filter((f) => f.fileType === "Supplier Quote").map(row), prepared };
}

export interface GenerateQuoteResult {
  note?: string;
  error?: string;
  storageKey?: string;
  fileName?: string;
}

export async function generateQuote(_prevState: GenerateQuoteResult, formData: FormData): Promise<GenerateQuoteResult> {
  const user = await requireNotInstaller();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const quoteNumber = String(formData.get("quoteNumber") ?? "").trim();
  const total = parseFloat(String(formData.get("total") ?? "0")) || 0;
  const gstBasis = formData.get("gstBasis") === "including" ? "including" : "excluding";
  const wording = String(formData.get("wording") ?? "").trim();
  const partIds = formData.getAll("partFileIds").map(String).filter(Boolean);
  const includeProfile = formData.get("includeProfile") === "on";

  if (!jobNumber) return { error: "Select a job first." };
  if (!quoteNumber) return { error: "Enter a quote number." };
  if (total <= 0) return { error: "Enter the approved total." };
  if (!wording) return { error: "Paste the finished quote wording." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const totalLine = `Total ${total.toLocaleString("en-NZ", { style: "currency", currency: "NZD" })}${gstBasis === "excluding" ? " + GST" : " (incl. GST)"}`;

  const pdfBuffer = await generateQuotePdf({
    quoteNumber,
    clientName: job.client?.name ?? job.title,
    date: new Date().toLocaleDateString("en-NZ"),
    totalLine,
    wording,
  });

  // One PDF: quote, then the measure sheet and supplier schedule from this job, then the company profile.
  const parts: { label: string; mimeType: string; data: Buffer }[] = [];
  try {
    const picked = await prisma.fileAsset.findMany({ where: { id: { in: partIds }, jobNumber, fileType: { in: ["Site Measure", "Supplier Quote"] } } });
    if (picked.length !== partIds.length) return { error: "One of the selected documents isn't on this job." };
    // Measure sheet first, then supplier schedule, each in the order they were uploaded.
    for (const f of [...picked.filter((p) => p.fileType === "Site Measure"), ...picked.filter((p) => p.fileType === "Supplier Quote")]) {
      parts.push({ label: f.fileName, mimeType: f.mimeType, data: await getObjectBuffer(f.storageKey) });
    }
  } catch (e) {
    console.error("[send-quote] could not read source documents", e);
    return { error: `File storage problem — the measure sheet and supplier schedule couldn't be read. Nothing was created. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
  }
  const { pdf: packBuffer, skipped } = await buildQuotePack(pdfBuffer, parts, includeProfile);

  const fileName = `${quoteNumber} Quote Pack.pdf`;
  const storageKey = buildStorageKey(jobNumber, fileName);
  try {
    await putObjectBuffer(storageKey, packBuffer, "application/pdf");
  } catch (e) {
    console.error("[send-quote] could not store the quote pack", e);
    return { error: `File storage problem — the quote PDF couldn't be saved. Nothing was created. (Reason: ${e instanceof Error ? e.message.slice(0, 160) : "unknown"})` };
  }

  await prisma.fileAsset.create({
    data: { jobNumber, storageKey, fileName, fileType: "Other", mimeType: "application/pdf", sizeBytes: packBuffer.length, uploadedById: user.id },
  });

  const existing = await prisma.quote.findUnique({ where: { quoteNumber } });
  if (existing) {
    await prisma.quote.update({
      where: { quoteNumber },
      data: { total, jobNumber, customerName: job.client?.name ?? job.title, hasFiles: true },
    });
  } else {
    await prisma.quote.create({
      data: {
        quoteNumber,
        customerName: job.client?.name ?? job.title,
        jobNumber,
        total,
        status: "Sent",
        quoteDate: new Date(),
        dateSent: new Date(),
        expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        hasFiles: true,
      },
    });
  }

  await logAudit({ userId: user.id, action: "quote_generated", entityType: "Job", entityId: jobNumber, metadata: { quoteNumber, total } });
  revalidatePath("/quotes");
  revalidatePath(`/jobs/${jobNumber}`);
  return {
    storageKey,
    fileName,
    note: skipped.length ? `Not included (Word/Excel can't be merged into a PDF — convert to PDF first): ${skipped.join(", ")}` : undefined,
  };
}

export interface SendQuoteEmailResult {
  error?: string;
  success?: boolean;
}

export async function sendQuoteEmail(_prevState: SendQuoteEmailResult, formData: FormData): Promise<SendQuoteEmailResult> {
  const user = await requireNotInstaller();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const storageKey = String(formData.get("storageKey") ?? "").trim();
  const quoteNumber = String(formData.get("quoteNumber") ?? "").trim();
  const emailText = String(formData.get("emailText") ?? "").trim();

  if (!jobNumber || !storageKey) return { error: "Generate the quote PDF before sending." };
  if (!emailText) return { error: "The email body can't be empty." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const to = job.client?.email || job.email;
  if (!to) return { error: "This job has no client email on file." };

  const file = await prisma.fileAsset.findFirst({ where: { jobNumber, storageKey } });
  if (!file) return { error: "Could not find the generated PDF — try generating it again." };

  const pdfBuffer = await getObjectBuffer(storageKey);

  await sendRepricingEmail({
    to,
    jobNumber,
    subject: `Your Quote — ${quoteNumber}`,
    text: emailText,
    attachments: [{ filename: file.fileName, content: pdfBuffer }],
  });

  await logAudit({ userId: user.id, action: "quote_emailed", entityType: "Job", entityId: jobNumber, metadata: { to, quoteNumber } });
  revalidatePath(`/jobs/${jobNumber}`);
  return { success: true };
}
