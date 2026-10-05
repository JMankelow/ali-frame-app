// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { PDFDocument } from "pdf-lib";
import { readFileSync } from "fs";
import path from "path";

export interface PackPart {
  label: string;
  mimeType: string;
  data: Buffer;
}

const A4 = { w: 595.28, h: 841.89 };

/** The AliFrame company profile that goes at the end of every quote pack. */
export function companyProfilePdf(): Buffer {
  return readFileSync(path.join(process.cwd(), "assets", "AliFrame_Profile.pdf"));
}

/**
 * Merges the quote, then the measure sheet, then the supplier schedule, then (optionally) the company profile into
 * ONE PDF. PDFs are appended page for page; JPG/PNG images (e.g. site-measure sketches) are placed on an A4 page.
 * Anything else (Word/Excel) can't be merged — its label is returned in `skipped` so it can be attached separately.
 */
export async function buildQuotePack(quotePdf: Buffer, parts: PackPart[], includeProfile: boolean): Promise<{ pdf: Buffer; skipped: string[] }> {
  const out = await PDFDocument.create();
  const skipped: string[] = [];

  const appendPdf = async (buf: Buffer) => {
    const src = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  };

  await appendPdf(quotePdf);

  for (const part of parts) {
    try {
      if (part.mimeType === "application/pdf") {
        await appendPdf(part.data);
      } else if (part.mimeType === "image/png" || part.mimeType === "image/jpeg") {
        const img = part.mimeType === "image/png" ? await out.embedPng(part.data) : await out.embedJpg(part.data);
        const page = out.addPage([A4.w, A4.h]);
        const margin = 28;
        const scale = Math.min((A4.w - margin * 2) / img.width, (A4.h - margin * 2) / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        page.drawImage(img, { x: (A4.w - w) / 2, y: (A4.h - h) / 2, width: w, height: h });
      } else {
        skipped.push(part.label);
      }
    } catch (e) {
      console.error("[quotePack] could not add", part.label, e);
      skipped.push(part.label);
    }
  }

  if (includeProfile) await appendPdf(companyProfilePdf());

  return { pdf: Buffer.from(await out.save()), skipped };
}
