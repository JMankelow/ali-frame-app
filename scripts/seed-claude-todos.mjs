// Running to-do list of outstanding work, requested by Jo (2026-09-28) so she
// can see what's not done in one place (Update Notes). Self-assigned to the
// Claude pseudo-user; resolved directly (not "return to creator") as each is
// finished, since these are self-tracked rather than handed-back review work.
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const TODOS = [
  "Build Book Appointment as a real feature — still the old prototype (not backed by the live database).",
  "Build the Final Check Measure document generator (Tanya-approved template, per-item technical schedule) + Generate Client Copy variant that strips supplier info.",
  "Add Google Maps links to every displayed address across the app.",
  "Add lead email upload capability (attach the original enquiry email/file to a Lead).",
  "Purchase Order enhancement: supplier picker from the real Supplier table (add supplierId FK), link the final measure via SharePoint, and a Send to Supplier email action using Jo's exact wording.",
  "Import Jobs.xlsx (5,010 rows) — blocked: no reliable date field to filter '2025 onwards'. Need a cutoff criterion from Jo (e.g. a job number range).",
  "Inspect Budget 2027.xls and decide whether it's already covered by the live Xero Budget vs Actual report or needs separate handling.",
  "Re-run a full Job Tracking re-import using the updated spreadsheet's shifted column mapping, if/when Jo wants the dataset refreshed rather than just the targeted Install Date update already applied.",
  "Create the Render Cron Job resources for the daily (vehicle-checklists, backup, installer-reviews) and monthly (wip-snapshot, vehicle-checklists-monthly) endpoints — these are ready in code but nothing is scheduling them yet on Render's side.",
  "Confirm Xero bill-to-job/vehicle auto-linking format with Jo.",
  "Decide on requireRole() tightening for archiveJob/reactivateJob/markLeadConverted/markPurchaseOrderReceived — currently open to every signed-in user.",
  "Wire real SharePoint upload for job Photos/Files (needs a Microsoft/Azure app registration from Jo — Files.ReadWrite.All + admin consent — before this can replace the current R2 stopgap).",
  "Scope and build the Installer mobile access view (per the PDF mockup) — Client Details/Photos/Time Log can reuse existing pieces, but Instant Messaging is a whole new feature with no data model yet.",
  "Add a cladding dropdown (Brick/Weatherboard/Plaster/Hardiplank/Cedar) to the Site Measure sheet, replacing the free-text field.",
  "Add line/type options to the Site Measure pen tool so measurements can be labelled directly on the drawing.",
  "Get the real quote email template Jo intended to send (referenced as sent 'Saturday' — never actually arrived in chat) — needed before that template can be added to Templates.",
  "Get the list of new suppliers Jo wants added (referenced but the actual list never arrived in chat).",
  "Generate the Install QA Checklist automatically once a job's Check Measure is complete and the order is placed (real content already captured from Jo's PDF).",
];

async function main() {
  const claude = await prisma.user.findUnique({ where: { email: "claude@aliframe.local" } });
  if (!claude) throw new Error("Claude pseudo-user not found.");

  let created = 0;
  for (const text of TODOS) {
    const existing = await prisma.note.findFirst({ where: { text, assignedToId: claude.id } });
    if (existing) continue;
    await prisma.note.create({ data: { text, authorId: claude.id, assignedToId: claude.id } });
    created += 1;
  }
  console.log(`Created ${created} to-do notes (skipped ${TODOS.length - created} already present).`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
