import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getOutstandingInvoices, type OutstandingInvoice } from "@/lib/xeroReports";

function money(v: number): string {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

export async function InvoiceListPage({
  title,
  subtitle,
  type,
}: {
  title: string;
  subtitle: string;
  type: "ACCREC" | "ACCPAY";
}) {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>{title}</h2>
            <div className="subtitle">{subtitle}</div>
          </div>
        </div>
        <div className="card">
          <p>Xero isn&apos;t connected yet.</p>
          <div className="actions" style={{ marginTop: 12 }}>
            <Link href="/sync/xero" className="btn primary">
              Connect Xero
            </Link>
          </div>
        </div>
      </div>
    );
  }

  let invoices: OutstandingInvoice[] | null = null;
  let error = "";
  try {
    invoices = await getOutstandingInvoices(type);
  } catch (err) {
    error = err instanceof Error ? err.message : "Could not load invoices from Xero.";
  }

  const total = invoices?.reduce((sum, i) => sum + i.amountDue, 0) ?? 0;

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{title}</h2>
          <div className="subtitle">{subtitle} Live from {connection.tenantName}.</div>
        </div>
        {invoices && <div className="metric" style={{ fontSize: 20 }}>{money(total)} outstanding</div>}
      </div>

      {error && <div className="authError">{error}</div>}

      {invoices && (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Contact</th>
                <th>Due Date</th>
                <th>Total</th>
                <th>Amount Due</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.invoiceNumber}>
                  <td>{inv.invoiceNumber}</td>
                  <td>{inv.contactName}</td>
                  <td>{inv.dueDate ? inv.dueDate.toLocaleDateString("en-NZ") : "—"}</td>
                  <td>{money(inv.total)}</td>
                  <td>{money(inv.amountDue)}</td>
                  <td>
                    {inv.daysOverdue > 0 ? (
                      <span className="status red">{inv.daysOverdue} days overdue</span>
                    ) : (
                      <span className="status grey">Not yet due</span>
                    )}
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="hint">
                    Nothing outstanding.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
