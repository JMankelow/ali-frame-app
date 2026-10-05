// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PreStartForm } from "./PreStartForm";

export default async function PreStartPage() {
  const user = await requireUser();
  const [jobs, staff] = await Promise.all([
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "desc" }, select: { number: true, title: true, address: true }, take: 300 }),
    prisma.user.findMany({ where: { isActive: true, email: { not: "claude@aliframe.local" } }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Daily Toolbox</h2>
          <div className="subtitle">Complete before work begins on site.</div>
        </div>
        <Link href="/health-safety" className="btn light">← Health &amp; Safety</Link>
      </div>
      <div style={{ maxWidth: 860 }}>
        <PreStartForm jobs={jobs} staff={staff} me={{ id: user.id, name: user.name }} />
      </div>
    </div>
  );
}
