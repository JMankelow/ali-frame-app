// Fills in ESTIMATED values for Fita's tools that have no purchase amount in the register export.
// These are second-hand market estimates (tools roughly 3 years old, NZ prices), NOT receipts —
// each row is tagged in its notes so they can be replaced with real figures. Only rows with no value are touched.
//   node scripts/estimate-fita-values.mjs [--dry-run]
import { PrismaClient } from "@prisma/client";
const DRY = process.argv.includes("--dry-run");
const p = new PrismaClient();

// serial -> [estimated value NZD, basis]
const ESTIMATES = {
  "22287MO519": [650, "Paslode angled finish nailer — about half of ~$1,300 new"],
  "2146LA0788": [650, "Paslode angled finish nailer — about half of ~$1,300 new"],
  N810590: [400, "Portable table saw — used market"],
  JM2318A004: [450, "Mitre / drop saw — about half of ~$850 new"],
  "504564": [250, "Green-beam line laser — about half of ~$500 new"],
  "1377094": [150, "Reciprocating saw — about half of ~$350 new"],
  N434882: [100, "Cordless blower — about half of ~$195 new"],
  "235753": [250, "Cordless circular saw — about half of ~$500 new"],
  GA4030K: [60, "Corded angle grinder — used market"],
  DC5356: [200, "Cordless multi-tool — about half of ~$390 new"],
  N494477: [150, "Cordless drill — about half of ~$300 new"],
  DCF809: [150, "18V impact driver — about half of ~$300 new"],
};

try {
  const user = await p.user.findFirst({ where: { name: { contains: "Fita" } } });
  const assets = await p.asset.findMany({ where: { assignedToUserId: user.id, estimatedValue: null } });
  let total = 0;
  for (const a of assets) {
    const est = ESTIMATES[String(a.serialNumber ?? "").trim()];
    if (!est) {
      console.log(`no estimate for: ${a.name} (${a.serialNumber})`);
      continue;
    }
    total += est[0];
    console.log(`${DRY ? "[dry] " : ""}${a.assetCode ?? ""} ${a.name.padEnd(22)} ${a.serialNumber?.padEnd(14)} -> $${est[0]}  (${est[1]})`);
    if (!DRY)
      await p.asset.update({
        where: { id: a.id },
        data: { estimatedValue: est[0], receiptNote: `ESTIMATED value (2026-10-05): ${est[1]}; assumed ~3 years old. Not a purchase price — replace with the receipt figure if known.` },
      });
  }
  console.log(`\nEstimated total added: $${total}`);
} finally {
  await p.$disconnect();
}
