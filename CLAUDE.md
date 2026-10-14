# Signode SecureShare Portal

Internet-facing file-exchange portal for sharing files with third parties (vendors,
customers, partners). **Live** at `secureshare.signode.com` with real Entra sign-in,
real group-driven scoping, and real SharePoint content via Microsoft Graph.

Owner: Grant Nonnemacher, Sr. Systems Engineer. Project knowledge base is Notion
("Signode SecureShare Portal — Architecture, Design & Deployment Overview"); the build
is tracked in runbooks RB-00 to RB-30 and DEMO-01.

Repository: `SignodeCloudServices/signodesecureshare`. **Public.**

**`main` is deployed.** `deploy-dev.yml` triggers on push to `main` and publishes to the
Static Web App. Work merged only into a feature branch is invisible on the live site —
this has already caused a day of the portal serving a stale build while finished work
sat on `feat/msal-auth`.

**Production is gated (added 13 Oct 2026).** `main` deploys to **dev** only. Production
deploys only through `deploy-prod.yml` — see *Release process* below. First gated
production release: 13 Oct 2026, `main` @ `5622aff` (manual run). Since then the live
portal signs in through `cs-secure-share-prod-spa`.

| | Static Web App | Tier | URL | SPA registration |
|---|---|---|---|---|
| dev | `secureshare-dev-swa` | Free | `calm-smoke-01ee89410.2.azurestaticapps.net` | `cs-secure-share-dev-spa` `212f8c25-…` |
| prod | `secureshare-swa` | Standard | `secureshare.signode.com` (via Front Door) | `cs-secure-share-prod-spa` `d25ef5a7-…` |

Both SWAs use deployment source **Other**: GitHub is not linked from the Azure side, so
Azure never commits its own workflow or repo-wide token. The SPA client ID is chosen at
build time (`VITE_SPA_CLIENT_ID`, see `auth-config.ts`).

**`secureshare.signode.com` is the only public hostname** (decided 14 Oct 2026, D8). The
earlier `secureshare.pkgconnect.com` was retired outright, with no redirect: `pkgconnect.com`
is the internal AD domain and is not advertised to partners. Do not reintroduce it in copy,
config, redirect URIs or DNS. The UI shows `window.location.origin` rather than a hard-coded
hostname for the same reason.

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
- **Do not grant app-only Graph permissions to the SPA registrations.** They are inert on
  a public client and declare tenant-wide reach. Every Graph permission on
  `cs-secure-share-dev-spa` and `cs-secure-share-prod-spa` must be **Delegated**, and must
  match `GRAPH_SCOPES` in `auth-config.ts` exactly: `User.Read`, `User.ReadBasic.All`,
  `GroupMember.Read.All`, `Sites.Read.All`, `Files.ReadWrite.All`, all admin-consented.
  This was got wrong once; check the Type column after any permission change.
- **Do not put `GroupMember.ReadWrite.All` back on an SPA registration.** Removed 13 Oct
  2026. The SPA only reads memberships; membership writes belong to the Functions API.
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

**Built in `api/` (WS3, from 14 Oct 2026)** — TypeScript on Node 22, Functions v4, bundled
with esbuild so it imports `src/lib/retention.ts` and `src/lib/folder-scopes.ts` directly
(one source for limits and eligible scopes). See `api/README.md`.
- **No on-behalf-of for invitations.** The API validates the user's token (who is asking),
  then calls Graph as the Function App's **managed identity**. OBO is needed only when file
  traffic moves behind the API.
- **Runs on its own Function App, `secureshare-api`** (Flex, Node 22), created 14 Oct 2026.
  Two identities, two narrow grants: the `secureshare-api` identity holds the directory
  grants (invite guests, manage the guest groups) and **no SharePoint access**; the
  `SecureSharePortal` identity `cc0b2c45-…` keeps `Sites.Selected` for the later file API and
  holds **no directory write**. Do not merge them. `SecureSharePortal` itself is .NET 10 with
  leftover AI-template settings and no functions; nothing deploys to it.
- **The SPA requests one non-Graph scope:** `api://<api client id>/Invitations.ReadWrite`.
  This is the only exception to "SPA permissions match `GRAPH_SCOPES`"; it is not a Graph
  permission and grants no directory access.
- **The administrative unit for Groups Administrator holds only guest-eligible (External)
  groups.** Putting the 40 internal region/department groups in it would let the API add a
  guest to them.
- The server-side checks are unit-tested (`api/test`, run in CI's `build` job). A failing
  test there is a security regression, not a flaky test.
- Guest objects are not deleted by the expiry sweep (needs a broader role); membership is
  removed and quarterly access reviews clean up guests.

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
- ~~Admin documentation pages shipped in the public bundle~~ — **fixed 13 Oct 2026
  (WS1.3).** `BuildGuidePage`, `ArchitecturePage`, `SecurityPage`, `ControlsPage`,
  `DeploymentPage` and `RunbooksPage` are lazy-loaded only when the build sets
  `VITE_INCLUDE_ADMIN_DOCS=true` (`src/lib/admin-docs.ts`). No deployed build sets it, so
  they are not emitted into `dist/` at all; `deploy-prod.yml` greps the bundle to prove it.
  To read them locally: `VITE_INCLUDE_ADMIN_DOCS=true npm run dev`. **Never set the flag
  in a workflow** — dev is a public URL too. The import sites compare `import.meta.env`
  inline on purpose: that literal is what lets the bundler drop the branch.
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
- `react-router-dom` 6.x carries a **moderate** advisory (open redirect via backslash
  in `<Link>` / `useNavigate`). The fix is the v7 major upgrade. CI blocks only on high,
  so this does not fail the build; schedule the upgrade rather than forget it.
- `@tanstack/react-query` is declared but no `QueryClientProvider` exists. Keep it — it
  is the right choice for caching Graph calls. Wire it when the data layer grows.
- `README.md` is UTF-16LE and contains only the repo name.
- No tests for the SPA. The API (`api/`) has unit tests for its checks and token validation.

**Infrastructure**
- **There is no IaC in this repository.** `main.bicep` and `network.bicep` exist only in
  a Google Doc and describe an estate that does not match reality — wrong VNet, no App
  Insights, EP1 instead of the deployed FC1 Flex Consumption, `Standard_ZRS` instead of
  `Standard_LRS`. Do not commit them unchanged; `deploy-dev.yml` deliberately has no
  infrastructure steps.
- `provision-secureshare-sites.ps1` and `apply-sensitivity-labels.ps1` also exist only in
  that Google Doc, still creating five sites and applying a `SecureShare-7Day` label.
- Front Door (`secureshare-frontdoor`, Premium, `secureshare-dev-rg`, Front Door ID
  `77d8904a-4a36-4e33-87da-b9001fa3decb`) already routes `/*` from endpoint
  `SecureSharePortal-hydpg2b4gwegg6cn.a01.azurefd.net` to `secureshare-swa`, with WAF policy
  `securesharewafpolicy` (Detection, DRS 2.1, Bot Manager 1.1) and access + WAF logs going to
  the central `naissc` workspace by Azure Policy. Custom domain `secureshare.signode.com`
  (AFD managed certificate) is bound to `default-route` and covered by the WAF security
  policy. Origin probe HTTPS, forwarding HTTPS only. The orphaned `SecureShare` WAF policy
  was deleted 14 Oct 2026.
- Private endpoints exist but are unused: no VNet integration on the Function App, and
  public network access is enabled on Storage and Key Vault (RB-07/RB-08, reopened).

---

## Conventions

- Run `npm run lint` and `npm run build` after changes. Lint is ESLint 9
  (`eslint.config.js`) and runs in CI; errors fail the PR, warnings do not.
- `tailwindcss` and `tailwindcss-animate` are **devDependencies** on purpose: they run at
  build time only. Keeping build tools out of `dependencies` is what makes
  `npm audit --omit=dev` measure what actually ships to the browser.
- Verify with `npm run build` after changes — it runs `tsc -b` first, so type errors fail
  the build. Expect roughly 680 kB (since WS1.3).
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

## Static Web App config and the Front Door origin lock

`public/staticwebapp.config.json` (security headers, SPA fallback) is copied into `dist/` by
Vite; both workflows upload `dist/` only. **It must stay in `public/`.** Until 14 Oct 2026 it
sat at the repo root and was never deployed — the 13 Oct prod release shipped without the
security headers. CI and `deploy-prod.yml` now fail if it is missing from `dist/`.

The origin lock is **not** in the committed file. `deploy-prod.yml` injects it when the `prod`
environment variable `AFD_FDID` is set. Dev (Free tier, not behind Front Door) never gets it.
**Live since 14 Oct 2026 (Deploy - prod #7, `82a2164`).** Two layers, both needed:

1. `networking.allowedIpRanges: ["AzureFrontDoor.Backend"]` — only Front Door egress IPs reach
   the origin. Without it the header check is bypassable: the Front Door ID is public (it is in
   this file) and anyone can send `X-Azure-FDID` straight to `*.azurestaticapps.net`.
2. `forwardingGateway.requiredHeaders["X-Azure-FDID"]` — of those, only Signode's profile.
   `allowedForwardedHosts` is set to the host of `PROD_URL`, but in testing a mismatch did not
   block; the header is the control.

Guards in the lock step, each from a real failure:
- `AFD_FDID` is trimmed and must be a lowercase GUID.
- **`PROD_URL` must already be served by Front Door** (response carries `x-azure-ref`), or the
  run fails before deploying. On 14 Oct the `secureshare` CNAME pointed at the SWA hostname, not
  the Front Door endpoint, so real traffic bypassed Front Door *and the WAF*, and turning the lock
  on returned 403 to every visitor.
- If the smoke test fails with the lock on, the run probes the origin with hand-built headers
  ("Diagnose origin lock"), then **redeploys the same build unlocked** and fails. With the IP
  layer on, those probes all return 403 from the runner; they confirm the lock is active but no
  longer isolate the header check.
- With `PROD_ORIGIN_URL` set, the deploy asserts the SWA's own hostname returns 403.

**DNS and custom domains.** `secureshare.signode.com` is a CNAME to the Front Door endpoint
(`SecureSharePortal-hydpg2b4gwegg6cn.a01.azurefd.net`) in the public Azure DNS zone
`signode.com`, and is bound **only** on Front Door. Do not add it as a custom domain on
`secureshare-swa`: SWA custom-domain validation wants the CNAME pointed at the SWA, which is how
the record got flipped on 14 Oct. Verify from outside the network:
`curl -sI https://secureshare.signode.com | grep -i x-azure-ref` must print a line.

## Release process

| Workflow | Trigger | Target | Gate |
|---|---|---|---|
| `ci.yml` | Pull request to `main` | — | lint, runtime `npm audit` (high+), build |
| `deploy-dev.yml` | Push to `main` | `secureshare-dev-swa` | none |
| `deploy-api.yml` | Tag `v*`, or manual run | Function App `secureshare-api` (Flex, Node 22) | commit on `main`; audit, typecheck, unit tests, bundle; **`prod` environment approval**; OIDC via the `prod` federated credential |
| `deploy-prod.yml` | Tag `v*`, or manual run | `secureshare-swa` | commit must be on `main`; lint, audit, build, bundle-disclosure check, prod client ID check; **`prod` environment approval** |

To release: merge to `main` through a PR, confirm dev, then `git tag v1.0.0 && git push
origin v1.0.0` (or run *Deploy - prod* from the Actions tab), and approve the `prod`
deployment when it pauses.

**The bundle-disclosure step** greps `dist/` for markers of the internal documentation
pages (break-glass, Sentinel, NIST, Purview, Entra PIM) and fails the production deploy
if any appear. It passes since WS1.3. If it ever fails, something re-imported a doc page
statically or set `VITE_INCLUDE_ADMIN_DOCS` — fix the build, not the pattern.

### One-time setup that lives in repository settings, not in code

These cannot be set from a workflow file. Status as of 13 Oct 2026:

- [x] **Ruleset `MainBranch`** targets the default branch (`main`): PR required
      (0 approvals while Grant is the only engineer; raise to 1 when a second joins),
      `build` check required, no deletion, no force-push.
- [x] Environments `dev` and `prod` created.
- [x] **`prod` required reviewers**: Grant (add a second reviewer when one exists), 10-minute
      wait timer.
- [x] **`prod` deployment branches and tags**: branch `main`, tag `v*`.
- [x] **`prod` admin bypass** off: the approval gate applies to admins too.
- [x] **`dev` secret** `SWA_DEPLOYMENT_TOKEN_DEV` → token of `secureshare-dev-swa` (reset
      13 Oct after briefly being stored as a plain variable).
- [x] **`prod` secret** `SWA_DEPLOYMENT_TOKEN_PROD` → token of `secureshare-swa`.
- [x] **Environment variables** on `prod`: `PROD_URL` = `https://secureshare.signode.com`,
      `PROD_ORIGIN_URL` = `https://calm-pebble-011c41510.6.azurestaticapps.net`,
      `AFD_FDID` = `77d8904a-4a36-4e33-87da-b9001fa3decb` (origin lock on).

- [ ] **Federated credential** for the `prod` environment on `cs-secure-share-github-deploy`
      (subject `repo:SignodeCloudServices/signodesecureshare:environment:prod`), needed
      only when infrastructure steps are added.
- [ ] **Repository visibility → private.** Check the org's GitHub plan first: on GitHub
      Free, branch protection and environment required reviewers are not available on
      private repositories, so going private would silently remove the gates above.

### Redirect URIs (platform **Single-page application**, exact origin, no trailing slash)

| Registration | URIs | Notes |
|---|---|---|
| `cs-secure-share-dev-spa` | `https://calm-smoke-01ee89410.2.azurestaticapps.net`, `http://localhost:5173` | Live URL removed 13 Oct after the first prod release |
| `cs-secure-share-prod-spa` | `https://secureshare.signode.com` | The only prod URI. Never add localhost or the `azurefd.net` endpoint hostname |

A URI under the **Web** platform fails with `AADSTS9002326`; a missing one with `AADSTS50011`.
`cs-secure-share-prod-spa` has *Assignment required* on, with the 42 folder groups and
`sg-SecureShare-Admins` assigned — a new partner group must be assigned there too.

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
