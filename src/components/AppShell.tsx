"use client";

import Link from "next/link";
import { NavSidebar } from "./NavSidebar";
import { Brandbar } from "./Brandbar";
import { usePins } from "./usePins";

const PROTOTYPE_URL = "https://claude.ai/code/artifact/c92f8bb2-9536-4b09-8104-2c8cd55ffb78";

export function AppShell({
  isSuperUser,
  userBadge,
  signOutForm,
  openTaskCount,
  children,
}: {
  isSuperUser: boolean;
  userBadge: React.ReactNode;
  signOutForm: React.ReactNode;
  openTaskCount: number;
  children: React.ReactNode;
}) {
  const pins = usePins();

  return (
    <>
      <div className="appTopBrandBar" />
      <div className="app">
      <aside>
        <div className="brand">
          <div className="side-logo">
            <img src="/icon.svg" alt="Ali-Frame" style={{ width: "100%", height: "100%", borderRadius: 12 }} />
          </div>
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
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Link href="/tasks" className="btn light" style={{ position: "relative" }} title="My Tasks">
              🔔 Tasks
              {openTaskCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -6,
                    right: -6,
                    background: "#dc2626",
                    color: "#fff",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 900,
                    padding: "1px 6px",
                  }}
                >
                  {openTaskCount}
                </span>
              )}
            </Link>
            {signOutForm}
          </div>
        </div>
        <Brandbar pins={pins} />
        {children}
      </main>
      </div>
    </>
  );
}
