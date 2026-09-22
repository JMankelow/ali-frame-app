import { SingleXeroReportPage } from "@/components/SingleXeroReportPage";
import { getBalanceSheet } from "@/lib/xeroReports";

export default function Page() {
  const today = new Date();
  return (
    <SingleXeroReportPage
      title="Balance Sheet"
      subtitle={`As at ${today.toLocaleDateString("en-NZ")}.`}
      fetchReport={() => getBalanceSheet(today)}
    />
  );
}
