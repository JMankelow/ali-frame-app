"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createJob, searchClients, type ClientHit, type JobFormState } from "./actions";
import { JOB_STATUS_OPTIONS, JOB_LEAD_SOURCES, JOB_PRICE_TYPES } from "@/lib/jobStatus";

const initialState: JobFormState = {};

/** Add a job in one go — customer, type, status, price type, lead, supplier, install days and who it's with. Previous customers can be found and re-used. */
export function JobForm({ nextNumber, suppliers, staff }: { nextNumber: string; suppliers: string[]; staff: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createJob, initialState);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [clientId, setClientId] = useState("");
  const [hits, setHits] = useState<ClientHit[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wasPending = useRef(false);

  // After a successful add, clear the customer fields ready for the next job.
  useEffect(() => {
    if (wasPending.current && !pending && !state.error) {
      setName("");
      setPhone("");
      setEmail("");
      setAddress("");
      setClientId("");
    }
    wasPending.current = pending;
  }, [pending, state.error]);

  // Look up previous customers as the name is typed (only until one is picked).
  useEffect(() => {
    if (clientId || name.trim().length < 2) {
      setHits([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        setHits(await searchClients(name));
      } catch {
        setHits([]);
      }
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [name, clientId]);

  function pick(c: ClientHit) {
    setClientId(c.id);
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setHits([]);
    setOpen(false);
  }
  function clearPick() {
    setClientId("");
    setPhone("");
    setEmail("");
    setAddress("");
  }

  return (
    <div id="add-job" className="card" style={{ marginTop: 16, scrollMarginTop: 110 }}>
      <div className="label">Add Job</div>
      <form action={formAction} className="form" style={{ marginTop: 10 }}>
        <input type="hidden" name="clientId" value={clientId} />

        <div className="full label" style={{ marginTop: 4 }}>Customer</div>
        <div style={{ position: "relative" }}>
          <label htmlFor="clientName">Customer name — start typing to find a previous customer</label>
          <input
            id="clientName"
            name="clientName"
            value={name}
            autoComplete="off"
            required
            onChange={(e) => {
              setName(e.target.value);
              if (clientId) clearPick();
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
          />
          {clientId && <div className="hint" style={{ marginTop: 2 }}>Existing customer — details filled in. Edit the name to start a new one.</div>}
          {open && hits.length > 0 && (
            <div style={{ position: "absolute", zIndex: 20, left: 0, right: 0, top: "100%", background: "#fff", border: "1px solid var(--line)", borderRadius: 8, boxShadow: "0 6px 18px rgba(0,0,0,.12)", maxHeight: 260, overflowY: "auto" }}>
              {hits.map((c) => (
                <button key={c.id} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)} style={{ display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "none", background: "transparent", cursor: "pointer" }}>
                  <b>{c.name}</b>
                  <div className="hint">{[c.phone, c.email, c.address].filter(Boolean).join(" · ") || "No other details"}</div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div>
          <label htmlFor="clientPhone">Customer phone</label>
          <input id="clientPhone" name="clientPhone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div>
          <label htmlFor="clientEmail">Customer email</label>
          <input id="clientEmail" name="clientEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="full">
          <label htmlFor="address">Address</label>
          <input id="address" name="address" value={address} onChange={(e) => setAddress(e.target.value)} />
        </div>

        <div className="full label" style={{ marginTop: 8 }}>Job</div>
        <div>
          <label htmlFor="number">Job Number</label>
          <input id="number" name="number" defaultValue={nextNumber} key={nextNumber} required />
          <div className="hint">Filled in with the next free number — change it only if you need to.</div>
        </div>
        <div>
          <label htmlFor="type">Job Type</label>
          <select id="type" name="type" defaultValue="RESIDENTIAL">
            <option value="RESIDENTIAL">Residential</option>
            <option value="COMMERCIAL">Commercial</option>
          </select>
        </div>
        <div>
          <label htmlFor="status">Status</label>
          <select id="status" name="status" defaultValue="New">
            {JOB_STATUS_OPTIONS.map((st) => (
              <option key={st}>{st}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="installDays">Install Days</label>
          <input id="installDays" name="installDays" type="number" step="0.5" min="0.5" placeholder="e.g. 2" />
        </div>
        <div>
          <label htmlFor="priceType">Price Type</label>
          <select id="priceType" name="priceType" defaultValue="">
            <option value="">— Select price type —</option>
            {JOB_PRICE_TYPES.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="leadSource">How Did They Hear About Us?</label>
          <select id="leadSource" name="leadSource" defaultValue="">
            <option value="">— Select lead —</option>
            {JOB_LEAD_SOURCES.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="supplier">Supplier</label>
          <select id="supplier" name="supplier" defaultValue="">
            <option value="">— Select supplier —</option>
            {suppliers.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="assignedUserId">Assigned To (Sales)</label>
          <select id="assignedUserId" name="assignedUserId" defaultValue="">
            <option value="">— Unassigned —</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        {state.error && <div className="authError full">{state.error}</div>}
        <div className="full actions">
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Job"}
          </button>
        </div>
      </form>
    </div>
  );
}
