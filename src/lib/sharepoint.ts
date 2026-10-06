// The real job folders (e.g. "11938 Scott Thompson") live in Jo's OneDrive
// for Business under "Ali Frame - Sales & Operations - Documents", named
// "<job number><client name>" with an inconsistent separator (space, "-",
// "- "). Rather than requiring a full Microsoft Graph app registration just
// to open a folder, this builds a SharePoint search link scoped to the job
// number — one click lands on the matching folder without needing any new
// credentials. If Jo later wants direct deep-links (not just search), that
// needs an Azure AD app registration with Graph Files.Read.All — a bigger,
// separate step, same shape as the Xero setup.
const SHAREPOINT_BASE = "https://blbconsultantsltd-my.sharepoint.com/personal/jo_aliframe_co_nz";

// Job folders are in the "Ali Frame - Sales & Operations" team site, which the whole team can open
// (the old link went to Jo's personal OneDrive, which nobody else can see).
const SALES_OPS_SITE = "https://blbconsultantsltd.sharepoint.com/sites/AliFrameWindowsDoors-SalesOperations";

export function buildSharePointSearchUrl(jobNumber: string): string {
  return `${SALES_OPS_SITE}/_layouts/15/search.aspx?q=${encodeURIComponent(jobNumber)}`;
}

// Employee HR folders live under the same site
// ("Management - Documents/Human Resources/Operations Human Resources/1 -
// Employees - Installers/<Surname, Firstname or full name>"), inconsistently
// named — some "Surname, Firstname", some full name as-is — so this searches
// by name rather than guessing the exact folder string.
export function buildEmployeeSharePointUrl(employeeName: string): string {
  return `${SHAREPOINT_BASE}/_layouts/15/search.aspx?q=${encodeURIComponent(employeeName)}`;
}
