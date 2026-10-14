// ---------------------------------------------------------------------------
// Client for the invitation API (api/, runbook WS3).
//
// Presentation only. Every rule — who may invite, which scopes are
// guest-eligible, expiry limits, domain policy — is enforced by the API. The
// scope list shown here comes FROM the API (/invitations/scopes), not from
// folder-scopes.ts, so the UI offers exactly what the server will accept.
// ---------------------------------------------------------------------------
import * as React from "react";
import { useMsal } from "@azure/msal-react";
import type { AccountInfo, IPublicClientApplication } from "@azure/msal-browser";
import { INVITATIONS_API_BASE, INVITATIONS_API_SCOPE, INVITATIONS_ENABLED, TENANT_ID } from "./auth-config";
import { useAuth, DEMO_MODE } from "./auth-context";

export type SponsorScope = { groupId: string; path: string; label: string };

export type InvitationStatus = "pending" | "redeemed" | "expired" | "revoked";

export type Invitation = {
  id: string;
  groupId: string;
  scopePath: string;
  inviteeEmail: string;
  inviterUpn: string;
  createdAt: string;
  expiresAt: string;
  status: InvitationStatus;
  closedAt?: string;
  closedBy?: string;
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

async function apiToken(msal: IPublicClientApplication, account: AccountInfo): Promise<string> {
  const request = { scopes: [INVITATIONS_API_SCOPE], account };
  try {
    return (await msal.acquireTokenSilent(request)).accessToken;
  } catch {
    return (await msal.acquireTokenPopup(request)).accessToken;
  }
}

async function call<T>(msal: IPublicClientApplication, account: AccountInfo, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${INVITATIONS_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${await apiToken(msal, account)}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const body = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

export const listSponsorScopes = (m: IPublicClientApplication, a: AccountInfo) =>
  call<SponsorScope[]>(m, a, "/invitations/scopes");

export const listInvitations = (m: IPublicClientApplication, a: AccountInfo) =>
  call<Invitation[]>(m, a, "/invitations");

export const createInvitation = (
  m: IPublicClientApplication,
  a: AccountInfo,
  body: { email: string; groupId: string; days: number },
) => call<{ invitation: Invitation; redeemUrl: string }>(m, a, "/invitations", { method: "POST", body: JSON.stringify(body) });

export const revokeInvitation = (m: IPublicClientApplication, a: AccountInfo, id: string) =>
  call<Invitation>(m, a, `/invitations/${encodeURIComponent(id)}`, { method: "DELETE" });

/**
 * True for accounts whose home tenant is Signode's. B2B guests sign in to the
 * Signode tenant but keep their own home tenant in homeAccountId, so partners
 * never trigger an API call from the header. (The API would refuse them
 * anyway: guests are never owners of a folder group.)
 */
export function isSignodeMember(account: AccountInfo | null): boolean {
  return !!account && account.homeAccountId.endsWith(`.${TENANT_ID}`);
}

// One request per account per page load: the header and the Invitations page
// both ask, and each answer costs the API several Graph calls.
const scopeCache = new Map<string, Promise<SponsorScope[]>>();

/**
 * Scopes the signed-in user may invite into, fetched once per account.
 * Empty when invitations are disabled, in demo mode, or for guests.
 */
export function useSponsorScopes(): { scopes: SponsorScope[]; loading: boolean; error: string | null } {
  const { instance } = useMsal();
  const { account } = useAuth();
  const [state, setState] = React.useState<{ scopes: SponsorScope[]; loading: boolean; error: string | null }>({
    scopes: [],
    loading: false,
    error: null,
  });
  const eligible = INVITATIONS_ENABLED && !DEMO_MODE && isSignodeMember(account);

  React.useEffect(() => {
    if (!eligible || !account) return;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    let pending = scopeCache.get(account.homeAccountId);
    if (!pending) {
      pending = listSponsorScopes(instance, account);
      scopeCache.set(account.homeAccountId, pending);
      // A failure should be retried on the next mount, not cached.
      pending.catch(() => scopeCache.delete(account.homeAccountId));
    }
    pending
      .then((scopes) => !cancelled && setState({ scopes, loading: false, error: null }))
      .catch((e: unknown) => !cancelled && setState({ scopes: [], loading: false, error: e instanceof Error ? e.message : String(e) }));
    return () => {
      cancelled = true;
    };
  }, [eligible, account, instance]);

  return eligible ? state : { scopes: [], loading: false, error: null };
}
