import { requireUser } from "@/lib/session";

export default async function SettingsPage() {
  await requireUser();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Settings</h2>
          <div className="subtitle">Coming soon.</div>
        </div>
      </div>
      <div className="notice">
        Account/company settings will move here as they get migrated off the prototype.
      </div>
    </div>
  );
}
