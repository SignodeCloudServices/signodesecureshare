// ---------------------------------------------------------------------------
// Retention and expiry constants — single source of truth
//
// Two DIFFERENT clocks are easy to conflate, and the portal previously did:
//
//   FILE RETENTION      90 days  — how long an uploaded file lives in
//                                 SharePoint before the Extranet-AutoCleanup-90d
//                                 retention label removes it (RB-16)
//
//   INVITATION EXPIRY    7 days  — how long a guest invitation link stays
//                                 redeemable (RB-03), 30 days maximum
//
// Both are ratified. The 7 in the invitation dialog is correct; the 7 that
// appeared in file-expiry copy was not.
//
// Anything that displays a retention or expiry figure imports from here. Do
// not hardcode the numbers — that is how the copy drifted from the design in
// the first place.
// ---------------------------------------------------------------------------

/** Days an uploaded file is retained before automatic cleanup (RB-16). */
export const FILE_RETENTION_DAYS = 90;

/** Default lifetime of a guest invitation link (RB-03). */
export const INVITATION_DEFAULT_DAYS = 7;

/** Maximum lifetime an inviter may set on an invitation link (RB-03). */
export const INVITATION_MAX_DAYS = 30;

/** At or below this many days remaining, show the expiry badge as critical. */
export const EXPIRY_CRITICAL_DAYS = 7;

/** At or below this many days remaining, show the expiry badge as a warning. */
export const EXPIRY_WARNING_DAYS = 21;

/** Severity for an expiry badge, given days remaining. */
export type ExpirySeverity = "expired" | "critical" | "warning" | "ok";

export function expirySeverity(daysRemaining: number): ExpirySeverity {
  if (daysRemaining <= 0) return "expired";
  if (daysRemaining <= EXPIRY_CRITICAL_DAYS) return "critical";
  if (daysRemaining <= EXPIRY_WARNING_DAYS) return "warning";
  return "ok";
}

/**
 * Days remaining before a file uploaded at `uploadedAt` is cleaned up.
 * Negative means it is past retention and awaiting removal.
 */
export function daysUntilExpiry(uploadedAt: Date | string): number {
  const uploaded =
    typeof uploadedAt === "string" ? new Date(uploadedAt) : uploadedAt;
  const ageDays = Math.floor((Date.now() - uploaded.getTime()) / 86_400_000);
  return FILE_RETENTION_DAYS - ageDays;
}
