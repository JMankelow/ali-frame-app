// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Creates a clearly-labelled TEST install job (TEST001) booked for the test installer login (jo@jtbc.co.nz) so Jo can
// see what installers see on her phone: customer + address + phone, budgets, a plan file, a QA sheet, photos, time.
// Safe to re-run. When finished, set the job to Cancelled/archive it from Jobs (it is not real work).
import { PrismaClient } from "@prisma/client";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";

const p = new PrismaClient();
try {
  const tester = await p.user.findUnique({ where: { email: "jo@jtbc.co.nz" } });
  const jo = await p.user.findUnique({ where: { email: "jo@aliframe.co.nz" } });
  if (!tester || !jo) throw new Error("test installer or Jo not found — run create-test-installer.mjs first");

  const number = "TEST001";
  let job = await p.job.findUnique({ where: { number } });
  if (!job) {
    const client = await p.client.create({ data: { name: "TEST CUSTOMER - Installer view", phone: "021 000 0000", email: "test.customer@example.com", address: "34A Allens Road, East Tamaki, Auckland" } });
    job = await p.job.create({
      data: {
        number, title: "TEST CUSTOMER - Installer view", clientId: client.id, address: "34A Allens Road, East Tamaki, Auckland", phone: "021 000 0000", email: "test.customer@example.com",
        type: "RESIDENTIAL", status: "Installation Date Confirmed", installDays: 1, supplier: "Vision", leadSource: "Website",
        description: "TEST JOB for checking the installer view. Replace 3 windows and 1 slider. Dog on site - please close the gate.",
      },
    });
    await p.jobCosting.create({ data: { jobNumber: number, quoteNumber: "TEST", installQuoted: 2400, labourHoursQuoted: 16, materialsQuoted: 1200, rubbishQuoted: 150 } });
    console.log("Created job", number);
  }

  const tomorrow = new Date(new Date().toISOString().slice(0, 10)); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const hasBooking = await p.jobScheduledTask.findFirst({ where: { jobNumber: number, assignees: { some: { id: tester.id } } } });
  if (!hasBooking) {
    await p.jobScheduledTask.create({ data: { jobNumber: number, type: "Installation", scheduledDate: tomorrow, endDate: tomorrow, status: "Booked in", notes: "TEST booking — delete/cancel after testing", createdById: jo.id, assignees: { connect: [{ id: tester.id }] } } });
    console.log("Booked the test installer on", tomorrow.toISOString().slice(0, 10));
  }

  const hasFile = await p.fileAsset.findFirst({ where: { jobNumber: number, fileType: "Plan" } });
  if (!hasFile) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    page.drawText("TEST check measure pack", { x: 50, y: 780, size: 22, font, color: rgb(0, 0.62, 0.89) });
    page.drawText("Job TEST001 - installer view test. Not a real job.", { x: 50, y: 750, size: 12, font });
    const body = Buffer.from(await doc.save());
    const accountId = process.env.R2_ACCOUNT_ID.match(/[0-9a-fA-F]{32}/)[0];
    const s3 = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() } });
    const fileName = "TEST Check Measure Pack.pdf";
    const storageKey = `jobs/${number}/${randomUUID()}-TEST_Check_Measure_Pack.pdf`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key: storageKey, Body: body, ContentType: "application/pdf" }));
    await p.fileAsset.create({ data: { jobNumber: number, storageKey, fileName, fileType: "Plan", mimeType: "application/pdf", sizeBytes: body.length, uploadedById: jo.id } });
    console.log("Added a test Plan file");
  }
} catch (e) {
  console.log("ERR", String(e.message).split("\n").filter(Boolean).slice(-2).join(" "));
} finally {
  await p.$disconnect();
}
