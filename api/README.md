# SecureShare invitation API

Azure Functions (Node 22, TypeScript, Flex Consumption). Runbook WS3 / RB-31.
A sponsor invites a partner to one guest-eligible folder; Entra issues and
validates the invitation; access ends on schedule.

## Endpoints

| Method | Route | Who | Does |
|---|---|---|---|
| GET | `/api/health` | Front Door probe | Liveness only |
| GET | `/api/invitations/scopes` | Signed-in user | Guest-eligible scopes the caller may invite into |
| POST | `/api/invitations` | Scope owner (sponsor) or `sg-secureshare-admins` | Validate → invite → add to folder group → record |
| GET | `/api/invitations` | Sponsor (own scopes) / admins (all) | List records |
| DELETE | `/api/invitations/{id}` | Sponsor / admins | Remove membership, revoke sessions, mark revoked |
| timer | daily 02:15 UTC | — | Expiry sweep |

`POST` body: `{ "email": "jane@acme.com", "groupId": "<folder group id>", "days": 7 }` (`days` optional, 1–30).

## How a request is authorised

1. **Token** (`src/lib/auth.ts`): an Entra access token for this API with the
   delegated scope `Invitations.ReadWrite`, from the Signode tenant. App-only
   tokens are refused. The caller is the token's `oid` — never the body.
2. **Checks** (`src/lib/checks.ts`, unit-tested): body shape and expiry
   (1–30 days, from `src/lib/retention.ts`), target is a guest-eligible
   `/External/` scope (from `src/lib/folder-scopes.ts`), invitee is not a
   Signode domain and passes the D1 allow/block list, caller is an admin or an
   owner of the target group.
3. **Graph** (`src/lib/graph.ts`) runs as the Function App's managed identity.
   No on-behalf-of exchange, no secret.

The constants and the scope registry are imported from the portal's own
`src/lib`, so UI and API cannot disagree about limits or eligible folders.

## Grants the managed identity needs

| For | Preferred | Fallback |
|---|---|---|
| Invite guest | Directory role **Guest Inviter** | Graph app `User.Invite.All` |
| Add/remove member | **Groups Administrator** scoped to an administrative unit holding **only the guest-eligible (External) groups** | Graph app `GroupMember.ReadWrite.All` |
| Admin/sponsor check, redemption state | Graph app `GroupMember.Read.All` + `User.Read.All` (`User.Read.All` is needed for `externalUserState` and also covers `checkMemberGroups`) | — |
| Revoke sessions | Graph app `User.RevokeSessions.All` | — |
| Records | **Storage Table Data Contributor** on the storage account | — |

Never put internal region or department groups in the administrative unit:
that would let the API add a guest to them.

## App settings

See `local.settings.example.json`. `EXPIRY_CLOCK` (D3) and
`DOMAIN_POLICY_MODE` / `DOMAIN_POLICY_LIST` (D1) are settings so the open
decisions do not block the build. `DOMAIN_POLICY_MODE=allow` with an empty
list admits nobody.

## Deploy

`.github/workflows/deploy-api.yml`: tag `v*` or manual run, `prod` approval,
OIDC as `cs-secure-share-github-deploy` (needs its `prod` federated credential
and **Website Contributor** on `SecureSharePortal`). One Function App serves
both portals; its token audience is `cs-secure-share-prod-api`, and both SPA
registrations request that API's `Invitations.ReadWrite` scope.

## Develop

```bash
cd api
npm ci
npm test          # unit tests: checks + token validation
npm run build     # typecheck + bundle to dist/index.js
cp local.settings.example.json local.settings.json   # fill in, never commit
func start        # needs Azure Functions Core Tools v4 and `az login`
```

Audit trail: every decision logs one `secureshare.audit` line (ALLOW/DENY,
actor, invitee, scope, reason) to Application Insights.
