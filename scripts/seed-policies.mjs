// One-off: uploads Ali-Frame's company policy PDFs to the file store and registers them under
// Human Resources > Company Policies. Safe to re-run (skips titles that already exist).
import { readFileSync } from "fs";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const DL = "C:/Users/Jo Mankelow - New/Downloads/";
const POLICIES = [
  ["Workplace Policies", "Code of Conduct", "bedb06a8734c43e9-BLB_CodeofConduct_2025Jan23.pdf"],
  ["Workplace Policies", "Alcohol and Other Drugs Policy", "0c7f12bcda0dd5a9-BLB_Policy - Alcohol and Other Drugs_2023Oct20.pdf"],
  ["Workplace Policies", "Equal Employment Opportunity (EEO) & Anti-Discrimination Policy", "NZ Equal Employment Opportunity (EEO) & Anti-Discrimination Policy.pdf"],
  ["Workplace Policies", "Grievance Policy", "NZ Grievance Policy1.pdf"],
  ["Workplace Policies", "Leave Policy", "NZ Leave Policy1.pdf"],
  ["Workplace Policies", "Parental Leave Policy", "7086c2f4dcdd1154-BLB_Parental Leave Policy_2023Oct20.pdf"],
  ["Workplace Policies", "Privacy Policy", "NZ Privacy Policy1.pdf"],
  ["Workplace Policies", "Remote Working & Working from Home Policy", "NZ Remote Working and Working from Home Policy1.pdf"],
  ["Vehicles", "Motor Vehicle Policy", "50b6679e32d665c6-BLB_Motor Vehicle Policy_20231020.pdf"],
  ["Vehicles", "Company Vehicle — Contact Information", "7b0505194ad49631-Company Vehicle - Contact Infomation.pdf"],
  ["Vehicles", "Company Van — Emergency Response Plan", "159bedea67fc0730-Company Van- Emergency Response Plan.pdf"],
  ["Vehicles", "Hazardous Substances Register — Vehicles", "06fdb5fdba4fa643-Hazardous Substances Register - Vehicles.pdf"],
];

const p = new PrismaClient();
const { R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME } = process.env;
if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
  console.error("R2 settings are not available locally — cannot upload.");
  process.exit(1);
}
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

try {
  let order = 0;
  for (const [category, title, file] of POLICIES) {
    order += 1;
    if (await p.companyPolicy.findFirst({ where: { title } })) {
      console.log(`skip (exists)  ${title}`);
      continue;
    }
    const body = readFileSync(DL + file);
    const fileName = title.replace(/[^A-Za-z0-9 &()-]/g, "").trim() + ".pdf";
    const storageKey = `policies/${randomUUID()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    await s3.send(new PutObjectCommand({ Bucket: R2_BUCKET_NAME, Key: storageKey, Body: body, ContentType: "application/pdf" }));
    await p.companyPolicy.create({ data: { title, category, fileName, storageKey, sizeBytes: body.length, sortOrder: order } });
    console.log(`uploaded       ${title}  (${Math.round(body.length / 1024)} KB)`);
  }
} finally {
  await p.$disconnect();
}
