"use client";

import { useState } from "react";
import { JobEditForm } from "./JobEditForm";

const STATUS_COLOR: Record<string, string> = {
  New: "blue",
  "In Progress": "purple",
  "On Hold": "orange",
  Complete: "green",
};

export function JobDetailsCard({
  jobNumber,
  clientName,
  clientPhone,
  clientEmail,
  status,
  type,
  supplier,
  address,
  assignedUserName,
  assignedUserId,
  startDate,
  staff,
}: {
  jobNumber: string;
  clientName: string;
  clientPhone: string;
  clientEmail: string;
  status: string;
  type: "RESIDENTIAL" | "COMMERCIAL";
  supplier: string;
  address: string;
  assignedUserName: string;
  assignedUserId: string;
  startDate: string;
  staff: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: editing ? 12 : 0 }}>
        <div className="label">Job Details</div>
        {!editing && (
          <button type="button" className="btn light" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <JobEditForm
          jobNumber={jobNumber}
          clientName={clientName}
          clientPhone={clientPhone}
          clientEmail={clientEmail}
          status={status}
          type={type}
          supplier={supplier}
          address={address}
          assignedUserId={assignedUserId}
          startDate={startDate}
          staff={staff}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Status</label>
            <div>
              <span className={`status ${STATUS_COLOR[status] ?? "grey"}`}>{status}</span>
            </div>
          </div>
          <div>
            <label>Type</label>
            <div>{type === "COMMERCIAL" ? "Commercial" : "Residential"}</div>
          </div>
          <div>
            <label>Supplier</label>
            <div>{supplier || "—"}</div>
          </div>
          <div>
            <label>Assigned To</label>
            <div>{assignedUserName || "—"}</div>
          </div>
          <div>
            <label>Start Date</label>
            <div>{startDate ? new Date(startDate).toLocaleDateString("en-NZ") : "—"}</div>
          </div>
          <div className="full">
            <label>Address</label>
            <div>{address || "—"}</div>
          </div>
          <div>
            <label>Customer</label>
            <div>{clientName || "—"}</div>
          </div>
          <div>
            <label>Customer Phone</label>
            <div>{clientPhone || "—"}</div>
          </div>
          <div>
            <label>Customer Email</label>
            <div>{clientEmail || "—"}</div>
          </div>
        </div>
      )}
    </div>
  );
}
