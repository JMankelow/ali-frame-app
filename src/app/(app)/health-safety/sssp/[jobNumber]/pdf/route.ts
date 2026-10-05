// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ensureHsDocuments } from "@/lib/hsSeed";
import { DEFAULT_SSSP_ACTIVITIES } from "@/lib/hsDocs";
import { generateSsspPdf } from "@/lib/hsPdf";

/** The full Site Specific Safety Plan for a job as one professional PDF. */
export async function GET(_req: Request, { params }: { params: Promise<{ jobNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const jobNumber = decodeURIComponent((await params).jobNumber);

  const job = await prisma.job.findUnique({ where: { number: jobNumber }, include: { client: true } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await ensureHsDocuments();
  const [sssp, docs, risks, people] = await Promise.all([
    prisma.hsSssp.findUnique({ where: { jobNumber }, include: { signOns: { orderBy: { createdAt: "asc" } } } }),
    prisma.hsDocument.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.hsRisk.findMany({ where: { status: "Open" }, orderBy: { createdAt: "asc" } }),
    prisma.hsCompetency.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const pdf = await generateSsspPdf({
    job: { number: job.number, title: job.title, address: job.address, clientName: job.client?.name ?? null },
    sssp,
    defaults: {
      siteActivities: DEFAULT_SSSP_ACTIVITIES,
      pcbu2ProjectManager: "Kere Taaka Tekaute · 021 223 5833 · kere@aliframe.co.nz",
      pcbu2SiteManager: "Kere Taaka Tekaute",
      pcbu2HsRep: "Tanya Cleghorn · 027 231 8160 · tanya@aliframe.co.nz",
    },
    docs,
    risks,
    people: people.map((p) => ({ name: p.name, keyRole: p.keyRole, siteSafeNumber: p.siteSafeNumber, qualifications: p.qualifications, yearsExperience: p.yearsExperience })),
  });
  return new NextResponse(new Uint8Array(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="SSSP ${job.number}.pdf"`, "Cache-Control": "private, no-store" },
  });
}
