// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { requireUser } from "@/lib/session";
import { INCIDENT_SPEC } from "@/lib/incidentSpec";
import { IncidentForm } from "./IncidentForm";

export default async function NewIncidentPage() {
  const user = await requireUser();
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{INCIDENT_SPEC.title}</h2>
          <div className="subtitle">Report every accident, injury and near-miss as soon as it&apos;s safe to. Fields marked * are required.</div>
        </div>
        <Link href="/health-safety" className="btn light">← Health &amp; Safety</Link>
      </div>
      <IncidentForm userName={user.name} />
    </div>
  );
}
