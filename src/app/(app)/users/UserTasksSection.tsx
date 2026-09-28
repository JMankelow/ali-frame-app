"use client";

import { useActionState, useState } from "react";
import { createNote, updateNoteText, resolveNote, type NoteFormState } from "../notes/actions";

export interface UserTaskRow {
  id: string;
  text: string;
  authorName: string;
  createdAt: string;
}

const initialState: NoteFormState = {};

export function UserTasksSection({
  users,
}: {
  users: { id: string; name: string; tasks: UserTaskRow[] }[];
}) {
  return (
    <div className="card">
      <div className="label">Current Tasks</div>
      <div className="hint" style={{ marginTop: 4 }}>
        Open tasks assigned to each person — edit the wording, mark done, or assign a new one.
      </div>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
        {users.map((u) => (
          <div key={u.id} style={{ borderTop: "1px solid #e5e7eb", paddingTop: 10 }}>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>{u.name}</div>
            {u.tasks.length === 0 ? (
              <div className="hint" style={{ marginBottom: 6 }}>
                Nothing outstanding.
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 6 }}>
                {u.tasks.map((t) => (
                  <TaskItem key={t.id} task={t} />
                ))}
              </div>
            )}
            <NewTaskForm assignedToId={u.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

function TaskItem({ task }: { task: UserTaskRow }) {
  const [editing, setEditing] = useState(false);
  const action = updateNoteText.bind(null, task.id);
  const [state, formAction, pending] = useActionState(action, initialState);

  if (editing) {
    return (
      <form
        action={async (fd) => {
          await formAction(fd);
          setEditing(false);
        }}
        style={{ display: "flex", gap: 6 }}
      >
        <input name="text" defaultValue={task.text} style={{ flex: 1 }} />
        <button type="submit" className="btn primary" disabled={pending}>
          Save
        </button>
        <button type="button" className="btn light" onClick={() => setEditing(false)}>
          Cancel
        </button>
        {state.error && <div className="authError">{state.error}</div>}
      </form>
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1 }}>
        {task.text}
        <div className="hint">
          {task.authorName} — {new Date(task.createdAt).toLocaleDateString("en-NZ")}
        </div>
      </div>
      <button type="button" className="btn light" onClick={() => setEditing(true)}>
        Edit
      </button>
      <form action={resolveNote.bind(null, task.id)}>
        <button type="submit" className="btn light">
          Mark Done
        </button>
      </form>
    </div>
  );
}

function NewTaskForm({ assignedToId }: { assignedToId: string }) {
  const [state, formAction, pending] = useActionState(createNote, initialState);

  return (
    <form action={formAction} style={{ display: "flex", gap: 6 }}>
      <input type="hidden" name="assignedToId" value={assignedToId} />
      <input name="text" placeholder="Assign a new task…" style={{ flex: 1 }} required />
      <button type="submit" className="btn light" disabled={pending}>
        {pending ? "Adding…" : "Add"}
      </button>
      {state.error && <div className="authError">{state.error}</div>}
    </form>
  );
}
