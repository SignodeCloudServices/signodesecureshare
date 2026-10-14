import type { HttpResponseInit, InvocationContext } from "@azure/functions";
import { AuthError } from "./auth";

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
  ctx.error(e instanceof Error ? e.stack ?? e.message : String(e));
  return problem(500, "Internal error");
}
