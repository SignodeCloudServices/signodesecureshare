#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# SecureShare permission inventory — READ-ONLY. Go/no-go item for 10/21.
#
# For every identity that touches SecureShare, lists what it can do:
#   - Graph permissions granted (application roles and delegated grants),
#     with their type, so "Delegated vs Application" is visible at a glance
#   - Entra directory roles, with scope (tenant or administrative unit)
#   - Azure RBAC role assignments, with scope
#
# Run in Azure Cloud Shell (Bash):  bash scripts/permission-inventory.sh
# Writes permission-inventory-<date>.md — attach it to the review package.
# Changes nothing.
# ---------------------------------------------------------------------------
set -uo pipefail
OUT="permission-inventory-$(date -u +%Y%m%d).md"
GRAPH_APPID=00000003-0000-0000-c000-000000000000

# name | appId (registrations) or "" | service principal object ID (identities)
IDENTITIES=(
  "cs-secure-share-prod-spa (prod portal)|d25ef5a7-5e7a-4ebf-a06e-f3cbf047294d|"
  "cs-secure-share-dev-spa (dev portal)|212f8c25-c2f7-4e09-a316-280dd4c89e73|"
  "cs-secure-share-prod-api (API audience)|e07aa77f-557f-45c1-bd76-fb61609381ab|"
  "cs-secure-share-github-deploy (CI/CD)|94f1ea9a-b6cb-4236-9c02-c333a3e549d0|"
  "secureshare-api managed identity (invitations)||11db5319-39bf-4623-a992-2ee6003a4802"
  "SecureSharePortal managed identity (Sites.Selected)||cc0b2c45-4958-4648-814d-4a39c4c8454e"
)

GRAPH_ROLES=$(az ad sp show --id $GRAPH_APPID --query "appRoles[].{id:id,value:value}" -o json)
role_name() { echo "$GRAPH_ROLES" | jq -r --arg id "$1" '.[] | select(.id==$id) | .value // empty'; }

{
  echo "# SecureShare permission inventory"
  echo
  echo "Generated $(date -u '+%Y-%m-%d %H:%M UTC') by $(az account show --query user.name -o tsv) — read-only export."
  echo
} > "$OUT"

for entry in "${IDENTITIES[@]}"; do
  IFS='|' read -r NAME APPID SPID <<<"$entry"
  if [ -z "$SPID" ]; then SPID=$(az ad sp show --id "$APPID" --query id -o tsv 2>/dev/null); fi
  {
    echo "## $NAME"
    echo
    echo "Service principal: \`${SPID:-not found}\`${APPID:+ · app ID \`$APPID\`}"
    echo
    echo "| Kind | Resource | Permission / role | Scope |"
    echo "|---|---|---|---|"
  } >> "$OUT"
  [ -z "$SPID" ] && { echo "| — | — | (no service principal found) | — |" >> "$OUT"; echo >> "$OUT"; continue; }

  # Application permissions (app roles granted to this SP)
  az rest -u "https://graph.microsoft.com/v1.0/servicePrincipals/$SPID/appRoleAssignments" \
    --query "value[].{res:resourceDisplayName, rid:resourceId, role:appRoleId}" -o json 2>/dev/null |
  jq -c '.[]' | while read -r a; do
    res=$(jq -r .res <<<"$a"); role=$(jq -r .role <<<"$a")
    name=$( [ "$res" = "Microsoft Graph" ] && role_name "$role" || echo "$role" )
    echo "| Application | $res | \`${name:-$role}\` | tenant |" >> "$OUT"
  done

  # Delegated permissions (admin-consented OAuth2 grants where this SP is the client)
  az rest -u "https://graph.microsoft.com/v1.0/servicePrincipals/$SPID/oauth2PermissionGrants" \
    --query "value[].{res:resourceId, scope:scope, type:consentType}" -o json 2>/dev/null |
  jq -c '.[]' | while read -r g; do
    resid=$(jq -r .res <<<"$g"); res=$(az ad sp show --id "$resid" --query displayName -o tsv 2>/dev/null)
    for s in $(jq -r .scope <<<"$g"); do
      echo "| Delegated ($(jq -r .type <<<"$g")) | ${res:-$resid} | \`$s\` | signed-in user |" >> "$OUT"
    done
  done

  # Entra directory roles
  az rest -u "https://graph.microsoft.com/v1.0/roleManagement/directory/roleAssignments?\$filter=principalId eq '$SPID'&\$expand=roleDefinition" \
    --query "value[].{role:roleDefinition.displayName, scope:directoryScopeId}" -o json 2>/dev/null |
  jq -c '.[]' | while read -r r; do
    scope=$(jq -r .scope <<<"$r")
    if [[ "$scope" == /administrativeUnits/* ]]; then
      au=${scope#/administrativeUnits/}
      scope="AU $(az rest -u "https://graph.microsoft.com/v1.0/directory/administrativeUnits/$au" --query displayName -o tsv 2>/dev/null) (\`$au\`)"
    elif [ "$scope" = "/" ]; then scope="tenant"; fi
    echo "| Directory role | Entra ID | $(jq -r .role <<<"$r") | $scope |" >> "$OUT"
  done

  # Azure RBAC
  az role assignment list --assignee "$SPID" --all --query "[].{role:roleDefinitionName, scope:scope}" -o json 2>/dev/null |
  jq -c '.[]' | while read -r r; do
    scope=$(jq -r .scope <<<"$r"); scope=${scope##*/providers/}
    echo "| Azure RBAC | Azure | $(jq -r .role <<<"$r") | \`$scope\` |" >> "$OUT"
  done
  echo >> "$OUT"
done

echo "Sites.Selected grants are per site and are not listed by Graph role assignments; verify in the SharePoint site permissions (RB-10)." >> "$OUT"
echo "Wrote $(pwd)/$OUT"
