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
import { PhotosSection } from "./PhotosSection";

function money(v: number | null | undefined): string {
  if (v == null) return "—";
  return v.toLocaleString("en-NZ", { style: "currency", currency: "NZD" });
}

const AUDIT_LABELS: Record<string, (m: Record<string, unknown> | null) => string> = {
  job_created: () => "Job created.",
  job_updated: (m) =>
    m?.statusFrom && m?.statusTo ? `Status changed from ${m.statusFrom} to ${m.statusTo}.` : "Job details updated.",
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
};

export default async function JobDetailPage({ params }: { params: Promise<{ number: string }> }) {
  await requireUser();
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

  const [files, scheduledTasks, notes, auditLogs, quotes, purchaseOrders] = await Promise.all([
    prisma.fileAsset.findMany({ where: { jobNumber: number }, include: { uploadedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.jobScheduledTask.findMany({ where: { jobNumber: number }, include: { assignees: true }, orderBy: { scheduledDate: "asc" } }),
    prisma.note.findMany({ where: { jobNumber: number }, include: { author: true }, orderBy: { createdAt: "desc" } }),
    prisma.auditLog.findMany({ where: { entityType: "Job", entityId: number }, include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.quote.findMany({ where: { jobNumber: number }, orderBy: { quoteDate: "desc" } }),
    prisma.purchaseOrder.findMany({ where: { jobNumber: number }, include: { orderedBy: true }, orderBy: { createdAt: "desc" } }),
  ]);

  const siteMeasureFiles = files.filter((f) => f.fileType === "Site Measure");
  const photoFiles = files.filter((f) => f.fileType === "Photos");
  const otherFiles = files.filter((f) => f.fileType !== "Site Measure" && f.fileType !== "Photos");

  const taskRows: ScheduledTaskRow[] = scheduledTasks.map((t) => ({
    id: t.id,
    type: t.type,
    scheduledDate: t.scheduledDate.toISOString(),
    endDate: t.endDate ? t.endDate.toISOString() : null,
    status: t.status,
    notes: t.notes,
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
    ...auditLogs.map((a) => ({
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

  const checklistItems: ChecklistItem[] = [
    { label: "Quote accepted", done: job.status !== "New" && job.status !== "Quote Sent" && job.status !== "Quote Sent to Supplier" },
    { label: "Check Measure booked", done: checkMeasureBooked, detail: checkMeasureBooked ? undefined : "No Check Measure booking on this job yet." },
    { label: "Joinery ordered", done: purchaseOrders.length > 0, detail: purchaseOrders.length > 0 ? undefined : "No purchase order raised yet." },
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
        priceType={job.priceType ?? ""}
        leadSource={job.leadSource ?? ""}
        staff={salesStaff}
        suppliers={suppliers}
      />

      {job.costing && (
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
        <a href={buildSharePointSearchUrl(job.number)} target="_blank" rel="noopener noreferrer" className="btn primary">
          Open in SharePoint ↗
        </a>
      </div>
      <div className="hint" style={{ marginBottom: 10 }}>
        This job's real files live in SharePoint — the table below is only files uploaded directly through this app
        (a stopgap until uploads go straight to SharePoint).
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
              />
            ))}
          </tbody>
        </table>
      )}
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
                <td>{po.supplier}</td>
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
          <a href={buildSharePointSearchUrl(job.number)} target="_blank" rel="noopener noreferrer" className="btn light">
            Find in SharePoint ↗
          </a>
          <Link href="/jobs" className="btn light">
            ← All Jobs
          </Link>
        </div>
      </div>

      <JobTabs
        tabs={[
          { key: "details", label: "Job Details", content: detailsTab },
          {
            key: "tasks",
            label: "Scheduled Tasks",
            content: <ScheduledTasksSection jobNumber={job.number} tasks={taskRows} staff={allStaff} />,
          },
          { key: "contacts", label: "Linked Contacts", content: comingSoon("Linked Contacts") },
          {
            key: "photos",
            label: "Photos",
            content: (
              <PhotosSection
                jobNumber={job.number}
                sharePointUrl={buildSharePointSearchUrl(job.number)}
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
          { key: "files", label: "Files", content: filesTab },
          { key: "sitemeasure", label: "Site Measure", content: siteMeasureTab },
          { key: "charges", label: "Charges", content: comingSoon("Charges") },
          { key: "quotes", label: "Quotes", content: quotesTab },
          { key: "orders", label: "Purchase Orders", content: ordersTab },
          { key: "supplierinvoices", label: "Supplier Invoices", content: comingSoon("Supplier Invoices") },
          { key: "checklist", label: "Job Checklist", content: <JobChecklistSection items={checklistItems} /> },
        ]}
      />
    </div>
  );
}
