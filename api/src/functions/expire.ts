// ---------------------------------------------------------------------------
// Daily expiry sweep — runbook WS3.4 step 4.
//
// For every open (pending/redeemed) invitation:
//   - refresh pending → redeemed when Entra says the guest accepted
//   - past expiresAt, the D3 setting decides what happens:
//       EXPIRY_CLOCK=redemption  unredeemed → remove membership, mark expired;
//                                redeemed   → left alone (quarterly access
//                                             reviews govern duration)
//       EXPIRY_CLOCK=access      remove membership + revoke sessions, mark
//                                expired, redeemed or not
//
// Guest objects are not deleted here: that needs a broader directory role than
// this identity holds, and an orphaned guest with no group membership can see
// nothing. Quarterly access reviews (RB-28/29) clean them up.
//
// 02:15 UTC daily (~21:15 CT). The "Expiry job missed" alert in WS5.2 fires on
// no successful run in 26 h.
// ---------------------------------------------------------------------------
import { app, type InvocationContext, type Timer } from "@azure/functions";
import { config } from "../lib/config";
import * as graph from "../lib/graph";
import * as store from "../lib/store";
import { audit } from "../lib/http";
import { revokeAccess } from "./invitations";

const ACTOR = "system:expiry-sweep";

export async function sweep(ctx: InvocationContext, now: Date = new Date()): Promise<{ redeemed: number; expired: number; failed: number }> {
  const clock = config().expiryClock;
  const counts = { redeemed: 0, expired: 0, failed: 0 };

  for (const inv of await store.listOpenInvitations()) {
    try {
      let status = inv.status;
      if (status === "pending" && (await graph.externalUserState(inv.inviteeUserId)) === "Accepted") {
        await store.updateStatus(inv, "redeemed", ACTOR);
        status = "redeemed";
        counts.redeemed++;
      }
      if (new Date(inv.expiresAt) > now) continue;
      if (clock === "redemption" && status === "redeemed") continue;

      await revokeAccess({ ...inv, status });
      await store.updateStatus(inv, "expired", ACTOR);
      counts.expired++;
      audit(ctx, { action: "expire", decision: "ALLOW", actor: ACTOR, invitee: inv.inviteeEmail, groupId: inv.groupId, scope: inv.scopePath, invitationId: inv.id, reason: `clock=${clock}, was ${status}` });
    } catch (e) {
      // One bad record must not stop the sweep; it is retried tomorrow.
      counts.failed++;
      ctx.error(`expiry sweep: invitation ${inv.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return counts;
}

app.timer("expirySweep", {
  schedule: "0 15 2 * * *",
  runOnStartup: false,
  handler: async (_t: Timer, ctx: InvocationContext) => {
    const r = await sweep(ctx);
    ctx.info(JSON.stringify({ event: "secureshare.expirySweep", ...r }));
    if (r.failed > 0) throw new Error(`expiry sweep: ${r.failed} invitation(s) failed; see errors above`);
  },
});
