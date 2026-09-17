import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { UploadForm } from "./UploadForm";
import { FileRow } from "./FileRow";

export default async function FilesPage() {
  await requireUser();

  const [files, jobs] = await Promise.all([
    prisma.fileAsset.findMany({
      include: { uploadedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.job.findMany({ where: { archived: false }, orderBy: { number: "asc" }, select: { number: true, title: true } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Files</h2>
          <div className="subtitle">{files.length} file(s) — stored in Cloudflare R2, shared for everyone signed in.</div>
        </div>
      </div>

      <div className="card">
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
            {files.map((f) => (
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
            {files.length === 0 && (
              <tr>
                <td colSpan={6} className="hint">
                  No files yet — upload the first one below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <UploadForm jobs={jobs} />
    </div>
  );
}
