"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OpeningCanvas } from "./OpeningCanvas";
import { requestUpload, confirmUpload } from "../files/actions";
import { sendSiteMeasureSheetEmail } from "./actions";
import { JobPicker } from "@/components/JobPicker";
import { ContactPicker } from "@/components/ContactPicker";

export interface SupplierContact {
  companyName: string;
  contactName: string | null;
  email: string | null;
}

// Jo's named preferred contact per supplier (2026-09-26) — used to default
// the dropdown's selection when a supplier has more than one contact on file.
const PREFERRED_CONTACT: Record<string, string> = {
  "vision windows": "sales",
  "nz windows": "paul",
  "altherm west": "troy",
  counties: "maree",
};

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
  tool,
  registerCanvas,
}: {
  pageNum: number;
  openingIndex: number;
  color: string;
  tool: "line" | "curve" | "text";
  registerCanvas: (id: string, el: HTMLCanvasElement | null) => void;
}) {
  const prefix = `page${pageNum}_opening${openingIndex}`;
  const canvasId = `smCanvas_${pageNum}_${openingIndex}`;
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="label">Opening {openingIndex}</div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
        <div style={{ flex: "1 1 320px", minWidth: 260 }}>
          <OpeningCanvas id={canvasId} color={color} tool={tool} registerRef={registerCanvas} />
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
  tool,
  openings,
  registerCanvas,
}: {
  pageNum: number;
  job: JobOption;
  color: string;
  tool: "line" | "curve" | "text";
  openings: number[];
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
          <select name={`${p}_cladding`} defaultValue="">
            <option value="">— Select —</option>
            {["Brick", "Weatherboard", "Plaster", "Hardiplank", "Cedar"].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
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
      {openings.map((i) => (
        <OpeningBlock key={i} pageNum={pageNum} openingIndex={i} color={color} tool={tool} registerCanvas={registerCanvas} />
      ))}
    </div>
  );
}

export interface EmailTemplateOption {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const DEFAULT_SUPPLIER_TEMPLATE = "Please Quote — Supplier";

function fillPlaceholders(text: string, values: Record<string, string>): string {
  let out = text;
  for (const [k, v] of Object.entries(values)) out = out.replaceAll(`{${k}}`, v).replaceAll(`[${k}]`, v);
  return out;
}

export function SiteMeasureSheet({ jobs, suppliers, templates }: { jobs: JobOption[]; suppliers: SupplierContact[]; templates: EmailTemplateOption[] }) {
  const [selectedJobNumber, setSelectedJobNumber] = useState("");
  const [opened, setOpened] = useState(false);
  const [openings, setOpenings] = useState<number[]>([]);
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [tool, setTool] = useState<"line" | "curve" | "text">("line");
  const [supplierEmail, setSupplierEmail] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const canvasesRef = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const job = useMemo(() => jobs.find((j) => j.number === selectedJobNumber) ?? null, [jobs, selectedJobNumber]);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (!t || !job) {
      setEmailSubject("");
      setEmailBody("");
      return;
    }
    const values = { "Job Number": job.number, "Client Name": job.client?.name ?? job.title, Address: job.address ?? "" };
    setEmailSubject(fillPlaceholders(t.subject, values));
    setEmailBody(fillPlaceholders(t.body, values));
  }

  // Default to the "Please Quote — Supplier" template as soon as a job is open.
  useEffect(() => {
    if (!opened || !job || templateId) return;
    const def = templates.find((t) => t.name === DEFAULT_SUPPLIER_TEMPLATE);
    if (def) applyTemplate(def.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, job]);

  const contacts = useMemo(() => {
    if (!job?.supplier) return [];
    const target = job.supplier.trim().toLowerCase();
    const matches = suppliers.filter(
      (s) => s.companyName.toLowerCase() === target || target.includes(s.companyName.toLowerCase()) || s.companyName.toLowerCase().includes(target)
    );
    return matches
      .filter((s) => s.email)
      .map((s) => ({ name: s.contactName ? `${s.contactName} (${s.companyName})` : s.companyName, email: s.email as string }));
  }, [job, suppliers]);

  // Every contact in the system, unfiltered — lets Sales search and pick any
  // supplier contact directly, for testing or when a job's supplier field
  // doesn't cleanly match a real Supplier row.
  const allContacts = useMemo(
    () =>
      suppliers
        .filter((s) => s.email)
        .map((s) => ({ name: s.contactName ? `${s.contactName} (${s.companyName})` : s.companyName, email: s.email as string })),
    [suppliers]
  );

  const preferredEmail = useMemo(() => {
    if (!job?.supplier || contacts.length === 0) return contacts[0]?.email ?? "";
    const key = Object.keys(PREFERRED_CONTACT).find((k) => job.supplier!.toLowerCase().includes(k));
    const hint = key ? PREFERRED_CONTACT[key] : null;
    if (!hint) return contacts[0].email;
    const preferred = contacts.find((c) => c.name.toLowerCase().includes(hint) || c.email.toLowerCase().includes(hint));
    return preferred?.email ?? contacts[0].email;
  }, [job, contacts]);

  // Stable identity across re-renders — OpeningCanvas passes this straight into a
  // ref callback, and a ref callback that changes identity every render gets
  // called with (null) then (element) on every single re-render, churning the
  // Map unnecessarily (see the snapshot comment in handleSaveAndEmail below).
  const registerCanvas = useCallback((id: string, el: HTMLCanvasElement | null) => {
    if (el) canvasesRef.current.set(id, el);
    else canvasesRef.current.delete(id);
  }, []);

  function openTemplate() {
    if (!selectedJobNumber) return setError("Select a job first.");
    setError("");
    canvasesRef.current.clear();
    setOpenings([1]);
    setOpened(true);
    setSupplierEmail(preferredEmail);
  }

  function addOpening() {
    setOpenings((prev) => [...prev, (prev[prev.length - 1] ?? 0) + 1]);
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
      const keyByCanvas = new Map<string, string>();
      let uploaded = 0;

      // Snapshot the canvases up front — iterating the live Map directly is
      // unsafe here: each await below triggers a re-render, and OpeningCanvas's
      // ref callback re-fires on every re-render (new inline function identity),
      // which removes and re-adds its entry mid-iteration. That reordering made
      // the loop revisit the same canvas endlessly (confirmed in testing: one
      // drawn opening produced 28 duplicate uploads instead of 1).
      const canvasesToUpload = Array.from(canvasesRef.current.entries());

      for (const [canvasId, canvas] of canvasesToUpload) {
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
          fileType: "Other",
          mimeType: "image/png",
          sizeBytes: blob.size,
        });
        if (confirmError) throw new Error(confirmError);

        storageKeys.push(storageKey);
        keyByCanvas.set(canvasId, storageKey);
        uploaded += 1;
      }

      if (storageKeys.length === 0) {
        setError("Draw at least one opening before saving.");
        return;
      }

      // Everything typed into the sheet's fields, grouped by page and opening, so the supplier gets one proper PDF.
      const pageMap = new Map<number, { header: Record<string, string>; openings: Map<number, Record<string, string>> }>();
      document.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>('[name^="page"]').forEach((el) => {
        const m = el.name.match(/^page(\d+)_(?:opening(\d+)_)?(.+)$/);
        if (!m) return;
        const page = Number(m[1]);
        const entry: { header: Record<string, string>; openings: Map<number, Record<string, string>> } = pageMap.get(page) ?? { header: {}, openings: new Map() };
        if (m[2]) {
          const fields: Record<string, string> = entry.openings.get(Number(m[2])) ?? {};
          fields[m[3]] = el.value;
          entry.openings.set(Number(m[2]), fields);
        } else entry.header[m[3]] = el.value;
        pageMap.set(page, entry);
      });
      const sheet = {
        pages: Array.from(pageMap.entries())
          .sort((a, b) => a[0] - b[0])
          .map(([pageNum, e]) => ({
            pageNum,
            header: e.header,
            openings: Array.from(e.openings.entries())
              .sort((a, b) => a[0] - b[0])
              .map(([index, fields]) => ({ index, fields, storageKey: keyByCanvas.get(`smCanvas_${pageNum}_${index}`) ?? "" }))
              .filter((o) => o.storageKey),
          }))
          .filter((p) => p.openings.length > 0),
      };

      setStatus("Emailing supplier...");
      const { error: sendError } = await sendSiteMeasureSheetEmail({
        jobNumber: job.number,
        supplierEmail,
        pageCount: 1,
        storageKeys,
        subject: emailSubject,
        body: emailBody,
        sheet,
      });
      if (sendError) throw new Error(sendError);

      setStatus(`Sent — the measure sheet PDF (${uploaded} opening${uploaded === 1 ? "" : "s"}) was saved to the job and emailed.`);
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
            <JobPicker jobs={jobs} value={selectedJobNumber} onChange={setSelectedJobNumber} />
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
          {/* top:92 clears the app's own fixed blue utility bar (48px) + black
              section-tab bar (44px) — without this the sticky offset was too
              small and the pen picker slid up underneath those bars while
              scrolling, instead of staying visible above the sheet. */}
          <div className="card" style={{ marginTop: 16, position: "sticky", top: 92, zIndex: 5, boxShadow: "0 4px 14px rgba(0,0,0,.08)" }}>
            <div className="label">Pen</div>
            <div className="actions">
              {PEN_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  className="btn light"
                  style={color === c.value && tool !== "text" ? { outline: `2px solid ${c.value}` } : undefined}
                  onClick={() => {
                    setColor(c.value);
                    if (tool === "text") setTool("line");
                  }}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                className="btn light"
                style={tool === "line" ? { outline: `2px solid ${color}`, fontWeight: 900 } : undefined}
                onClick={() => setTool("line")}
                title="Drag to draw a straight line"
              >
                ╱ Straight Line
              </button>
              <button
                type="button"
                className="btn light"
                style={tool === "curve" ? { outline: `2px solid ${color}`, fontWeight: 900 } : undefined}
                onClick={() => setTool("curve")}
                title="Draw a curly / freehand line"
              >
                ∿ Curly Line
              </button>
              <button
                type="button"
                className="btn light"
                style={tool === "text" ? { outline: `2px solid ${color}`, fontWeight: 900 } : undefined}
                onClick={() => setTool(tool === "text" ? "line" : "text")}
                title="Tap this, then tap the sketch where the text should go"
              >
                Aa Add Text
              </button>
              <button type="button" className="btn primary" onClick={addOpening}>
                + Add New Box
              </button>
            </div>
            {tool === "text" && <div className="hint" style={{ marginTop: 6 }}>Text mode: tap the sketch where the text should go, then type it. Pick Straight Line or Curly Line to go back to drawing.</div>}
          </div>

          <form ref={formRef}>
            <PageBlock pageNum={1} job={job} color={color} tool={tool} openings={openings} registerCanvas={registerCanvas} />
          </form>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="label">Email to Supplier</div>
            <div className="form">
              <div>
                <label>Supplier Contact</label>
                <ContactPicker contacts={allContacts} value={supplierEmail} onChange={setSupplierEmail} />
                {contacts.length === 0 && job?.supplier && (
                  <div className="hint" style={{ marginTop: 4 }}>
                    No contact matched “{job.supplier}” automatically — search for the right one above.
                  </div>
                )}
              </div>
            </div>
            <div className="form" style={{ marginTop: 12 }}>
              <div>
                <label>Email Template</label>
                <select value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                  <option value="">— Write my own —</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Subject</label>
                <input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} placeholder="Please Quote — job number" />
              </div>
              <div className="full">
                <label>Message (edit before sending — your name is added at the end)</label>
                <textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} rows={8} style={{ width: "100%" }} />
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
