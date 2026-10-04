"use client";

import Link from "next/link";

/** One row in a checklist list. "Complete" always opens the full Yes/No vehicle check — never an inline notes box. */
export function ChecklistRow({
  id,
  vehicleName,
  assignedName,
  dueDate,
  status,
}: {
  id: string;
  vehicleName: string;
  assignedName: string;
  items?: string;
  dueDate: string;
  status: string;
  template?: string;
}) {
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
        <Link href={`/vehicles/checklist/${id}`} className={status === "Completed" ? "btn light" : "btn primary"}>
          {status === "Completed" ? "View" : "Complete check"}
        </Link>
      </td>
    </tr>
  );
}
