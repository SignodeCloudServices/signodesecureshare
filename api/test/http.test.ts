import { describe, expect, it, vi } from "vitest";
import type { InvocationContext } from "@azure/functions";
import { failure } from "../src/lib/http";
import { GraphError } from "../src/lib/graph";
import { AuthError } from "../src/lib/auth";

const ctx = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as InvocationContext;
const body = (r: ReturnType<typeof failure>) => (r.jsonBody as { error: string }).error;

describe("failure", () => {
  it("names the invite step when Graph refuses the invitation", () => {
    const r = failure(ctx, new GraphError(401, "Unauthorized", "POST /invitations → 401 Unauthorized: Insufficient privileges"));
    expect(r.status).toBe(502);
    expect(body(r)).toMatch(/guest invitation.*User\.Invite\.All/);
  });
  it("names the membership step for a refused group change", () => {
    const r = failure(ctx, new GraphError(403, "Authorization_RequestDenied", "POST /groups/48ef08e1-465b-4921-a2c7-dbe74f1a60ae/members/$ref → 403"));
    expect(r.status).toBe(502);
    expect(body(r)).toMatch(/folder-group membership/);
  });
  it("keeps other errors generic", () => {
    const r = failure(ctx, new Error("boom"));
    expect(r.status).toBe(500);
    expect(body(r)).toBe("Internal error");
  });
  it("passes auth errors through", () => {
    expect(failure(ctx, new AuthError(401, "Invalid token")).status).toBe(401);
  });
});
