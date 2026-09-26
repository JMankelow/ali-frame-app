export interface NavLeaf {
  label: string;
  href: string;
  superUserOnly?: boolean;
}
export interface NavGroup {
  label: string;
  items: (NavLeaf | NavGroup)[];
  /** Only show this group's contents to super users (e.g. Users under Settings). */
  superUserOnly?: boolean;
}

export function isNavGroup(item: NavLeaf | NavGroup): item is NavGroup {
  return "items" in item;
}

function containsPath(items: (NavLeaf | NavGroup)[], path: string): boolean {
  return items.some((item) =>
    isNavGroup(item) ? containsPath(item.items, path) : item.href.split("?")[0] === path
  );
}

/** Finds which top-level NAV_TREE group (by label) a route lives under, so the
 * top tab bar can auto-select the right section when a page is opened directly
 * (not just when a tab is clicked). Returns null for routes outside the tree
 * (Dashboard, Tasks, Notes, Jobs detail pages, etc). */
export function findSectionForPath(tree: NavGroup[], path: string): string | null {
  const match = tree.find((group) => containsPath(group.items, path));
  return match?.label ?? null;
}

/** A whole group (e.g. "Check Measures") has no single page of its own, so
 * pinning it pins a shortcut to its first leaf item — the practical
 * equivalent of "take me straight into this section". */
export function firstHref(group: NavGroup): string | null {
  for (const item of group.items) {
    if (isNavGroup(item)) {
      const nested = firstHref(item);
      if (nested) return nested;
    } else {
      return item.href;
    }
  }
  return null;
}

function salesSection(): NavGroup {
  const quotesGroup = (): NavGroup => ({
    label: "Quotes",
    items: [
      { label: "Quote Register", href: "/quotes" },
      { label: "Prepare Price", href: "/prepare-price" },
      { label: "Convert Schedule", href: "/quotes" },
      { label: "Quote Comparison", href: "/quote-comparison" },
      { label: "Quote Wording", href: "/quote-wording" },
    ],
  });

  return {
    label: "Sales",
    items: [
      { label: "Calendar", href: "/calendar" },
      {
        label: "Commercial",
        items: [
          { label: "Leads", href: "/leads" },
          { label: "Estimates", href: "/estimates" },
          { label: "Site Measures", href: "/site-measure" },
          { label: "Book Measure", href: "/book-appointment" },
          quotesGroup(),
        ],
      },
      {
        label: "Residential",
        items: [
          { label: "Leads", href: "/leads" },
          { label: "Estimates", href: "/estimates" },
          { label: "Site Measures", href: "/site-measure" },
          { label: "Book Measure", href: "/book-appointment" },
          quotesGroup(),
        ],
      },
    ],
  };
}

export const NAV_TREE: NavGroup[] = [
  salesSection(),
  {
    label: "Jobs",
    items: [
      { label: "Overview", href: "/jobs" },
      { label: "Residential", href: "/jobs?type=Residential" },
      { label: "Commercial", href: "/jobs?type=Commercial" },
      { label: "Inactive", href: "/jobs?archived=1" },
    ],
  },
  {
    label: "Operations",
    items: [
      {
        label: "Residential",
        items: [
          { label: "Acceptances", href: "/acceptances" },
          {
            label: "Check Measures",
            items: [
              { label: "Email Client", href: "/email-client" },
              { label: "Prepare Check Measure", href: "/prepare-check-measure" },
              { label: "Book Check Measure", href: "/book-appointment" },
              { label: "Prepare Final Measure", href: "/prepare-final-measure" },
            ],
          },
          { label: "Book Appointment", href: "/book-appointment" },
          { label: "Purchase Orders", href: "/purchase-orders" },
          { label: "Remedial", href: "/remedial" },
          { label: "Calendar", href: "/calendar" },
        ],
      },
      {
        label: "Commercial",
        items: [
          { label: "Acceptances", href: "/acceptances" },
          {
            label: "Check Measures",
            items: [
              { label: "Email Client", href: "/email-client" },
              { label: "Prepare Check Measure", href: "/prepare-check-measure" },
              { label: "Book Check Measure", href: "/book-appointment" },
              { label: "Prepare Final Measure", href: "/prepare-final-measure" },
            ],
          },
          { label: "Book Appointment", href: "/book-appointment" },
          { label: "Remedial", href: "/remedial" },
          { label: "Calendar", href: "/calendar" },
          { label: "QA Documentation", href: "/qa-documentation" },
        ],
      },
    ],
  },
  {
    label: "Human Resources",
    items: [
      { label: "Assets", href: "/assets" },
      { label: "Vehicles", href: "/vehicles" },
      { label: "Timesheets", href: "/timesheets" },
      { label: "Payroll", href: "/payroll" },
      { label: "Health & Safety", href: "/health-safety" },
      { label: "Performance", href: "/performance" },
      { label: "Senior Performance", href: "/senior-performance" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { label: "Costing & Margin", href: "/costing" },
      { label: "WIP Report", href: "/wip" },
      { label: "Cashflow", href: "/cashflow" },
      {
        label: "Invoicing",
        items: [
          { label: "Sales", href: "/invoicing/sales" },
          { label: "Purchases", href: "/invoicing/purchases" },
        ],
      },
      {
        label: "Reports",
        items: [
          { label: "Profit & Loss", href: "/reports/profit-loss" },
          { label: "Balance Sheet", href: "/reports/balance-sheet" },
          { label: "Budget vs Actual", href: "/reports/budget" },
          { label: "Accounts Receivable", href: "/reports/accounts-receivable" },
          { label: "Accounts Payable", href: "/reports/accounts-payable" },
          { label: "Monthly Management Report", href: "/reports/monthly" },
        ],
      },
    ],
  },
  {
    label: "Marketing",
    items: [
      { label: "Branding Guidelines", href: "/marketing/branding" },
      { label: "Logo", href: "/marketing/logo" },
      { label: "Social Media", href: "/marketing/social-media" },
      { label: "Pending Content", href: "/marketing/pending-content" },
    ],
  },
  {
    label: "Communications",
    items: [
      { label: "Hub", href: "/communications" },
      { label: "Groups", href: "/communications/groups" },
      { label: "Notes", href: "/notes" },
      { label: "Email Templates", href: "/templates" },
      { label: "Leads", href: "/leads" },
    ],
  },
  {
    label: "Installers",
    items: [
      { label: "Calendar", href: "/calendar" },
      { label: "Jobs", href: "/jobs" },
      { label: "Residential", href: "/jobs?type=Residential" },
      { label: "Commercial", href: "/jobs?type=Commercial" },
      { label: "Timesheets", href: "/timesheets" },
      { label: "Crew Mobile View", href: "/crew" },
    ],
  },
  {
    label: "Settings",
    items: [
      { label: "Users", href: "/users", superUserOnly: true },
      { label: "Security", href: "/security", superUserOnly: true },
      { label: "Backup Data", href: "/backup" },
      { label: "Templates", href: "/templates" },
      { label: "Admin", href: "/settings" },
    ],
  },
];
