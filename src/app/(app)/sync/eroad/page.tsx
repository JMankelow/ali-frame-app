import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/ComingSoon";

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Sync EROAD" hint="Not connected yet — needs API access from Jo's EROAD account manager." />;
}
