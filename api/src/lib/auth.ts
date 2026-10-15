// ---------------------------------------------------------------------------
// Caller authentication: validate the Entra access token the SPA sends.
//
// The SPA requests a token for THIS API (scope api://<api id>/Invitations.ReadWrite).
// We check signature (tenant JWKS), issuer, audience, tenant, expiry and the
// delegated scope, then take the caller's identity from `oid`.
//
// No on-behalf-of exchange: invitations use the Function App's managed
// identity for Graph. The user token only answers "who is asking", and the
// checks in checks.ts decide whether they may.
//
// App-only tokens (no `scp`) are refused: every invitation must be
// attributable to a person.
//
// The token must also have been issued to an allowed client (the prod SPA by
// default). Audience proves the token is meant for this API; `azp` proves
// which app asked for it. Without this, any registration consented to
// Invitations.ReadWrite (the dev SPA had it until 15 Oct) could call the API.
// The sponsor checks would still apply, but there is no reason to have a
// second way in.
// ---------------------------------------------------------------------------
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from "jose";
import type { Config } from "./config";

export type Caller = {
  oid: string;
  upn: string;
  name: string;
};

export class AuthError extends Error {
  constructor(public status: 401 | 403, message: string) {
    super(message);
  }
}

const jwksCache = new Map<string, JWTVerifyGetKey>();
function tenantJwks(tenantId: string): JWTVerifyGetKey {
  let k = jwksCache.get(tenantId);
  if (!k) {
    k = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenantId}/discovery/v2.0/keys`));
    jwksCache.set(tenantId, k);
  }
  return k;
}

export function bearerToken(header: string | null | undefined): string {
  const m = /^Bearer\s+(\S+)$/i.exec(header ?? "");
  if (!m?.[1]) throw new AuthError(401, "Missing bearer token");
  return m[1];
}

type Claims = JWTPayload & {
  tid?: string;
  oid?: string;
  scp?: string;
  azp?: string;
  appid?: string;
  upn?: string;
  preferred_username?: string;
  name?: string;
};

export async function authenticate(
  authorizationHeader: string | null | undefined,
  cfg: Pick<Config, "tenantId" | "audiences" | "requiredScope" | "allowedClientIds">,
  keys: JWTVerifyGetKey = tenantJwks(cfg.tenantId),
): Promise<Caller> {
  const token = bearerToken(authorizationHeader);
  let claims: Claims;
  try {
    const { payload } = await jwtVerify(token, keys, {
      algorithms: ["RS256"],
      audience: cfg.audiences,
      // v2.0 tokens (accessTokenAcceptedVersion = 2) and v1.0 tokens differ
      // only in issuer. Both are signed by the same tenant keys.
      issuer: [
        `https://login.microsoftonline.com/${cfg.tenantId}/v2.0`,
        `https://sts.windows.net/${cfg.tenantId}/`,
      ],
      clockTolerance: 60,
    });
    claims = payload as Claims;
  } catch {
    // Do not echo the reason: it would help someone probing the endpoint.
    throw new AuthError(401, "Invalid token");
  }

  if (claims.tid !== cfg.tenantId) throw new AuthError(401, "Invalid token");
  if (!claims.oid) throw new AuthError(401, "Invalid token");
  // v2 tokens carry `azp`, v1 tokens `appid`; both name the requesting client.
  const client = (claims.azp ?? claims.appid ?? "").toLowerCase();
  if (!cfg.allowedClientIds.includes(client)) {
    throw new AuthError(403, "Token was not issued to the SecureShare portal");
  }
  const scopes = (claims.scp ?? "").split(" ").filter(Boolean);
  if (!scopes.includes(cfg.requiredScope)) {
    throw new AuthError(403, `Token lacks the ${cfg.requiredScope} scope`);
  }
  return {
    oid: claims.oid,
    upn: claims.upn ?? claims.preferred_username ?? claims.oid,
    name: claims.name ?? "",
  };
}
