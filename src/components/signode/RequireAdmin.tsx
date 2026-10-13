import { Navigate } from "react-router-dom";
import { useAuth, DEMO_MODE } from "@/lib/auth-context";
import { usePersona } from "@/lib/persona-context";

/**
 * Blocks the internal documentation pages for anyone who is not a portal
 * administrator.
 *
 * WHY THIS EXISTS
 * ---------------
 * SignodeHeader filters the nav by `adminOnly`, but App.tsx previously
 * registered every route unconditionally. A scoped user could reach
 * /runbooks, /controls or /security by typing the URL — the pages render
 * internal runbooks and the NIST control matrix, which should never be
 * visible to an external partner.
 *
 * Hiding a nav item is presentation. This is the guard.
 *
 * This guard is client-side, so it was never enough on its own: while the
 * admin pages were statically imported, their text shipped in the JS bundle.
 * Since WS1.3 (13 Oct 2026) deployed builds do not contain those pages at all
 * (src/lib/admin-docs.ts). This guard still matters for local builds that
 * include them.
 */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { isAdmin, isAuthenticated, isLoading } = useAuth();
  const { persona } = usePersona();

  // In demo mode the persona switcher drives the experience.
  const allowed = DEMO_MODE ? persona.id === "global-admin" : isAdmin;

  if (!DEMO_MODE && (isLoading || !isAuthenticated)) {
    return null;
  }

  if (!allowed) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
