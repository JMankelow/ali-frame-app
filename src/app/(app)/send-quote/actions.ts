"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { buildStorageKey, putObjectBuffer, getObjectBuffer } from "@/lib/storage";
import { generateQuotePdf } from "@/lib/quotePdf";
import { sendRepricingEmail } from "@/lib/email";

export interface GenerateQuoteResult {
  error?: string;
  storageKey?: string;
  fileName?: string;
}

export async function generateQuote(_prevState: GenerateQuoteResult, formData: FormData): Promise<GenerateQuoteResult> {
  const user = await requireUser();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const quoteNumber = String(formData.get("quoteNumber") ?? "").trim();
  const total = parseFloat(String(formData.get("total") ?? "0")) || 0;
  const gstBasis = formData.get("gstBasis") === "including" ? "including" : "excluding";
  const wording = String(formData.get("wording") ?? "").trim();

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

  const fileName = `${quoteNumber} Quote.pdf`;
  const storageKey = buildStorageKey(jobNumber, fileName);
  await putObjectBuffer(storageKey, pdfBuffer, "application/pdf");

  await prisma.fileAsset.create({
    data: { jobNumber, storageKey, fileName, fileType: "Other", mimeType: "application/pdf", sizeBytes: pdfBuffer.length, uploadedById: user.id },
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
  return { storageKey, fileName };
}

export interface SendQuoteEmailResult {
  error?: string;
  success?: boolean;
}

export async function sendQuoteEmail(_prevState: SendQuoteEmailResult, formData: FormData): Promise<SendQuoteEmailResult> {
  const user = await requireUser();
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
