// ---------------------------------------------------------------------------
// Auth context — real identity, real group membership, real scope
//
// Replaces the hardcoded persona list when VITE_DEMO_MODE is off. The signed-in
// user's transitive group membership is resolved against folder-scopes.ts to
// produce the paths the portal renders.
//
// IMPORTANT: this decides what the UI RENDERS, nothing more. SharePoint decides
// what the user can actually read, and it does so independently. If this
// resolved an over-broad scope, Graph would still return nothing for folders
// the user cannot see — the listing would simply come back empty.
// ---------------------------------------------------------------------------

import * as React from "react";
import { useMsal, useIsAuthenticated } from "@azure/msal-react";
import type { AccountInfo } from "@azure/msal-browser";
import { loginRequest } from "./auth-config";
import { getMyGroupIds, getMe } from "./graph";
import { pathsForGroups, scopeByGroupId, type FolderScope } from "./folder-scopes";

/** Entra app role or group that marks a portal administrator. */
const ADMIN_GROUP_IDS: string[] = [
  // Populate with an IT admin group object ID to grant "*" scope.
  // Deliberately empty: an unset admin list fails closed.
];

export type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  displayName: string;
  userPrincipalName: string;
  /** Raw transitive group IDs from getMemberGroups. */
  groupIds: string[];
  /** Scopes from the registry that the user holds. */
  scopes: FolderScope[];
  /** Portal paths to render. "*" for admins. */
  scopedPaths: string[];
  isAdmin: boolean;
  account: AccountInfo | null;
  signIn: () => void;
  signOut: () => void;
};

const AuthContext = React.createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { instance, accounts } = useMsal();
  const isAuthenticated = useIsAuthenticated();

  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [displayName, setDisplayName] = React.useState("");
  const [userPrincipalName, setUserPrincipalName] = React.useState("");
  const [groupIds, setGroupIds] = React.useState<string[]>([]);

  const account = accounts[0] ?? null;

  React.useEffect(() => {
    if (!isAuthenticated || !account) return;

    let cancelled = false;
    setIsLoading(true);
    setError(null);

    (async () => {
      try {
        const [me, groups] = await Promise.all([
          getMe(instance, account),
          getMyGroupIds(instance, account),
        ]);
        if (cancelled) return;
        setDisplayName(me.displayName);
        setUserPrincipalName(me.userPrincipalName);
        setGroupIds(groups);
      } catch (e) {
        if (cancelled) return;
        // Most likely cause early on: admin consent not yet granted for the
        // delegated Graph scopes. The message is worth surfacing verbatim.
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, account, instance]);

  const isAdmin = React.useMemo(
    () => groupIds.some((g) => ADMIN_GROUP_IDS.includes(g)),
    [groupIds]
  );

  const scopes = React.useMemo(
    () =>
      groupIds
        .map((id) => scopeByGroupId(id))
        .filter((s): s is FolderScope => s !== undefined),
    [groupIds]
  );

  const scopedPaths = React.useMemo(
    () => pathsForGroups(groupIds, { isAdmin }),
    [groupIds, isAdmin]
  );

  const value: AuthState = {
    isAuthenticated,
    isLoading,
    error,
    displayName,
    userPrincipalName,
    groupIds,
    scopes,
    scopedPaths,
    isAdmin,
    account,
    signIn: () => {
      instance.loginPopup(loginRequest).catch((e) => setError(String(e)));
    },
    signOut: () => {
      instance.logoutPopup().catch((e) => setError(String(e)));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** True when the app should use mock data instead of live Graph. */
export const DEMO_MODE = import.meta.env.VITE_DEMO_MODE === "true";
