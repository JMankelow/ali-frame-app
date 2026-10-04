// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { prisma } from "@/lib/prisma";
import { HS_DOCS, HS_IMPORT_STATUS } from "@/lib/hsDocs";

/** Inserts any company H&S document that doesn't exist yet. Never overwrites edits. */
export async function ensureHsDocuments() {
  const existing = await prisma.hsDocument.findMany({ select: { slug: true } });
  const have = new Set(existing.map((d) => d.slug));
  const missing = HS_DOCS.filter((d) => !have.has(d.slug));
  if (missing.length === 0) return;
  await prisma.hsDocument.createMany({
    skipDuplicates: true,
    data: missing.map((d) => ({
      slug: d.slug,
      title: d.title,
      sortOrder: d.sortOrder,
      version: d.version,
      effectiveDate: d.effectiveDate ? new Date(d.effectiveDate) : null,
      nextReviewDate: d.nextReviewDate ? new Date(d.nextReviewDate) : null,
      content: d.content,
      status: HS_IMPORT_STATUS,
    })),
  });
}
