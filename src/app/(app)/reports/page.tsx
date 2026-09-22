import Link from "next/link";
import { requireUser } from "@/lib/session";

const REPORTS = [
  { label: "Profit & Loss", href: "/reports/profit-loss", hint: "This/last month, this/last FY, or a custom range." },
  { label: "Balance Sheet", href: "/reports/balance-sheet", hint: "Point-in-time snapshot as at today." },
  { label: "Budget vs Actual", href: "/reports/budget", hint: "Current financial year." },
  { label: "Accounts Receivable", href: "/reports/accounts-receivable", hint: "Outstanding customer invoices." },
  { label: "Accounts Payable", href: "/reports/accounts-payable", hint: "Outstanding supplier bills." },
  { label: "Monthly Management Report", href: "/reports/monthly", hint: "P&L + Balance Sheet + Cashflow + WIP, all in one." },
];

export default async function ReportsHubPage() {
  await requireUser();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Reports</h2>
          <div className="subtitle">Pick a report — each pulls live from Xero.</div>
        </div>
      </div>

      <div className="cards">
        {REPORTS.map((r) => (
          <Link key={r.href} href={r.href} className="card" style={{ textDecoration: "none", color: "inherit" }}>
            <div className="label">{r.label}</div>
            <div className="hint" style={{ marginTop: 6 }}>{r.hint}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
