"use client";

import { NavSidebar } from "./NavSidebar";
import { Brandbar } from "./Brandbar";
import { usePins } from "./usePins";

const PROTOTYPE_URL = "https://claude.ai/code/artifact/c92f8bb2-9536-4b09-8104-2c8cd55ffb78";

export function AppShell({
  isSuperUser,
  userBadge,
  signOutForm,
  children,
}: {
  isSuperUser: boolean;
  userBadge: React.ReactNode;
  signOutForm: React.ReactNode;
  children: React.ReactNode;
}) {
  const pins = usePins();

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="side-logo">AF</div>
          <div>
            <h1>Ali-Frame</h1>
            <span>Job Management System</span>
          </div>
        </div>
        <NavSidebar isSuperUser={isSuperUser} pins={pins} />
        <div className="navUnsorted">
          <div className="navUnsorted-label">Not yet migrated</div>
          <a href={PROTOTYPE_URL} target="_blank" rel="noopener noreferrer">
            Other tools (prototype) ↗
          </a>
        </div>
      </aside>
      <main>
        <div className="topbar">
          <div>{userBadge}</div>
          {signOutForm}
        </div>
        <Brandbar pins={pins} />
        {children}
      </main>
    </div>
  );
}
