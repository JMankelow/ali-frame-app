import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { FileRow } from "../../files/FileRow";
import { buildSharePointSearchUrl } from "@/lib/sharepoint";
import { JobDetailsCard } from "./JobDetailsCard";
import { JobTabs } from "./JobTabs";
import { ScheduledTasksSection, type ScheduledTaskRow } from "./ScheduledTasksSection";
import { JobNotesSection, type JobFeedItem } from "./JobNotesSection";
import { JobChecklistSection, type ChecklistItem } from "./JobChecklistSection";
import { ScheduleUpload } from "./ScheduleUpload";
import { PhotosSection } from "./PhotosSection";
import { BookCheckMeasureForm } from "../../email-client/BookCheckMeasureForm";
import { SendTemplateEmailForm } from "./SendTemplateEmailForm";
import { JobTimeSection } from "./JobTimeSection";
import { isInstallerProfile } from "@/lib/permissions";
import { createQaSheet } from "../../health-safety/qa/sheetActions";
import { cleanPack, dollars, labourLine } from "@/lib/checkMeasure";

// Field staff only get these tabs — no quotes, orders, costing, supplier invoices or client email.
const INSTALLER_TABS = ["details", "qa", "schedule", "tasks", "photos", "notes", "time", "files", "checklist"];
const INSTALLER_HIDDEN_AUDIT = /^(purchase_order|templated_email|check_measure_booking|repricing|quote)/;

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

const AUDIT_LABELS: Record<string, (m: Record<string, unknown> | null) => string> = {
  job_created: () => "Job created.",
  job_updated: (m) =>
    m?.statusFrom && m?.statusTo ? `Status changed from ${m.statusFrom} to ${m.statusTo}.` : "Job details updated.",
  sales_rep_notified_booked_in: (m) => `Sales rep${m?.to ? ` (${m.to})` : ""} emailed that the job is booked in.`,
  job_archived: () => "Job archived.",
  job_reactivated: () => "Job reactivated.",
  note_added: () => "Added a note.",
  scheduled_task_created: (m) =>
    `Booked ${m?.type ?? "a task"} for ${m?.scheduledDate ? new Date(String(m.scheduledDate)).toLocaleDateString("en-NZ") : "—"}.`,
  scheduled_task_updated: (m) => `Updated booking — ${m?.type ?? ""} now ${m?.status ?? ""}.`,
  check_measure_booking_emailed: () => "Emailed the client to book Check Measure.",
  purchase_order_created: (m) => `Placed purchase order with ${m?.supplier ?? "supplier"} (${money(Number(m?.amount) || 0)}).`,
  purchase_order_received: (m) => `Purchase order ${m?.poNumber ?? ""} marked received.`,
  remedial_created: (m) => `Remedial raised (${m?.priority ?? "Normal"} priority) — Tanya and Tristam notified.`,
  remedial_auto_raised: () => "Remedial auto-raised on status change to Remedial Work Required.",
  remedial_resolved: () => "Remedial marked resolved.",
  templated_email_sent: (m) => `Emailed ${m?.to ?? "client"}: ${m?.subject ?? ""}`,
};

export default async function JobDetailPage({ params }: { params: Promise<{ number: string }> }) {
  const currentUser = await requireUser();
  const installer = isInstallerProfile(currentUser);
  const { number } = await params;

  const [job, salesStaff, allStaff, suppliers] = await Promise.all([
    prisma.job.findUnique({
      where: { number },
      include: { client: true, assignedUser: true, costing: true },
    }),
    prisma.user.findMany({ where: { isActive: true, role: "SALES" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.supplier.findMany({ orderBy: { companyName: "asc" }, select: { id: true, companyName: true } }),
  ]);
  if (!job) notFound();
  // Field staff can only open jobs they are booked on — customer details for every other job stay private.
  if (installer && !(await prisma.jobScheduledTask.findFirst({ where: { jobNumber: number, assignees: { some: { id: currentUser.id } } }, select: { id: true } }))) notFound();

  const [files, scheduledTasks, notes, auditLogs, quotes, purchaseOrders, emailTemplates] = await Promise.all([
    prisma.fileAsset.findMany({ where: { jobNumber: number }, include: { uploadedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.jobScheduledTask.findMany({ where: { jobNumber: number }, include: { assignees: true }, orderBy: { scheduledDate: "asc" } }),
    prisma.note.findMany({ where: { jobNumber: number }, include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ where: { entityType: "Job", entityId: number }, include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.quote.findMany({ where: { jobNumber: number }, orderBy: { quoteDate: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { jobNumber: number }, include: { orderedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.emailTemplate.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, subject: true, body: true } }),
  ]);

  const [hoursAgg, quoteInputs, timeEntries] = await Promise.all([
    prisma.timesheetEntry.groupBy({ by: ["isRemedial"], where: { jobNumber: number }, _sum: { totalHours: true } }),
    prisma.jobQuoteInputs.findUnique({ where: { jobNumber: number } }),
    prisma.timesheetEntry.findMany({
      where: { jobNumber: number, ...(installer ? { userId: currentUser.id } : {}) },
      include: { user: true },
      orderBy: { dateWorked: "desc" },
      take: 100,
    }),
  ]);
  const hoursLogged = hoursAgg.find((h) => !h.isRemedial)?._sum.totalHours ?? 0; // usual install labour
  const remedialHoursLogged = hoursAgg.find((h) => h.isRemedial)?._sum.totalHours ?? 0;

  // Supplier contacts for this job's supplier — lets the email "To" fill itself in for supplier templates.
  const supplierContactRows = job.supplier
    ? await prisma.supplier.findMany({
        where: { companyName: { contains: job.supplier.trim(), mode: "insensitive" }, email: { not: null } },
        select: { contactName: true, email: true },
      })
    : [];
  const supplierContacts = supplierContactRows.filter((c) => c.email).map((c) => ({ name: c.contactName ?? c.email!, email: c.email! }));

  const siteMeasureFiles = files.filter((f) => f.fileType === "Site Measure");
  const photoFiles = files.filter((f) => f.fileType === "Photos");
  const allOtherFiles = files.filter((f) => f.fileType !== "Site Measure" && f.fileType !== "Photos");
  // Field staff see the job's plans / check measure pack only — not supplier quotes, repricing or correspondence.
  const otherFiles = installer ? allOtherFiles.filter((f) => f.fileType === "Plan" || f.fileType === "Supplier Schedule") : allOtherFiles;

  const taskRows: ScheduledTaskRow[] = scheduledTasks.map((t) => ({
    id: t.id,
    type: t.type,
    scheduledDate: t.scheduledDate.toISOString(),
    endDate: t.endDate ? t.endDate.toISOString() : null,
    status: t.status,
    notes: t.notes,
    startTime: t.startTime,
    endTime: t.endTime,
    assigneeIds: t.assignees.map((a) => a.id),
    assigneeNames: t.assignees.map((a) => a.name),
  }));

  const feed: JobFeedItem[] = [
    ...notes.map((n) => ({
      id: `note-${n.id}`,
      kind: "note" as const,
      text: n.text,
      authorName: n.author.name,
      createdAt: n.createdAt.toISOString(),
    })),
    ...auditLogs.filter((a) => !installer || !INSTALLER_HIDDEN_AUDIT.test(a.action)).map((a) => ({
      id: `audit-${a.id}`,
      kind: "audit" as const,
      text: AUDIT_LABELS[a.action]?.(a.metadata as Record<string, unknown> | null) ?? a.action,
      authorName: a.user?.name ?? "System",
      createdAt: a.createdAt.toISOString(),
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const checkMeasureBooked = scheduledTasks.some((t) => t.type === "Check Measure");
  const installationBooked = scheduledTasks.some((t) => t.type === "Installation");
  const isCompleted = job.status === "Completed";
  const invoiceSent = quotes.some((q) => (q.amountInvoiced ?? 0) > 0) || job.status === "Deposit Invoice Sent";

  // The job's journey, in order. A step counts as done from what has actually happened on the job (bookings,
  // quotes, orders, files) or because the job's status has moved past it — never just because the status isn't "New".
  const ACCEPTED_OR_LATER = ["Quote Accepted", "Commercial Acceptance", "Check Measure Required", "Final Check Measure Complete", "Joinery Ordered", "Deposit Invoice Sent", "Installation Date Confirmed", "In Progress", "Completed", "Remedial Work Required"];
  const acceptanceLogged = !!(await prisma.acceptance.findFirst({ where: { jobNumber: number }, select: { id: true } }));
  const accepted = ACCEPTED_OR_LATER.includes(job.status) || acceptanceLogged;
  const salesMeasureBooked = scheduledTasks.some((t) => t.type === "Sales Measure") || job.status === "Measure & Quoted Booked" || accepted;
  const quoteSentToSupplier = ["Quote Sent to Supplier", "Gone to Supplier for Requote"].includes(job.status) || files.some((f) => f.fileType === "Supplier Quote") || accepted;
  const quoteSent = ["Quote Sent", "Commercial Quote Sent", "Followed Up After Quote Sent"].includes(job.status) || quotes.length > 0 || accepted;
  const finalMeasureDone = ["Final Check Measure Complete", "Joinery Ordered", "Deposit Invoice Sent", "Installation Date Confirmed", "In Progress", "Completed"].includes(job.status);

  const checklistItems: ChecklistItem[] = [
    { label: "Job added", done: true },
    { label: "Sales measure booked", done: salesMeasureBooked, detail: salesMeasureBooked ? undefined : "No sales measure booking on this job yet." },
    { label: "Quote sent to supplier", done: quoteSentToSupplier },
    { label: "Quote sent to customer", done: quoteSent },
    { label: "Quote accepted", done: accepted, detail: accepted ? undefined : "Marked done when the job's status is moved to Quote Accepted." },
    { label: "Check Measure booked", done: checkMeasureBooked || finalMeasureDone, detail: checkMeasureBooked ? undefined : "No Check Measure booking on this job yet." },
    { label: "Final Check Measure complete", done: finalMeasureDone },
    { label: "Joinery ordered", done: purchaseOrders.length > 0 || ["Joinery Ordered", "Deposit Invoice Sent", "Installation Date Confirmed", "In Progress", "Completed"].includes(job.status), detail: purchaseOrders.length > 0 ? undefined : "No purchase order raised yet." },
    { label: "Installation booked", done: installationBooked, detail: installationBooked ? undefined : "No install booking yet." },
    { label: "Photos / files uploaded", done: files.length > 0, detail: files.length > 0 ? `${files.length} file(s) on this job.` : "Nothing uploaded to this job yet." },
    { label: "Invoice sent", done: invoiceSent, detail: invoiceSent ? undefined : "No invoiced amount recorded against this job's quote yet." },
    { label: "Job marked Completed", done: isCompleted },
  ];

  const detailsTab = (
    <>
      <JobDetailsCard
        jobNumber={job.number}
        clientName={job.client?.name ?? ""}
        clientPhone={job.client?.phone ?? ""}
        clientEmail={job.client?.email ?? ""}
        status={job.status}
        type={job.type}
        supplier={job.supplier ?? ""}
        address={job.address ?? ""}
        assignedUserName={job.assignedUser?.name ?? ""}
        assignedUserId={job.assignedUserId ?? ""}
        installDays={job.installDays != null ? String(job.installDays) : ""}
        priceType={job.priceType ?? ""}
        leadSource={job.leadSource ?? ""}
        staff={salesStaff}
        suppliers={suppliers}
        readOnly={installer}
      />

      {job.description && (
        <details className="card" style={{ marginTop: 16 }}>
          <summary style={{ cursor: "pointer", fontWeight: 600 }}>Enquiry / job notes</summary>
          <div style={{ whiteSpace: "pre-wrap", marginTop: 8 }}>{job.description}</div>
        </details>
      )}

      {installer && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Install budget</div>
          <div className="hint" style={{ marginTop: 4 }}>What this job was priced to take — aim to finish within it.</div>
          <div className="form" style={{ marginTop: 10 }}>
            <div><label>Install days</label><div>{job.installDays ?? "—"}</div></div>
            <div><label>Install allowance</label><div>{money(quoteInputs?.installAllowance ?? job.costing?.installQuoted)}</div></div>
            <div><label>Labour hours (budget)</label><div>{job.costing?.labourHoursQuoted ?? "—"}</div></div>
            <div><label>Hours logged so far</label><div>{hoursLogged.toFixed(1)}</div></div>
            {remedialHoursLogged > 0 && <div><label>Remedial hours (separate)</label><div>{remedialHoursLogged.toFixed(1)}</div></div>}
            <div><label>Materials (budget)</label><div>{money(job.costing?.materialsQuoted)}</div></div>
            <div><label>Rubbish removal (budget)</label><div>{money(job.costing?.rubbishQuoted)}</div></div>
          </div>
        </div>
      )}

      {job.costing && !installer && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="label">Costing (from Job Tracking import)</div>
          <div className="form" style={{ marginTop: 10 }}>
            <div>
              <label>Quote No</label>
              <div>{job.costing.quoteNumber ?? "—"}</div>
            </div>
            <div>
              <label>Quoted Total</label>
              <div>{money(job.costing.quotedTotal)}</div>
            </div>
            <div>
              <label>Deposit</label>
              <div>{money(job.costing.deposit)}</div>
            </div>
            <div>
              <label>Materials</label>
              <div>
                Quoted {money(job.costing.materialsQuoted)} / Actual {money(job.costing.materialsActual)}
              </div>
            </div>
            <div>
              <label>Rubbish</label>
              <div>
                Quoted {money(job.costing.rubbishQuoted)} / Actual {money(job.costing.rubbishActual)}
              </div>
            </div>
            <div>
              <label>Install</label>
              <div>
                Quoted {money(job.costing.installQuoted)} / Actual {money(job.costing.installActual)}
              </div>
            </div>
            <div>
              <label>Labour Hours</label>
              <div>
                Quoted {job.costing.labourHoursQuoted ?? "—"} / Actual {job.costing.labourHoursActual ?? "—"}
              </div>
            </div>
            <div>
              <label>Margin</label>
              <div>
                {money(job.costing.marginProfit)} profit ({job.costing.marginPct ?? "—"}%)
              </div>
            </div>
            {job.costing.remedialFlag && (
              <div className="full">
                <label>Remedial</label>
                <div>
                  Senior: {job.costing.remedialSeniorName ?? "—"} — Cost {money(job.costing.remedialCost)}, Updated{" "}
                  {money(job.costing.remedialUpdatedCost)} ({job.costing.remedialMarginPct ?? "—"}% margin)
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const filesTab = (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">Files</div>
        {!installer && (
          <a href={buildSharePointSearchUrl(job.number)} target="_blank" rel="noopener noreferrer" className="btn primary">
            Open in SharePoint ↗
          </a>
        )}
      </div>
      <div className="hint" style={{ marginBottom: 10 }}>
        {installer ? "Plans, the check measure pack and the supplier schedule for this job. Photos are on the Photos tab; measure sheets are on Site Measure." : "Job folders are in SharePoint. Below: files added through this app."}
      </div>
      {otherFiles.length === 0 ? (
        <div className="hint">No other files uploaded for this job yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {otherFiles.map((f) => (
              <FileRow
                key={f.id}
                id={f.id}
                name={f.fileName}
                jobNumber={f.jobNumber}
                fileType={f.fileType}
                uploadedByName={f.uploadedBy?.name ?? "—"}
                date={f.createdAt.toLocaleDateString("en-NZ")}
                readOnly={installer}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // What the install involves — labour, materials, rubbish and the scope of supply, from the job's check measure pack.
  const cmPackRow = await prisma.checkMeasurePack.findUnique({ where: { jobNumber: number }, select: { data: true } });
  const cmPack = cmPackRow ? cleanPack(cmPackRow.data) : null;
  const labourText = cmPack ? cmPack.labourLines.trim() || labourLine(cmPack.installAmount, cmPack.teamSize) : "";
  const budgetHours = quoteInputs || job.costing ? job.costing?.labourHoursQuoted : null;
  const scopeRows: [string, string][] = [
    ["LABOUR", labourText || (budgetHours ? `${budgetHours} hours` : "")],
    ["MATERIALS", (cmPack ? dollars(cmPack.materials) : "") || (job.costing?.materialsQuoted != null ? money(job.costing.materialsQuoted) : "")],
    ["RUBBISH", (cmPack ? cmPack.rubbish.trim() : "") || (job.costing?.rubbishQuoted != null ? money(job.costing.rubbishQuoted) : "")],
  ];
  const scopeCard = (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">What's involved in this install</div>
      {scopeRows.some(([, v]) => v) ? (
        <div style={{ marginTop: 8, fontWeight: 600, lineHeight: 1.7 }}>
          {scopeRows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k}>&#9656; {k} - {v}</div>
          ))}
        </div>
      ) : (
        <div className="hint" style={{ marginTop: 6 }}>No labour / materials / rubbish figures on this job yet.</div>
      )}
      {cmPack?.summary.trim() && <div style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{cmPack.summary.trim()}</div>}
      {cmPack?.notes.trim() && <div style={{ whiteSpace: "pre-wrap", marginTop: 12 }}>{cmPack.notes.trim()}</div>}
      {!cmPack && job.description && <div className="hint" style={{ marginTop: 8 }}>The check measure pack hasn't been prepared yet — see the enquiry notes above for what the customer asked for.</div>}
    </div>
  );

  // QA check sheets for this job — everyone on the job can open them (including ones the office set up) and start another.
  const qaSheets = await prisma.qaCheckSheet.findMany({ where: { jobNumber: number }, orderBy: { updatedAt: "desc" }, select: { id: true, kind: true, status: true, updatedAt: true, data: true } });
  const qaTab = (
    <div className="card">
      <div className="label">QA check sheet</div>
      <div className="hint" style={{ marginTop: 4 }}>The install questionnaire for this job — tick each item off, label and describe your photos. It saves as you go and stays open until the whole job is complete.</div>
      {qaSheets.length > 0 && (
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Sheet</th><th>Items</th><th>Status</th><th>Updated</th><th></th></tr></thead>
          <tbody>
            {qaSheets.map((q) => {
              const n = (q.data as { items?: unknown[] } | null)?.items?.length ?? 0;
              return (
                <tr key={q.id}>
                  <td><Link href={`/health-safety/qa/sheet/${q.id}`} style={{ fontWeight: 600, color: "var(--blueDark)", textDecoration: "none" }}>{q.kind === "COMMERCIAL" ? "Commercial QA check sheet" : "Residential QA check sheet"}</Link></td>
                  <td>{n}</td>
                  <td><span className={`status ${q.status === "Complete" ? "green" : "orange"}`}>{q.status}</span></td>
                  <td>{q.updatedAt.toLocaleDateString("en-NZ")}</td>
                  <td><a className="btn light" href={`/health-safety/qa/sheet/${q.id}/pdf`} target="_blank" rel="noopener noreferrer">Download PDF</a></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <form action={createQaSheet} style={{ marginTop: 12 }}>
        <input type="hidden" name="jobNumber" value={job.number} />
        <input type="hidden" name="kind" value={job.type} />
        {job.type === "COMMERCIAL" && (
          <div className="form">
            <div>
              <label>How many items (windows/doors)?</label>
              <input name="itemCount" type="number" min={1} max={60} defaultValue={1} />
            </div>
          </div>
        )}
        <div className="actions" style={{ marginTop: 10 }}>
          <button type="submit" className="btn primary">Start {job.type === "COMMERCIAL" ? "Commercial" : "Residential"} QA check sheet</button>
          {!installer && <Link href="/health-safety/qa" className="btn light">QA photo reports</Link>}
        </div>
      </form>
    </div>
  );

  // The job's schedule(s): downloadable by the team; the office adds them here.
  const scheduleFiles = files.filter((f) => f.fileType === "Supplier Schedule");
  const scheduleTab = (
    <div className="card">
      <div className="label">Schedule</div>
      <div className="hint" style={{ marginTop: 4 }}>The schedule for this job — every item with its code, frame type and size. Tap Download to open or save it.</div>
      {scheduleFiles.length === 0 ? (
        <div className="hint" style={{ marginTop: 10 }}>No schedule has been added to this job yet{installer ? " — ask the office." : "."}</div>
      ) : (
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Name</th><th>Job</th><th>Type</th><th>Added by</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {scheduleFiles.map((f) => (
              <FileRow key={f.id} id={f.id} name={f.fileName} jobNumber={f.jobNumber} fileType={f.fileType} uploadedByName={f.uploadedBy?.name ?? "—"} date={f.createdAt.toLocaleDateString("en-NZ")} readOnly={installer} />
            ))}
          </tbody>
        </table>
      )}
      {!installer && <ScheduleUpload jobNumber={job.number} />}
    </div>
  );

  const siteMeasureTab = (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">Site Measure Sketches</div>
        <Link href="/site-measure" className="btn light">
          Open Site Measure ↗
        </Link>
      </div>
      {siteMeasureFiles.length === 0 ? (
        <div className="hint">No site measure sketches uploaded for this job yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Job</th>
              <th>Type</th>
              <th>Uploaded By</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {siteMeasureFiles.map((f) => (
              <FileRow
                key={f.id}
                id={f.id}
                name={f.fileName}
                jobNumber={f.jobNumber}
                fileType={f.fileType}
                uploadedByName={f.uploadedBy?.name ?? "—"}
                date={f.createdAt.toLocaleDateString("en-NZ")}
              />
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const quotesTab = (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">Quotes</div>
        <Link href="/quotes" className="btn light">
          Open Quote Register ↗
        </Link>
      </div>
      {quotes.length === 0 ? (
        <div className="hint">No quotes linked to this job yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Quote No</th>
              <th>Status</th>
              <th>Total</th>
              <th>Remaining</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <tr key={q.id}>
                <td>{q.quoteNumber}</td>
                <td>
                  <span className="status blue">{q.status}</span>
                </td>
                <td>{money(q.total)}</td>
                <td>{money(q.amountRemaining)}</td>
                <td>{q.quoteDate ? q.quoteDate.toLocaleDateString("en-NZ") : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const ordersTab = (
    <div className="card">
      <div className="topbar" style={{ marginBottom: 8 }}>
        <div className="label">Purchase Orders</div>
        <Link href="/purchase-orders" className="btn light">
          Open Purchase Orders ↗
        </Link>
      </div>
      {purchaseOrders.length === 0 ? (
        <div className="hint">No purchase orders placed for this job yet.</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>PO No</th>
              <th>Supplier</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Ordered By</th>
            </tr>
          </thead>
          <tbody>
            {purchaseOrders.map((po) => (
              <tr key={po.id}>
                <td>{po.poNumber}</td>
                <td>{po.supplier}{po.isRemedial && <span className="status orange" style={{ marginLeft: 6 }}>Remedial</span>}</td>
                <td>{money(po.amount)}</td>
                <td>
                  <span className={`status ${po.status === "Received" ? "green" : "blue"}`}>{po.status}</span>
                </td>
                <td>{po.orderedBy?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const comingSoon = (label: string) => (
    <div className="card">
      <div className="label">{label}</div>
      <p className="hint" style={{ marginTop: 8 }}>
        Not built yet — this tab is reserved so the layout matches the full job file, and will fill in as that part of
        the system is built.
      </p>
    </div>
  );

  const tabsFor = <T extends { key: string }>(all: T[]): T[] => (installer ? all.filter((t) => INSTALLER_TABS.includes(t.key)) : all);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>
            {job.number} — {job.client?.name ?? job.title}
          </h2>
          <div className="subtitle">
            Everything for this job in one place — files, site measure sketches, bookings, quotes, orders and notes.
          </div>
        </div>
        <div className="actions">
          {!installer && (
            <a href={buildSharePointSearchUrl(job.number)} target="_blank" rel="noopener noreferrer" className="btn light">
              Find in SharePoint ↗
            </a>
          )}
          <Link href={`/jobs/${job.number}/notify-remedial`} className="btn" style={{ background: "#c62828", color: "#fff", border: "none", fontWeight: 600 }}>
            ⚠ Notify remedial
          </Link>
          <Link href="/jobs" className="btn light">
            ← All Jobs
          </Link>
        </div>
      </div>

      <JobTabs
        tabs={tabsFor([
          {
            key: "details",
            label: "Job Details",
            content: (
              <>
                {detailsTab}
                {scopeCard}
              </>
            ),
          },
          {
            key: "tasks",
            label: "Scheduled Tasks",
            content: <ScheduledTasksSection jobNumber={job.number} tasks={taskRows} staff={allStaff} readOnly={installer} />,
          },
          { key: "contacts", label: "Linked Contacts", content: comingSoon("Linked Contacts") },
          {
            key: "photos",
            label: "Photos",
            content: (
              <PhotosSection
                jobNumber={job.number}
                sharePointUrl={installer ? "" : buildSharePointSearchUrl(job.number)}
                photos={photoFiles.map((f) => ({
                  id: f.id,
                  fileName: f.fileName,
                  uploadedByName: f.uploadedBy?.name ?? "—",
                  date: f.createdAt.toLocaleDateString("en-NZ"),
                }))}
              />
            ),
          },
          { key: "notes", label: "Notes", content: <JobNotesSection jobNumber={job.number} feed={feed} /> },
          {
            key: "time",
            label: "Time",
            content: (
              <JobTimeSection
                jobNumber={job.number}
                userId={currentUser.id}
                showStaff={!installer}
                rows={timeEntries.map((t) => ({ id: t.id, date: t.dateWorked.toLocaleDateString("en-NZ"), staffName: t.user.name, workType: t.workType, hours: t.totalHours, status: t.status, isRemedial: t.isRemedial }))}
              />
            ),
          },
          { key: "files", label: "Files", content: filesTab },
          { key: "sitemeasure", label: "Site Measure", content: siteMeasureTab },
          { key: "qa", label: "Job QA", content: qaTab },
          { key: "schedule", label: "Schedule", content: scheduleTab },
          {
            key: "emailclient",
            label: "Emails",
            content: (
              <>
                <SendTemplateEmailForm
                  jobNumber={job.number}
                  clientName={job.client?.name ?? job.title}
                  address={job.address ?? ""}
                  clientEmail={job.client?.email ?? job.email ?? ""}
                  senderName={currentUser.name}
                  templates={emailTemplates}
                  supplierName={job.supplier ?? ""}
                  supplierContacts={supplierContacts}
                  jobFiles={files.map((f) => ({ id: f.id, fileName: f.fileName, fileType: f.fileType }))}
                />
                <div style={{ marginTop: 16 }}>
                  <BookCheckMeasureForm fixedJobNumber={job.number} fixedClientName={job.client?.name ?? job.title} />
                </div>
              </>
            ),
          },
          { key: "charges", label: "Charges", content: comingSoon("Charges") },
          { key: "quotes", label: "Quotes", content: quotesTab },
          { key: "orders", label: "Purchase Orders", content: ordersTab },
          { key: "supplierinvoices", label: "Supplier Invoices", content: comingSoon("Supplier Invoices") },
          { key: "checklist", label: "Job Checklist", content: <JobChecklistSection items={checklistItems} /> },
        ])}
      />
    </div>
  );
}
