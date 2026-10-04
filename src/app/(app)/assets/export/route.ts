// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};

/** Asset register as CSV — super users only (it carries values). */
export async function GET() {
  const user = await getSessionUser();
  if (!user?.isSuperUser) return NextResponse.json({ error: "Not allowed" }, { status: 403 });

  const assets = await prisma.asset.findMany({
    where: { status: "Active" },
    include: { assignedToUser: { select: { name: true } }, assignedToVehicle: { select: { name: true } } },
    orderBy: [{ assetCode: "asc" }, { name: "asc" }],
  });
  const header = ["Asset code", "Name", "Type", "Serial / model no.", "Purchase date", "Value (NZD)", "Assigned to", "Vehicle", "Test & tag due", "Status"];
  const lines = [header.map(cell).join(",")];
  for (const a of assets) {
    lines.push(
      [
        a.assetCode,
        a.name,
        a.assetType,
        a.serialNumber,
        a.purchaseDate?.toISOString().slice(0, 10),
        a.estimatedValue,
        a.assignedToUser?.name,
        a.assignedToVehicle?.name,
        a.testTagDueDate?.toISOString().slice(0, 10),
        a.status,
      ]
        .map(cell)
        .join(","),
    );
  }
  return new NextResponse(lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ali-frame-asset-register-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
