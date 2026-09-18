"use client";

import { useState } from "react";
import { completeVehicleChecklist } from "./checklistActions";

export function ChecklistRow({
  id,
  vehicleName,
  assignedName,
  items,
  dueDate,
  status,
}: {
  id: string;
  vehicleName: string;
  assignedName: string;
  items: string;
  dueDate: string;
  status: string;
}) {
  const [open, setOpen] = useState(false);
  const isOverdue = status === "Pending" && new Date(dueDate) < new Date();

  return (
    <tr>
      <td>{vehicleName}</td>
      <td>{assignedName}</td>
      <td>{new Date(dueDate).toLocaleDateString("en-NZ")}</td>
      <td>
        <span className={`status ${status === "Completed" ? "green" : isOverdue ? "red" : "orange"}`}>
          {status === "Completed" ? "Completed" : isOverdue ? "Overdue" : "Pending"}
        </span>
      </td>
      <td>
        {status !== "Completed" &&
          (open ? (
            <form
              action={async (formData) => {
                await completeVehicleChecklist(id, formData);
                setOpen(false);
              }}
            >
              <div style={{ fontSize: 12, whiteSpace: "pre-wrap", marginBottom: 6 }}>{items}</div>
              <textarea name="responses" rows={2} placeholder="Notes (optional)" style={{ width: "100%" }} />
              <div className="actions" style={{ marginTop: 6 }}>
                <button type="submit" className="btn primary">
                  Mark Complete
                </button>
                <button type="button" className="btn light" onClick={() => setOpen(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn light" onClick={() => setOpen(true)}>
              Complete
            </button>
          ))}
      </td>
    </tr>
  );
}
