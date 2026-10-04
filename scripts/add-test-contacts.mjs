// Adds Jo and Tanya as selectable supplier contacts so the Site Measure "email to supplier" flow
// can be tested end to end without emailing a real supplier. Idempotent. Remove them from the
// Supplier list (company "Ali-Frame (internal test)") once testing is done.
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const CONTACTS = [
  { contactName: "Tanya Cleghorn", email: "tanya@aliframe.co.nz" },
  { contactName: "Jo Mankelow", email: "jo@aliframe.co.nz" },
];
try {
  for (const c of CONTACTS) {
    const existing = await p.supplier.findFirst({ where: { email: c.email } });
    if (existing) {
      console.log(`exists  ${c.email}`);
      continue;
    }
    await p.supplier.create({ data: { companyName: "Ali-Frame (internal test)", contactName: c.contactName, email: c.email } });
    console.log(`added   ${c.contactName} <${c.email}>`);
  }
} finally {
  await p.$disconnect();
}
