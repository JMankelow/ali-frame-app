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
          quotesGroup(),
        ],
      },
      {
        label: "Residential",
        items: [
          { label: "Leads", href: "/leads" },
          { label: "Estimates", href: "/estimates" },
          { label: "Site Measures", href: "/site-measure" },
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
          { label: "Files", href: "/files" },
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
          { label: "Files", href: "/files" },
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
      { label: "Timesheets", href: "/timesheets" },
      { label: "Performance", href: "/performance" },
      { label: "Senior Performance", href: "/senior-performance" },
    ],
  },
  {
    label: "Accounts",
    items: [
      { label: "Invoices", href: "/invoices" },
      { label: "Costing & Margin", href: "/costing" },
      { label: "WIP Report", href: "/wip" },
      { label: "Cashflow", href: "/cashflow" },
      { label: "Reports", href: "/reports" },
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
      { label: "Security", href: "/security" },
      { label: "Backup Data", href: "/backup" },
      { label: "Templates", href: "/templates" },
      { label: "Admin", href: "/settings" },
    ],
  },
];
