"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_TREE, isNavGroup, type NavLeaf, type NavGroup } from "./navTree";
import type { usePins } from "./usePins";

type Pins = ReturnType<typeof usePins>;

function NavItem({ item, pathname, pins }: { item: NavLeaf; pathname: string; pins: Pins }) {
  const isActive = pathname === item.href.split("?")[0];
  const pinned = pins.isPinned(item.href);

  return (
    <Link href={item.href} className={isActive ? "active" : ""}>
      <span>{item.label}</span>
      <button
        type="button"
        className={`pinToggle${pinned ? " pinned" : ""}`}
        title={pinned ? "Unpin" : "Pin to top bar"}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pins.toggle(item.href, item.label);
        }}
      >
        📌
      </button>
    </Link>
  );
}

function NavGroupView({
  group,
  pathname,
  pins,
  isSuperUser,
  depth,
}: {
  group: NavGroup;
  pathname: string;
  pins: Pins;
  isSuperUser: boolean;
  depth: number;
}) {
  // Depth 1 (e.g. Commercial/Residential under Sales) gets the normal indent
  // step. Anything nested deeper (e.g. Quotes under Residential) stays flush
  // with its sibling leaf items instead of compounding another indent level —
  // only its own children indent in from there.
  const className = depth >= 2 ? "navGroup navSubGroup navFlat" : "navGroup navSubGroup";

  return (
    <details className={className}>
      <summary>{group.label}</summary>
      {group.items.map((item, i) =>
        isNavGroup(item) ? (
          <NavGroupView
            key={item.label + i}
            group={item}
            pathname={pathname}
            pins={pins}
            isSuperUser={isSuperUser}
            depth={depth + 1}
          />
        ) : item.superUserOnly && !isSuperUser ? null : (
          <NavItem key={item.href + item.label} item={item} pathname={pathname} pins={pins} />
        )
      )}
    </details>
  );
}

export function NavSidebar({ isSuperUser, pins }: { isSuperUser: boolean; pins: Pins }) {
  const pathname = usePathname();

  return (
    <nav className="nav">
      <NavItem item={{ label: "Notes", href: "/notes" }} pathname={pathname} pins={pins} />
      {NAV_TREE.map((group) => (
        <details className="navGroup" key={group.label}>
          <summary>{group.label}</summary>
          {group.items.map((item, i) =>
            isNavGroup(item) ? (
              <NavGroupView
                key={item.label + i}
                group={item}
                pathname={pathname}
                pins={pins}
                isSuperUser={isSuperUser}
                depth={1}
              />
            ) : item.superUserOnly && !isSuperUser ? null : (
              <NavItem key={item.href + item.label} item={item} pathname={pathname} pins={pins} />
            )
          )}
        </details>
      ))}
    </nav>
  );
}
