import Link from "next/link";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "./AssetForm";
import { retireAsset, resolveAssetIssue } from "./actions";
import { AssetIssueForm } from "./AssetIssueForm";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  await requireUser();
  const { add } = await searchParams;
  const adding = add === "1";

  const [assets, staff, vehicles] = await Promise.all([
    prisma.asset.findMany({
      where: { status: "Active" },
      include: { assignedToUser: true, assignedToVehicle: true, issues: { where: { status: "Open" }, include: { raisedBy: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.vehicle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const today = new Date();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Assets</h2>
          <div className="subtitle">
            {assets.length} active asset(s) — tools, office equipment and other gear. Vehicles have their own page.
          </div>
        </div>
        <div className="actions">
          <Link href={adding ? "/assets" : "/assets?add=1"} className="btn primary">
            {adding ? "Cancel" : "+ Add New Asset"}
          </Link>
          <Link href="/vehicles" className="btn light">
            Go to Vehicles ↗
          </Link>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Asset</th>
              <th>Type</th>
              <th>Serial Number</th>
              <th>Description</th>
              <th>Assigned To</th>
              <th>Test &amp; Tag Due</th>
              <th>Open Issues</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const overdue = a.testTagDueDate && a.testTagDueDate < today;
              return (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.assetType}</td>
                  <td>{a.serialNumber ?? "—"}</td>
                  <td>{a.description ?? "—"}</td>
                  <td>
                    {a.assignedToUser?.name ?? a.assignedToVehicle?.name ?? <span className="hint">Unassigned</span>}
                  </td>
                  <td style={overdue ? { color: "#dc2626", fontWeight: 700 } : undefined}>
                    {a.testTagDueDate ? a.testTagDueDate.toLocaleDateString("en-NZ") : "—"}
                    {overdue ? " (Overdue)" : ""}
                  </td>
                  <td>
                    {a.issues.length === 0 ? (
                      "—"
                    ) : (
                      <div>
                        {a.issues.map((i) => (
                          <div key={i.id} style={{ marginBottom: 4 }}>
                            <span className="status orange">{i.description}</span>
                            <form action={resolveAssetIssue.bind(null, i.id)} style={{ display: "inline", marginLeft: 6 }}>
                              <button type="submit" className="btn light">
                                Resolve
                              </button>
                            </form>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  <td>
                    <form action={retireAsset.bind(null, a.id)}>
                      <button type="submit" className="btn light">
                        Retire
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={8} className="hint">
                  No assets yet — add one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && <AssetForm staff={staff} vehicles={vehicles} />}
      <AssetIssueForm assets={assets.map((a) => ({ id: a.id, name: a.name }))} />
    </div>
  );
}
