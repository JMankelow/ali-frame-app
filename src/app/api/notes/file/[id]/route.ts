// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

/** Serves a note attachment that was kept in the database (see /api/notes/upload). Office staff only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  if (isInstallerProfile(user)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { id } = await params;
  const att = await prisma.noteAttachment.findUnique({ where: { id }, select: { storageKey: true, fileName: true, mimeType: true } });
  if (!att || !att.storageKey.startsWith("db:")) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const blob = await prisma.noteFileBlob.findUnique({ where: { id: att.storageKey.slice(3) } });
  if (!blob) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const inline = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"].includes(att.mimeType);
  return new NextResponse(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${att.fileName.replace(/[^a-zA-Z0-9._ -]/g, "_")}"`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
