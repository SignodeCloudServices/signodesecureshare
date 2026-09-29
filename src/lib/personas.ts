// ---------------------------------------------------------------------------
// Demo personas
//
// These are DEMO FIXTURES for the persona switcher. They exist so the portal
// can be shown without live authentication.
//
// In production this file does not decide anything. A real user signs in via
// MSAL, their Entra group memberships arrive in the token, and those group
// IDs are resolved against the registry in ./folder-scopes. The personas
// below simply hard-code a membership list to simulate that.
//
// Source of truth for group -> folder mapping: ./folder-scopes.ts
// Authoritative copy: Notion -> RB-00 Outputs Register.
//
// IMPORTANT: nothing in this file is a security control. isPathInScope()
// decides what the browser *renders*. Real enforcement is SharePoint ACLs,
// reached through the API's on-behalf-of Graph calls. See CLAUDE.md.
// ---------------------------------------------------------------------------
import {
 pathsForGroups,
 scopeByGroupId,
 guestEligibleScopes,
 type FolderScope,
} from "./folder-scopes";
export type PersonaId =
 | "global-admin"
 | "amer-sales"
 | "corp-legal"
 | "vendor-a"
 | "vendor-b"
 | "project-phoenix";
export type Persona = {
 id: PersonaId;
 displayName: string;
 role: string;
 organization: string;
 isInternal: boolean;
 /**
 * Entra security group object IDs this persona belongs to.
 * The production equivalent is the `groups` claim on the access token.
 */
 scopeGroups: string[];
 /**
 * Administrator. Comes from an Entra app role, never from a group in the
 * folder-scopes registry - an admin is not "a member of every folder".
 */
 isAdmin: boolean;
 /**
 * Portal paths this persona can see. DERIVED from scopeGroups at module
 * load; do not hand-edit. "*" means everything (admin only).
 */
 scopedPaths: string[];
 description: string;
};
type PersonaSpec = Omit<Persona, "scopedPaths">;
const PERSONA_SPECS: PersonaSpec[] = [
 {
 id: "global-admin",
 displayName: "Global Admin",
 role: "Portal Administrator",
 organization: "Signode IT",
 isInternal: true,
 scopeGroups: [],
 isAdmin: true,
 description:
 "Full access to every region, department, and BU folder. Can send invitations and manage users.",
 },
 {
 id: "amer-sales",
 displayName: "AMER Sales",
 role: "Regional Sales Lead",
 organization: "Signode AMER",
 isInternal: true,
 // SG-SecureShare-AMER-Sales -> 01_Signode_AMER/Sales_and_Marketing
 scopeGroups: ["c7ffb4c9-c785-4dd6-8cd5-341156975cb8"],
 isAdmin: false,
 description:
 "Scoped to AMER Sales & Marketing. Can send invitations to vendors within scope.",
 },
 {
 id: "corp-legal",
 displayName: "CORP Legal",
 role: "Corporate Counsel",
 organization: "Signode CORP",
 isInternal: true,
 scopeGroups: [
 "c179e7e4-a1ae-4416-b59e-722e2d7ad5c1", // SG-SecureShare-CORP-Legal
 "ae322f0e-84a6-43ae-ae03-f16ee441f3f5", // SG-SecureShare-EMEA-Legal
 ],
 isAdmin: false,
 description:
 "Scoped to CORP Legal and EMEA Legal. Can send invitations for NDA and contract exchanges.",
 },
 {
 id: "vendor-a",
 displayName: "Vendor A",
 role: "External Vendor",
 organization: "Acme Packaging Co.",
 isInternal: false,
 // SG-SecureShare-EXT-POC_Partner_A
 scopeGroups: ["48ef08e1-465b-4921-a2c7-dbe74f1a60ae"],
 isAdmin: false,
 description:
 "External vendor with access to a single partner exchange folder under AMER Sales & Marketing. Cannot send invitations.",
 },
 {
 id: "vendor-b",
 displayName: "Vendor B",
 role: "External Vendor",
 organization: "Bravo Logistics Ltd.",
 isInternal: false,
 // SG-SecureShare-EXT-POC_Partner_B
 scopeGroups: ["f8cc2714-b196-4ad2-b256-6ce93eb8b0d5"],
 isAdmin: false,
 description:
 "External vendor with a separate partner exchange folder under AMER Sales & Marketing. Cannot see Vendor A's folder. Cannot send invitations.",
 },
 {
 id: "project-phoenix",
 displayName: "Project Phoenix",
 role: "External Project Team",
 organization: "Phoenix Consulting Group",
 isInternal: false,
 // No scope group provisioned yet. Deliberately left empty: this persona
 // demonstrates the access-denied path, which is worth being able to show.
 // Give it a group once a CORP partner exchange folder exists.
 scopeGroups: [],
 isAdmin: false,
 description:
 "External project team with no folder scope provisioned yet. Demonstrates the access-denied path. Cannot send invitations.",
 },
];
export const PERSONAS: Persona[] = PERSONA_SPECS.map((spec) => ({
 ...spec,
 scopedPaths: pathsForGroups(spec.scopeGroups, { isAdmin: spec.isAdmin }),
}));
export function getPersonaById(id: PersonaId): Persona {
 const p = PERSONAS.find((x) => x.id === id);
 if (!p) throw new Error(`Unknown persona: ${id}`);
 return p;
}
/**
 * Whether a persona can see a path.
 *
 * The `+ "/"` guard matters: without it "Sales_and_Marketing" would also
 * match "Sales_and_Marketing_Archive".
 */
export function isPathInScope(persona: Persona, path: string): boolean {
 if (persona.scopedPaths.includes("*")) return true;
 return persona.scopedPaths.some(
 (allowed) => path === allowed || path.startsWith(allowed + "/")
 );
}
export function canSendInvitations(persona: Persona): boolean {
 return persona.isInternal;
}
/** Resolved FolderScope objects for a persona. Empty for admins (scope is "*"). */
export function scopesFor(persona: Persona): FolderScope[] {
 return persona.scopeGroups
 .map((id) => scopeByGroupId(id))
 .filter((s): s is FolderScope => s !== undefined);
}
/**
 * Folders this persona may invite a guest into.
 *
 * Deliberately narrower than isPathInScope(). An internal user can see their
 * whole department, but a guest may only ever be granted a partner exchange
 * folder beneath /External/. Without this distinction the invitation dialog
 * would happily offer to grant a vendor an internal department folder.
 *
 * Mirrored server-side. This copy is UX only.
 */
export function invitableScopes(persona: Persona): FolderScope[] {
 if (!canSendInvitations(persona)) return [];
 const eligible = guestEligibleScopes();
 if (persona.scopedPaths.includes("*")) return eligible;
 return eligible.filter((s) =>
 persona.scopedPaths.some(
 (allowed) => s.path === allowed || s.path.startsWith(allowed + "/")
 )
 );
}