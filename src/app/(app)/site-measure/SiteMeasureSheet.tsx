"use client";

import { useMemo, useRef, useState } from "react";
import { OpeningCanvas } from "./OpeningCanvas";
import { requestUpload, confirmUpload } from "../files/actions";
import { sendSiteMeasureSheetEmail } from "./actions";
import { SUPPLIER_CONTACTS } from "@/lib/supplierContacts";

export interface JobOption {
  number: string;
  title: string;
  address: string | null;
  supplier: string | null;
  client: { name: string; phone: string | null; email: string | null } | null;
}

const PEN_COLORS = [
  { label: "Red Pen", value: "#e11d48" },
  { label: "Black Pen", value: "#111827" },
  { label: "Blue Pen", value: "#0057b8" },
  { label: "Green Pen", value: "#16a34a" },
  { label: "Yellow Pen", value: "#eab308" },
];

const LOCATIONS = [
  "Lounge", "Family Room", "Kitchen", "Dining", "Bedroom 1", "Bedroom 2", "Bedroom 3", "Bedroom 4",
  "Bathroom", "Ensuite", "Laundry", "Hallway", "Study/Office", "Conservatory", "Garage", "Other",
];

function YesNoRow({ name, label }: { name: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select name={name} defaultValue="Yes" style={{ flex: "0 0 auto" }}>
        <option>Yes</option>
        <option>No</option>
      </select>
    </div>
  );
}

function DropdownRow({ name, label, options }: { name: string; label: string; options: string[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0" }}>
      <span style={{ fontWeight: 600 }}>{label}</span>
      <select name={name} style={{ flex: "0 0 auto" }}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}

function OpeningBlock({
  pageNum,
  openingIndex,
  color,
  registerCanvas,
}: {
  pageNum: number;
  openingIndex: number;
  color: string;
  registerCanvas: (id: string, el: HTMLCanvasElement | null) => void;
}) {
  const prefix = `page${pageNum}_opening${openingIndex}`;
  const canvasId = `smCanvas_${pageNum}_${openingIndex}`;
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="label">Opening {openingIndex}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 260 }}>
          <OpeningCanvas id={canvasId} color={color} registerRef={registerCanvas} />
        </div>
        <div style={{ flex: "1 1 320px", minWidth: 260, fontSize: 13 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 16 }}>
            <YesNoRow name={`${prefix}_fallProtection`} label="Protecting a Fall" />
            <DropdownRow name={`${prefix}_location`} label="Location" options={LOCATIONS} />
            <DropdownRow name={`${prefix}_glazingType`} label="Glazing Type" options={["Single", "Double"]} />
            <YesNoRow name={`${prefix}_restrictorStays`} label="Restrictor Stays" />
            <DropdownRow name={`${prefix}_glass`} label="Glass" options={["Tinted", "Clear", "Etchlite", "Low E"]} />
            <YesNoRow name={`${prefix}_architraves`} label="Architraves" />
            <YesNoRow name={`${prefix}_facings`} label="Facings" />
            <YesNoRow name={`${prefix}_scribers`} label="Scribers" />
            <YesNoRow name={`${prefix}_silicone`} label="Silicone" />
            <YesNoRow name={`${prefix}_headFlashing`} label="Head Flashing" />
            <YesNoRow name={`${prefix}_sillTray`} label="Sill Tray" />
          </div>
          <div style={{ marginTop: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Extra:</div>
            <textarea
              name={`${prefix}_extra`}
              rows={3}
              style={{ width: "100%", border: "1px dotted var(--muted)", borderRadius: 6, background: "transparent", font: "inherit", padding: 6 }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PageBlock({
  pageNum,
  job,
  color,
  registerCanvas,
}: {
  pageNum: number;
  job: JobOption;
  color: string;
  registerCanvas: (id: string, el: HTMLCanvasElement | null) => void;
}) {
  const p = `page${pageNum}`;
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Ali-Frame Measure Sheet — Page {pageNum}</div>
      <div className="form">
        <div>
          <label>Date</label>
          <input type="text" name={`${p}_date`} defaultValue={new Date().toLocaleDateString("en-NZ")} />
        </div>
        <div>
          <label>Customer</label>
          <input type="text" name={`${p}_customer`} defaultValue={job.client?.name ?? ""} />
        </div>
        <div>
          <label>Phone No</label>
          <input type="text" name={`${p}_phone`} defaultValue={job.client?.phone ?? ""} />
        </div>
        <div>
          <label>Email</label>
          <input type="text" name={`${p}_email`} defaultValue={job.client?.email ?? ""} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label>Site Address</label>
          <input type="text" name={`${p}_address`} defaultValue={job.address ?? ""} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label>Notes</label>
          <input type="text" name={`${p}_notes`} />
        </div>
        <div>
          <label>Hardware</label>
          <input type="text" name={`${p}_hardware`} />
        </div>
        <div>
          <label>Cladding</label>
          <input type="text" name={`${p}_cladding`} />
        </div>
        <div>
          <label>Colour Matched / Thermally Broken</label>
          <input type="text" name={`${p}_colourMatched`} />
        </div>
        <div>
          <label>Colour: Powdercoat / Anodised</label>
          <input type="text" name={`${p}_colourFinish`} />
        </div>
        <div>
          <label>Access Equipment + Days</label>
          <input type="text" name={`${p}_accessEquipment`} />
        </div>
        <div>
          <label>Rubbish Removal</label>
          <input type="text" name={`${p}_rubbishRemoval`} />
        </div>
      </div>
      {[1, 2, 3, 4].map((i) => (
        <OpeningBlock key={i} pageNum={pageNum} openingIndex={i} color={color} registerCanvas={registerCanvas} />
      ))}
    </div>
  );
}

export function SiteMeasureSheet({ jobs }: { jobs: JobOption[] }) {
  const [selectedJobNumber, setSelectedJobNumber] = useState("");
  const [opened, setOpened] = useState(false);
  const [pages, setPages] = useState<number[]>([]);
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [supplierEmail, setSupplierEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const canvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const job = useMemo(() => jobs.find((j) => j.number === selectedJobNumber) ?? null, [jobs, selectedJobNumber]);
  const contacts = useMemo(() => (job?.supplier ? SUPPLIER_CONTACTS[job.supplier] ?? [] : []), [job]);

  function registerCanvas(id: string, el: HTMLCanvasElement | null) {
    if (el) canvasesRef.current.set(id, el);
    else canvasesRef.current.delete(id);
  }

  function openTemplate() {
    if (!selectedJobNumber) return setError("Select a job first.");
    setError("");
    canvasesRef.current.clear();
    setPages([1]);
    setOpened(true);
    setSupplierEmail(contacts[0]?.email ?? "");
  }

  function addPage() {
    setPages((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 1]);
  }

  function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/png"));
  }

  async function handleSaveAndEmail() {
    if (!job) return;
    if (!supplierEmail) return setError("Select a supplier contact.");
    setError("");
    setBusy(true);
    try {
      const storageKeys: string[] = [];
      let uploaded = 0;

      for (const [canvasId, canvas] of canvasesRef.current.entries()) {
        if (canvas.dataset.hasStrokes !== "1") continue;
        const blob = await canvasToBlob(canvas);
        if (!blob) continue;

        setStatus(`Uploading sketch ${uploaded + 1}...`);
        const fileName = `SiteMeasure_${job.number}_${canvasId}.png`;
        const { error: reqError, storageKey, uploadUrl } = await requestUpload(job.number, fileName, "image/png", blob.size);
        if (reqError || !storageKey || !uploadUrl) throw new Error(reqError ?? "Could not start upload.");

        const putRes = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": "image/png" }, body: blob });
        if (!putRes.ok) throw new Error("Upload to storage failed.");

        const { error: confirmError } = await confirmUpload({
          jobNumber: job.number,
          storageKey,
          fileName,
          fileType: "Site Measure",
          mimeType: "image/png",
          sizeBytes: blob.size,
        });
        if (confirmError) throw new Error(confirmError);

        storageKeys.push(storageKey);
        uploaded += 1;
      }

      if (storageKeys.length === 0) {
        setError("Draw at least one opening before saving.");
        return;
      }

      setStatus("Emailing supplier...");
      const { error: sendError } = await sendSiteMeasureSheetEmail({
        jobNumber: job.number,
        supplierEmail,
        pageCount: pages.length,
        storageKeys,
      });
      if (sendError) throw new Error(sendError);

      setStatus(`Sent — uploaded ${uploaded} sketch(es) and emailed the ${pages.length}-page sheet.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="notice">
        <strong>Site Measure:</strong> select the job, open the Ali-Frame Measure Sheet, mark up each opening
        freehand, then email the completed sheet straight to the supplier for that job.
      </div>

      <div className="card">
        <div className="label">Select Job</div>
        <div className="form">
          <div>
            <label>Job</label>
            <select value={selectedJobNumber} onChange={(e) => setSelectedJobNumber(e.target.value)}>
              <option value="">Select a job...</option>
              {jobs.map((j) => (
                <option key={j.number} value={j.number}>
                  {j.number} - {j.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="button" className="btn primary" onClick={openTemplate}>
            Open Template
          </button>
        </div>
        {error && !opened && <div className="hint" style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}
      </div>

      {opened && job && (
        <>
          <div className="card" style={{ marginTop: 16, position: "sticky", top: 12, zIndex: 5, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
            <div className="label">Pen</div>
            <div className="actions">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="btn light"
                  style={color === c.value ? { outline: `2px solid ${c.value}` } : undefined}
                  onClick={() => setColor(c.value)}
                >
                  {c.label}
                </button>
              ))}
              <button type="button" className="btn primary" onClick={addPage}>
                + Add New Page
              </button>
            </div>
          </div>

          <form ref={formRef}>
            {pages.map((n) => (
              <PageBlock key={n} pageNum={n} job={job} color={color} registerCanvas={registerCanvas} />
            ))}
          </form>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="label">Email to Supplier</div>
            <div className="form">
              <div>
                <label>Supplier Contact</label>
                <select value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)}>
                  {contacts.length === 0 && <option value="">No contact on file for this supplier</option>}
                  {contacts.map((c) => (
                    <option key={c.email} value={c.email}>
                      {c.name} ({c.email})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn primary" onClick={handleSaveAndEmail} disabled={busy}>
                {busy ? "Working..." : "Save Sheet & Email to Supplier"}
              </button>
            </div>
            {status && !error && <div className="hint" style={{ marginTop: 8 }}>{status}</div>}
            {error && <div className="hint" style={{ marginTop: 8, color: "#b91c1c" }}>{error}</div>}
          </div>
        </>
      )}
    </div>
  );
}
