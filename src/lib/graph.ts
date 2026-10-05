// ---------------------------------------------------------------------------
// Microsoft Graph service
//
// Every call here is DELEGATED — made as the signed-in user. SharePoint
// enforces that user's ACLs and returns only what they may see. This module
// does not decide access; it reads what Graph gives it.
//
// Group membership is resolved with getMemberGroups, NOT the `groups` token
// claim. See CLAUDE.md for why: the claim silently degrades to an overage
// pointer past ~200 groups, which would resolve to an empty scope while
// SharePoint still grants access.
// ---------------------------------------------------------------------------

import type { IPublicClientApplication, AccountInfo } from "@azure/msal-browser";
import { GRAPH_BASE, SITE_ID, DRIVE_ID, graphRequest } from "./auth-config";
import { toGraphPath } from "./folder-scopes";

export type DriveItem = {
  id: string;
  name: string;
  size: number;
  lastModifiedDateTime: string;
  isFolder: boolean;
  childCount?: number;
  downloadUrl?: string;
  lastModifiedBy?: string;
};

/** Acquire a delegated Graph token, falling back to interactive if needed. */
async function getToken(
  msal: IPublicClientApplication,
  account: AccountInfo
): Promise<string> {
  try {
    const result = await msal.acquireTokenSilent({ ...graphRequest, account });
    return result.accessToken;
  } catch {
    // Silent acquisition fails on consent changes, expiry, or CA policy
    // re-evaluation. Falling back to popup rather than failing the call.
    const result = await msal.acquireTokenPopup({ ...graphRequest, account });
    return result.accessToken;
  }
}

async function graphFetch<T>(
  msal: IPublicClientApplication,
  account: AccountInfo,
  path: string,
  init?: RequestInit
): Promise<T> {
  const token = await getToken(msal, account);
  const res = await fetch(`${GRAPH_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    const body = await res.text();
    // 403 here usually means the ACL denied it, which is the system working.
    throw new Error(`Graph ${res.status} on ${path}: ${body.slice(0, 300)}`);
  }

  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

// ---------------------------------------------------------------------------
// Group membership
// ---------------------------------------------------------------------------

/**
 * Transitive group membership for the signed-in user.
 *
 * Transitive matters: SharePoint resolves nested groups, and the token claim
 * does not. Using the claim would diverge from what SharePoint enforces.
 */
export async function getMyGroupIds(
  msal: IPublicClientApplication,
  account: AccountInfo
): Promise<string[]> {
  const res = await graphFetch<{ value: string[] }>(
    msal,
    account,
    "/me/getMemberGroups",
    {
      method: "POST",
      body: JSON.stringify({ securityEnabledOnly: true }),
    }
  );
  return res.value ?? [];
}

// ---------------------------------------------------------------------------
// Folder and file operations
// ---------------------------------------------------------------------------

function mapItem(raw: any): DriveItem {
  return {
    id: raw.id,
    name: raw.name,
    size: raw.size ?? 0,
    lastModifiedDateTime: raw.lastModifiedDateTime,
    isFolder: Boolean(raw.folder),
    childCount: raw.folder?.childCount,
    downloadUrl: raw["@microsoft.graph.downloadUrl"],
    lastModifiedBy: raw.lastModifiedBy?.user?.displayName,
  };
}

/**
 * List the children of a folder.
 *
 * `portalPath` is a display path rooted at FileRoot; Graph paths are relative
 * to the drive root, so FileRoot is stripped. Passing it through unchanged
 * produces a 404 that looks like a permissions failure.
 */
export async function listChildren(
  msal: IPublicClientApplication,
  account: AccountInfo,
  portalPath: string
): Promise<DriveItem[]> {
  const graphPath = toGraphPath(portalPath);
  const url = graphPath
    ? `/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${encodeURI(graphPath)}:/children`
    : `/sites/${SITE_ID}/drives/${DRIVE_ID}/root/children`;

  const res = await graphFetch<{ value: any[] }>(msal, account, url);
  return (res.value ?? []).map(mapItem);
}

/** Short-lived, pre-authenticated download URL for a file. */
export async function getDownloadUrl(
  msal: IPublicClientApplication,
  account: AccountInfo,
  portalPath: string
): Promise<string> {
  const graphPath = toGraphPath(portalPath);
  const item = await graphFetch<any>(
    msal,
    account,
    `/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${encodeURI(graphPath)}`
  );
  const url = item["@microsoft.graph.downloadUrl"];
  if (!url) throw new Error(`No download URL for ${portalPath}`);
  return url;
}

/**
 * Upload a file.
 *
 * Simple PUT handles files under 4 MB. Larger files need createUploadSession
 * with chunking — out of scope for the demo; enforced below rather than
 * failing opaquely at 4 MB.
 */
export const SIMPLE_UPLOAD_LIMIT = 4 * 1024 * 1024;

export async function uploadFile(
  msal: IPublicClientApplication,
  account: AccountInfo,
  portalFolderPath: string,
  file: File
): Promise<DriveItem> {
  if (file.size > SIMPLE_UPLOAD_LIMIT) {
    throw new Error(
      `${file.name} is ${(file.size / 1024 / 1024).toFixed(1)} MB. ` +
        `Files over 4 MB need a chunked upload session, which is not yet implemented.`
    );
  }

  const graphPath = toGraphPath(portalFolderPath);
  const target = `${graphPath}/${file.name}`.replace(/^\/+/, "");
  const token = await getToken(msal, account);

  const res = await fetch(
    `${GRAPH_BASE}/sites/${SITE_ID}/drives/${DRIVE_ID}/root:/${encodeURI(target)}:/content`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
    }
  );

  if (!res.ok) {
    const body = await res.text();
    // A DLP block surfaces here. Worth distinguishing in the UI rather than
    // reporting a generic failure — see RB-18.
    throw new Error(`Upload failed (${res.status}): ${body.slice(0, 300)}`);
  }

  return mapItem(await res.json());
}

/** Signed-in user's display name and UPN, for the header. */
export async function getMe(
  msal: IPublicClientApplication,
  account: AccountInfo
): Promise<{ displayName: string; userPrincipalName: string; id: string }> {
  return graphFetch(msal, account, "/me?$select=displayName,userPrincipalName,id");
}
