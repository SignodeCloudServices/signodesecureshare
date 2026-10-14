// ---------------------------------------------------------------------------
// Server-side checks on invitation create (runbook WS3.3).
//
// Pure functions: no I/O, so every rule is unit-tested. The SPA may run
// similar checks for UX, but nothing it sends is trusted — these are the
// controls. The caller's identity comes from the validated token, never from
// the request body.
// ---------------------------------------------------------------------------
import { INVITATION_DEFAULT_DAYS, INVITATION_MAX_DAYS } from "../../../src/lib/retention";
import { isGuestEligibleScope, scopeByGroupId, type FolderScope } from "../../../src/lib/folder-scopes";
import type { Config } from "./config";

export type Denied = { ok: false; status: 400 | 403; reason: string };
export type Ok<T> = { ok: true; value: T };
export type Result<T> = Ok<T> | Denied;

const deny = (status: 400 | 403, reason: string): Denied => ({ ok: false, status, reason });

export type CreateRequest = { email: string; groupId: string; days: number };

// Deliberately simple: Entra validates the address properly. This only
// rejects input that is obviously not one address (lists, spaces, no domain).
const EMAIL = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Shape of the POST body. Unknown fields are ignored, never trusted. */
export function parseCreateRequest(body: unknown): Result<CreateRequest> {
  if (typeof body !== "object" || body === null) return deny(400, "Body must be a JSON object");
  const b = body as Record<string, unknown>;

  const email = typeof b.email === "string" ? b.email.trim().toLowerCase() : "";
  if (!EMAIL.test(email) || email.length > 254) return deny(400, "email must be a single email address");

  const groupId = typeof b.groupId === "string" ? b.groupId.trim().toLowerCase() : "";
  if (!GUID.test(groupId)) return deny(400, "groupId must be a group object ID");

  // Check 4: expiry within policy. Absent → the ratified default.
  let days = INVITATION_DEFAULT_DAYS;
  if (b.days !== undefined) {
    if (typeof b.days !== "number" || !Number.isInteger(b.days)) return deny(400, "days must be a whole number");
    days = b.days;
  }
  if (days < 1 || days > INVITATION_MAX_DAYS) {
    return deny(400, `days must be between 1 and ${INVITATION_MAX_DAYS}`);
  }
  return { ok: true, value: { email, groupId, days } };
}

/**
 * Check 2: the target must be a guest-eligible scope — an /External/ leaf in
 * the registry. This is the guard the old mock dialog ignored; without it a
 * sponsor could hand a partner an internal department folder.
 */
export function checkScope(groupId: string): Result<FolderScope> {
  const scope = scopeByGroupId(groupId);
  if (!scope) return deny(403, "Target group is not a SecureShare folder scope");
  if (!isGuestEligibleScope(groupId)) return deny(403, "Target scope is not guest-eligible");
  return { ok: true, value: scope };
}

export function domainOf(email: string): string {
  return email.slice(email.lastIndexOf("@") + 1).toLowerCase();
}

/** True when `domain` equals `d` or is a subdomain of it. */
function matches(domain: string, d: string): boolean {
  return domain === d || domain.endsWith(`.${d}`);
}

/** Check 3: not Signode's own domain, and passes the D1 allow/block list. */
export function checkDomain(email: string, cfg: Pick<Config, "internalDomains" | "domainPolicyMode" | "domainPolicyList">): Result<string> {
  const domain = domainOf(email);
  if (cfg.internalDomains.some((d) => matches(domain, d))) {
    return deny(403, "Signode accounts are not invited as guests");
  }
  const listed = cfg.domainPolicyList.some((d) => matches(domain, d));
  if (cfg.domainPolicyMode === "allow" && !listed) return deny(403, "Invitee domain is not on the allow list");
  if (cfg.domainPolicyMode === "block" && listed) return deny(403, "Invitee domain is blocked");
  return { ok: true, value: domain };
}

/**
 * Check 1: caller is a portal admin, or an owner of the target folder group
 * (owners are the sponsors — runbook 4.3). Inputs come from Graph, resolved
 * by the caller's object ID from the token.
 */
export function checkSponsor(caller: { isAdmin: boolean; isOwnerOfTarget: boolean }): Result<"admin" | "sponsor"> {
  if (caller.isAdmin) return { ok: true, value: "admin" };
  if (caller.isOwnerOfTarget) return { ok: true, value: "sponsor" };
  return deny(403, "Caller is not a sponsor of the target scope");
}

/** Expiry instant for a new invitation. */
export function expiresAt(days: number, now: Date = new Date()): Date {
  return new Date(now.getTime() + days * 86_400_000);
}
