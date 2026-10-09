// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import "server-only";
import { readFileSync } from "fs";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";

export interface WarrantyDetails {
  jobNumber: string;
  customerName: string;
  customerAddress: string;
  projectAddress?: string; // optional — left blank when not given / same as the customer address
  date: string; // DD.MM.YYYY
}

// The approved style (matches the 12099 / 12123 certificates): Times-Roman 10pt, #5147B8, values centred on their lines.
// Positions are the template's own (page 8 of the 8-page A4 AliFrame_Warranty.pdf).
const INK = rgb(0x51 / 255, 0x47 / 255, 0xb8 / 255);
const SIZE = 10;
const MIN_SIZE = 8;
const MAX_WIDTH = 270; // the certificate's lines are ~290pt wide
const PAGE_CENTRE = 297.64;
const Y = { name: 564.59, address: 521.09, project: 477.59, date: 433.99, job: 709.79 };
const JOB_X = 271.1; // starts just after the "JOB #" label

/** Standard PDF fonts only cover Western characters — swap anything else for "?" so a stray symbol can't break the file. */
function safe(text: string, font: PDFFont): string {
  return [...text.replace(/\s+/g, " ").trim()].map((ch) => { try { font.encodeText(ch); return ch; } catch { return "?"; } }).join("");
}

function fit(text: string, font: PDFFont, label: string): number {
  for (let size = SIZE; size >= MIN_SIZE; size -= 0.5) if (font.widthOfTextAtSize(text, size) <= MAX_WIDTH) return size;
  throw new Error(`The ${label} is too long to fit on the certificate legibly — please give a shorter form.`);
}

/** Fills the warranty certificate (page 8) and keeps all eight original pages. */
export async function makeWarrantyPdf(d: WarrantyDetails): Promise<Uint8Array> {
  const doc = await PDFDocument.load(readFileSync(path.join(process.cwd(), "assets", "AliFrame_Warranty.pdf")));
  const pages = doc.getPages();
  if (pages.length !== 8) throw new Error("The warranty template should have 8 pages.");
  const page = pages[7];
  const font = await doc.embedFont(StandardFonts.TimesRoman);

  const centred = (raw: string | undefined, y: number, label: string) => {
    const text = safe(raw ?? "", font);
    if (!text) return;
    const size = fit(text, font, label);
    page.drawText(text, { x: PAGE_CENTRE - font.widthOfTextAtSize(text, size) / 2, y, size, font, color: INK });
  };

  const job = safe(d.jobNumber, font);
  page.drawText(job, { x: JOB_X, y: Y.job, size: SIZE, font, color: INK });
  centred(d.customerName, Y.name, "customer name");
  centred(d.customerAddress, Y.address, "customer address");
  centred(d.projectAddress, Y.project, "project address");
  centred(d.date, Y.date, "date");
  return doc.save();
}
