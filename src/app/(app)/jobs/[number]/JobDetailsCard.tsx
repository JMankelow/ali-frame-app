"use client";

import { useState } from "react";
import { JobEditForm } from "./JobEditForm";
import { JOB_STATUS_COLOR } from "@/lib/jobStatus";

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
  priceType,
  leadSource,
  staff,
  suppliers,
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
  priceType: string;
  leadSource: string;
  staff: { id: string; name: string }[];
  suppliers: { id: string; companyName: string }[];
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
          priceType={priceType}
          leadSource={leadSource}
          staff={staff}
          suppliers={suppliers}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Status</label>
            <div>
              <span className={`status ${JOB_STATUS_COLOR[status] ?? "grey"}`}>{status}</span>
            </div>
          </div>
          <div>
            <label>Type</label>
            <div>{type === "COMMERCIAL" ? "Commercial" : "Residential"}</div>
          </div>
          <div>
            <label>Price Type</label>
            <div>{priceType || "—"}</div>
          </div>
          <div>
            <label>How Did They Hear About Us?</label>
            <div>{leadSource || "—"}</div>
          </div>
          <div>
            <label>Supplier</label>
            <div>{supplier || "—"}</div>
          </div>
          <div>
            <label>Assigned To (Sales)</label>
            <div>{assignedUserName || "—"}</div>
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
