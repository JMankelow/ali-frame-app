// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Applies the Altherm West schedule QTE-50433-A (Ver 26) to job 12116 (CMP — Ponsonby Pompallier):
//   1. builds a Commercial QA check sheet with one item per schedule item (window codes from the schedule), and
//   2. files the schedule PDF on the job as a "Supplier Quote" file (so Send Quote / Prepare Check Measure can use it).
// Item list below was read from the schedule on 6 Oct 2026. Usage: node scripts/apply-schedule-12116.mjs [--apply]
import { PrismaClient } from "@prisma/client";
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const apply = process.argv.includes("--apply");
const JOB = "12116";
const PDF = "C:/Users/Jo Mankelow - New/OneDrive - BLB Consultants Ltd/Ali Frame - Sales & Operations - Documents/2 - Work in Progress/Commercial/12 Altherm West Ltd/12116 - Ponsonby Pompellier/QTE-50433A  Vers26-Customer Copy- Schedule.pdf";

// [item no., window code, frame type, trim size]
const ITEMS = [
  [1, "2A.200.W01", "Flushglaze 150mm seismic", "3750 x 3000"],
  [2, "2A.200.W02", "Flushglaze 150mm seismic", "3750 x 3000"],
  [3, "2A.200.W03", "Flushglaze 150mm seismic", "3750 x 3000"],
  [4, "2A.200.W04", "Flushglaze 150mm seismic", "3750 x 3000"],
  [5, "2A.100.W01", "Architectural SD", "3055 x 3620"],
  [6, "2A.100.W02", "Architectural SD", "3055 x 3620"],
  [7, "2A.100.W03", "Architectural SD", "3055 x 3620"],
  [8, "2A.100.W04", "Architectural SD", "3055 x 3620"],
  [9, "2A.100W.12", "Flushglaze 125mm seismic", "2820 x 13284"],
  [10, "2A.200.W11", "Flushglaze 150mm seismic", "4668 x 12702"],
  [11, "2A.200.W11 - Part 2", "Architectural SD", "2545 x 3597"],
  [12, "2A.200.W11 - Part 3", "Architectural SD", "2545 x 3597"],
  [13, "2A.200.W06", "Flushglaze 150mm seismic", "3750 x 3000"],
  [14, "2A.200.W07, W08 & W09", "Flushglaze 150mm seismic", "3750 x 10500"],
  [15, "2A.200.W10", "Flushglaze 150mm seismic", "3750 x 3000"],
  [16, "2A.100.W07", "Flushglaze 125mm seismic", "3040 x 3600"],
  [17, "2A.100.W06", "As hinge door", "970 x 650"],
  [18, "2A.100.W08, W09 & W10", "Flushglaze 125mm seismic", "3040 x 11100"],
  [19, "2A.100.W11", "Flushglaze 125mm seismic", "3040 x 3600"],
  [20, "2A.100.W05", "Flushglaze 125mm seismic", "2400 x 6000"],
  [21, "2A.200.W05", "Flushglaze 125mm seismic", "3158 x 6000"],
];

const emptyQa = () => ({ checks: {}, photos: {}, photoMeta: {}, notes: {}, tl: { name: "", date: "", comments: "", sig: "", by: "", at: "" } });
const id = () => Math.random().toString(36).slice(2, 10);

const p = new PrismaClient();
try {
  const job = await p.job.findUnique({ where: { number: JOB } });
  if (!job) throw new Error(`Job ${JOB} not found`);
  const jo = await p.user.findFirst({ where: { email: "jo@aliframe.co.nz" } });
  if (!jo) throw new Error("jo@aliframe.co.nz not found");

  const existingCom = await p.qaCheckSheet.findMany({ where: { jobNumber: JOB, kind: "COMMERCIAL" } });
  const existingFile = await p.fileAsset.findFirst({ where: { jobNumber: JOB, fileName: { contains: "QTE-50433A" } } });
  console.log(`Job ${job.number} — ${job.title} (${job.address}); ${ITEMS.length} items; commercial sheets already: ${existingCom.length}; schedule already filed: ${!!existingFile}`);
  if (!apply) process.exit(0);

  if (existingCom.length === 0) {
    const data = {
      date: new Date().toISOString().slice(0, 10),
      installers: "",
      items: ITEMS.map(([n, code, frame, trim]) => ({ id: id(), n: String(n), code, loc: `${frame} — ${trim}`, qa: emptyQa() })),
    };
    const sheet = await p.qaCheckSheet.create({ data: { kind: "COMMERCIAL", jobNumber: JOB, data, createdById: jo.id } });
    await p.auditLog.create({ data: { userId: jo.id, action: "qa_sheet_created", entityType: "QaCheckSheet", entityId: sheet.id, metadata: { kind: "COMMERCIAL", jobNumber: JOB, source: "Altherm schedule QTE-50433-A Ver 26", items: ITEMS.length } } });
    console.log("Created commercial QA sheet", sheet.id, `https://ali-frame-app.onrender.com/health-safety/qa/sheet/${sheet.id}`);
  } else console.log("Commercial sheet already exists — left alone:", existingCom.map((s) => s.id).join(", "));

  if (!existingFile) {
    const accountId = process.env.R2_ACCOUNT_ID.match(/[0-9a-fA-F]{32}/)[0];
    const s3 = new S3Client({ region: "auto", endpoint: `https://${accountId}.r2.cloudflarestorage.com`, credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID.trim(), secretAccessKey: process.env.R2_SECRET_ACCESS_KEY.trim() } });
    const body = readFileSync(PDF);
    const fileName = "QTE-50433A Ver26 Altherm Schedule.pdf";
    const storageKey = `${JOB}/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await s3.send(new PutObjectCommand({ Bucket: process.env.R2_BUCKET_NAME.trim(), Key: storageKey, Body: body, ContentType: "application/pdf" }));
    await p.fileAsset.create({ data: { jobNumber: JOB, storageKey, fileName, fileType: "Supplier Quote", mimeType: "application/pdf", sizeBytes: body.length, uploadedById: jo.id } });
    console.log("Filed the schedule on the job as a Supplier Quote file:", fileName);
  }
} catch (e) {
  console.log("ERR", String(e.message).split("\n").filter(Boolean).slice(-1)[0]);
} finally {
  await p.$disconnect();
}
