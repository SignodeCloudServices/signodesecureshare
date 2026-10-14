import { app } from "@azure/functions";

// Front Door health probe target. Liveness only: no data, no auth, no
// dependency checks (a Graph outage must not take the origin out of rotation).
app.http("health", {
  route: "health",
  methods: ["GET", "HEAD"],
  authLevel: "anonymous",
  handler: async () => ({ status: 200, jsonBody: { status: "ok" }, headers: { "Cache-Control": "no-store" } }),
});
