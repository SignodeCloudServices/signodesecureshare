// ---------------------------------------------------------------------------
// /api/invitations — runbook WS3.2.
//
//   GET    /api/invitations/scopes   guest-eligible scopes the caller may invite into
//   POST   /api/invitations          create: validate, invite, grant, record
//   GET    /api/invitations          list: admins see all, sponsors their scopes
//   DELETE /api/invitations/{id}     revoke: remove membership, revoke sessions
//
// authLevel "anonymous" at the Functions layer on purpose: every handler
// validates the Entra token itself (auth.ts). Function keys would be a shared
// secret in a public SPA.
// ---------------------------------------------------------------------------
import { app, type HttpRequest, type InvocationContext } from "@azure/functions";
import { guestEligibleScopes, scopeLabel } from "../../../src/lib/folder-scopes";
import { authenticate, type Caller } from "../lib/auth";
import { checkDomain, checkScope, checkSponsor, expiresAt, parseCreateRequest } from "../lib/checks";
import { config } from "../lib/config";
import * as graph from "../lib/graph";
import * as store from "../lib/store";
import { audit, failure, json, problem } from "../lib/http";

async function isAdmin(caller: Caller): Promise<boolean> {
  return (await graph.memberOf(caller.oid, config().adminGroupIds)).length > 0;
}

/** Guest-eligible scopes the caller sponsors (all of them for admins). */
async function sponsoredScopes(caller: Caller, admin: boolean) {
  const scopes = guestEligibleScopes();
  if (admin) return scopes;
  const owned = await Promise.all(scopes.map((s) => graph.isOwner(s.groupId, caller.oid)));
  return scopes.filter((_, i) => owned[i]);
}

app.http("invitationScopes", {
  route: "invitations/scopes",
  methods: ["GET"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext) => {
    try {
      const caller = await authenticate(req.headers.get("authorization"), config());
      const scopes = await sponsoredScopes(caller, await isAdmin(caller));
      return json(200, scopes.map((s) => ({ groupId: s.groupId, path: s.path, label: scopeLabel(s.path) })));
    } catch (e) {
      return failure(ctx, e);
    }
  },
});

app.http("invitations", {
  route: "invitations",
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext) => {
    try {
      const cfg = config();
      const caller = await authenticate(req.headers.get("authorization"), cfg);
      const admin = await isAdmin(caller);

      if (req.method === "GET") {
        const groupIds = admin ? undefined : (await sponsoredScopes(caller, false)).map((s) => s.groupId);
        const items = await store.listInvitations(groupIds);
        audit(ctx, { action: "list", decision: "ALLOW", actor: caller.upn, reason: admin ? "admin" : "sponsor" });
        return json(200, items);
      }

      // ---- POST: every check runs before any write to the directory. ----
      let body: unknown;
      try {
        body = await req.json();
      } catch {
        return problem(400, "Body must be JSON");
      }
      const parsed = parseCreateRequest(body);
      if (!parsed.ok) {
        audit(ctx, { action: "invite", decision: "DENY", actor: caller.upn, reason: parsed.reason });
        return problem(parsed.status, parsed.reason);
      }
      const { email, groupId, days } = parsed.value;
      const base = { action: "invite" as const, actor: caller.upn, invitee: email, groupId };

      const scope = checkScope(groupId);
      if (!scope.ok) {
        audit(ctx, { ...base, decision: "DENY", reason: scope.reason });
        return problem(scope.status, scope.reason);
      }
      const domain = checkDomain(email, cfg);
      if (!domain.ok) {
        audit(ctx, { ...base, decision: "DENY", scope: scope.value.path, reason: domain.reason });
        return problem(domain.status, domain.reason);
      }
      const sponsor = checkSponsor({
        isAdmin: admin,
        isOwnerOfTarget: admin ? false : await graph.isOwner(groupId, caller.oid),
      });
      if (!sponsor.ok) {
        audit(ctx, { ...base, decision: "DENY", scope: scope.value.path, reason: sponsor.reason });
        return problem(sponsor.status, sponsor.reason);
      }

      // Check 5 (idempotency) is in Graph: re-inviting an existing guest
      // returns the same user, and addMember treats "already a member" as done.
      const label = scopeLabel(scope.value.path);
      const who = caller.name || caller.upn;
      const result = await graph.invite(
        email,
        cfg.inviteRedirectUrl,
        `${who} at Signode has invited you to Signode SecureShare to exchange files (${label}). ` +
          `Accept within ${days} days. If you did not expect this, ignore this message.`,
      );
      await graph.addMember(groupId, result.userId);

      const record = await store.createInvitation({
        groupId,
        scopePath: scope.value.path,
        inviteeEmail: email,
        inviteeUserId: result.userId,
        inviterOid: caller.oid,
        inviterUpn: caller.upn,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt(days).toISOString(),
        status: result.status === "Completed" ? "redeemed" : "pending",
      });
      audit(ctx, { ...base, decision: "ALLOW", scope: scope.value.path, reason: sponsor.value, invitationId: record.id });

      // The redeem URL goes back to the sponsor once (Entra mail has landed in
      // spam in testing) and is not stored.
      return json(201, { invitation: record, redeemUrl: result.redeemUrl });
    } catch (e) {
      return failure(ctx, e);
    }
  },
});

app.http("revokeInvitation", {
  route: "invitations/{id}",
  methods: ["DELETE"],
  authLevel: "anonymous",
  handler: async (req: HttpRequest, ctx: InvocationContext) => {
    try {
      const caller = await authenticate(req.headers.get("authorization"), config());
      const id = req.params.id ?? "";
      const inv = await store.getInvitation(id);
      if (!inv) return problem(404, "Invitation not found");

      const admin = await isAdmin(caller);
      const sponsor = checkSponsor({ isAdmin: admin, isOwnerOfTarget: admin ? false : await graph.isOwner(inv.groupId, caller.oid) });
      const base = { action: "revoke" as const, actor: caller.upn, invitee: inv.inviteeEmail, groupId: inv.groupId, scope: inv.scopePath, invitationId: id };
      if (!sponsor.ok) {
        audit(ctx, { ...base, decision: "DENY", reason: sponsor.reason });
        // 404, not 403: do not confirm that someone else's invitation exists.
        return problem(404, "Invitation not found");
      }
      if (inv.status === "revoked" || inv.status === "expired") return json(200, inv);

      await revokeAccess(inv);
      await store.updateStatus(inv, "revoked", caller.upn);
      audit(ctx, { ...base, decision: "ALLOW", reason: sponsor.value });
      return json(200, { ...inv, status: "revoked" });
    } catch (e) {
      return failure(ctx, e);
    }
  },
});

/**
 * Remove the guest from the folder group unless another open invitation
 * still grants the same person the same scope, then revoke their sessions so
 * the folder disappears now rather than at the next token refresh.
 */
export async function revokeAccess(inv: store.Invitation): Promise<void> {
  const open = await store.listOpenInvitations();
  const stillGranted = open.some((o) => o.id !== inv.id && o.groupId === inv.groupId && o.inviteeUserId === inv.inviteeUserId);
  if (!stillGranted) await graph.removeMember(inv.groupId, inv.inviteeUserId);
  await graph.revokeSessions(inv.inviteeUserId);
}
