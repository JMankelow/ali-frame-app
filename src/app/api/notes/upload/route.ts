// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

// Backup route for note attachments: keeps the file in the database when file storage (R2) can't be reached,
// so the team can still attach screenshots and photos to Update Notes. Small files only.
const ALLOWED = [
  "image/png", "image/jpeg", "image/webp", "image/gif", "image/heic", "image/heif",
  "application/pdf", "text/plain", "text/csv",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
];
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || isInstallerProfile(user)) return NextResponse.json({ error: "Not allowed" }, { status: 403 });
  // Same-site only (the session cookie is SameSite already — this is belt and braces).
  const origin = req.headers.get("origin");
  if (origin && new URL(origin).host !== req.headers.get("host")) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Couldn't read the upload." }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file." }, { status: 400 });
  const mimeType = String(form.get("mimeType") || file.type || "");
  if (!ALLOWED.includes(mimeType)) return NextResponse.json({ error: "That file type can't be attached." }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "That file is over 8 MB." }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const fileName = (file.name || "attachment").replace(/[^a-zA-Z0-9._ -]/g, "_").slice(-120);
  const blob = await prisma.noteFileBlob.create({ data: { data: bytes, mimeType, fileName, sizeBytes: bytes.length, uploadedById: user.id } });
  return NextResponse.json({ blobId: blob.id, fileName, mimeType, sizeBytes: bytes.length });
}
