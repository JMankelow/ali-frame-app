import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TemplateRow } from "./TemplateRow";
import { TemplateForm } from "./TemplateForm";

export default async function TemplatesPage() {
  await requireUser();

  const templates = await prisma.emailTemplate.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Templates</h2>
          <div className="subtitle">
            Reusable email wording — pick one, fill in the placeholders, send. (Sending directly from a job/quote/PO
            with a chosen sender&apos;s signature, per the prototype, is a follow-up once general outbound email
            exists — for now this is the shared library of wording itself.)
          </div>
        </div>
      </div>

      {templates.length === 0 && (
        <div className="card">
          <div className="hint">No templates yet — add the first one below.</div>
        </div>
      )}

      {templates.map((t) => (
        <TemplateRow key={t.id} id={t.id} name={t.name} subject={t.subject} body={t.body} />
      ))}

      <TemplateForm />
    </div>
  );
}
