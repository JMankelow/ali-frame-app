// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireNotInstaller } from "@/lib/session";
import { getDownloadUrl } from "@/lib/storage";
import { bufferConfigured, listChannels, type BufferChannel } from "@/lib/buffer";
import { cloudinaryConfigured } from "@/lib/cloudinary";
import { PostBuilder } from "./PostBuilder";

const money = (n: number) => `$${Math.round(n).toLocaleString("en-NZ")}`;

export default async function JobPostPage({ params }: { params: Promise<{ number: string }> }) {
  const user = await requireNotInstaller();
  const { number } = await params;
  const job = await prisma.job.findUnique({
    where: { number },
    include: {
      costing: { select: { quotedTotal: true } },
      quotes: { select: { quoteNumber: true, status: true, total: true, quoteDate: true }, orderBy: { quoteDate: "desc" } },
      scheduledTasks: { where: { type: "Installation", status: { not: "Cancelled" } }, select: { scheduledDate: true, endDate: true }, orderBy: { scheduledDate: "asc" } },
      files: { where: { fileType: "Photos", mimeType: { startsWith: "image/" } }, orderBy: { createdAt: "asc" } },
    },
  });
  if (!job) notFound();

  const photos = await Promise.all(job.files.map(async (f) => ({ id: f.id, name: f.fileName, url: await getDownloadUrl(f.storageKey, f.fileName) })));

  const ready = bufferConfigured() && cloudinaryConfigured();
  let channels: BufferChannel[] = [];
  let channelError = "";
  if (bufferConfigured()) {
    try {
      channels = await listChannels();
    } catch (e) {
      channelError = e instanceof Error ? e.message : "Could not load Buffer channels.";
    }
  }

  const type = job.type === "COMMERCIAL" ? "commercial" : "residential";
  const product = job.supplier ? ` using ${job.supplier}` : "";
  const draftCaption =
    `Another ${type} project complete! ✅\n\n` +
    `Our team has just finished installing new windows and doors${product}. Quality products, expert installation and a tidy finish.\n\n` +
    `Thinking about new windows or doors? Get in touch with the Ali Frame team for a free quote.\n\n` +
    `#AliFrame #WindowsAndDoors #AucklandBuilder #NewWindows #HomeRenovation`;

  const install = job.scheduledTasks[0];

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Prepare post — {job.number}</h2>
          <div className="subtitle">{job.title}</div>
        </div>
        <Link href="/marketing/job-posts" className="btn light">← Completed jobs</Link>
      </div>

      {!ready && (
        <div className="card" style={{ marginTop: 12, borderLeft: "4px solid #f59e0b" }}>
          <div className="label">Setup needed before posts can be sent</div>
          <div className="hint" style={{ marginTop: 6 }}>
            You can choose photos and write the caption now. To send drafts to Buffer, an administrator needs to add these settings in Render (never in chat or code):
            <ul style={{ margin: "6px 0 0 18px" }}>
              {!bufferConfigured() && <li><b>BUFFER_API_KEY</b> — from developers.buffer.com (Buffer &rarr; API). Set your Buffer channels to &ldquo;Requires approval&rdquo; so everything lands as a draft.</li>}
              {!cloudinaryConfigured() && <li><b>CLOUDINARY_CLOUD_NAME</b>, <b>CLOUDINARY_API_KEY</b>, <b>CLOUDINARY_API_SECRET</b> — from the Cloudinary dashboard; it hosts the photos so Buffer can load them.</li>}
            </ul>
          </div>
        </div>
      )}

      <div className="card" style={{ marginTop: 12 }}>
        <div className="label">Job &amp; quote information</div>
        <table style={{ marginTop: 8 }}>
          <tbody>
            <tr><td className="hint">Type</td><td>{job.type === "COMMERCIAL" ? "Commercial" : "Residential"}</td></tr>
            <tr><td className="hint">Supplier</td><td>{job.supplier ?? "—"}</td></tr>
            {install && <tr><td className="hint">Installed</td><td>{install.scheduledDate.toLocaleDateString("en-NZ")}{install.endDate ? ` – ${install.endDate.toLocaleDateString("en-NZ")}` : ""}</td></tr>}
            {job.description && <tr><td className="hint">Description</td><td>{job.description}</td></tr>}
            {user.isSuperUser && job.costing?.quotedTotal != null && <tr><td className="hint">Quoted (excl. GST)</td><td>{money(job.costing.quotedTotal)}</td></tr>}
            {job.quotes.map((q) => (
              <tr key={q.quoteNumber}>
                <td className="hint">Quote</td>
                <td>{q.quoteNumber} — {q.status}{user.isSuperUser && q.total != null ? ` — ${money(q.total / 1.15)} excl. GST` : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="hint" style={{ marginTop: 8 }}>The suggested caption leaves out the customer&apos;s name, address and price. Keep it that way unless the customer has agreed.</div>
      </div>

      <PostBuilder jobNumber={job.number} photos={photos} channels={channels} channelError={channelError} initialCaption={draftCaption} canSend={ready} />
    </div>
  );
}
