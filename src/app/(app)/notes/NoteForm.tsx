"use client";

import { useActionState } from "react";
import { createNote, type NoteFormState } from "./actions";

const initialState: NoteFormState = {};

export function NoteForm({ users }: { users: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createNote, initialState);

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div className="label">Add a Note</div>
      <form action={formAction} style={{ marginTop: 10 }}>
        <div className="form">
          <div className="full">
            <label htmlFor="text">Note</label>
            <textarea id="text" name="text" rows={3} required placeholder="A bug, a request, something that still needs building..." />
          </div>
          <div>
            <label htmlFor="assignedToId">Assign To</label>
            <select id="assignedToId" name="assignedToId" defaultValue="">
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {state.error && <div className="authError">{state.error}</div>}
        <div className="actions" style={{ marginTop: 12 }}>
          <button type="submit" className="btn primary" disabled={pending}>
            {pending ? "Adding…" : "Add Note"}
          </button>
        </div>
      </form>
    </div>
  );
}
