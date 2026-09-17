import { requireUser } from "@/lib/session";
import { QuoteWordingTool } from "./QuoteWordingTool";

export default async function QuoteWordingPage() {
  await requireUser();
  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Quote Wording</h2>
          <div className="subtitle">Build copy-ready quote wording to paste into NextMinute.</div>
        </div>
      </div>
      <QuoteWordingTool />
    </div>
  );
}
