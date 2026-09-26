// Real supplier/vendor contact list Jo pasted directly into chat (2026-09-25).
// Idempotent: upserts by companyName+email combo (skips exact duplicates).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SUPPLIERS = [
  { contactName: null, company: "3 PM - Easyforms", phone: null, email: "accounts@3pm.nz", address: null },
  { contactName: "Treena", company: "A Safe Working Environment For All", phone: null, email: "Sales@aswefa.co.nz", address: null },
  { contactName: "Ashley Ball", company: "ANB Embroidery & Promotional Solutions", phone: "027 4854782", email: "sales@anythingneedingbranding.co.nz", address: null },
  { contactName: "Alistair van Schalkwyk", company: "ASCO LEGAL", phone: null, email: "info@ascoleqal.co.nz", address: null },
  { contactName: null, company: "Ascot Aluminium", phone: null, email: "accounts@ascotaluminium.co.nz", address: null },
  { contactName: "Keu Lorangi", company: "Ask Q Ltd", phone: "+64 210 2312709", email: "keu@askq.co.nz", address: null },
  { contactName: null, company: "Carters East Tamaki", phone: null, email: "fleur.morgan@carters.co.nz", address: null },
  { contactName: "Christin Thomas", company: "Vision Windows", phone: "09 268 6800", email: "christin@visionwindows.co.nz", address: "33 Rangi Road, Takanini, Auckland 2105, New Zealand" },
  { contactName: "Doug Brand", company: "Crighton Engineering & Manufacturing Ltd", phone: null, email: "doug@crighton.co.nz", address: null },
  { contactName: "Jens Van Der Sanden", company: "Daily Freight Ltd", phone: "+64 27 7064079", email: "Jens.vanderSanden@dailyfreight.co.nz", address: null },
  { contactName: "Dylan Abbott", company: "DS SIGNS & INSTALLATIONS", phone: "0275218182", email: "ds.signs@live.com", address: null },
  { contactName: "Ian Buller", company: "Duzit All", phone: "0274389482", email: "duzitall@xtra.co.nz", address: null },
  { contactName: null, company: "Eastern Auto Performance Centre", phone: null, email: "info@eapc.co.nz", address: null },
  { contactName: "Fraser Illsley", company: "Effort Construction", phone: "0272762061", email: "fraser@blbconsultants.co.nz", address: null },
  { contactName: "Jared McCraken", company: "Electracraft Limited", phone: "0274627483", email: "jared@ecraft.co.nz", address: null },
  { contactName: null, company: "Elgas New Zealand Ltd", phone: null, email: "auckland@elgas.co.nz", address: null },
  { contactName: null, company: "Flashings Direct", phone: null, email: "orders@flashingsdirect.co.nz", address: "1/43 The Concourse, Henderson, Auckland 0610, New Zealand" },
  { contactName: "Richard", company: "Flow Electrical", phone: "02102426212", email: "info@flowelectrical.co.nz", address: null },
  { contactName: null, company: "HDMasters", phone: null, email: "office@masterscivil.co.nz", address: null },
  { contactName: null, company: "iPayroll Ltd", phone: null, email: "help@ipayroll.co.nz", address: null },
  { contactName: "Accounts", company: "JJ Richards", phone: null, email: "ar.auckland@jjswaste.co.nz", address: null },
  { contactName: null, company: "Just water", phone: null, email: "accounts@justwater.co.nz", address: null },
  { contactName: null, company: "Loscam", phone: null, email: "cs.nz@loscam.com", address: null },
  { contactName: "Maree Littlewood", company: "Counties Aluminium", phone: "0272067249", email: "info@countiesaluminium.co.nz", address: "69 Hunua Road, Hunua 2583, New Zealand" },
  { contactName: "Martin Lindgreen", company: "Roof Fix", phone: "021 542 546", email: "lindgreenmartin@gmail.com", address: null },
  { contactName: null, company: "New Zealand Post", phone: null, email: "accounts@nzpost.co.nz", address: null },
  { contactName: "Nick", company: "Summit Windows & Doors", phone: null, email: "nick@summitwindows.co.nz", address: "252 Roscommon Road, Wiri, Auckland 2104, New Zealand" },
  { contactName: "Nilesh", company: "Rylock", phone: null, email: "nilesh@rylockaucklandsouth.co.nz", address: "Blackburn Road, East Tāmaki, Auckland 2013, New Zealand" },
  { contactName: "Nilesh Kumar", company: "Rylock", phone: "027 437 6200", email: "nilesh@rylockaucklandsouth.co.nz", address: "10 Blackburn Road, East Tāmaki, Auckland 2013, New Zealand" },
  { contactName: "Daniel Jacka", company: "NZ Windows", phone: "027 263 6056", email: "DanielJ@nzwindows.co.nz", address: "46 Princes Street, Ōtāhuhu, Auckland 1062, New Zealand" },
  { contactName: "Kath M", company: "NZWindows", phone: null, email: "KathM@nzwindows.co.nz", address: null },
  { contactName: null, company: "OFFICE MAX", phone: null, email: "invoices@officemax.co.nz", address: null },
  { contactName: "Paul Smith", company: "NZ Windows", phone: "0273795393", email: "PaulS@nzwindows.co.nz", address: "46 Princes Street, Auckland 1062, New Zealand" },
  { contactName: null, company: "Ricoh New Zealand Limited", phone: null, email: "statements@ricoh.co.nz", address: null },
  { contactName: null, company: "Smudge", phone: null, email: "kylie@smudgesigns.co.nz", address: "177 Captain Springs Road, Onehunga, Auckland 1061, New Zealand" },
  { contactName: null, company: "South Pacific Timber(1990) Ltd", phone: null, email: "orders@southpacifictimber.co.nz", address: null },
  { contactName: "Eric Scott", company: "Southern Signs", phone: "021627493", email: "scottbuilt@xtra.co.nz", address: null },
  { contactName: null, company: "Stellar Machinery", phone: null, email: "Nikilesh@stellarmachinery.co.nz", address: null },
  { contactName: null, company: "Summit Aliminium", phone: null, email: "accounts@summitwindows.co.nz", address: null },
  { contactName: "Steve", company: "Summit Windows", phone: null, email: "steve@summitwndows.co.nz", address: null },
  { contactName: "Hamish Holder", company: "GD Rutter", phone: "0274445258", email: "sales@gdrutter.co.nz", address: "127 Diana Drive, Wairau Valley, Auckland 0627, New Zealand" },
  { contactName: "Tata Nyunt", company: "Ascot Aluminum", phone: "0272741945", email: "tata@ascotaluminium.co.nz", address: "30A Noel Burnside Road, Wiri, Auckland 2025, New Zealand" },
  { contactName: null, company: "Tier 4", phone: null, email: "receivables@tier4.co.nz", address: null },
  { contactName: null, company: "Top Flight Computer Services", phone: null, email: "yasmin.patel@topflight.co.nz", address: null },
  { contactName: "Troy Adam", company: "Summit Windows & Doors", phone: null, email: "Troy@summitwindows.co.nz", address: "252 Roscommon Road, Wiri, Auckland 2104, New Zealand" },
  { contactName: "Troy Simanu", company: "Altherm West Limited", phone: "0228544378", email: "Troy@althermwest.co.nz", address: null },
  { contactName: "Roan Blom", company: "Vision Windows", phone: "021 509 423", email: "sales@visionwindows.co.nz", address: "33 Rangi Road, Takanini, Auckland 2105, New Zealand" },
  { contactName: "Sarah", company: "Vision Windows", phone: null, email: "admin@visionwindows.co.nz", address: null },
  { contactName: null, company: "Wurth", phone: null, email: "accounts@wurth.co.nz", address: null },
];

async function main() {
  let created = 0;
  let skipped = 0;
  for (const s of SUPPLIERS) {
    const existing = await prisma.supplier.findFirst({ where: { companyName: s.company, email: s.email } });
    if (existing) {
      skipped += 1;
      continue;
    }
    await prisma.supplier.create({
      data: { companyName: s.company, contactName: s.contactName, phone: s.phone, email: s.email, address: s.address },
    });
    created += 1;
  }
  console.log(`Created ${created} suppliers, skipped ${skipped} already-imported.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
