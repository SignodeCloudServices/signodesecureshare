# Signode SecureShare Portal

Internet-facing file-exchange portal for sharing files with third parties (vendors,
customers, partners). Currently a demo SPA with mock data; the live API integration is
the next phase.

Owner: Grant Nonnemacher, Sr. Systems Engineer. Project knowledge base is Notion
("Signode SecureShare Portal — Architecture, Design & Deployment Overview").

Repository: `SignodeCloudServices/signodesecureshare` (transferred from the personal
account `grantnonnemacher` on 1 Oct 2026 — GitHub redirects the old URL, so a stale
remote keeps working and hides the change). **Public.**

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

---

## Do not do these

- **Do not use Entra External ID / CIAM.** Earlier drafts specified it. It is wrong:
  External ID identities live in a separate tenant and **cannot** be granted permissions
  on SharePoint Online in the corporate tenant. Any doc or code referencing it is stale.
- **Do not create per-region SharePoint sites.** Superseded — see decision 2.
- **Do not rely on client-side scope checks for security.** `isPathInScope` in
  `src/lib/personas.ts` is a UI affordance only. Real enforcement is server-side.
- **Do not use app-only Graph auth for user-facing reads/writes.** See below.
- **Do not commit secrets, tenant IDs, or client IDs.** The repo is public.
- **Do not reintroduce a 7-day file retention value.** 7 days is the *invitation link*
  default only.

---

## Security model for the API phase

Use **on-behalf-of (delegated) Graph calls**, not app-only:

```
SPA (MSAL.js, auth code + PKCE, no secrets)
  → Functions API (validates token, OBO exchange)
    → Microsoft Graph, acting as the signed-in user
      → SharePoint enforces ACLs natively
```

This makes SharePoint the enforcement point: the API cannot return a listing the caller
isn't entitled to. App-only (managed identity, constrained by `Sites.Selected`) is
reserved for operations that genuinely require it — guest invitation, folder
provisioning.

`scopedPaths` on a persona maps to Entra security group membership. The SPA may read
group/role claims to decide **what nav to render**. Never to decide **what data to
return**.

### Resolve group membership with getMemberGroups, not the `groups` claim

**Decision, 29 Sep 2026 — do not implement claim-reading.** The API resolves a
caller's group membership by calling Graph `getMemberGroups` once per session and
caching for the session. It must not read the `groups` token claim, even though the
claim is configurable and would work at current membership counts (measured: 4 for a
guest, 30 for a heavily-grouped internal user, against a cap of ~150–200).

Three reasons:

- **The cap is a cliff, not a slope.** Past it, Entra drops the list and returns
  `_claim_names` / `_claim_sources` instead. `pathsForGroups()` would resolve to an
  empty array, so the portal shows a partner nothing while SharePoint still grants
  them access — a silent divergence between what the UI renders and what is enforced.
  Nobody will be monitoring group counts against a token limit.
- **The fallback has to exist anyway.** Relying on the claim still requires handling
  `_claim_names` for correctness. Always taking that path means one code path instead
  of two, and the rarely-exercised branch is the one that breaks.
- **Transitive membership.** `getMemberGroups` resolves nesting; the claim does not,
  and SharePoint does. Region (`-m`) groups are an obvious future candidate for
  nesting department groups beneath them, and that divergence would be painful to
  diagnose.

If a `groups` claim is configured for diagnostics, prefer "Groups assigned to the
application" over "Security groups" — it cannot overflow.

### Deployment identity (CI/CD)

GitHub Actions authenticates to Azure with **OIDC federated credentials**, never a
stored secret — the repository is public and a client secret there would be a serious
exposure.

- Deploy app registration: `cs-secure-share-github-deploy`,
  client ID `94f1ea9a-b6cb-4236-9c02-c333a3e549d0`. **No client secret.**
- This is deliberately *not* the API app registration. An earlier draft reused
  `cs-secure-share-dev-api`, which would have given the deployment credential the
  API's Graph permissions including `Sites.Selected` on the live SharePoint site.
- Two federated credentials, scoped by GitHub **environment** (`dev`, `prod`), not by
  branch. Combined with environment approval gates, a workflow cannot obtain an Azure
  token at all until a human approves.
- RBAC is scoped to the resource group, never the subscription.

Workflows must declare `permissions: id-token: write`, or `azure/login` fails with an
error that does not point at the cause.

Invitation tokens must be server-issued, CSPRNG, single-use, and revocable. The current
`Math.random()` token in `SendInvitationDialog.tsx` is demo-only and goes away entirely
when Entra owns invitations.

---

## Known gaps — safe to fix, ask before expanding scope

Current state is a demo with no live APIs. These are known and tracked:

**Deploy blockers**
- No `staticwebapp.config.json`. Required: `navigationFallback` to `/index.html` with
  `/assets/*` excluded, or Azure Static Web Apps 404s on every direct route hit and page
  refresh.
- No `.github/workflows/`, despite `DeploymentPage.tsx` describing a GitHub Actions +
  OIDC federated identity pipeline in detail.

**Security / correctness**
- Admin routes are not guarded. `SignodeHeader` filters nav by `adminOnly`, but `App.tsx`
  registers all routes unconditionally — a vendor persona can reach `/runbooks`,
  `/controls`, `/security` by typing the URL.
- `RecentPage` is not persona-filtered despite copy saying "across your scope."
- `SignInGate` is cosmetic; pages render fully behind the modal.
- All six admin doc pages ship in the single bundle to every visitor. Internal runbooks
  arguably should not live in an internet-facing vendor portal at all — consider an env
  flag for production.
- `BrowsePage` deep links are broken: `?path=` is read into initial state, then the
  `[persona.id]` effect overwrites it on mount.
- `UploadPage`: `allowedFolders` rebuilt every render and used as an effect dependency;
  `destination` not revalidated on persona change.

**Hygiene**
- `npm run lint` fails — script calls `eslint .` but eslint is not a dependency and there
  is no config.
- `*.tsbuildinfo` files are committed; belong in `.gitignore`.
- `@tanstack/react-query` is declared but no `QueryClientProvider` exists. Keep it — it's
  the right choice for the API layer. Wire it when wiring the APIs.
- `README.md` is UTF-16LE and contains only the repo name.
- Both `bun.lock` and npm usage exist. Pick one; make CI match. CI must use `npm ci`
  (lockfile-exact) rather than `npm install`.
- Bicep defaults to `eastus2`; everything is deployed in `northcentralus`. Fix before
  the first automated deployment or CI will build a parallel estate in the wrong region.
- Two path vocabularies: `folderTree.ts` uses `FileRoot/01_Signode_AMER/...`;
  `RECENT_UPLOADS` in `RecentPage.tsx` uses `Home/AMER/Sales/...`. Unify on tree paths.
- No tests, no error boundary.

**Stale documentation inside the app** — `ArchitecturePage.tsx`, `DeploymentPage.tsx`,
and `RunbooksPage.tsx` still reference Entra External ID / CIAM in places. These are
wrong per decision 3 and should be corrected as encountered.

**Not in the repo at all:** `provision-secureshare-sites.ps1` and
`apply-sensitivity-labels.ps1` exist only in a Google Doc. They still create five sites
and apply a `SecureShare-7Day` label. Both need correcting to single-site +
`Extranet-AutoCleanup-90d`, and committing so the label name is version-controlled.

---

## Conventions

- Keep the demo working. Put mock-vs-live behind `VITE_DEMO_MODE` so the persona switcher
  and seeded data survive for leadership demos while the live path is built.
- Verify with `npm run build` after changes — it runs `tsc -b` first, so type errors fail
  the build.
- Prefer `useMemo` for derived collections used as effect dependencies.
- Avoid `any`. `Persona` and `FolderNode` types are exported; use them.
- Signode house style: charcoal `#231F20`, shield red / burnt orange `#B43D27`, white.
- Contact address used throughout the UI: `itservicecenter@signode.com`.

---

## Where things live

- Persona and scope model: `src/lib/personas.ts`, `src/lib/persona-context.tsx`
- Folder tree (currently static; becomes Graph-backed): `src/lib/folderTree.ts`
- Retention and invitation constants: `src/lib/retention.ts`
- Signode-specific components: `src/components/signode/`
- `src/components/ui/` is shadcn/ui — generated primitives, avoid editing directly
