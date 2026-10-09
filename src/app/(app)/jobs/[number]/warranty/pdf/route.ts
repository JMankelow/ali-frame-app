// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { buildStorageKey } from "@/lib/storage";
import { putObjectBuffer } from "@/lib/storage";
import { makeWarrantyPdf } from "@/lib/warrantyPdf";

const fmtDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}`;

/** Creates the job's warranty certificate PDF from the template, sends it back, and files a copy on the job when storage allows. */
export async function POST(req: Request, { params }: { params: Promise<{ number: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (isInstallerProfile(user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  const { number } = await params;
  const job = await prisma.job.findUnique({ where: { number }, select: { number: true } });
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  let b: Record<string, unknown>;
  try {
    b = await req.json();
  } catch {
    return NextResponse.json({ error: "Couldn't read the form." }, { status: 400 });
  }
  const s = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n);
  const customerName = s(b.customerName, 120);
  const customerAddress = s(b.customerAddress, 200);
  const projectAddress = s(b.projectAddress, 200);
  const dateIso = s(b.date, 10);
  const quoteNumber = s(b.quoteNumber, 40);
  const missing = [!customerName && "customer name", !customerAddress && "customer address", !/^\d{4}-\d{2}-\d{2}$/.test(dateIso) && "warranty date"].filter(Boolean);
  if (missing.length) return NextResponse.json({ error: `Still needed: ${missing.join(", ")}.` }, { status: 400 });

  let pdf: Uint8Array;
  try {
    pdf = await makeWarrantyPdf({
      jobNumber: number,
      customerName,
      customerAddress,
      projectAddress: projectAddress && projectAddress.toLowerCase() !== customerAddress.toLowerCase() ? projectAddress : "",
      date: fmtDate(dateIso),
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Couldn't create the certificate." }, { status: 422 });
  }

  // File a copy on the job (the quote number is recorded in the history only — it isn't printed on the certificate).
  const fileName = `${number}-AliFrame_Warranty.pdf`;
  let filed = false;
  try {
    const storageKey = buildStorageKey(number, fileName);
    await putObjectBuffer(storageKey, Buffer.from(pdf), "application/pdf");
    await prisma.fileAsset.create({ data: { jobNumber: number, storageKey, fileName, fileType: "Warranty", mimeType: "application/pdf", sizeBytes: pdf.length, uploadedById: user.id } });
    filed = true;
  } catch (e) {
    console.error("[warranty] couldn't file the copy on the job", e);
  }
  await logAudit({ userId: user.id, action: "warranty_created", entityType: "Job", entityId: number, metadata: { quoteNumber: quoteNumber || null, date: fmtDate(dateIso), filed } });

  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${fileName}"`, "X-Filed-On-Job": filed ? "yes" : "no", "Cache-Control": "no-store" },
  });
}
