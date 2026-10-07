import * as React from "react";
import { DocPageShell } from "@/components/signode/DocPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Rocket,
  AlertTriangle,
  RefreshCw,
  ShieldAlert,
  UserPlus,
  KeyRound,
  ClipboardCheck,
  Cloud,
  Target,
  Bell,
  CheckSquare,
  ListChecks,
  ArrowUpRight,
} from "lucide-react";

// ---- Runbook data ----------------------------------------------------------

type Runbook = {
  id: string;
  title: string;
  icon: React.ReactNode;
  purpose: string;
  triggers: string[];
  prerequisites: string[];
  steps: { title: string; detail: string }[];
  verification: string[];
  escalation: {
    level: string;
    contact: string;
    when: string;
  }[];
};

const RUNBOOKS: Runbook[] = [
  {
    id: "cicd",
    title: "CI/CD Deploy",
    icon: <Rocket className="h-4 w-4" />,
    purpose:
      "Ship a new build of the React SPA and/or .NET 8 Function API to Dev, Test, or Prod using the standard GitHub Actions pipeline.",
    triggers: [
      "PR merged to main (auto-deploys to Dev)",
      "Manual dispatch of the 'promote' workflow for Test / Prod",
      "Hotfix branch merged with the 'urgent' label",
    ],
    prerequisites: [
      "Change ticket approved in ServiceNow (Test / Prod only)",
      "All required status checks green: CodeQL, Snyk, unit tests, e2e",
      "OIDC federated identity between GitHub and Azure verified",
      "Deployer has 'Contributor' on the target RG via Entra PIM",
    ],
    steps: [
      {
        title: "Trigger the workflow",
        detail:
          "Navigate to Actions → 'Deploy to <env>' → Run workflow. Select the target environment and confirm the source ref.",
      },
      {
        title: "Watch the build",
        detail:
          "Build stage runs bun install → bun run build → dotnet publish. Any failure here halts before touching Azure.",
      },
      {
        title: "Deploy to staging slot",
        detail:
          "SPA + API deploy to the staging slot of the target Static Web App / Function App. Post-deploy tests run against the slot.",
      },
      {
        title: "Manual approval gate (Prod only)",
        detail:
          "For Prod, an approver from the release CAB must click Approve in GitHub Environments before the swap.",
      },
      {
        title: "Slot swap",
        detail:
          "Staging → production slot swap. Zero-downtime; brief warm-up period as the new instance takes traffic.",
      },
      {
        title: "Smoke tests",
        detail:
          "Automated smoke tests run against the production URL. Any red result auto-triggers rollback (swap back).",
      },
    ],
    verification: [
      "Health endpoint /api/health returns 200 OK with the new build SHA",
      "SPA loads and displays the release commit in the footer",
      "Sentinel receives the 'Deployment' custom event within 60 seconds",
      "App Insights shows normal response-time percentiles for 10 minutes post-swap",
    ],
    escalation: [
      { level: "L1", contact: "Release-on-call (PagerDuty)", when: "Smoke test failure or 5xx spike within 15 min" },
      { level: "L2", contact: "Platform Engineering lead", when: "Rollback fails or slot swap hangs" },
      { level: "L3", contact: "CTO / VP Engineering", when: "Prod outage > 30 min with no clear recovery path" },
    ],
  },
  {
    id: "ir",
    title: "Incident Response (Dev)",
    icon: <AlertTriangle className="h-4 w-4" />,
    purpose:
      "Structured response to a suspected or confirmed security incident affecting the SecureShare Dev environment. Prevents Dev incidents from bleeding into Test/Prod and preserves evidence.",
    triggers: [
      "High or Critical Sentinel alert on Dev resources",
      "Manual escalation from an engineer during dev/test",
      "Detection of secret or credential leak in a PR or commit",
    ],
    prerequisites: [
      "Access to the SOC Sentinel workspace",
      "PagerDuty on-call rotation active",
      "Signode CISO office reachable via the security-incident hotline",
    ],
    steps: [
      {
        title: "Declare & acknowledge",
        detail:
          "On-call acknowledges the PagerDuty alert within 15 min. Open an incident channel in Teams (#sec-inc-<yyyymmdd>).",
      },
      {
        title: "Contain",
        detail:
          "Isolate affected resources: disable the compromised identity, block the source IP at Azure Firewall, revoke Function App keys.",
      },
      {
        title: "Preserve evidence",
        detail:
          "Snapshot the affected Storage account, export the last 24h of relevant Log Analytics data, capture Function App logs.",
      },
      {
        title: "Investigate",
        detail:
          "Correlate Sentinel events across Entra sign-ins, SharePoint audit, and DLP. Determine blast radius and root cause.",
      },
      {
        title: "Eradicate & recover",
        detail:
          "Rotate any exposed secrets via Key Vault. Redeploy affected components from a known-good build. Re-enable identities only after verification.",
      },
      {
        title: "Post-incident review",
        detail:
          "Within 5 business days, publish an incident report to the CISO office. Track corrective actions in the risk register.",
      },
    ],
    verification: [
      "No further high-severity Sentinel alerts on the affected resources for 24 hrs",
      "Secrets rotated and old versions destroyed in Key Vault",
      "Corrective actions filed with owners and due dates",
      "Incident closed in ServiceNow with a linked post-mortem",
    ],
    escalation: [
      { level: "L1", contact: "SOC on-call (PagerDuty)", when: "Initial triage and containment" },
      { level: "L2", contact: "Signode CISO office", when: "Suspected data exfiltration or vendor exposure" },
      { level: "L3", contact: "External IR retainer (Mandiant)", when: "Confirmed breach or nation-state indicators" },
    ],
  },
  {
    id: "dr",
    title: "DR Failover Test",
    icon: <RefreshCw className="h-4 w-4" />,
    purpose:
      "Quarterly verification that the SecureShare portal can fail over to the secondary Azure region and continue serving traffic within the 4-hour RTO / 15-minute RPO.",
    triggers: [
      "Scheduled quarterly test (Q1, Q2, Q3, Q4)",
      "Post-material-change validation",
      "Ad-hoc executive request following an incident",
    ],
    prerequisites: [
      "Written approval from IT Ops director",
      "Comms sent to internal stakeholders 72 hrs in advance",
      "Backup taken and verified within the prior 24 hrs",
      "Secondary region resources warm and healthy in monitoring",
    ],
    steps: [
      {
        title: "Kick off DR call",
        detail:
          "Bridge opens 15 min before failover window. Roll call: Platform Eng, IT Ops, SOC, PM, comms.",
      },
      {
        title: "Freeze changes",
        detail:
          "Merge freeze in effect for the duration of the test. Any hotfix requires DR coordinator approval.",
      },
      {
        title: "Redirect traffic",
        detail:
          "Update Front Door origin (or DNS CNAME) from primary to secondary. Monitor traffic shift in App Insights.",
      },
      {
        title: "Validate secondary region",
        detail:
          "Smoke test all 6 personas, upload/download flows, DLP scan, and Sentinel event ingestion.",
      },
      {
        title: "Fail back",
        detail:
          "Once validated, redirect traffic back to primary. Confirm zero drift in SharePoint content and audit logs.",
      },
      {
        title: "Publish results",
        detail:
          "DR coordinator files the test report within 5 business days. Any RTO / RPO miss triggers a CAR (corrective action request).",
      },
    ],
    verification: [
      "Traffic served exclusively from secondary region for at least 30 min",
      "Actual RTO recorded and compared to 4-hour objective",
      "Actual RPO recorded and compared to 15-minute objective",
      "No user-visible data loss; all in-flight uploads recovered or explicitly documented",
    ],
    escalation: [
      { level: "L1", contact: "DR coordinator", when: "Deviation from the runbook" },
      { level: "L2", contact: "IT Ops director", when: "RTO/RPO miss or unrecoverable state" },
      { level: "L3", contact: "CIO office", when: "Executive escalation or regulatory reporting required" },
    ],
  },
  {
    id: "dlp",
    title: "DLP Quarantine Review",
    icon: <ShieldAlert className="h-4 w-4" />,
    purpose:
      "Regular review of files quarantined by Microsoft Purview DLP policies. Ensures legitimate business content is released quickly and true positives are handled with the right care.",
    triggers: [
      "Daily automated review queue populated by Purview",
      "User-submitted release request via Help form",
      "Ad-hoc executive request following a business impact",
    ],
    prerequisites: [
      "Access to the Purview compliance portal (DLP reviewer role)",
      "Familiarity with Signode data classification matrix",
      "Business context on the affected folder / requester",
    ],
    steps: [
      {
        title: "Open the queue",
        detail:
          "Purview → Data Loss Prevention → Alerts → Filter to 'Quarantined' status. Sort by age descending.",
      },
      {
        title: "Assess the match",
        detail:
          "Review the DLP rule that fired, the detected content types (PII, PCI, etc.), and the confidence score.",
      },
      {
        title: "Contact the requester if needed",
        detail:
          "For ambiguous cases, reach out through the Help form to confirm business intent. Document the response.",
      },
      {
        title: "Decide: release, keep, or delete",
        detail:
          "Release with sensitivity label applied if legitimate; keep quarantined with a note if under investigation; delete if malicious.",
      },
      {
        title: "Update policy if needed",
        detail:
          "If the same false positive recurs, propose a policy tune-up (exception, additional condition, or rule scope change).",
      },
      {
        title: "Log the decision",
        detail:
          "Every action is auto-logged to Sentinel. Add a short justification for audit trail (especially for releases).",
      },
    ],
    verification: [
      "Queue drained to zero items older than 24 hours at end of shift",
      "Weekly false-positive rate under 10%",
      "No release of Confidential-labeled content without matching sensitivity label",
    ],
    escalation: [
      { level: "L1", contact: "Data protection analyst", when: "Standard queue items" },
      { level: "L2", contact: "Data protection lead", when: "Ambiguous PII / PCI cases or repeat offenders" },
      { level: "L3", contact: "Legal / privacy office", when: "Regulated data exposure or regulator-reportable events" },
    ],
  },
  {
    id: "prov",
    title: "External User Provisioning",
    icon: <UserPlus className="h-4 w-4" />,
    purpose:
      "Onboard a new external vendor or project team into SecureShare with least-privilege scope and a time-boxed access window.",
    triggers: [
      "Send Invitation action from an authorized internal persona",
      "PMO handoff for a new external project",
      "Vendor contract signed and countersigned in the contract system",
    ],
    prerequisites: [
      "Business sponsor identified (Global Admin, AMER Sales, or CORP Legal)",
      "Vendor NDA on file",
      "Data classification agreement on file (for Confidential access)",
      "Target folder exists in the SharePoint tree",
    ],
    steps: [
      {
        title: "Create the invitation",
        detail:
          "Internal user clicks 'Send Invitation' in the portal. Selects target folder, sets expiry (default 30 days), adds context note.",
      },
      {
        title: "Auto-provision the guest account",
        detail:
          "Function API invites the B2B guest into the Signode corporate tenant and adds them to the scoped Entra security group.",
      },
      {
        title: "Vendor accepts",
        detail:
          "Vendor receives the invitation link, completes MFA enrollment (FIDO2 or Authenticator), and accepts the acceptable-use policy.",
      },
      {
        title: "Sponsor confirmation",
        detail:
          "Sponsor receives a confirmation email once the vendor completes onboarding, with the expiry date highlighted.",
      },
      {
        title: "Register in the access review campaign",
        detail:
          "The new guest is auto-added to the next quarterly access review for the folder they were granted.",
      },
    ],
    verification: [
      "Guest can sign in and see exactly the intended folder(s)",
      "Guest cannot see or navigate to out-of-scope paths",
      "Sentinel logs the first successful sign-in with expected persona attributes",
      "Access-review record exists with the correct sponsor and expiry",
    ],
    escalation: [
      { level: "L1", contact: "IAM operations", when: "Invitation delivery failure or MFA enrollment stuck" },
      { level: "L2", contact: "IAM lead", when: "Repeat provisioning failures or scope drift" },
      { level: "L3", contact: "CISO office", when: "Suspected impersonation or fraud" },
    ],
  },
  {
    id: "deprov",
    title: "External User Deprovisioning",
    icon: <UserPlus className="h-4 w-4 rotate-180" />,
    purpose:
      "Cleanly remove an external user's access when their engagement ends — either scheduled expiry, project close-out, or ad-hoc revocation.",
    triggers: [
      "Access expiry reached (auto)",
      "Sponsor requests early revocation",
      "Access review campaign marks the user for removal",
      "Security incident requires immediate revocation",
    ],
    prerequisites: [
      "IAM operator role in Entra",
      "Confirmation that no active engagements depend on the user",
    ],
    steps: [
      {
        title: "Suspend sign-in",
        detail:
          "Disable the B2B guest account in Entra ID. Any active sessions are terminated on next token refresh.",
      },
      {
        title: "Revoke scoped access",
        detail:
          "Remove the guest from all Entra security groups tied to SecureShare folders.",
      },
      {
        title: "Preserve audit trail",
        detail:
          "Do NOT delete the guest account for 90 days. This preserves attribution on historical audit events.",
      },
      {
        title: "Notify the sponsor",
        detail:
          "Sponsor receives a notification with the effective revocation timestamp and the linked access-review record.",
      },
      {
        title: "Hard delete after retention",
        detail:
          "After 90 days, the account is hard-deleted by the scheduled cleanup runbook.",
      },
    ],
    verification: [
      "Guest can no longer sign in — sign-in blocked event logged in Sentinel",
      "Guest is no longer visible in any SecureShare Entra security group",
      "Access-review record marked 'Revoked' with sponsor stamp",
    ],
    escalation: [
      { level: "L1", contact: "IAM operations", when: "Standard revocation" },
      { level: "L2", contact: "IAM lead", when: "Emergency revocation required within 15 min" },
      { level: "L3", contact: "CISO office", when: "Revocation tied to active security incident" },
    ],
  },
  {
    id: "secrets",
    title: "Secret Rotation",
    icon: <KeyRound className="h-4 w-4" />,
    purpose:
      "Rotate any secret used by SecureShare — API keys, certificates, service principal credentials, storage keys — on a scheduled cadence and on demand after any suspected exposure.",
    triggers: [
      "Scheduled quarterly rotation (all secrets)",
      "Immediate rotation on suspected exposure",
      "Certificate expiry within 30 days",
      "Employee departure who held credentials",
    ],
    prerequisites: [
      "Key Vault contributor role via Entra PIM",
      "Coordination window with app owner for restart if required",
      "Backup of current secret in an out-of-band vault (Legal-approved)",
    ],
    steps: [
      {
        title: "Add the new secret",
        detail:
          "Generate a new secret and add it to Key Vault as a new version. Do NOT delete the old version yet.",
      },
      {
        title: "Reference the new version",
        detail:
          "Update the app's Key Vault reference to point at the new version SHA. Deploy via CI/CD.",
      },
      {
        title: "Verify the app is using the new secret",
        detail:
          "Watch App Insights for successful downstream calls using the new secret. No errors expected.",
      },
      {
        title: "Disable the old version",
        detail:
          "In Key Vault, disable the previous version. Any lingering client using it will start failing immediately.",
      },
      {
        title: "Destroy the old version",
        detail:
          "After 7 days without incident, hard-delete the disabled version. Retention on Key Vault preserves it for 90 days.",
      },
    ],
    verification: [
      "App logs show zero authentication failures against the downstream service",
      "New secret version is the only enabled version in Key Vault",
      "Rotation event logged to Sentinel with actor + timestamp",
    ],
    escalation: [
      { level: "L1", contact: "IAM operations", when: "Standard rotation" },
      { level: "L2", contact: "Platform Engineering lead", when: "App fails to pick up the new secret" },
      { level: "L3", contact: "CISO office", when: "Emergency rotation tied to a suspected leak" },
    ],
  },
  {
    id: "access",
    title: "Access Review Campaigns",
    icon: <ClipboardCheck className="h-4 w-4" />,
    purpose:
      "Quarterly review of all external and privileged internal access to SecureShare, ensuring the principle of least privilege and revoking stale access.",
    triggers: [
      "Q1, Q2, Q3, Q4 scheduled campaigns",
      "Post-material-change review (e.g. new region added)",
      "Audit finding that requires ad-hoc review",
    ],
    prerequisites: [
      "Reviewers identified (typically the internal sponsor of each guest)",
      "Access review template current in Entra Access Reviews",
      "Communication drafted for reviewer kickoff",
    ],
    steps: [
      {
        title: "Launch the campaign",
        detail:
          "In Entra Access Reviews, launch the quarterly template. Reviewer notifications go out automatically.",
      },
      {
        title: "Reviewer decisions",
        detail:
          "Each reviewer approves, denies, or requests more information for every guest in their scope. Duration: 14 days.",
      },
      {
        title: "Auto-revoke on inaction",
        detail:
          "If a reviewer doesn't act within the window, the campaign auto-revokes as the safe default. Sponsor is notified.",
      },
      {
        title: "Investigate denials",
        detail:
          "Denials trigger the deprovisioning runbook. Any denial with a security concern is flagged to the SOC.",
      },
      {
        title: "Report to CISO office",
        detail:
          "Campaign coordinator publishes a summary: reviewers, decisions, revocations, exceptions.",
      },
    ],
    verification: [
      "Campaign closes with a decision on 100% of guests",
      "All revocations reflected in Entra and SharePoint within 24 hrs of decision",
      "Report filed with CISO office within 5 business days of close",
      "Metrics feed into the Security dashboard (Access reviews KPI card)",
    ],
    escalation: [
      { level: "L1", contact: "Access review coordinator", when: "Reviewer non-response or unclear scope" },
      { level: "L2", contact: "IAM lead", when: "Systemic non-response across multiple sponsors" },
      { level: "L3", contact: "CISO / CORP Legal", when: "Regulatory attestation deadline at risk" },
    ],
  },
];

// ---- Page ------------------------------------------------------------------

export function RunbooksPage() {
  const [activeId, setActiveId] = React.useState(RUNBOOKS[0].id);

  return (
    <DocPageShell
      title="Runbooks"
      subtitle="Operational playbooks for the SecureShare Portal — each with purpose, triggers, prerequisites, steps, verification, and escalation."
    >
      {/* Overview strip */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ListChecks className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Runbook index
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
            {RUNBOOKS.map((rb) => (
              <button
                key={rb.id}
                onClick={() => setActiveId(rb.id)}
                className={[
                  "flex items-center gap-2 rounded-md border p-3 text-left text-sm transition-colors",
                  activeId === rb.id
                    ? "border-[hsl(var(--signode-orange))] bg-[hsl(var(--signode-orange))]/5"
                    : "hover:border-[hsl(var(--signode-orange))]/40",
                ].join(" ")}
              >
                <span className="text-[hsl(var(--signode-orange))]">
                  {rb.icon}
                </span>
                <span className="font-semibold text-[hsl(var(--signode-black))]">
                  {rb.title}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeId} onValueChange={setActiveId}>
        <TabsList className="flex-wrap h-auto justify-start no-print">
          {RUNBOOKS.map((rb) => (
            <TabsTrigger key={rb.id} value={rb.id} className="text-xs">
              {rb.title}
            </TabsTrigger>
          ))}
        </TabsList>

        {RUNBOOKS.map((rb) => (
          <TabsContent key={rb.id} value={rb.id} className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-[hsl(var(--signode-orange))]">
                    {rb.icon}
                  </span>
                  {rb.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <Section
                  icon={<Target className="h-4 w-4" />}
                  title="Purpose"
                >
                  <p>{rb.purpose}</p>
                </Section>

                <Section
                  icon={<Bell className="h-4 w-4" />}
                  title="Triggers"
                >
                  <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                    {rb.triggers.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<CheckSquare className="h-4 w-4" />}
                  title="Prerequisites"
                >
                  <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                    {rb.prerequisites.map((p, i) => (
                      <li key={i}>{p}</li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<ListChecks className="h-4 w-4" />}
                  title="Steps"
                >
                  <ol className="space-y-3">
                    {rb.steps.map((s, i) => (
                      <li key={i} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signode-orange))] text-white text-xs font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-semibold text-[hsl(var(--signode-black))]">
                            {s.title}
                          </div>
                          <div className="text-muted-foreground">
                            {s.detail}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </Section>

                <Section
                  icon={<CheckSquare className="h-4 w-4" />}
                  title="Verification"
                >
                  <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                    {rb.verification.map((v, i) => (
                      <li key={i}>{v}</li>
                    ))}
                  </ul>
                </Section>

                <Section
                  icon={<ArrowUpRight className="h-4 w-4" />}
                  title="Escalation"
                >
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                            Level
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                            Contact
                          </th>
                          <th className="text-left px-3 py-2 text-xs uppercase tracking-wider text-muted-foreground">
                            When to escalate
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {rb.escalation.map((e, i) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-semibold">
                              <Badge
                                variant="outline"
                                className="text-xs border-[hsl(var(--signode-orange))]/40 text-[hsl(var(--signode-orange-deep))]"
                              >
                                {e.level}
                              </Badge>
                            </td>
                            <td className="px-3 py-2">{e.contact}</td>
                            <td className="px-3 py-2 text-muted-foreground">
                              {e.when}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Section>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Ownership footer */}
      <Card className="bg-[hsl(var(--signode-black))] text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[hsl(var(--signode-orange-soft))] mb-2">
            <Cloud className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Runbook ownership
            </span>
          </div>
          <p className="text-sm text-white/90">
            Runbooks are reviewed quarterly by the Signode SOC and Platform
            Engineering. Every runbook is drilled at least once per year via
            tabletop or live exercise. Changes flow through pull requests
            against the source repo; the current version is always what's
            rendered here. Questions go to Platform Engineering via the
            internal support channel.
          </p>
        </CardContent>
      </Card>
    </DocPageShell>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[hsl(var(--signode-orange-deep))] mb-2">
        {icon}
        <span className="font-semibold text-sm uppercase tracking-wider">
          {title}
        </span>
      </div>
      {children}
    </div>
  );
}