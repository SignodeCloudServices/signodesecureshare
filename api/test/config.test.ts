import { describe, expect, it } from "vitest";
import { loadConfig, PROD_SPA_CLIENT_ID } from "../src/lib/config";

const base = {
  TENANT_ID: "7db30361-ce9f-4244-8d28-60553bffff38",
  API_AUDIENCES: "api://e07aa77f-557f-45c1-bd76-fb61609381ab",
  ADMIN_GROUP_IDS: "389d5c85-73f2-47dd-8f61-1b916dae4e3e",
  INVITE_REDIRECT_URL: "https://secureshare.signode.com",
  INVITATIONS_TABLE_URL: "https://example.table.core.windows.net",
};

describe("loadConfig: allowed clients", () => {
  it("defaults to the prod SPA only, so an unset value fails closed", () => {
    expect(loadConfig(base).allowedClientIds).toEqual([PROD_SPA_CLIENT_ID]);
  });
  it("takes an explicit list, normalised to lower case", () => {
    expect(loadConfig({ ...base, ALLOWED_CLIENT_IDS: " AAAA , bbbb" }).allowedClientIds).toEqual(["aaaa", "bbbb"]);
  });
});
