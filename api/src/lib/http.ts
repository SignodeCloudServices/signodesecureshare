import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { AuthError } from "./auth";
import { GraphError } from "./graph";

/**
 * Which directory step a refused Graph call was, in words a sponsor or the
 * Operations center can act on. The caller is always an authenticated
 * sponsor, so naming the step discloses nothing; it turns a bare "Internal
 * error" into a pointer at the missing grant (15 Oct 2026: the invite step
 * was refused because the identity lacked User.Invite.All).
 */
function refusedStep(e: GraphError): string {
  const m = e.message;
  if (m.includes("POST /invitations")) return "creating the guest invitation (needs Graph User.Invite.All)";
  if (/\/groups\/[^ ]+\/members/.test(m)) return "changing folder-group membership (needs Groups Administrator on the SecureShare Guest Groups unit)";
  if (m.includes("revokeSignInSessions")) return "revoking the guest's sessions (needs Graph User.RevokeSessions.All)";
  if (m.includes("checkMemberGroups") || m.includes("/owners")) return "checking sponsor or admin membership (needs Graph GroupMember.Read.All)";
  return "a directory call";
}

export const json = (status: number, body: unknown): HttpResponseInit => ({
  status,
  jsonBody: body,
  headers: { "Cache-Control": "no-store" },
});

export const problem = (status: number, reason: string): HttpResponseInit => json(status, { error: reason });

/**
 * One audit line per decision, to App Insights (runbook WS3.2 / WS5): who,
 * whom, which scope, ALLOW or DENY, and why. Query with
 *   traces | where message has "secureshare.audit"
 */
export function audit(
  ctx: InvocationContext,
  entry: {
    action: "invite" | "list" | "revoke" | "expire";
    decision: "ALLOW" | "DENY";
    actor: string;
    invitee?: string;
    groupId?: string;
    scope?: string;
    reason?: string;
    invitationId?: string;
  },
): void {
  const line = JSON.stringify({ event: "secureshare.audit", ...entry });
  if (entry.decision === "DENY") ctx.warn(line);
  else ctx.info(line);
}

/** Map thrown errors to responses without leaking internals. */
export function failure(ctx: InvocationContext, e: unknown): HttpResponseInit {
  if (e instanceof AuthError) return problem(e.status, e.message);
  if (e instanceof GraphError && (e.status === 401 || e.status === 403)) {
    ctx.error(e.stack ?? e.message);
    // 502: the request was valid; an upstream permission is missing.
    return problem(502, `The directory refused ${refusedStep(e)}. Nothing was changed for this request. Tell the SecureShare administrator.`);
  }
  if (e instanceof GraphError && e.status === 400 && e.message.includes("POST /invitations")) {
    // Entra refused the address itself (15 Oct 2026: a plus-address returned
    // "The Primary SMTP Address is an invalid value"). The request was the
    // sponsor's to fix, so say so: 400, not a bare 500. Graph's own message
    // is not echoed — the sponsor needs the action, not Exchange wording.
    ctx.warn(e.stack ?? e.message);
    return problem(
      400,
      "Microsoft's directory did not accept this email address, so no invitation was sent. " +
        "Check it for typos. If it contains a plus sign (name+tag@…), use the partner's plain address instead.",
    );
  }
  if (e instanceof GraphError && e.status >= 400 && e.status < 500) {
    ctx.error(e.stack ?? e.message);
    return problem(502, `The directory rejected ${refusedStep(e)} (${e.code}). Tell the SecureShare administrator.`);
  }
  ctx.error(e instanceof Error ? e.stack ?? e.message : String(e));
  return problem(500, "Internal error");
}
