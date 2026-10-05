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
 * Note this is still client-side: the admin pages are static content bundled
 * into the SPA, so a determined reader could find the text in the JS. The
 * real fix is to stop shipping internal documentation inside an
 * internet-facing portal — tracked separately. This guard closes the
 * trivial path.
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
