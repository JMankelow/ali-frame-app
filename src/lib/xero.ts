import "server-only";
import { XeroClient } from "xero-node";
import { prisma } from "./prisma";

// "accounting.budgets.read" isn't a real Xero scope (caused an
// invalid_scope error on Xero's own consent screen) — Budget Summary and
// every other report we need (P&L, Balance Sheet, Aged Payables/
// Receivables) are all covered by accounting.reports.read.
const SCOPES = [
  "openid",
  "profile",
  "email",
  "accounting.transactions.read",
  "accounting.reports.read",
  "accounting.settings.read",
  "offline_access",
].join(" ");

function redirectUri(): string {
  const appUrl = process.env.APP_URL ?? "https://ali-frame-app.onrender.com";
  return `${appUrl}/api/xero/callback`;
}

function assertConfigured(): { clientId: string; clientSecret: string } {
  const clientId = process.env.XERO_CLIENT_ID;
  const clientSecret = process.env.XERO_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("XERO_CLIENT_ID / XERO_CLIENT_SECRET must be set");
  }
  return { clientId, clientSecret };
}

function buildClient(): XeroClient {
  const { clientId, clientSecret } = assertConfigured();
  return new XeroClient({
    clientId,
    clientSecret,
    redirectUris: [redirectUri()],
    scopes: SCOPES.split(" "),
  });
}

/** Step 1 of the OAuth dance: where to send the browser to approve access. */
export async function buildXeroConsentUrl(): Promise<string> {
  const client = buildClient();
  await client.initialize();
  return client.buildConsentUrl();
}

/** Step 2: exchanges the callback URL's code for tokens and records the connected org. Only one org is supported — a fresh connect replaces any previous one. */
export async function handleXeroCallback(fullCallbackUrl: string): Promise<{ tenantName: string }> {
  const client = buildClient();
  await client.initialize();
  const tokenSet = await client.apiCallback(fullCallbackUrl);
  await client.updateTenants();

  const tenant = client.tenants[0];
  if (!tenant) throw new Error("No Xero organisation was authorised.");
  if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
    throw new Error("Xero did not return a usable token set.");
  }

  await prisma.xeroConnection.deleteMany({});
  await prisma.xeroConnection.create({
    data: {
      tenantId: tenant.tenantId,
      tenantName: tenant.tenantName ?? "Xero Organisation",
      accessToken: tokenSet.access_token,
      refreshToken: tokenSet.refresh_token,
      expiresAt: new Date(tokenSet.expires_at * 1000),
    },
  });

  return { tenantName: tenant.tenantName ?? "Xero Organisation" };
}

export async function getXeroConnectionStatus() {
  return prisma.xeroConnection.findFirst();
}

export async function disconnectXero() {
  await prisma.xeroConnection.deleteMany({});
}

/** Returns a ready-to-use client + tenantId, refreshing the stored token first if it's within 2 minutes of expiring. */
export async function getValidXeroClient(): Promise<{ client: XeroClient; tenantId: string }> {
  const connection = await prisma.xeroConnection.findFirst();
  if (!connection) throw new Error("Xero is not connected yet.");

  const client = buildClient();
  await client.initialize();

  const needsRefresh = connection.expiresAt.getTime() - Date.now() < 2 * 60 * 1000;
  if (needsRefresh) {
    client.setTokenSet({ refresh_token: connection.refreshToken } as never);
    const tokenSet = await client.refreshWithRefreshToken(
      process.env.XERO_CLIENT_ID!,
      process.env.XERO_CLIENT_SECRET!,
      connection.refreshToken
    );
    if (!tokenSet.access_token || !tokenSet.refresh_token || !tokenSet.expires_at) {
      throw new Error("Failed to refresh the Xero connection — please reconnect.");
    }
    await prisma.xeroConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokenSet.access_token,
        refreshToken: tokenSet.refresh_token,
        expiresAt: new Date(tokenSet.expires_at * 1000),
      },
    });
    client.setTokenSet(tokenSet);
  } else {
    client.setTokenSet({ access_token: connection.accessToken, refresh_token: connection.refreshToken } as never);
  }

  return { client, tenantId: connection.tenantId };
}
