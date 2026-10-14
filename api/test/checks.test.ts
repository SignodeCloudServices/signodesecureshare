import { describe, expect, it } from "vitest";
import { checkDomain, checkScope, checkSponsor, expiresAt, parseCreateRequest } from "../src/lib/checks";
import { INVITATION_DEFAULT_DAYS, INVITATION_MAX_DAYS } from "../../src/lib/retention";

const PARTNER_A = "48ef08e1-465b-4921-a2c7-dbe74f1a60ae"; // EXT POC_Partner_A, guest-eligible
const REGION_AMER = () => {
  // Any non-external registry entry will do; take the first region scope.
  return import("../../src/lib/folder-scopes").then((m) => m.REGION_SCOPES[0]!.groupId);
};

const policy = { internalDomains: ["signode.com", "pkgconnect.com"], domainPolicyMode: "block" as const, domainPolicyList: [] as string[] };

describe("parseCreateRequest (check 4: expiry within policy)", () => {
  it("defaults days to the ratified invitation default", () => {
    const r = parseCreateRequest({ email: "Jane@Acme.com ", groupId: PARTNER_A });
    expect(r).toEqual({ ok: true, value: { email: "jane@acme.com", groupId: PARTNER_A, days: INVITATION_DEFAULT_DAYS } });
  });
  it("accepts the maximum", () => {
    expect(parseCreateRequest({ email: "a@b.com", groupId: PARTNER_A, days: INVITATION_MAX_DAYS }).ok).toBe(true);
  });
  it("rejects one day past the maximum with 400 (runbook test case: 31 days)", () => {
    const r = parseCreateRequest({ email: "a@b.com", groupId: PARTNER_A, days: INVITATION_MAX_DAYS + 1 });
    expect(r).toMatchObject({ ok: false, status: 400 });
  });
  it.each([0, -1, 2.5, "7"])("rejects days=%s", (days) => {
    expect(parseCreateRequest({ email: "a@b.com", groupId: PARTNER_A, days })).toMatchObject({ ok: false, status: 400 });
  });
  it.each(["", "not-an-email", "a@b", "a@b.com,c@d.com", "a b@c.com", "<a@b.com>"])("rejects email %j", (email) => {
    expect(parseCreateRequest({ email, groupId: PARTNER_A })).toMatchObject({ ok: false, status: 400 });
  });
  it("rejects a non-GUID groupId", () => {
    expect(parseCreateRequest({ email: "a@b.com", groupId: "FileRoot/01_Signode_AMER" })).toMatchObject({ ok: false, status: 400 });
  });
  it("rejects non-objects", () => {
    expect(parseCreateRequest(null).ok).toBe(false);
    expect(parseCreateRequest("x").ok).toBe(false);
  });
});

describe("checkScope (check 2: guest-eligible only)", () => {
  it("allows an External partner leaf", () => {
    expect(checkScope(PARTNER_A)).toMatchObject({ ok: true });
  });
  it("refuses an internal region scope with 403 (runbook test case: internal scope)", async () => {
    expect(checkScope(await REGION_AMER())).toMatchObject({ ok: false, status: 403 });
  });
  it("refuses every non-guest-eligible registry entry", async () => {
    const { ALL_SCOPES } = await import("../../src/lib/folder-scopes");
    for (const s of ALL_SCOPES.filter((x) => !x.guestEligible)) {
      expect(checkScope(s.groupId).ok, s.groupName).toBe(false);
    }
  });
  it("refuses a group that is not in the registry at all", () => {
    expect(checkScope("00000000-0000-0000-0000-000000000000")).toMatchObject({ ok: false, status: 403 });
  });
});

describe("checkDomain (check 3)", () => {
  it.each(["a@signode.com", "a@pkgconnect.com", "a@eu.signode.com", "A@SIGNODE.COM".toLowerCase()])("refuses Signode's own domain: %s", (e) => {
    expect(checkDomain(e, policy)).toMatchObject({ ok: false, status: 403 });
  });
  it("does not treat lookalike domains as internal", () => {
    expect(checkDomain("a@notsignode.com", policy).ok).toBe(true);
  });
  it("block mode: refuses listed domains and their subdomains", () => {
    const p = { ...policy, domainPolicyList: ["gmail.com"] };
    expect(checkDomain("a@gmail.com", p).ok).toBe(false);
    expect(checkDomain("a@acme.com", p).ok).toBe(true);
  });
  it("allow mode: admits only listed domains", () => {
    const p = { ...policy, domainPolicyMode: "allow" as const, domainPolicyList: ["acme.com"] };
    expect(checkDomain("a@acme.com", p).ok).toBe(true);
    expect(checkDomain("a@sub.acme.com", p).ok).toBe(true);
    expect(checkDomain("a@other.com", p).ok).toBe(false);
  });
  it("allow mode with an empty list admits nobody (fail closed)", () => {
    expect(checkDomain("a@acme.com", { ...policy, domainPolicyMode: "allow" }).ok).toBe(false);
  });
});

describe("checkSponsor (check 1)", () => {
  it("admins may invite", () => expect(checkSponsor({ isAdmin: true, isOwnerOfTarget: false })).toEqual({ ok: true, value: "admin" }));
  it("owners of the target group may invite", () => expect(checkSponsor({ isAdmin: false, isOwnerOfTarget: true })).toEqual({ ok: true, value: "sponsor" }));
  it("anyone else gets 403 (runbook test case: non-sponsor)", () =>
    expect(checkSponsor({ isAdmin: false, isOwnerOfTarget: false })).toMatchObject({ ok: false, status: 403 }));
});

describe("expiresAt", () => {
  it("adds whole days", () => {
    expect(expiresAt(7, new Date("2026-10-14T00:00:00Z")).toISOString()).toBe("2026-10-21T00:00:00.000Z");
  });
});
