"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NavSidebar } from "./NavSidebar";
import { Brandbar } from "./Brandbar";
import { TopTabs } from "./TopTabs";
import { usePins } from "./usePins";
import { findSectionForPath, NAV_TREE } from "./navTree";

const PROTOTYPE_URL = "https://claude.ai/artifact/RqumJgPWXTGv6d8W2pvRiw";

const SYNC_BUTTONS = [
  { label: "Email Triage", href: "/email-triage" },
  { label: "Sync Xero", href: "/sync/xero" },
  { label: "Sync EROAD", href: "/sync/eroad" },
];

export function AppShell({
  isSuperUser,
  visibleSections,
  userBadge,
  signOutForm,
  openTaskCount,
  children,
}: {
  isSuperUser: boolean;
  visibleSections: string[];
  userBadge: React.ReactNode;
  signOutForm: React.ReactNode;
  openTaskCount: number;
  children: React.ReactNode;
}) {
  const pins = usePins();
  const pathname = usePathname();
  const visibleTree = NAV_TREE.filter((g) => visibleSections.includes(g.label));

  // Which top-level section's items the sidebar shows. Clicking a top tab
  // changes this without navigating; landing directly on a page (e.g. via a
  // bookmark or a Link elsewhere in the app) auto-selects its section instead
  // of leaving the sidebar showing something unrelated to where you are.
  const [selectedSection, setSelectedSection] = useState<string | null>(() => {
    const fromPath = findSectionForPath(NAV_TREE, pathname);
    if (fromPath && visibleSections.includes(fromPath)) return fromPath;
    return visibleTree[0]?.label ?? null;
  });

  useEffect(() => {
    const section = findSectionForPath(NAV_TREE, pathname);
    if (section && visibleSections.includes(section)) setSelectedSection(section);
  }, [pathname, visibleSections]);

  return (
    <>
      <div className="topUtilityBar">
        <div className="side-logo" style={{ width: 34, height: 34 }}>
          <img src="/icon.svg" alt="Ali-Frame" style={{ width: "100%", height: "100%", borderRadius: 8 }} />
        </div>
        <Link href="/notes" className="syncBtn" style={{ fontWeight: 900 }}>
          📝 Update Notes
        </Link>
        <Link href="/communications" className="syncBtn" style={{ fontWeight: 900 }}>
          💬 Communications Hub
        </Link>
        <div style={{ flex: 1 }} />
        {SYNC_BUTTONS.map((s) => (
          <Link key={s.href} href={s.href} className="syncBtn">
            {s.label}
          </Link>
        ))}
        <Link href="/tasks" className="syncBtn" style={{ position: "relative" }} title="My Tasks">
          🔔
          {openTaskCount > 0 && <span className="taskBadge">{openTaskCount}</span>}
        </Link>
        <div className="topUtilityUser">{userBadge}</div>
        {signOutForm}
      </div>
      <TopTabs selected={selectedSection} onSelect={setSelectedSection} visibleSections={visibleSections} />
      <div className="app">
        <aside>
          <NavSidebar isSuperUser={isSuperUser} pins={pins} selectedSection={selectedSection} />
          <div className="navUnsorted">
            <div className="navUnsorted-label">Not yet migrated</div>
            <a href={PROTOTYPE_URL} target="_blank" rel="noopener noreferrer">
              Other tools (prototype) ↗
            </a>
          </div>
        </aside>
        <main>
          <Brandbar pins={pins} />
          {children}
        </main>
      </div>
    </>
  );
}
