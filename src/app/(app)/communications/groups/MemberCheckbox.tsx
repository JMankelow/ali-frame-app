"use client";

import { useTransition } from "react";
import { toggleGroupMember } from "./actions";

export function MemberCheckbox({ groupId, userId, checked }: { groupId: string; userId: string; checked: boolean }) {
  const [pending, startTransition] = useTransition();

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formData = new FormData();
    if (e.currentTarget.checked) formData.set("member", "on");
    startTransition(() => toggleGroupMember(groupId, userId, formData));
  }

  return <input type="checkbox" defaultChecked={checked} disabled={pending} onChange={handleChange} />;
}
