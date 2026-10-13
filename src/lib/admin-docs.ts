// ---------------------------------------------------------------------------
// Internal documentation pages — build-time switch (WS1.3)
//
// The Build Guide, Architecture, Security, Controls, Deployment and Runbooks
// pages describe the internal security stack, the NIST control inventory
// with per-control implementation status, and the break-glass procedure.
// RequireAdmin stops a non-admin *navigating* to them, but while they were
// statically imported their full text shipped in the JavaScript bundle to
// every anonymous visitor of an internet-facing portal.
//
// They are now loaded with dynamic import() behind this flag. When the flag
// is not "true", the condition is a constant false at build time, Rollup
// drops the branch, and the pages are never emitted into dist/ at all.
//
// FAIL CLOSED: the default is OFF. A forgotten variable leaves the docs out.
// No deployed build sets it — dev and prod are both public URLs. To read the
// pages locally:  VITE_INCLUDE_ADMIN_DOCS=true npm run dev
//
// deploy-prod.yml enforces the outcome by grepping dist/ for markers of
// these pages; that check, not this comment, is the control.
//
// Each import site compares import.meta.env directly rather than importing a
// shared boolean. Vite substitutes the literal at each site, which is what
// lets the bundler prove the branch dead; a constant passed through another
// module is not reliably folded.
// ---------------------------------------------------------------------------

/** For display logic only (e.g. nav). Import sites test the env var inline. */
export const INCLUDE_ADMIN_DOCS = import.meta.env.VITE_INCLUDE_ADMIN_DOCS === "true";
