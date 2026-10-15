import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey, type KeyLike } from "jose";
import { authenticate, AuthError } from "../src/lib/auth";

const TENANT = "7db30361-ce9f-4244-8d28-60553bffff38";
const API = "11111111-2222-3333-4444-555555555555";
const SPA = "d25ef5a7-5e7a-4ebf-a06e-f3cbf047294d";
const cfg = { tenantId: TENANT, audiences: [API, `api://${API}`], requiredScope: "Invitations.ReadWrite", allowedClientIds: [SPA] };

let key: KeyLike;
let otherKey: KeyLike;
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256");
  key = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256" };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

async function token(claims: Record<string, unknown> = {}, opts: { signWith?: KeyLike; iss?: string; aud?: string; exp?: string | number } = {}) {
  return new SignJWT({ tid: TENANT, oid: "aaaaaaaa-0000-0000-0000-000000000001", scp: "Invitations.ReadWrite", azp: SPA, upn: "sponsor@signode.com", name: "Pat Sponsor", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? `https://login.microsoftonline.com/${TENANT}/v2.0`)
    .setAudience(opts.aud ?? API)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "10m")
    .sign(opts.signWith ?? key);
}

const status = async (p: Promise<unknown>) => {
  try {
    await p;
    return 200;
  } catch (e) {
    return e instanceof AuthError ? e.status : -1;
  }
};

describe("authenticate", () => {
  it("accepts a valid v2 token and returns the caller from the token", async () => {
    const c = await authenticate(`Bearer ${await token()}`, cfg, jwks);
    expect(c).toEqual({ oid: "aaaaaaaa-0000-0000-0000-000000000001", upn: "sponsor@signode.com", name: "Pat Sponsor" });
  });
  it("accepts a v1 issuer and the api:// audience", async () => {
    const t = await token({}, { iss: `https://sts.windows.net/${TENANT}/`, aud: `api://${API}` });
    expect(await status(authenticate(`Bearer ${t}`, cfg, jwks))).toBe(200);
  });
  it("401 without a bearer token", async () => {
    expect(await status(authenticate(undefined, cfg, jwks))).toBe(401);
    expect(await status(authenticate("Basic abc", cfg, jwks))).toBe(401);
  });
  it("401 for a token signed by another key", async () => {
    expect(await status(authenticate(`Bearer ${await token({}, { signWith: otherKey })}`, cfg, jwks))).toBe(401);
  });
  it("401 for the wrong audience (e.g. a Graph token)", async () => {
    expect(await status(authenticate(`Bearer ${await token({}, { aud: "https://graph.microsoft.com" })}`, cfg, jwks))).toBe(401);
  });
  it("401 for another tenant's issuer", async () => {
    const t = await token({}, { iss: "https://login.microsoftonline.com/00000000-0000-0000-0000-000000000000/v2.0" });
    expect(await status(authenticate(`Bearer ${t}`, cfg, jwks))).toBe(401);
  });
  it("401 when tid does not match", async () => {
    expect(await status(authenticate(`Bearer ${await token({ tid: "00000000-0000-0000-0000-000000000000" })}`, cfg, jwks))).toBe(401);
  });
  it("401 for an expired token", async () => {
    const t = await token({}, { exp: Math.floor(Date.now() / 1000) - 3600 });
    expect(await status(authenticate(`Bearer ${t}`, cfg, jwks))).toBe(401);
  });
  it("403 when the delegated scope is missing", async () => {
    expect(await status(authenticate(`Bearer ${await token({ scp: "User.Read" })}`, cfg, jwks))).toBe(403);
  });
  it("403 for a token issued to another client (e.g. the dev SPA or Azure CLI)", async () => {
    expect(await status(authenticate(`Bearer ${await token({ azp: "212f8c25-c2f7-4e09-a316-280dd4c89e73" })}`, cfg, jwks))).toBe(403);
    expect(await status(authenticate(`Bearer ${await token({ azp: undefined })}`, cfg, jwks))).toBe(403);
  });
  it("accepts a v1 token whose appid is the portal", async () => {
    const t = await token({ azp: undefined, appid: SPA }, { iss: `https://sts.windows.net/${TENANT}/` });
    expect(await status(authenticate(`Bearer ${t}`, cfg, jwks))).toBe(200);
  });
  it("403 for an app-only token (no scp): every invitation must name a person", async () => {
    expect(await status(authenticate(`Bearer ${await token({ scp: undefined, roles: ["Invitations.ReadWrite"] })}`, cfg, jwks))).toBe(403);
  });
});
