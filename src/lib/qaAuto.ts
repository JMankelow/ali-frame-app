// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/audit";
import { getObjectBuffer } from "@/lib/storage";
import { describeItem, parseSchedulePdf } from "@/lib/scheduleParse";
import { emptyComItem, emptyCommercial, emptyResItem, emptyResidential } from "@/lib/qaSheets";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * A job's type decides which QA check sheet it gets: Commercial → the Commercial QA (one item per schedule line, read from the
 * job's schedule PDF when there is one), Residential → the single Residential QA for the whole job. Created once, the first time
 * the job is booked in / accepted; never replaces a sheet that already exists for that type.
 */
export async function ensureQaSheet(jobNumber: string, userId: string): Promise<string | null> {
  const job = await prisma.job.findUnique({ where: { number: jobNumber }, select: { type: true } });
  if (!job) return null;
  const kind = job.type === "COMMERCIAL" ? "COMMERCIAL" : "RESIDENTIAL";
  if (await prisma.qaCheckSheet.findFirst({ where: { jobNumber, kind }, select: { id: true } })) return null;

  let data;
  if (kind === "RESIDENTIAL") {
    data = emptyResidential(today());
    data.items = [{ ...emptyResItem(), label: "All items" }];
  } else {
    data = emptyCommercial(today());
    // the job's schedule (preferred) or supplier quote PDF, read for its items
    const files = await prisma.fileAsset.findMany({
      where: { jobNumber, mimeType: "application/pdf", fileType: { in: ["Supplier Schedule", "Supplier Quote"] } },
      orderBy: { createdAt: "desc" },
    });
    files.sort((a, b) => (a.fileType === "Supplier Schedule" ? 0 : 1) - (b.fileType === "Supplier Schedule" ? 0 : 1));
    for (const f of files) {
      try {
        const items = await parseSchedulePdf(await getObjectBuffer(f.storageKey));
        if (items.length) {
          data.items = items.slice(0, 60).map((it) => ({ ...emptyComItem(), n: String(it.n), code: it.code.slice(0, 60), loc: describeItem(it).slice(0, 120) }));
          break;
        }
      } catch {
        /* unreadable file — try the next one, or fall back to a single blank item */
      }
    }
  }
  const sheet = await prisma.qaCheckSheet.create({ data: { kind, jobNumber, data: data as never, createdById: userId } });
  await logAudit({ userId, action: "qa_sheet_auto_created", entityType: "QaCheckSheet", entityId: sheet.id, metadata: { kind, jobNumber, items: (data.items as unknown[]).length } });
  return sheet.id;
}
