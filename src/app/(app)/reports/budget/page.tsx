import { SingleXeroReportPage } from "@/components/SingleXeroReportPage";
import { getBudgetSummary } from "@/lib/xeroReports";

function currentFinancialYear() {
  const now = new Date();
  const fyStartYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return {
    from: new Date(Date.UTC(fyStartYear, 3, 1)),
    to: new Date(Date.UTC(fyStartYear + 1, 2, 31)),
    label: `FY${fyStartYear + 1}`,
  };
}

export default function Page() {
  const { from, to, label } = currentFinancialYear();
  return (
    <SingleXeroReportPage
      title="Budget vs Actual"
      subtitle={`${label} (${from.toLocaleDateString("en-NZ")} – ${to.toLocaleDateString("en-NZ")}).`}
      fetchReport={() => getBudgetSummary(from, to)}
    />
  );
}
