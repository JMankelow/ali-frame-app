// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PolicyUploader } from "./PolicyUploader";
import { archivePolicy } from "./actions";

export default async function CompanyPoliciesPage() {
  const user = await requireUser();
  const policies = await prisma.companyPolicy.findMany({ where: { active: true }, orderBy: [{ category: "asc" }, { sortOrder: "asc" }] });
  const categories = [...new Set(policies.map((p) => p.category))];

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Company Policies</h2>
          <div className="subtitle">Ali-Frame&apos;s workplace and vehicle policies. Open to everyone — please read them and ask Tanya or Jo if anything is unclear.</div>
        </div>
      </div>

      {categories.map((cat) => (
        <div key={cat} className="card" style={{ marginTop: 16 }}>
          <div className="label">{cat}</div>
          <table style={{ marginTop: 8 }}>
            <tbody>
              {policies.filter((p) => p.category === cat).map((p) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 700 }}>{p.title}</td>
                  <td className="hint">PDF · {Math.max(1, Math.round(p.sizeBytes / 1024))} KB</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <a href={`/policies/file/${p.id}`} target="_blank" rel="noopener noreferrer" className="btn primary">Open</a>
                  </td>
                  {user.isSuperUser && (
                    <td>
                      <form action={archivePolicy.bind(null, p.id)}><button type="submit" className="btn light">Archive</button></form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      {policies.length === 0 && <div className="card hint" style={{ marginTop: 16 }}>No policies have been added yet.</div>}

      {user.isSuperUser && <PolicyUploader categories={categories.length ? categories : ["Workplace Policies", "Vehicles"]} />}
    </div>
  );
}
