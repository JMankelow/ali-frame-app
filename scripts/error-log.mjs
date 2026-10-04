// Usage: node scripts/error-log.mjs            -> 20 most recent server errors
//        node scripts/error-log.mjs <digest>   -> the error behind a "Reference" code
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const digest = process.argv[2];
try {
  const rows = await p.errorLog.findMany({
    where: digest ? { digest } : {},
    orderBy: { createdAt: "desc" },
    take: digest ? 5 : 20,
  });
  if (rows.length === 0) console.log(digest ? `No logged error with reference ${digest}` : "No errors logged yet");
  for (const r of rows) {
    console.log(`\n${r.createdAt.toISOString()}  ref ${r.digest ?? "-"}  ${r.method ?? ""} ${r.path}  [${r.routeType ?? ""}]`);
    console.log(`  ${r.errorName ?? "Error"}: ${r.message}`);
    if (digest && r.stack) console.log(r.stack.split("\n").slice(0, 8).map((l) => "    " + l).join("\n"));
  }
} finally {
  await p.$disconnect();
}
