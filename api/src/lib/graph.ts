// ---------------------------------------------------------------------------
// Microsoft Graph, app-only, as the Function App's managed identity.
//
// Grants the identity needs (runbook WS3.1). Preferred / fallback:
//   invite guest          Guest Inviter role        / User.Invite.All
//   add/remove member     Groups Administrator      / GroupMember.ReadWrite.All
//                         scoped to an AU holding
//                         ONLY the guest-eligible
//                         (External) groups
//   sponsor/admin check   GroupMember.Read.All + User.ReadBasic.All
//   redemption state      User.Read.All (externalUserState)
//   revoke sessions       User.RevokeSessions.All
//
// DefaultAzureCredential resolves to the managed identity in Azure and to
// `az login` locally. No secret exists anywhere.
// ---------------------------------------------------------------------------
import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";

const GRAPH = "https://graph.microsoft.com/v1.0";

export class GraphError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
  }
}

let credential: TokenCredential | undefined;
async function token(): Promise<string> {
  credential ??= new DefaultAzureCredential();
  const t = await credential.getToken("https://graph.microsoft.com/.default");
  if (!t) throw new Error("Could not acquire a Graph token for the managed identity");
  return t.token;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One Graph call. Retries throttling (429/503, honouring Retry-After) and,
 * when `retryNotFound` is set, 404s — a guest created seconds ago may not have
 * replicated to the replica that serves the next call.
 */
async function call<T>(method: string, path: string, body?: unknown, opts: { retryNotFound?: boolean } = {}): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`${GRAPH}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await token()}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (res.ok) {
      return (res.status === 204 ? undefined : await res.json()) as T;
    }
    const retryable = res.status === 429 || res.status === 503 || (opts.retryNotFound && res.status === 404);
    if (retryable && attempt < 5) {
      const after = Number(res.headers.get("Retry-After"));
      await sleep(Number.isFinite(after) && after > 0 ? after * 1000 : attempt * 2000);
      continue;
    }
    let code = "unknown";
    let message = res.statusText;
    try {
      const e = (await res.json()) as { error?: { code?: string; message?: string } };
      code = e.error?.code ?? code;
      message = e.error?.message ?? message;
    } catch {
      /* non-JSON error body */
    }
    throw new GraphError(res.status, code, `${method} ${path.split("?")[0]} → ${res.status} ${code}: ${message}`);
  }
}

/** Which of `groupIds` the user is a (transitive) member of. */
export async function memberOf(userId: string, groupIds: string[]): Promise<string[]> {
  if (groupIds.length === 0) return [];
  const r = await call<{ value: string[] }>("POST", `/users/${userId}/checkMemberGroups`, { groupIds });
  return r.value.map((g) => g.toLowerCase());
}

/** Direct owners of a group. Owners are the folder's sponsors. */
export async function isOwner(groupId: string, userId: string): Promise<boolean> {
  let next: string | undefined = `/groups/${groupId}/owners?$select=id&$top=100`;
  while (next) {
    const page: { value: { id: string }[]; "@odata.nextLink"?: string } = await call("GET", next);
    if (page.value.some((o) => o.id.toLowerCase() === userId.toLowerCase())) return true;
    next = page["@odata.nextLink"]?.replace(GRAPH, "");
  }
  return false;
}

export type InviteResult = { userId: string; redeemUrl: string; status: string };

/**
 * Create (or re-invite) a B2B guest. Entra generates and validates the
 * redemption link; the portal issues no token of its own.
 */
export async function invite(email: string, redirectUrl: string, message: string): Promise<InviteResult> {
  const r = await call<{ invitedUser: { id: string }; inviteRedeemUrl: string; status: string }>("POST", "/invitations", {
    invitedUserEmailAddress: email,
    inviteRedirectUrl: redirectUrl,
    sendInvitationMessage: true,
    invitedUserMessageInfo: { customizedMessageBody: message },
  });
  return { userId: r.invitedUser.id, redeemUrl: r.inviteRedeemUrl, status: r.status };
}

/** Add to the folder group. Idempotent: already a member is success. */
export async function addMember(groupId: string, userId: string): Promise<void> {
  try {
    await call("POST", `/groups/${groupId}/members/$ref`, { "@odata.id": `${GRAPH}/directoryObjects/${userId}` }, { retryNotFound: true });
  } catch (e) {
    if (e instanceof GraphError && e.status === 400 && /already exist/i.test(e.message)) return;
    throw e;
  }
}

/** Remove from the folder group. Idempotent: not a member is success. */
export async function removeMember(groupId: string, userId: string): Promise<void> {
  try {
    await call("DELETE", `/groups/${groupId}/members/${userId}/$ref`);
  } catch (e) {
    if (e instanceof GraphError && e.status === 404) return;
    throw e;
  }
}

/** Invalidate refresh tokens so removal takes effect now, not at next refresh (~1 h). */
export async function revokeSessions(userId: string): Promise<void> {
  await call("POST", `/users/${userId}/revokeSignInSessions`);
}

/** "PendingAcceptance" | "Accepted" | null (null for non-guest accounts). */
export async function externalUserState(userId: string): Promise<string | null> {
  try {
    const u = await call<{ externalUserState: string | null }>("GET", `/users/${userId}?$select=externalUserState`);
    return u.externalUserState;
  } catch (e) {
    if (e instanceof GraphError && e.status === 404) return null;
    throw e;
  }
}
