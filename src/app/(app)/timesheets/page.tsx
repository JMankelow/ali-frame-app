import { requireUser } from "@/lib/session";
import { ComingSoon } from "@/components/ComingSoon";

export default async function Page() {
  await requireUser();
  return <ComingSoon title="Timesheets" />;
}
