import Link from "next/link";
import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { getOutstandingInvoices, type OutstandingInvoice } from "@/lib/xeroReports";

function money(v: number): string {
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

function InvoiceTable({ title, invoices, error }: { title: string; invoices: OutstandingInvoice[] | null; error: string }) {
  const total = invoices?.reduce((sum, i) => sum + i.amountDue, 0) ?? 0;

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">{title}</div>
        {invoices && <div className="metric" style={{ fontSize: 20 }}>{money(total)} outstanding</div>}
      </div>
      {error && <div className="authError">{error}</div>}
      {invoices && (
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
      )}
    </div>
  );
}

export default async function InvoicesPage() {
  await requireUser();
  const connection = await getXeroConnectionStatus();

  if (!connection) {
    return (
      <div>
        <div className="topbar">
          <div>
            <h2>Invoices</h2>
            <div className="subtitle">Accounts Receivable and Accounts Payable, live from Xero.</div>
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

  async function safe(type: "ACCREC" | "ACCPAY"): Promise<{ invoices: OutstandingInvoice[] | null; error: string }> {
    try {
      return { invoices: await getOutstandingInvoices(type), error: "" };
    } catch (err) {
      return { invoices: null, error: err instanceof Error ? err.message : "Could not load invoices from Xero." };
    }
  }

  const [ar, ap] = await Promise.all([safe("ACCREC"), safe("ACCPAY")]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Invoices</h2>
          <div className="subtitle">Live from {connection.tenantName}.</div>
        </div>
      </div>

      <InvoiceTable title="Accounts Receivable — Money Owed To Us" invoices={ar.invoices} error={ar.error} />
      <InvoiceTable title="Accounts Payable — Money We Owe" invoices={ap.invoices} error={ap.error} />
    </div>
  );
}
