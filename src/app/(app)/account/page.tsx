// Copyright (c) 2026 BLB Consultants Limited T/A Ali-Frame Windows & Doors. All rights reserved.
// Proprietary and confidential. Unauthorised copying, use or distribution is prohibited.
// Developed with AI-assisted tooling; review and approval: PENDING ORGANISATION REVIEW.
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { currentTrustedDeviceId, TRUST_DAYS } from "@/lib/trustedDevice";
import { AuthenticatorSetup } from "./AuthenticatorSetup";
import { DeviceRow } from "./DeviceRow";
import { forgetAllDevices } from "./actions";

export default async function AccountPage() {
  const me = await requireUser();
  const [u, devices, thisDevice, codesLeft] = await Promise.all([
    prisma.user.findUnique({ where: { id: me.id }, select: { totpEnabledAt: true, email: true, name: true } }),
    prisma.trustedDevice.findMany({ where: { userId: me.id, expiresAt: { gt: new Date() } }, orderBy: { lastUsedAt: "desc" } }),
    currentTrustedDeviceId(me.id),
    prisma.recoveryCode.count({ where: { userId: me.id, usedAt: null } }),
  ]);

  return (
    <div>
      <div className="topbar">
        <div>
          <h2>My sign-in &amp; security</h2>
          <div className="subtitle">{u?.name} · {u?.email}</div>
        </div>
      </div>

      <div className="card">
        <div className="label">Authenticator app (recommended)</div>
        <div className="hint" style={{ marginTop: 4 }}>
          Use an app on your phone (Google Authenticator, Microsoft Authenticator, Authy…) to sign in instead of waiting for an emailed code.
          It works even with no signal, and an email code can&apos;t be intercepted.
        </div>
        <AuthenticatorSetup enabled={!!u?.totpEnabledAt} codesLeft={codesLeft} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="label">Remembered devices</div>
        <div className="hint" style={{ marginTop: 4 }}>
          Devices you ticked &ldquo;Remember this device&rdquo; on skip the sign-in code for {TRUST_DAYS} days (your password is still needed). Only remember your own phone or computer.
          Changing your password forgets all of them.
        </div>
        {devices.length === 0 ? (
          <div className="hint" style={{ marginTop: 10 }}>No remembered devices.</div>
        ) : (
          <>
            <table style={{ marginTop: 10 }}>
              <thead><tr><th>Device</th><th>Last used</th><th>Expires</th><th></th></tr></thead>
              <tbody>
                {devices.map((d) => (
                  <DeviceRow key={d.id} id={d.id} label={d.label} thisDevice={d.id === thisDevice} lastUsed={d.lastUsedAt.toLocaleDateString("en-NZ")} expires={d.expiresAt.toLocaleDateString("en-NZ")} />
                ))}
              </tbody>
            </table>
            <form action={forgetAllDevices} style={{ marginTop: 10 }}>
              <button type="submit" className="btn light">Forget all devices</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
