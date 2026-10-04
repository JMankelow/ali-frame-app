"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { calculateRepricing, type RepricingInput } from "@/lib/repricing";
import { generateRepricingPdf } from "@/lib/repricingPdf";
import { buildStorageKey, putObjectBuffer, getObjectBuffer } from "@/lib/storage";
import { sendRepricingEmail } from "@/lib/email";

export interface GeneratePdfResult {
  error?: string;
  storageKey?: string;
  fileName?: string;
  lines?: { label: string; amount: number }[];
  total?: number;
}

function parseInput(formData: FormData): RepricingInput {
  const num = (name: string) => parseFloat(String(formData.get(name) ?? "0")) || 0;
  return {
    supplierPrice: num("supplierPrice"),
    marginMode: formData.get("marginMode") === "discount" ? "discount" : "margin",
    marginIsPercent: formData.get("marginUnit") !== "dollar",
    marginValue: num("marginValue"),
    installDays: num("installDays"),
    installDaysOriginal: formData.get("installDaysOriginal") ? num("installDaysOriginal") : null,
    installAllowance: num("installAllowance"),
    materials: num("materials"),
    rubbishRemoval: num("rubbishRemoval"),
    scaffolding: num("scaffolding"),
    otherLabel: String(formData.get("otherLabel") ?? ""),
    otherAmount: num("otherAmount"),
    gstBasis: formData.get("gstBasis") === "including" ? "including" : "excluding",
  };
}

export async function generateRepricing(_prevState: GeneratePdfResult, formData: FormData): Promise<GeneratePdfResult> {
  const user = await requireUser();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  if (!jobNumber) return { error: "Select a job first." };

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return { error: `Job ${jobNumber} not found.` };

  const input = parseInput(formData);
  const { lines, total } = calculateRepricing(input);

  // Keep the raw inputs so Send Quote can build the initial quote total without re-typing them.
  await prisma.jobQuoteInputs.upsert({
    where: { jobNumber },
    create: {
      jobNumber,
      supplierPrice: input.supplierPrice,
      marginIsPercent: input.marginIsPercent,
      marginValue: input.marginMode === "margin" ? input.marginValue : 0,
      installAllowance: input.installAllowance + input.materials + input.rubbishRemoval + input.scaffolding + input.otherAmount,
      updatedById: user.id,
    },
    update: {
      supplierPrice: input.supplierPrice,
      marginIsPercent: input.marginIsPercent,
      marginValue: input.marginMode === "margin" ? input.marginValue : 0,
      installAllowance: input.installAllowance + input.materials + input.rubbishRemoval + input.scaffolding + input.otherAmount,
      updatedById: user.id,
    },
  });

  const pdfBuffer = await generateRepricingPdf({
    jobNumber,
    clientName: job.client?.name ?? job.title,
    siteAddress: job.address ?? "",
    date: new Date().toLocaleDateString("en-NZ"),
    lines,
    total,
    gstBasis: input.gstBasis,
  });

  const fileName = `${jobNumber} Revised Install Pricing.pdf`;
  const storageKey = buildStorageKey(jobNumber, fileName);
  const { putObjectBuffer } = await import("@/lib/storage");
  await putObjectBuffer(storageKey, pdfBuffer, "application/pdf");

  await prisma.fileAsset.create({
    data: {
      jobNumber,
      storageKey,
      fileName,
      fileType: "Repricing",
      mimeType: "application/pdf",
      sizeBytes: pdfBuffer.length,
      uploadedById: user.id,
    },
  });

  await logAudit({ userId: user.id, action: "repricing_pdf_generated", entityType: "Job", entityId: jobNumber, metadata: { total } });
  revalidatePath(`/jobs/${jobNumber}`);
  return { storageKey, fileName, lines, total };
}

export interface SendEmailResult {
  error?: string;
  success?: boolean;
}

export async function sendRepricingEmailAction(_prevState: SendEmailResult, formData: FormData): Promise<SendEmailResult> {
  const user = await requireUser();
  const jobNumber = String(formData.get("jobNumber") ?? "").trim();
  const storageKey = String(formData.get("storageKey") ?? "").trim();
  const emailText = String(formData.get("emailText") ?? "").trim();

  if (!jobNumber) return { error: "Select a job first." };
  if (!storageKey) return { error: "Generate the PDF before sending." };
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
    subject: `Revised Install Pricing — ${jobNumber}`,
    text: emailText,
    attachments: [{ filename: file.fileName, content: pdfBuffer }],
  });

  await logAudit({ userId: user.id, action: "repricing_emailed", entityType: "Job", entityId: jobNumber, metadata: { to } });
  revalidatePath(`/jobs/${jobNumber}`);
  return { success: true };
}
