import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/ComingSoon";

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Sync Xero" hint="Not connected yet — needs a Xero Developer app (Client ID/Secret) from Jo." />;
}
