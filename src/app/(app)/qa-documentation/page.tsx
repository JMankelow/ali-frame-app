import { redirect } from "next/navigation";

// QA reporting lives under Health & Safety.
export default function Page() {
  redirect("/health-safety/qa");
}
