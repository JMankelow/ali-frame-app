import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PurchaseOrderForm } from "./PurchaseOrderForm";
import { markPurchaseOrderReceived } from "./actions";

export default async function PurchaseOrdersPage() {
  await requireUser();

  const [orders, jobs] = await Promise.all([
    prisma.purchaseOrder.findMany({ include: { orderedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Purchase Orders</h2>
          <div className="subtitle">{orders.length} purchase order(s) — shared, real-time for everyone signed in.</div>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>PO Number</th>
              <th>Job</th>
              <th>Supplier</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Ordered By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {orders.map((po) => (
              <tr key={po.id}>
                <td>{po.poNumber}</td>
                <td>{po.jobNumber}</td>
                <td>{po.supplier}</td>
                <td>{po.description ?? "—"}</td>
                <td>${po.amount.toLocaleString("en-NZ", { minimumFractionDigits: 2 })}</td>
                <td>
                  <span className={`status ${po.status === "Received" ? "green" : "orange"}`}>{po.status}</span>
                </td>
                <td>{po.orderedBy?.name ?? "—"}</td>
                <td>
                  {po.status !== "Received" && (
                    <form action={markPurchaseOrderReceived.bind(null, po.id)}>
                      <button type="submit" className="btn light">
                        Mark Received
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="hint">
                  No purchase orders yet — add the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PurchaseOrderForm jobs={jobs} />
    </div>
  );
}
