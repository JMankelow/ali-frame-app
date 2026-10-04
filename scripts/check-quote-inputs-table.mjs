import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
try {
  const r = await p.$queryRawUnsafe(`select to_regclass('public."JobQuoteInputs"')::text as t`);
  console.log("table:", JSON.stringify(r));
  if (r[0].t) {
    const c = await p.$queryRawUnsafe(`select count(*)::int as n from "JobQuoteInputs"`);
    console.log("rows:", JSON.stringify(c));
  }
} finally {
  await p.$disconnect();
}
