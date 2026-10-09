# Signode SecureShare Portal

Internet-facing file-exchange portal for sharing files with third parties (vendors,
customers, partners). **Live** at `secureshare.pkgconnect.com` with real Entra sign-in,
real group-driven scoping, and real SharePoint content via Microsoft Graph.

Owner: Grant Nonnemacher, Sr. Systems Engineer. Project knowledge base is Notion
("Signode SecureShare Portal — Architecture, Design & Deployment Overview"); the build
is tracked in runbooks RB-00 to RB-30 and DEMO-01.

Repository: `SignodeCloudServices/signodesecureshare`. **Public.**

**`main` is deployed.** `deploy-dev.yml` triggers on push to `main` and publishes to the
Static Web App. Work merged only into a feature branch is invisible on the live site —
this has already caused a day of the portal serving a stale build while finished work
sat on `feat/msal-auth`.

---

## Ratified decisions — do not contradict these

Approved by the project sponsor, August 2026. If a task appears to require changing one
of these, stop and ask rather than implementing around it.

1. **Option A architecture: SharePoint Online is the backing store.** The portal is a
   branded front end over a SharePoint document library. SharePoint is the system of
   record and the authoritative permission enforcement point. External users never see a
   SharePoint URL or surface. This is what keeps Purview DLP, sensitivity labels,
   retention, Unified Audit Log, and eDiscovery working natively under existing M365 E5
   licensing.

2. **Single SharePoint site.** One site backs the entire portal. The five regional
   groupings (`01_Signode_AMER`, `02_Signode_EMEA`, `03_Signode_APAC`, `04_Signode_APT`,
   `05_Signode_CORP`) are **folders within that one site's library**, not separate sites.
   Isolation is achieved by breaking inheritance at the folder level and granting one
   Entra security group per shared folder. One `Sites.Selected` grant, one permission
   surface to review quarterly.

3. **Identity: Entra B2B guests in the Signode corporate tenant.** External users are
   invited as B2B guests. Existing guest-scoped Conditional Access (MFA required, legacy
   auth blocked) applies automatically.

4. **Retention: two independent clocks.** File retention is 90 days via the Purview
   retention label `Extranet-AutoCleanup-90d`. Invitation link expiry is separate and
   deliberately shorter — 7 days default, 30 maximum. Both live in `src/lib/retention.ts`.
   Never introduce a hardcoded expiry value elsewhere; import from that module.

5. **The correct document library is `SecureSharePortal`, not `Documents`.** The site has
   two. `Documents` is the site default and is empty; using its drive ID produces an empty
   listing and a 404 on every path. The right IDs are in `src/lib/auth-config.ts`.

---

## Do not do these

- **Do not use Entra External ID / CIAM.** Earlier drafts specified it. It is wrong:
  External ID identities live in a separate tenant and **cannot** be granted permissions
  on SharePoint Online in the corporate tenant. Any doc or code referencing it is stale.
- **Do not create per-region SharePoint sites.** Superseded — see decision 2.
- **Do not rely on client-side scope checks for security.** `isPathInScope` and
  `scopedPaths` decide what the UI *renders*. Graph and SharePoint decide what the user
  can actually read, independently.
- **Do not grant app-only Graph permissions to the SPA registration.** They are inert on
  a public client and declare tenant-wide reach. All four Graph permissions on
  `cs-secure-share-dev-spa` must be **Delegated**. This was got wrong once; check the
  Type column after any permission change.
- **Do not commit secrets or client secrets.** The repo is public. Tenant, client, site
  and drive IDs are public identifiers and are committed deliberately — they are not
  credentials.
- **Do not reintroduce a 7-day file retention value.** 7 days is the *invitation link*
  default only.
- **Do not render mock data in live mode.** Anything behind `VITE_DEMO_MODE` is seeded.
  Rendering it against the live portal states things that are not true — a "DLP status:
  Clear" tile for a control that is not built, activity for files that do not exist.

---

## Security model

### Current: SPA calls Graph directly

A deliberate, temporary deviation for the 12 Oct 2026 leadership demo. See DEMO-01.

```
SPA (MSAL.js, auth code + PKCE, no secrets)
  → Microsoft Graph, acting as the signed-in user
    → SharePoint enforces ACLs natively
```

**The enforcement model is the same as the target.** Tokens are delegated, so Graph
returns only what the signed-in user's SharePoint ACLs permit. What this path cannot do
is app-only work — guest invitation and folder provisioning.

### Target: Functions API with on-behalf-of

```
SPA → Functions API (validates token, OBO exchange) → Graph → SharePoint
```

Migrating back does not touch `folder-scopes.ts`, the UI, or the scope logic — only the
transport moves. Note OBO requires the API to authenticate itself; `cs-secure-share-dev-api`
deliberately has no secret, so this needs a federated identity credential trusting the
Function App's managed identity.

App-only (managed identity `cc0b2c45-4958-4648-814d-4a39c4c8454e`, constrained by
`Sites.Selected` on the one site) is reserved for operations that genuinely require it.

### Resolve group membership with getMemberGroups, not the `groups` claim

**Decision, 29 Sep 2026 — do not implement claim-reading.** `src/lib/graph.ts` calls
`getMemberGroups` once per session. It must not read the `groups` token claim.

A live measurement on 6 Oct returned **105 transitive groups** for one ordinary internal
user, against a cap of roughly 150–200.

- **The cap is a cliff, not a slope.** Past it, Entra drops the list and returns
  `_claim_names` / `_claim_sources` instead. `pathsForGroups()` would resolve to an empty
  array, so the portal shows a partner nothing while SharePoint still grants them access
  — a silent divergence between what renders and what is enforced.
- **The fallback has to exist anyway**, so always taking it means one code path instead
  of two, and the rarely-exercised branch is the one that breaks.
- **Transitive membership.** `getMemberGroups` resolves nesting; the claim does not, and
  SharePoint does.

### Two gates on access, and they must stay in step

1. **SharePoint ACLs** — folder-level, one Entra group per folder (RB-14, RB-15).
2. **Enterprise application assignment** — `cs-secure-share-dev-spa` has *user assignment
   required* enabled. A user whose group is not assigned to the enterprise application
   **cannot sign in at all** (`AADSTS50105`), raised before any scope logic runs.

Creating a new partner group means doing both. Skipping the second produces an error that
reads like a permissions problem.

### Deployment identity (CI/CD)

GitHub Actions authenticates to Azure with **OIDC federated credentials**, never a stored
secret — the repository is public.

- Deploy app registration: `cs-secure-share-github-deploy`,
  client ID `94f1ea9a-b6cb-4236-9c02-c333a3e549d0`. **No client secret.**
- Deliberately *not* the API app registration. An earlier draft reused
  `cs-secure-share-dev-api`, which would have given the deployment credential the API's
  Graph permissions including `Sites.Selected` on the live SharePoint site.
- Two federated credentials, scoped by GitHub **environment** (`dev`, `prod`), not branch.
- RBAC scoped to the resource group, never the subscription.

Workflows must declare `permissions: id-token: write`, or `azure/login` fails with an
error that does not point at the cause. Secrets must exist at the level the job reads
from — a missing secret resolves to an empty string with no warning.

### Invitations: Entra issues them, the portal never does

**`SendInvitationDialog.tsx` renders nothing in live mode** (gated 9 Oct 2026, inside the
component so the guard travels with it). It is mock scaffolding and it was wrong in a way
that mattered: it read the persona switcher rather than the signed-in identity, drew its
folder list from seeded `folderTree.ts`, **ignored `guestEligibleScopes()` entirely** — so
it would have offered internal department folders as invitation targets, inverting the one
guard that exists to stop over-granting to a partner — and claimed mail was sent when none
was. In the production build Vite dead-code-eliminates the whole thing.

The real flow cannot live in the SPA. Creating a B2B guest and writing group membership are
app-only operations, and app-only permissions are inert on a public client, so **invitation
is the first feature with a hard architectural dependency on the Functions API**. See
RB-31 for the build sequence.

Under that design the portal issues no token at all — Entra generates and validates the
redemption link. So the standing requirement that invitation tokens be server-issued,
CSPRNG, single-use and revocable is satisfied by there being no token; keep the rule as a
guard against anyone reintroducing one. What the portal stores is an invitation *record*
(who, whom, which scope, until when) for audit and revocation — metadata, not a credential.

Copy that told users to "use the Send Invitation button" was corrected on `LiveHomePage`
and `HelpPage` at the same time. If that button is ever restored, those two need revisiting
together — they are the surfaces that describe it.

---

## Live mode vs demo mode

`DEMO_MODE` (`src/lib/auth-context.tsx`, from `VITE_DEMO_MODE`) is the switch. It is
**off** in the deployed build.

| | Live | Demo |
|---|---|---|
| Identity | Real Entra, MSAL `loginPopup` | Persona switcher |
| Scope | `getMemberGroups` → `folder-scopes.ts` | Hardcoded `scopeGroups` |
| Content | Graph against SharePoint | `folderTree.ts` (seeded) |
| Admin | `sg-secureshare-admins` membership | `global-admin` persona |

Pages branch at the top: `BrowsePage`, `UploadPage`, `HomePage`, `SignInGate`. The live
branch is a separate component (`LiveScopedBrowser`, `LiveUpload`, `LiveHomePage`); the
demo implementation stays intact beneath it.

**Keep both working.** Demo mode is the fallback if live auth misbehaves during a
presentation.

---

## Known gaps

**Security / correctness**
- `RequireAdmin` blocks navigation to the admin documentation pages, but their content is
  static and still ships in the bundle to every visitor. The real fix is not shipping
  internal runbooks inside an internet-facing portal — consider an env flag or a separate
  build.
  **This is now the largest open disclosure gap.** Scrubbing product names from the
  user-facing copy (7 Oct) does not touch the bundle: `ArchitecturePage`,
  `SecurityPage`, `ControlsPage`, `DeploymentPage` and `RunbooksPage` still name
  Purview, Sentinel, Entra PIM, the NIST control inventory with per-control
  implementation status, and the break-glass procedure. All of it is readable from
  `view-source` by any anonymous visitor, without signing in. The AUP line was one
  sentence; this is the architecture. Raise it with the security team alongside the
  AUP change.
- `BrowsePage` deep links are broken in demo mode: `?path=` is read into initial state,
  then the `[persona.id]` effect overwrites it on mount.
- No error boundary. A render error anywhere blanks the page.

**Incomplete features**
- Upload is limited to 4 MB (simple PUT). Larger files need `createUploadSession` with
  chunking.
- `RecentPage` renders a "not available yet" placeholder in live mode and the seeded
  version only under `VITE_DEMO_MODE` (gated 9 Oct 2026). It is also hidden from the nav.
  The real version needs the Unified Audit Log (RB-19 → RB-26).
  **Why both:** it had no mode branch at all, so while the nav link was removed on 6 Oct
  the route stayed registered and `/recent` served fabricated activity — invented legal
  and compliance filenames, `Math.random()` charts — to any signed-in user, a scoped
  partner included. Hiding the link concealed it; the gate fixes it. Restoring the nav
  link is still a one-line change in `SignodeHeader`, but do not restore it until there
  is real data behind it.
- `folderTree.ts` is seeded demo data whose shape no longer matches SharePoint. Only
  reachable via `VITE_DEMO_MODE`. Either refresh it from the live tree or delete it once
  demo mode is retired.
- The AUP modal states that uploads are scanned by security software and that all
  activity is logged. Neither is built (RB-18, RB-26). Known and deliberate —
  positioned as the designed end state.

**Hygiene**
- `npm run lint` fails — the script calls `eslint .` but eslint is not a dependency and
  there is no config. Either add it properly or drop the script; do not add a CI step
  that is permanently red.
- `@tanstack/react-query` is declared but no `QueryClientProvider` exists. Keep it — it
  is the right choice for caching Graph calls. Wire it when the data layer grows.
- `README.md` is UTF-16LE and contains only the repo name.
- No tests.

**Infrastructure**
- **There is no IaC in this repository.** `main.bicep` and `network.bicep` exist only in
  a Google Doc and describe an estate that does not match reality — wrong VNet, no App
  Insights, EP1 instead of the deployed FC1 Flex Consumption, `Standard_ZRS` instead of
  `Standard_LRS`. Do not commit them unchanged; `deploy-dev.yml` deliberately has no
  infrastructure steps.
- `provision-secureshare-sites.ps1` and `apply-sensitivity-labels.ps1` also exist only in
  that Google Doc, still creating five sites and applying a `SecureShare-7Day` label.
- Front Door and the WAF are deployed but **not in the traffic path** —
  `secureshare.pkgconnect.com` resolves straight to the Static Web App (RB-11 gap).
- Private endpoints exist but are unused: no VNet integration on the Function App, and
  public network access is enabled on Storage and Key Vault (RB-07/RB-08, reopened).

---

## Conventions

- Verify with `npm run build` after changes — it runs `tsc -b` first, so type errors fail
  the build. Expect roughly 850 kB.
- `npm ci`, not `npm install`. The lockfile is `package-lock.json`; bun is not used.
- Keep demo mode working behind `VITE_DEMO_MODE`.
- **A user can hold several unrelated grants.** `scopedPaths` is a list, not a path.
  Never index it — `LiveScopedBrowser` and `LiveUpload` both did (`scopedPaths[0]`), which
  silently made every scope past the first unreachable for anyone in two groups, and
  labelled the rest with their raw `FileRoot/...` path. Collapse nested grants with
  `rootScopePaths()` and label with `scopeLabel()`, both in `folder-scopes.ts`. Unrelated
  grants are not one tree and have no ancestor the user may see, so they cannot be
  browsed as one: `LiveScopedBrowser` shows a Department picker when there is more than
  one root, and nothing at all when there is one. `LiveHomePage`'s "Folders in scope"
  tile counts `rootScopePaths(scopedPaths)` for the same reason — counting the raw list
  reported two folders to a region-plus-department user while the picker offered one.
- Prefer `useMemo` for derived collections used as effect dependencies.
- Avoid `any`. `Persona`, `FolderScope` and `DriveItem` are exported; use them.
- Signode house style: charcoal `#231F20`, shield red / burnt orange `#B43D27`, white.
- **No support mailbox is advertised in the UI.** Use the wording "your internal
  Signode Support Contact". `itservicecenter@signode.com` was removed on 7 Oct 2026:
  inbound mail security blocks most external senders to it, so publishing it to
  partners produced a dead end. Do not reintroduce it or any other address until the
  dedicated SecureShare inbox exists; then update it in one place per surface.
- **Do not name internal security products in user-facing copy.** Flagged by the
  security team on 7 Oct 2026. Describe the control, not the vendor — "scanned by
  security software", not "Purview DLP". This applies to the AUP, `HelpPage`, and the
  upload surfaces. The admin documentation pages still name the real stack, which is
  correct for internal docs but see the bundle caveat under Known gaps.
- Comments should explain *why*, especially where a decision looks arbitrary — which
  library, which threshold, which of two similar-sounding permissions.

---

## Where things live

- MSAL config, tenant / site / drive IDs: `src/lib/auth-config.ts`
- Graph calls: `src/lib/graph.ts`
- Identity → group membership → scope: `src/lib/auth-context.tsx`
- Entra group → folder path registry (42 scopes, runtime-validated): `src/lib/folder-scopes.ts`
- Retention and invitation constants: `src/lib/retention.ts`
- Demo personas: `src/lib/personas.ts`, `src/lib/persona-context.tsx`
- Seeded folder tree (demo mode only): `src/lib/folderTree.ts`
- Live pages: `src/pages/LiveScopedBrowser.tsx`, `src/pages/LiveUpload.tsx`
- Admin route guard: `src/components/signode/RequireAdmin.tsx`
- Signode-specific components: `src/components/signode/`
- `src/components/ui/` is shadcn/ui — generated primitives, avoid editing directly
