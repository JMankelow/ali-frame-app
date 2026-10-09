// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
"use client";

import { useActionState, useState, useTransition } from "react";
import { TeamPicker } from "@/components/TeamPicker";
import { saveGroup, deleteGroup, type GroupFormState } from "./actions";

interface Person {
  id: string;
  name: string;
}
interface Group {
  id: string;
  name: string;
  members: Person[];
}

const initial: GroupFormState = {};

/** Name + who's in it. Used for both adding a group and changing one. */
function GroupEditor({ group, people, onDone }: { group?: Group; people: Person[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(
    async (prev: GroupFormState, fd: FormData) => {
      const r = await saveGroup(prev, fd);
      if (!r.error) onDone();
      return r;
    },
    initial,
  );
  return (
    <form action={action} style={{ marginTop: 8 }}>
      {group && <input type="hidden" name="id" value={group.id} />}
      <div className="form">
        <div>
          <label>Group name</label>
          <input name="name" defaultValue={group?.name ?? ""} placeholder="e.g. Auckland crew" required />
        </div>
        <div>
          <label>Who is in this group</label>
          <TeamPicker name="memberIds" staff={people} defaultSelectedIds={group?.members.map((m) => m.id) ?? []} allowAdd={false} />
        </div>
      </div>
      {state.error && <div className="authError" style={{ marginTop: 10 }}>{state.error}</div>}
      <div className="actions" style={{ marginTop: 12 }}>
        <button type="submit" className="btn primary" disabled={pending}>{pending ? "Saving…" : group ? "Save group" : "Add group"}</button>
        <button type="button" className="btn light" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

function GroupCard({ group, people }: { group: Group; people: Person[] }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  return (
    <div className="card" style={{ marginTop: 12 }}>
      <div className="topbar" style={{ marginBottom: 6 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 17 }}>{group.name}</div>
          <div className="hint">{group.members.length} {group.members.length === 1 ? "person" : "people"}</div>
        </div>
        {!editing && (
          <div className="actions">
            <button type="button" className="btn light" onClick={() => setEditing(true)}>Edit</button>
            <button
              type="button"
              className="btn light"
              style={{ color: "#b91c1c" }}
              disabled={pending}
              onClick={() => { if (window.confirm(`Delete the group "${group.name}"? The people stay — only the group goes.`)) start(() => deleteGroup(group.id)); }}
            >
              Delete
            </button>
          </div>
        )}
      </div>
      {editing ? (
        <GroupEditor group={group} people={people} onDone={() => setEditing(false)} />
      ) : group.members.length === 0 ? (
        <div className="hint">No one in this group yet.</div>
      ) : (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {group.members.map((m) => (
            <span key={m.id} style={{ background: "#e6f4fd", border: "1px solid #b9dff5", color: "#0b2a4a", borderRadius: 999, padding: "3px 10px", fontSize: 13, fontWeight: 600 }}>{m.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export function GroupsManager({ groups, people }: { groups: Group[]; people: Person[] }) {
  const [adding, setAdding] = useState(false);
  return (
    <div>
      {!adding ? (
        <button type="button" className="btn primary" onClick={() => setAdding(true)}>+ Add a group</button>
      ) : (
        <div className="card">
          <div className="label">New group</div>
          <GroupEditor people={people} onDone={() => setAdding(false)} />
        </div>
      )}
      {groups.length === 0 && !adding && <div className="card hint" style={{ marginTop: 12 }}>No groups yet — add one and pick who&apos;s in it.</div>}
      {groups.map((g) => (
        <GroupCard key={g.id} group={g} people={people} />
      ))}
    </div>
  );
}
