import "server-only";
import { getValidXeroClient } from "./xero";

// Account codes taken from Jo's own real month-end WIP journal in Xero
// (screenshot shown 2026-09-22) — confirm with her if these ever change.
const RESIDENTIAL_WIP_ACCOUNT = "209"; // Ali Frame - Residential
const COMMERCIAL_WIP_ACCOUNT = "208"; // Ali Frame - Commercial
const INCOME_IN_ADVANCE_ACCOUNT = "638"; // Income in Advance

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Creates the month-end WIP journal as a DRAFT (never auto-posted — Jo
 * reviews and approves it in Xero herself), plus its reversal dated the
 * first of the next month. Xero's Manual Journal API has no "auto-reversing"
 * flag (that's a Xero UI-only feature), so this creates two real DRAFT
 * journals with mirrored debits/credits to get the same effect.
 */
export async function createWipJournalPair(params: {
  monthEndDate: Date;
  residentialTotal: number;
  commercialTotal: number;
}): Promise<{ journalId: string; reversalJournalId: string }> {
  const { client, tenantId } = await getValidXeroClient();
  const { monthEndDate, residentialTotal, commercialTotal } = params;

  const nextDay = new Date(monthEndDate);
  nextDay.setDate(nextDay.getDate() + 1);

  const narrationDate = monthEndDate.toLocaleDateString("en-NZ");

  function journalLines(sign: 1 | -1) {
    const lines = [];
    if (residentialTotal !== 0) {
      lines.push(
        { description: `Work in Progress ${narrationDate}`, accountCode: RESIDENTIAL_WIP_ACCOUNT, lineAmount: sign * residentialTotal, taxType: "NONE" },
        { description: `Work in Progress ${narrationDate}`, accountCode: INCOME_IN_ADVANCE_ACCOUNT, lineAmount: -sign * residentialTotal, taxType: "NONE" }
      );
    }
    if (commercialTotal !== 0) {
      lines.push(
        { description: `Work in Progress ${narrationDate}`, accountCode: COMMERCIAL_WIP_ACCOUNT, lineAmount: sign * commercialTotal, taxType: "NONE" },
        { description: `Work in Progress ${narrationDate}`, accountCode: INCOME_IN_ADVANCE_ACCOUNT, lineAmount: -sign * commercialTotal, taxType: "NONE" }
      );
    }
    return lines;
  }

  const response = await client.accountingApi.createManualJournals(tenantId, {
    manualJournals: [
      {
        narration: `Residential/Commercial WIP — ${narrationDate}`,
        date: isoDate(monthEndDate),
        status: "DRAFT" as never,
        journalLines: journalLines(1) as never,
      },
      {
        narration: `Reversal of WIP journal — ${narrationDate}`,
        date: isoDate(nextDay),
        status: "DRAFT" as never,
        journalLines: journalLines(-1) as never,
      },
    ],
  });

  const [journal, reversal] = response.body.manualJournals ?? [];
  if (!journal?.manualJournalID || !reversal?.manualJournalID) {
    throw new Error("Xero did not return the created journals.");
  }

  return { journalId: journal.manualJournalID, reversalJournalId: reversal.manualJournalID };
}
