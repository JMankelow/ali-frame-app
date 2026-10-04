import Link from "next/link";
import { requireUser } from "@/lib/session";
import { isInstallerProfile } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { AssetForm } from "./AssetForm";
import { retireAsset, resolveAssetIssue, updateAssetRegister } from "./actions";
import { AssetIssueForm } from "./AssetIssueForm";

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ add?: string }> }) {
  const user = await requireUser();
  // Field staff only ever see — and can report issues on — assets assigned to them (or to their vehicle).
  const installer = isInstallerProfile(user);
  const { add } = await searchParams;
  const adding = add === "1" && !installer;

  const [assets, staff, vehicles] = await Promise.all([
    prisma.asset.findMany({
      where: {
        status: "Active",
        ...(installer ? { OR: [{ assignedToUserId: user.id }, { assignedToVehicle: { assignedToUserId: user.id } }] } : {}),
      },
      include: { assignedToUser: true, assignedToVehicle: true, issues: { where: { status: "Open" }, include: { raisedBy: true } } },
      orderBy: { createdAt: "desc" },
    }),
    installer ? Promise.resolve([]) : prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    installer ? Promise.resolve([]) : prisma.vehicle.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const today = new Date();
  const money = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" }));
  const totalValue = assets.reduce((sum, a) => sum + (a.estimatedValue ?? 0), 0);
  const unvalued = assets.filter((a) => a.estimatedValue == null).length;
  const byPerson = new Map<string, { n: number; value: number }>();
  for (const a of assets) {
    const who = a.assignedToUser?.name ?? a.assignedToVehicle?.name ?? "Unassigned";
    const cur = byPerson.get(who) ?? { n: 0, value: 0 };
    byPerson.set(who, { n: cur.n + 1, value: cur.value + (a.estimatedValue ?? 0) });
  }

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{installer ? "My Assets" : "Assets"}</h2>
          <div className="subtitle">
            {installer
              ? `${assets.length} asset(s) assigned to you or your vehicle — report anything that needs repair below.`
              : `${assets.length} active asset(s) — tools, office equipment and other gear. Vehicles have their own page.`}
          </div>
        </div>
        {!installer && (
          <div className="actions">
            <Link href={adding ? "/assets" : "/assets?add=1"} className="btn primary">
              {adding ? "Cancel" : "+ Add New Asset"}
            </Link>
            <Link href="/vehicles" className="btn light">
              Go to Vehicles ↗
            </Link>
            {user.isSuperUser && (
              <a href="/assets/export" className="btn light">
                Export register (CSV)
              </a>
            )}
          </div>
        )}
      </div>

      {!installer && (
        <div className="cards">
          <div className="card"><div className="label">Assets</div><div className="metric">{assets.length}</div></div>
          <div className="card"><div className="label">Total value (purchase cost)</div><div className="metric">{money(totalValue)}</div></div>
          <div className="card"><div className="label">Without a value</div><div className="metric" style={unvalued ? { color: "#dc2626" } : undefined}>{unvalued}</div></div>
        </div>
      )}

      {!installer && byPerson.size > 0 && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Value by person / vehicle</div>
          <table style={{ marginTop: 8 }}>
            <thead><tr><th>Assigned to</th><th>Items</th><th>Value</th></tr></thead>
            <tbody>
              {[...byPerson.entries()].sort((a, b) => b[1].value - a[1].value).map(([who, v]) => (
                <tr key={who}><td>{who}</td><td>{v.n}</td><td>{money(v.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        <table>
          <thead>
            <tr>
              {!installer && <th>Code</th>}
              <th>Asset</th>
              <th>Type</th>
              <th>Serial Number</th>
              {!installer && <th>Purchased</th>}
              {!installer && <th>Value</th>}
              <th>Description</th>
              <th>Assigned To</th>
              <th>Test &amp; Tag Due</th>
              <th>Open Issues</th>
              {!installer && <th></th>}
            </tr>
          </thead>
          <tbody>
            {assets.map((a) => {
              const overdue = a.testTagDueDate && a.testTagDueDate < today;
              return (
                <tr key={a.id}>
                  {!installer && <td className="hint">{a.assetCode ?? "—"}</td>}
                  <td>{a.name}</td>
                  <td>{a.assetType}</td>
                  <td>{a.serialNumber ?? "—"}</td>
                  {!installer && <td>{a.purchaseDate ? a.purchaseDate.toLocaleDateString("en-NZ") : "—"}</td>}
                  {!installer && <td style={a.estimatedValue == null ? { color: "#dc2626" } : undefined}>{money(a.estimatedValue)}</td>}
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
                            {!installer && (
                              <form action={resolveAssetIssue.bind(null, i.id)} style={{ display: "inline", marginLeft: 6 }}>
                                <button type="submit" className="btn light">
                                  Resolve
                                </button>
                              </form>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </td>
                  {!installer && (
                    <td>
                      {user.isSuperUser && (
                        <details style={{ marginBottom: 6 }}>
                          <summary className="btn light" style={{ display: "inline-block", cursor: "pointer" }}>Edit</summary>
                          <form action={updateAssetRegister.bind(null, a.id)} style={{ marginTop: 8, minWidth: 260, display: "grid", gap: 6 }}>
                            <input name="name" defaultValue={a.name} placeholder="Name" />
                            <input name="assetCode" defaultValue={a.assetCode ?? ""} placeholder="Asset code" />
                            <input name="serialNumber" defaultValue={a.serialNumber ?? ""} placeholder="Serial number" />
                            <input name="estimatedValue" type="number" step="0.01" min="0" defaultValue={a.estimatedValue ?? ""} placeholder="Value ($)" />
                            <input name="purchaseDate" type="date" defaultValue={a.purchaseDate ? a.purchaseDate.toISOString().slice(0, 10) : ""} />
                            <button type="submit" className="btn primary">Save</button>
                          </form>
                        </details>
                      )}
                      <form action={retireAsset.bind(null, a.id)}>
                        <button type="submit" className="btn light">
                          Retire
                        </button>
                      </form>
                    </td>
                  )}
                </tr>
              );
            })}
            {assets.length === 0 && (
              <tr>
                <td colSpan={installer ? 7 : 11} className="hint">
                  {installer ? "No assets are assigned to you." : "No assets yet — add one below."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {adding && <AssetForm staff={staff} vehicles={vehicles} />}
      {assets.length > 0 && <AssetIssueForm assets={assets.map((a) => ({ id: a.id, name: a.name }))} />}
    </div>
  );
}
