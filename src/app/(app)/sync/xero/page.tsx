import { requireUser } from "@/lib/session";
import { getXeroConnectionStatus } from "@/lib/xero";
import { disconnectXeroAction } from "./actions";

export default async function SyncXeroPage({
  searchParams,
}: {
  searchParams: Promise<{ connected?: string; error?: string }>;
}) {
  const user = await requireUser();
  const { connected, error } = await searchParams;
  const connection = await getXeroConnectionStatus();

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>Sync Xero</h2>
          <div className="subtitle">Connects Ali-Frame&apos;s Xero organisation so Accounts reports can pull real data.</div>
        </div>
      </div>

      {connected && <div className="notice">Connected to Xero successfully.</div>}
      {error && <div className="authError">Could not connect to Xero — please try again.</div>}

      <div className="card">
        {connection ? (
          <>
            <div className="label">Connected</div>
            <p style={{ marginTop: 8 }}>
              Linked to <strong>{connection.tenantName}</strong>.
            </p>
            {user.isSuperUser && (
              <form action={disconnectXeroAction} style={{ marginTop: 12 }}>
                <button type="submit" className="btn light">
                  Disconnect
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <div className="label">Not connected</div>
            <p style={{ marginTop: 8, color: "#475569" }}>
              Connect Ali-Frame&apos;s Xero organisation to pull real Profit &amp; Loss, and later Balance Sheet,
              Aged Payables/Receivables and Budget vs Actual, into the Accounts section.
            </p>
            {user.isSuperUser ? (
              <div className="actions" style={{ marginTop: 12 }}>
                <a href="/api/xero/connect" className="btn primary">
                  Connect to Xero
                </a>
              </div>
            ) : (
              <div className="hint" style={{ marginTop: 8 }}>Only the Master User can connect Xero.</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
