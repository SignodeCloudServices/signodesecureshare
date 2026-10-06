// ---------------------------------------------------------------------------
// MSAL configuration — SPA-direct Graph access
//
// DEMO ARCHITECTURE NOTE
// ----------------------
// The target design puts a Functions API between the SPA and Graph, using
// on-behalf-of token exchange (see CLAUDE.md). This build has the SPA call
// Graph directly.
//
// The enforcement model is IDENTICAL either way: the token is delegated, so
// Microsoft Graph returns only what the signed-in user's SharePoint ACLs
// permit. SharePoint remains the authority. What the SPA-direct path cannot
// do is app-only work — guest invitation and folder provisioning — which is
// out of scope for the demo.
//
// Migration back to the API path does not touch folder-scopes.ts, the UI, or
// the scope logic. Only the transport changes.
// ---------------------------------------------------------------------------

import type { Configuration, PopupRequest } from "@azure/msal-browser";
import { LogLevel } from "@azure/msal-browser";

/** Signode corporate tenant. */
export const TENANT_ID = "7db30361-ce9f-4244-8d28-60553bffff38";

/** cs-secure-share-dev-spa — public client, auth code + PKCE, no secret. */
export const SPA_CLIENT_ID = "212f8c25-c2f7-4e09-a316-280dd4c89e73";

/** SecureShare SharePoint site (Graph composite ID). */
export const SITE_ID =
  "pkgconnect.sharepoint.com,863b900d-399b-4aec-b418-c09b29cea3cb,2222cff4-cd85-4d6e-803a-a30584a8383b";

/**
 * SecureSharePortal document library.
 *
 * NOT the site's default `Documents` library, which is empty. Using the wrong
 * drive produces an empty listing and 404s on every path.
 */
export const DRIVE_ID =
  "b!DZA7hps57Eq0GMCbKc6jy_TPIiKFzW5NgDqjBYSoODtD5D_PMB_SQIPqxppj9r_E";

export const msalConfig: Configuration = {
  auth: {
    clientId: SPA_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    // sessionStorage over localStorage: the token does not outlive the tab.
    cacheLocation: "sessionStorage",
    storeAuthStateInCookie: false,
  },
  system: {
    loggerOptions: {
      logLevel: LogLevel.Warning,
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (level === LogLevel.Error) console.error(message);
        else if (level === LogLevel.Warning) console.warn(message);
      },
    },
  },
};

/**
 * Scopes requested at sign-in.
 *
 * These are DELEGATED Graph permissions — broad-sounding, but each call is
 * made as the signed-in user and SharePoint trims the results to that user's
 * ACLs. A user who cannot see a folder gets nothing back for it.
 */
export const loginRequest: PopupRequest = {
  // Always show the account picker rather than silently reusing whichever
  // account is cached. Without this, switching between an admin and a scoped
  // user means clearing site data between sign-ins.
  prompt: "select_account",
  scopes: [
  "User.Read",
  "Sites.Read.All",
  "Files.ReadWrite.All",
  "GroupMember.ReadWrite.All",
  ],
};

/** Scopes for silent token acquisition before each Graph call. */
export const graphRequest = {
  scopes: ["User.Read", "Sites.Read.All", "Files.ReadWrite.All", "GroupMember.ReadWrite.All"],
};

export const GRAPH_BASE = "https://graph.microsoft.com/v1.0";
