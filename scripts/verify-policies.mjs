import { PrismaClient } from "@prisma/client";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
const p = new PrismaClient();
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
});
try {
  const rows = await p.companyPolicy.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  let bad = 0;
  for (const r of rows) {
    const out = await s3.send(new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: r.storageKey }));
    const buf = Buffer.from(await out.Body.transformToByteArray());
    const ok = buf.slice(0, 5).toString() === "%PDF-" && buf.length === r.sizeBytes;
    if (!ok) bad++;
    console.log(`${ok ? "OK  " : "BAD "} ${r.category.padEnd(18)} ${r.title}  (${buf.length} bytes)`);
  }
  console.log(`\n${rows.length} policies, ${bad} problems`);
} finally {
  await p.$disconnect();
}
