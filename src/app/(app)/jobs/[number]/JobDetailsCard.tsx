"use client";

import { useState } from "react";
import { JobEditForm } from "./JobEditForm";
import { JOB_STATUS_COLOR } from "@/lib/jobStatus";
import { jobStatusStyle } from "@/lib/statusColors";
import { AddressLink } from "@/components/AddressLink";

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
  installDays,
  staff,
  suppliers,
  readOnly = false,
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
  installDays: string;
  staff: { id: string; name: string }[];
  suppliers: { id: string; companyName: string }[];
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);

  return (
    <div className="card">
      <div className="topbar" style={{ marginBottom: editing ? 12 : 0 }}>
        <div className="label">Job Details</div>
        {!editing && !readOnly && (
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
          installDays={installDays}
          staff={staff}
          suppliers={suppliers}
          onDone={() => setEditing(false)}
        />
      ) : (
        <div className="form" style={{ marginTop: 10 }}>
          <div>
            <label>Status</label>
            <div>
              <span className={`status ${JOB_STATUS_COLOR[status] ?? "grey"}`} style={jobStatusStyle(status)}>{status}</span>
            </div>
          </div>
          <div>
            <label>Type</label>
            <div>{type === "COMMERCIAL" ? "Commercial" : "Residential"}</div>
          </div>
          <div>
            <label>Install Days</label>
            <div>{installDays || "—"}</div>
          </div>
{!readOnly && (
          <div>
            <label>Price Type</label>
            <div>{priceType || "—"}</div>
          </div>
)}
{!readOnly && (
          <div>
            <label>How Did They Hear About Us?</label>
            <div>{leadSource || "—"}</div>
          </div>
)}
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
            <div><AddressLink address={address} /></div>
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
