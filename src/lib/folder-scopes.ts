// ---------------------------------------------------------------------------
// Folder scope registry — Entra security group → portal folder path
//
// Source of truth for the group/folder mapping produced by RB-14 and applied
// by RB-15. 40 groups: 5 region + 35 department (5 regions × 7 departments).
// Object IDs as created in the Signode corporate tenant (pkgconnect.com),
// captured 2026-09-24.
//
// Authoritative copy: Notion → RB-00 Outputs Register. Keep in sync.
//
// IMPORTANT: this file describes what the portal *renders*. It is not a
// security control. Real enforcement is SharePoint ACLs, reached through the
// API's on-behalf-of Graph calls. See CLAUDE.md.
// ---------------------------------------------------------------------------
/** Synthetic display root. NOT part of any Graph path. */
export const PORTAL_ROOT = "FileRoot";
/** Convert a portal display path to a Graph drive-relative path. */
export function toGraphPath(portalPath: string): string {
 return portalPath.replace(new RegExp(`^${PORTAL_ROOT}/?`), "");
}
/** Convert a Graph drive-relative path to a portal display path. */
export function toPortalPath(graphPath: string): string {
 const trimmed = graphPath.replace(/^\/+/, "");
 return trimmed ? `${PORTAL_ROOT}/${trimmed}` : PORTAL_ROOT;
}
export type ScopeLevel = "region" | "department" | "external";
export type FolderScope = {
 /** Entra security group object ID. */
 groupId: string;
 /** Entra security group display name. */
 groupName: string;
 /** Portal display path, rooted at PORTAL_ROOT. */
 path: string;
 level: ScopeLevel;
 /**
 * Whether external guests may be granted this scope.
 *
 * Every scope below is false. Region scopes cascade to all seven
 * departments beneath them (RB-15 forbids granting guests at region
 * level). Department scopes hold internal working content. Guest-facing
 * scopes live in EXTERNAL_SCOPES and do not exist yet.
 */
 guestEligible: boolean;
};
// ---------------------------------------------------------------------------
// Region-level ("-m") groups — INTERNAL REGIONAL ADMINISTRATORS ONLY.
// A grant here cascades to every department beneath it.
// ---------------------------------------------------------------------------
export const REGION_SCOPES: FolderScope[] = [
 {
 groupId: "2e610098-0231-4361-9640-3eb25792a210",
 groupName: "SG-SecureShare-AMER-m",
 path: "FileRoot/01_Signode_AMER",
 level: "region",
 guestEligible: false,
 },
 {
 groupId: "54d91842-6d9d-4d0b-854b-fd41b3a7825f",
 groupName: "SG-SecureShare-EMEA-m",
 path: "FileRoot/02_Signode_EMEA",
 level: "region",
 guestEligible: false,
 },
 {
 groupId: "d319fa28-3525-4a1e-bb75-240ab969b953",
 groupName: "SG-SecureShare-APAC-m",
 path: "FileRoot/03_Signode_APAC",
 level: "region",
 guestEligible: false,
 },
 {
 groupId: "13f3bc9d-5328-4acd-b0c3-6e05fc1194b1",
 groupName: "SG-SecureShare-APT-m",
 path: "FileRoot/04_Signode_APT",
 level: "region",
 guestEligible: false,
 },
 {
 groupId: "eb158af8-94ee-44e5-9fe4-228a70f19f35",
 groupName: "SG-SecureShare-CORP-m",
 path: "FileRoot/05_Signode_CORP",
 level: "region",
 guestEligible: false,
 },
];
// ---------------------------------------------------------------------------
// Department-level groups — complete across all five regions.
//
// Note: three group-name suffixes are abbreviated relative to their folders
// (-Sales → Sales_and_Marketing, -Finance → Finance_and_Accounting,
// -HR → Human_Resources). Paths cannot be derived from group names; this
// table is the mapping.
// ---------------------------------------------------------------------------
export const DEPARTMENT_SCOPES: FolderScope[] = [
 // ---- AMER ----
 {
 groupId: "f62c9d7b-68ea-4f23-8bad-11adb2f83f65",
 groupName: "SG-SecureShare-AMER-Engineering",
 path: "FileRoot/01_Signode_AMER/Engineering",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "c9ab5fa6-3140-48ba-98fc-af5107914909",
 groupName: "SG-SecureShare-AMER-Finance",
 path: "FileRoot/01_Signode_AMER/Finance_and_Accounting",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "395befe4-03ea-488e-b6ee-5039ced3dd9a",
 groupName: "SG-SecureShare-AMER-HR",
 path: "FileRoot/01_Signode_AMER/Human_Resources",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "e71419e7-8c60-4291-8040-22d03e634f50",
 groupName: "SG-SecureShare-AMER-IT",
 path: "FileRoot/01_Signode_AMER/IT",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "faf3ccfe-763d-4742-932a-a564615798e8",
 groupName: "SG-SecureShare-AMER-Legal",
 path: "FileRoot/01_Signode_AMER/Legal",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "9f4ad8ec-f1fa-4ad1-9ff4-51493000660b",
 groupName: "SG-SecureShare-AMER-Operations",
 path: "FileRoot/01_Signode_AMER/Operations",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "c7ffb4c9-c785-4dd6-8cd5-341156975cb8",
 groupName: "SG-SecureShare-AMER-Sales",
 path: "FileRoot/01_Signode_AMER/Sales_and_Marketing",
 level: "department",
 guestEligible: false,
 },
 // ---- EMEA ----
 {
 groupId: "6ddb22e9-b66c-4edc-bf91-0ca1fe20c4ef",
 groupName: "SG-SecureShare-EMEA-Engineering",
 path: "FileRoot/02_Signode_EMEA/Engineering",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "0fb2235b-b822-45d3-aefa-9e6fa7522d41",
 groupName: "SG-SecureShare-EMEA-Finance",
 path: "FileRoot/02_Signode_EMEA/Finance_and_Accounting",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "8b75cefa-f6ab-4d3f-b4ed-0e8c759ca8e6",
 groupName: "SG-SecureShare-EMEA-HR",
 path: "FileRoot/02_Signode_EMEA/Human_Resources",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "251cf7ff-2b02-4060-aa96-27001472a843",
 groupName: "SG-SecureShare-EMEA-IT",
 path: "FileRoot/02_Signode_EMEA/IT",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "ae322f0e-84a6-43ae-ae03-f16ee441f3f5",
 groupName: "SG-SecureShare-EMEA-Legal",
 path: "FileRoot/02_Signode_EMEA/Legal",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "917f7200-748b-433a-b52d-c4b001b0eb35",
 groupName: "SG-SecureShare-EMEA-Operations",
 path: "FileRoot/02_Signode_EMEA/Operations",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "b0354d09-7c2c-421a-b454-a65944956a61",
 groupName: "SG-SecureShare-EMEA-Sales",
 path: "FileRoot/02_Signode_EMEA/Sales_and_Marketing",
 level: "department",
 guestEligible: false,
 },
 // ---- APAC ----
 {
 groupId: "710b0fd4-472f-49ce-a1c6-85bc6228c29f",
 groupName: "SG-SecureShare-APAC-Engineering",
 path: "FileRoot/03_Signode_APAC/Engineering",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "845f22e3-046a-4730-942e-15500f84e8b3",
 groupName: "SG-SecureShare-APAC-Finance",
 path: "FileRoot/03_Signode_APAC/Finance_and_Accounting",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "43b49a30-39fb-4278-9de4-d96d2649b306",
 groupName: "SG-SecureShare-APAC-HR",
 path: "FileRoot/03_Signode_APAC/Human_Resources",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "432e970e-7595-465e-8c2d-c9a6adbf8430",
 groupName: "SG-SecureShare-APAC-IT",
 path: "FileRoot/03_Signode_APAC/IT",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "b5cb5417-cbc2-4d82-8771-6354224f99ef",
 groupName: "SG-SecureShare-APAC-Legal",
 path: "FileRoot/03_Signode_APAC/Legal",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "4bb94df9-831d-4b39-a2d1-5f84eb12dc99",
 groupName: "SG-SecureShare-APAC-Operations",
 path: "FileRoot/03_Signode_APAC/Operations",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "28d1e21e-bc5e-4854-817b-aec2a3795576",
 groupName: "SG-SecureShare-APAC-Sales",
 path: "FileRoot/03_Signode_APAC/Sales_and_Marketing",
 level: "department",
 guestEligible: false,
 },
 // ---- APT ----
 {
 groupId: "2fb43cdc-ace4-48dd-a90c-685fbc41b98b",
 groupName: "SG-SecureShare-APT-Engineering",
 path: "FileRoot/04_Signode_APT/Engineering",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "dd0d5e1b-fcee-49d1-9d02-ec4e61a2a18e",
 groupName: "SG-SecureShare-APT-Finance",
 path: "FileRoot/04_Signode_APT/Finance_and_Accounting",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "b4deb2c3-28e0-4056-9a79-16968aaae6a0",
 groupName: "SG-SecureShare-APT-HR",
 path: "FileRoot/04_Signode_APT/Human_Resources",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "86714799-3d98-4d7e-a889-1c7349eef05a",
 groupName: "SG-SecureShare-APT-IT",
 path: "FileRoot/04_Signode_APT/IT",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "b9c86257-de84-4e97-bee6-481d9f54cfc3",
 groupName: "SG-SecureShare-APT-Legal",
 path: "FileRoot/04_Signode_APT/Legal",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "f313c25b-9784-4b7e-8059-0ea3b8dbe7ac",
 groupName: "SG-SecureShare-APT-Operations",
 path: "FileRoot/04_Signode_APT/Operations",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "3cde671f-376d-454c-81d8-8ec78af8f405",
 groupName: "SG-SecureShare-APT-Sales",
 path: "FileRoot/04_Signode_APT/Sales_and_Marketing",
 level: "department",
 guestEligible: false,
 },
 // ---- CORP ----
 {
 groupId: "1981981d-5261-48da-bfc1-5a1a49edced2",
 groupName: "SG-SecureShare-CORP-Engineering",
 path: "FileRoot/05_Signode_CORP/Engineering",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "a9514d98-59a3-485a-ba79-2e84d512e056",
 groupName: "SG-SecureShare-CORP-Finance",
 path: "FileRoot/05_Signode_CORP/Finance_and_Accounting",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "d7a15e22-5abd-416b-afaa-bb415a9ed230",
 groupName: "SG-SecureShare-CORP-HR",
 path: "FileRoot/05_Signode_CORP/Human_Resources",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "5ca89105-53f9-4ba4-84b0-ae5ed99b5355",
 groupName: "SG-SecureShare-CORP-IT",
 path: "FileRoot/05_Signode_CORP/IT",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "c179e7e4-a1ae-4416-b59e-722e2d7ad5c1",
 groupName: "SG-SecureShare-CORP-Legal",
 path: "FileRoot/05_Signode_CORP/Legal",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "25704765-1108-467b-a948-0986f5496750",
 groupName: "SG-SecureShare-CORP-Operations",
 path: "FileRoot/05_Signode_CORP/Operations",
 level: "department",
 guestEligible: false,
 },
 {
 groupId: "83d0d4bd-0b92-4fb2-8395-51436045695a",
 groupName: "SG-SecureShare-CORP-Sales",
 path: "FileRoot/05_Signode_CORP/Sales_and_Marketing",
 level: "department",
 guestEligible: false,
 },
];
// ---------------------------------------------------------------------------
// External exchange scopes — the ONLY guest-eligible scopes.
//
// Convention, ratified 2026-09-24:
// <Region>/<Department>/External/<Partner_Name>
// group: SG-SecureShare-EXT-<Partner_Name>
//
// The `External` folder itself is an organisational container, NOT a grant
// point. Inheritance is broken on it, but no guest group is granted there —
// otherwise every partner in that department would see each other's files.
// Guests are granted at the partner leaf only. It carries no group and so
// has no entry in this registry.
//
// POC scope (RB-15 validation). Two partners deliberately: partner-to-
// partner isolation is the test that proves the model, and it cannot be
// demonstrated with one folder.
// ---------------------------------------------------------------------------
/** Path segment that marks a folder as external-facing. See assertion below. */
export const EXTERNAL_SEGMENT = "/External/";
export const EXTERNAL_SCOPES: FolderScope[] = [
 {
 groupId: "48ef08e1-465b-4921-a2c7-dbe74f1a60ae",
 groupName: "SG-SecureShare-EXT-POC_Partner_A",
 path: "FileRoot/01_Signode_AMER/Sales_and_Marketing/External/POC_Partner_A",
 level: "external",
 guestEligible: true,
 },
 {
 groupId: "f8cc2714-b196-4ad2-b256-6ce93eb8b0d5",
 groupName: "SG-SecureShare-EXT-POC_Partner_B",
 path: "FileRoot/01_Signode_AMER/Sales_and_Marketing/External/POC_Partner_B",
 level: "external",
 guestEligible: true,
 },
];
export const ALL_SCOPES: FolderScope[] = [
 ...REGION_SCOPES,
 ...DEPARTMENT_SCOPES,
 ...EXTERNAL_SCOPES,
];
export function scopeByGroupId(groupId: string): FolderScope | undefined {
 return ALL_SCOPES.find((s) => s.groupId === groupId);
}
export function scopeByPath(path: string): FolderScope | undefined {
 return ALL_SCOPES.find((s) => s.path === path);
}
/**
 * Resolve group memberships to portal paths.
 * `isAdmin` comes from an app role, never from a group in this registry.
 */
export function pathsForGroups(
 groupIds: string[],
 opts: { isAdmin?: boolean } = {}
): string[] {
 if (opts.isAdmin) return ["*"];
 return ALL_SCOPES.filter((s) => groupIds.includes(s.groupId)).map(
 (s) => s.path
 );
}
/**
 * Guard for the invitation flow: refuse to invite a guest into a scope that
 * is not guest-eligible. Mirrored server-side — this copy is UX only.
 */
export function isGuestEligibleScope(groupId: string): boolean {
 return scopeByGroupId(groupId)?.guestEligible === true;
}
/** Scopes a guest may currently be invited into. */
export function guestEligibleScopes(): FolderScope[] {
 return ALL_SCOPES.filter((s) => s.guestEligible);
}

/**
 * Human label for a portal path: "AMER / Engineering", "CORP (all departments)".
 *
 * Derived from the path rather than `groupName` on purpose, so it also labels
 * paths *below* a registered scope ("AMER / Engineering / Drawings") — the
 * upload destination list needs that. The region segment carries a SharePoint
 * sort prefix (`01_Signode_AMER`) that means nothing to a user, so it is
 * stripped, and underscores become spaces.
 */
export function scopeLabel(portalPath: string): string {
 const segments = toGraphPath(portalPath).split("/").filter(Boolean);
 if (segments.length === 0) return "All folders";
 const label = segments
  .map((s, i) => (i === 0 ? s.replace(/^\d+_Signode_/, "") : s))
  .map((s) => s.replace(/_/g, " "))
  .join(" / ");
 // A region grant cascades to every department beneath it; say so, or the
 // single-word label reads as one folder rather than the whole region.
 return scopeByPath(portalPath)?.level === "region"
  ? `${label} (all departments)`
  : label;
}

/**
 * Reduce granted paths to the set of distinct roots worth offering.
 *
 * `pathsForGroups` returns one path per group, so a user in both a region
 * group and a department group inside that region gets both. The region grant
 * already cascades, so the department path is redundant — offering both would
 * be two doors into the same room, and the narrower one would look like a
 * different place.
 *
 * Returns paths sorted for stable ordering in a picker.
 */
export function rootScopePaths(paths: string[]): string[] {
 const unique = [...new Set(paths)];
 return unique
  .filter(
   (p) => !unique.some((other) => other !== p && p.startsWith(`${other}/`))
  )
  .sort((a, b) => a.localeCompare(b));
}
// ---------------------------------------------------------------------------
// Structural guard — module load time, fails loudly.
//
// A guest-eligible scope MUST sit beneath an `/External/` segment, and must
// be a leaf beneath it rather than the container itself. Without this, a
// single mistyped path could mark an internal department folder guest-
// eligible and nothing — not the type system, not review, not SharePoint —
// would catch it. Over-granting an internal folder to a partner is the
// specific failure this whole design exists to prevent.
//
// Mirrored server-side. This copy protects the demo and catches editing
// mistakes early; it is not itself a security control.
// ---------------------------------------------------------------------------
function assertExternalScopesAreWellFormed(): void {
 const offenders = ALL_SCOPES.filter(
 (s) => s.guestEligible && !s.path.includes(EXTERNAL_SEGMENT)
 );
 if (offenders.length > 0) {
 throw new Error(
 "folder-scopes: guest-eligible scope outside an External container: " +
 offenders.map((s) => `${s.groupName} → ${s.path}`).join("; ")
 );
 }
 const containers = ALL_SCOPES.filter(
 (s) => s.guestEligible && s.path.endsWith("/External")
 );
 if (containers.length > 0) {
 throw new Error(
 "folder-scopes: External container marked guest-eligible; grant at the " +
 "partner leaf instead: " +
 containers.map((s) => s.path).join("; ")
 );
 }
 const nonExternalGuest = ALL_SCOPES.filter(
 (s) => s.guestEligible && s.level !== "external"
 );
 if (nonExternalGuest.length > 0) {
 throw new Error(
 "folder-scopes: guest-eligible scope not at level 'external': " +
 nonExternalGuest.map((s) => `${s.groupName} (${s.level})`).join("; ")
 );
 }
 const ids = ALL_SCOPES.map((s) => s.groupId);
 if (new Set(ids).size !== ids.length) {
 throw new Error("folder-scopes: duplicate groupId in registry");
 }
 const paths = ALL_SCOPES.map((s) => s.path);
 if (new Set(paths).size !== paths.length) {
 throw new Error("folder-scopes: duplicate path in registry");
 }
}
assertExternalScopesAreWellFormed();