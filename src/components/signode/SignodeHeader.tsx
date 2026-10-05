import { NavLink } from "react-router-dom";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { SendInvitationDialog } from "./SendInvitationDialog";
import { usePersona } from "@/lib/persona-context";
import { useAuth, DEMO_MODE } from "@/lib/auth-context";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  adminOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { to: "/", label: "Home", end: true },
  { to: "/browse", label: "Browse" },
  { to: "/upload", label: "Upload" },
  { to: "/recent", label: "Recent" },
  { to: "/help", label: "Help" },
  { to: "/build-guide", label: "Build Guide", adminOnly: true },
  { to: "/architecture", label: "Architecture", adminOnly: true },
  { to: "/security", label: "Security", adminOnly: true },
  { to: "/controls", label: "Controls", adminOnly: true },
  { to: "/deployment", label: "Deployment Roadmap", adminOnly: true },
  { to: "/runbooks", label: "Runbooks", adminOnly: true },
  { to: "/source", label: "Source & IaC", adminOnly: true },
];

export function SignodeHeader() {
  const { persona } = usePersona();
  const { isAdmin, displayName, isAuthenticated } = useAuth();

  // Demo mode is driven by the persona switcher; live mode by the signed-in
  // user's Entra group membership.
  const isGlobalAdmin = DEMO_MODE ? persona.id === "global-admin" : isAdmin;

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.adminOnly || isGlobalAdmin
  );

  return (
    <header className="signode-header-gradient border-b-4 border-[hsl(var(--signode-orange))] no-print sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-6">
        {/* Top row: logo + right-side controls */}
        <div className="flex items-center justify-between py-3">
          <NavLink to="/" className="flex flex-col leading-none">
            <span className="signode-wordmark text-2xl">SIGNODE</span>
            <span className="signode-tagline mt-1">
              Transit Packaging Solutions
            </span>
          </NavLink>
          <div className="flex items-center gap-3">
            {/* Invitations are an admin action; the persona switcher is a demo
                affordance and must never appear to a real scoped user. */}
            {isGlobalAdmin && <SendInvitationDialog />}
            {DEMO_MODE ? (
              <PersonaSwitcher />
            ) : (
              isAuthenticated && (
                <span className="text-sm text-white/90">
                  Signed in as <strong>{displayName}</strong>
                </span>
              )
            )}
          </div>
        </div>
        {/* Bottom row: nav */}
        <nav className="flex flex-wrap gap-1 pb-2 -mx-1">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                [
                  "px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-[hsl(var(--signode-orange))] text-white"
                    : "text-white/80 hover:text-white hover:bg-white/10",
                ].join(" ")
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}