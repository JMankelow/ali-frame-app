import "server-only";
import { getValidXeroClient } from "./xero";

export interface ReportRow {
  label: string;
  values: string[];
  isSummary: boolean;
}

export interface ParsedReport {
  title: string;
  columnLabels: string[];
  rows: ReportRow[];
}

// Xero's report API returns a recursive Header/Section/Row/SummaryRow tree
// per report; flattening it into a plain row list (indenting section rows
// under their parent) is far more transparent for real financial data than
// trying to guess which handful of lines matter.
function flattenRows(rows: unknown[], depth = 0): ReportRow[] {
  const out: ReportRow[] = [];
  for (const raw of rows as Array<{ rowType?: string; title?: string; cells?: Array<{ value?: string }>; rows?: unknown[] }>) {
    if (raw.rowType === "Section") {
      if (raw.title) out.push({ label: raw.title, values: [], isSummary: false });
      if (raw.rows) out.push(...flattenRows(raw.rows, depth + 1));
    } else if (raw.rowType === "Row" || raw.rowType === "SummaryRow") {
      const cells = raw.cells ?? [];
      const label = "  ".repeat(depth) + (cells[0]?.value ?? "");
      const values = cells.slice(1).map((c) => c.value ?? "");
      out.push({ label, values, isSummary: raw.rowType === "SummaryRow" });
    }
  }
  return out;
}

function parseReport(report: { reportTitles?: string[]; rows?: unknown[] }): ParsedReport {
  const rows = report.rows ?? [];
  const headerRow = (rows[0] as { rowType?: string; cells?: Array<{ value?: string }> } | undefined);
  const columnLabels = headerRow?.rowType === "Header" ? (headerRow.cells ?? []).slice(1).map((c) => c.value ?? "") : [];
  const bodyRows = headerRow?.rowType === "Header" ? rows.slice(1) : rows;

  return {
    title: (report.reportTitles ?? []).join(" — "),
    columnLabels,
    rows: flattenRows(bodyRows),
  };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function getProfitAndLoss(fromDate: Date, toDate: Date): Promise<ParsedReport> {
  const { client, tenantId } = await getValidXeroClient();
  const response = await client.accountingApi.getReportProfitAndLoss(tenantId, isoDate(fromDate), isoDate(toDate));
  const report = response.body.reports?.[0];
  if (!report) throw new Error("Xero returned no Profit and Loss report.");
  return parseReport(report);
}
