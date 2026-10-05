import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TabStrip } from "@/components/TabStrip";
import { EmployeeDetailsTab } from "./EmployeeDetailsTab";
import { DocumentsTab } from "./DocumentsTab";
import { ReviewsTab } from "./ReviewsTab";
import { JobHistoryTab } from "./JobHistoryTab";
import { buildEmployeeSharePointUrl } from "@/lib/sharepoint";

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const currentUser = await requireUser();
  const { id } = await params;

  const employee = await prisma.user.findUnique({
    where: { id },
    include: { vehiclesDriven: { select: { name: true } }, employeeDetail: true },
  });
  if (!employee) notFound();

  const [documents, reviews, assignedJobs, scheduledTasks, jobsForPicker] = await Promise.all([
    prisma.employeeDocument.findMany({ where: { userId: id }, include: { uploadedBy: true }, orderBy: { createdAt: "desc" } }),
    prisma.installerAssessment.findMany({ where: { revieweeId: id }, include: { reviewer: true }, orderBy: { createdAt: "desc" } }),
    prisma.job.findMany({ where: { assignedUserId: id }, include: { client: true }, orderBy: { createdAt: "desc" } }),
    prisma.jobScheduledTask.findMany({
      where: { assignees: { some: { id } } },
      include: { job: { include: { client: true } } },
      orderBy: { scheduledDate: "desc" },
    }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  const jobHistoryRows = [
    ...assignedJobs.map((j) => ({
      jobNumber: j.number,
      clientName: j.client?.name ?? j.title,
      role: "Sales Owner",
      date: j.createdAt.toISOString(),
      status: j.status,
    })),
    ...scheduledTasks.map((t) => ({
      jobNumber: t.jobNumber,
      clientName: t.job.client?.name ?? t.job.title,
      role: `Booked — ${t.type}`,
      date: t.scheduledDate.toISOString(),
      status: t.status,
    })),
  ].sort((a, b) => new Date(b.date ?? 0).getTime() - new Date(a.date ?? 0).getTime());

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>{employee.name}</h2>
          <div className="subtitle">Details, documents, reviews and job history for this employee.</div>
        </div>
        <Link href="/employees" className="btn light">
          ← All Employees
        </Link>
      </div>

      <TabStrip
        tabs={[
          {
            key: "details",
            label: "Employee Details",
            content: (
              <EmployeeDetailsTab
                userId={employee.id}
                name={employee.name}
                email={employee.email}
                phone={employee.phone ?? ""}
                role={employee.role}
                isSuperUser={employee.isSuperUser}
                vehicle={employee.vehiclesDriven.map((v) => v.name).join(", ") || null}
                canEdit={currentUser.isSuperUser}
                showPay={currentUser.canViewPay}
                detail={
                  currentUser.isSuperUser && employee.employeeDetail
                    ? {
                        preferredName: employee.employeeDetail.preferredName ?? "",
                        personalEmail: employee.employeeDetail.personalEmail ?? "",
                        address: employee.employeeDetail.address ?? "",
                        jobTitle: employee.employeeDetail.jobTitle ?? "",
                        startDate: employee.employeeDetail.startDate?.toISOString().slice(0, 10) ?? "",
                        finishDate: employee.employeeDetail.finishDate?.toISOString().slice(0, 10) ?? "",
                        inviteTo: employee.employeeDetail.inviteTo,
                        isManagement: employee.employeeDetail.isManagement,
                        hoursPerWeek: employee.employeeDetail.hoursPerWeek,
                        // Pay is confidential: these values are only put into the page for someone granted canViewPay.
                        payRate: currentUser.canViewPay ? employee.employeeDetail.payRate : null,
                        payType: currentUser.canViewPay ? (employee.employeeDetail.payType ?? "") : "",
                        annualSalary: currentUser.canViewPay ? employee.employeeDetail.annualSalary : null,
                      }
                    : null
                }
              />
            ),
          },
          {
            key: "documents",
            label: "Employee Documents",
            content: (
              <DocumentsTab
                userId={employee.id}
                canManage={currentUser.isSuperUser}
                sharePointUrl={buildEmployeeSharePointUrl(employee.name)}
                documents={documents.map((d) => ({
                  id: d.id,
                  fileName: d.fileName,
                  docType: d.docType,
                  uploadedByName: d.uploadedBy?.name ?? "—",
                  date: d.createdAt.toLocaleDateString("en-NZ"),
                }))}
              />
            ),
          },
          {
            key: "reviews",
            label: "Employee Reviews",
            content: (
              <ReviewsTab
                employeeId={employee.id}
                employeeName={employee.name}
                currentUserId={currentUser.id}
                jobs={jobsForPicker}
                reviews={reviews.map((r) => ({
                  id: r.id,
                  reviewerName: r.reviewer.name,
                  jobNumber: r.jobNumber,
                  reviewPeriod: r.reviewPeriod,
                  overallResult: r.overallResult,
                  qualityScore: r.qualityScore,
                  keyWins: r.keyWins,
                  keyIssues: r.keyIssues,
                  actionsRequired: r.actionsRequired,
                  createdAt: r.createdAt.toISOString(),
                }))}
              />
            ),
          },
          { key: "jobhistory", label: "Job History", content: <JobHistoryTab rows={jobHistoryRows} /> },
        ]}
      />
    </div>
  );
}
