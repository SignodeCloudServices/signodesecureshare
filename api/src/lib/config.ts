// ---------------------------------------------------------------------------
// Runtime configuration, read once from app settings.
//
// Open decisions are settings, not code, so the build is not blocked on them:
//   D1  DOMAIN_POLICY_MODE / DOMAIN_POLICY_LIST  allow-list or block-list
//   D3  EXPIRY_CLOCK                              what the 7/30-day clock governs
//
// Defaults that are security controls (ALLOWED_CLIENT_IDS) fail closed: an
// unset value means the narrowest setting, never "allow anything".
//
// Missing required settings fail on first use with a message naming the
// setting, rather than as a confusing 500 deep inside a Graph call.
// ---------------------------------------------------------------------------

export type ExpiryClock = "redemption" | "access";
export type DomainPolicyMode = "allow" | "block";

export type Config = {
  tenantId: string;
  /** Accepted `aud` values: the API's client ID and/or its api:// URI. */
  audiences: string[];
  /** Delegated scope the caller's token must carry. */
  requiredScope: string;
  /**
   * Client IDs the caller's token may have been issued to (`azp`, or `appid` on
   * v1 tokens). Audience alone says "this token is for the API", not "it came
   * from the portal": any app with consent to the scope could otherwise call
   * us. Defaults to the prod SPA so a missing setting fails closed.
   */
  allowedClientIds: string[];
  /** sg-secureshare-admins (and any equivalents). */
  adminGroupIds: string[];
  inviteRedirectUrl: string;
  /** Signode's own domains: never invited as guests. */
  internalDomains: string[];
  domainPolicyMode: DomainPolicyMode;
  domainPolicyList: string[];
  /**
   * D3. "redemption" (recommended): the clock is the window to redeem; once
   * redeemed, access lasts until revoked or removed by the quarterly access
   * review. "access": the clock is the access duration; membership is removed
   * at expiry whether or not the invitation was redeemed.
   */
  expiryClock: ExpiryClock;
  tableUrl: string;
  tableName: string;
};

/** cs-secure-share-prod-spa. A public identifier, not a credential. */
export const PROD_SPA_CLIENT_ID = "d25ef5a7-5e7a-4ebf-a06e-f3cbf047294d";

function list(v: string | undefined): string[] {
  return (v ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function required(env: NodeJS.ProcessEnv, name: string): string {
  const v = env[name]?.trim();
  if (!v) throw new Error(`Missing required app setting ${name}`);
  return v;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const mode = (env.DOMAIN_POLICY_MODE ?? "block").trim().toLowerCase();
  if (mode !== "allow" && mode !== "block") {
    throw new Error(`DOMAIN_POLICY_MODE must be "allow" or "block", got "${mode}"`);
  }
  const clock = (env.EXPIRY_CLOCK ?? "redemption").trim().toLowerCase();
  if (clock !== "redemption" && clock !== "access") {
    throw new Error(`EXPIRY_CLOCK must be "redemption" or "access", got "${clock}"`);
  }
  const audiences = (env.API_AUDIENCES ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (audiences.length === 0) throw new Error("Missing required app setting API_AUDIENCES");
  const adminGroupIds = list(env.ADMIN_GROUP_IDS);
  if (adminGroupIds.length === 0) throw new Error("Missing required app setting ADMIN_GROUP_IDS");

  return {
    tenantId: required(env, "TENANT_ID"),
    audiences,
    requiredScope: env.REQUIRED_SCOPE?.trim() || "Invitations.ReadWrite",
    allowedClientIds: list(env.ALLOWED_CLIENT_IDS ?? PROD_SPA_CLIENT_ID),
    adminGroupIds,
    inviteRedirectUrl: required(env, "INVITE_REDIRECT_URL"),
    internalDomains: list(env.INTERNAL_DOMAINS ?? "signode.com,pkgconnect.com"),
    domainPolicyMode: mode,
    domainPolicyList: list(env.DOMAIN_POLICY_LIST),
    expiryClock: clock,
    tableUrl: required(env, "INVITATIONS_TABLE_URL"),
    tableName: env.INVITATIONS_TABLE_NAME?.trim() || "invitations",
  };
}

let cached: Config | undefined;
export function config(): Config {
  return (cached ??= loadConfig());
}
