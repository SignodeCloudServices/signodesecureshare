import { DocPageShell } from "@/components/signode/DocPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CodeBlock } from "@/components/signode/CodeBlock";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ClipboardList,
  Calendar,
  Users,
  Cloud,
  Server,
  KeyRound,
  ShieldCheck,
  Database,
  Activity,
  Globe,
  FileCode,
  CheckCircle2,
} from "lucide-react";

const STEPS = [
  {
    n: 1,
    title: "Foundational tenant & subscription setup",
    detail:
      "Create the dedicated Azure subscription for SecureShare under the Signode enterprise agreement. Establish management groups, tag policy, cost center. Verify the Signode Entra ID tenant and its B2B external collaboration settings.",
  },
  {
    n: 2,
    title: "IaC scaffolding & source control",
    detail:
      "Stand up the GitHub org repo with Bicep + Terraform modules. Wire GitHub Actions with OIDC federated identity to Azure — no long-lived secrets. CODEOWNERS + branch protection in place from day one.",
  },
  {
    n: 3,
    title: "Networking baseline",
    detail:
      "Deploy the hub VNet, Azure Firewall, private DNS zones, and private endpoints. Reserve address space for future spokes (Test, Prod). Configure log forwarding to the central Log Analytics workspace.",
  },
  {
    n: 4,
    title: "Identity & Conditional Access",
    detail:
      "Configure B2B external collaboration settings and guest invitation restrictions, Conditional Access policies for guests (MFA required, legacy authentication blocked), and the Entra security groups that map one-to-one onto shared folders.",
  },
  {
    n: 5,
    title: "SharePoint site provisioning",
    detail:
      "Run the PnP.PowerShell script (see Source & IaC) to create the site collection, the five region libraries, and folder tree. Bind sensitivity labels and DLP policy templates.",
  },
  {
    n: 6,
    title: "Function API deployment",
    detail:
      "Deploy the .NET 8 Function App with managed identity. Wire it to Key Vault for any downstream credentials. Confirm private endpoint access to SharePoint via Graph.",
  },
  {
    n: 7,
    title: "Static Web App + custom domain",
    detail:
      "Deploy the React SPA to Azure Static Web Apps via GitHub Actions. Attach the custom domain secureshare.pkgconnect.com. Enable staging slots.",
  },
  {
    n: 8,
    title: "Purview labels & DLP policies",
    detail:
      "Author sensitivity labels, publish to the site collection, and enable DLP policies (auto-quarantine of PII, PCI, and unlabeled Confidential content).",
  },
  {
    n: 9,
    title: "Sentinel content & detections",
    detail:
      "Deploy the Sentinel content pack. Enable Entra sign-in, SharePoint audit, and DLP connectors. Import the custom KQL detection library from Source & IaC.",
  },
  {
    n: 10,
    title: "Smoke test, hand-off, go/no-go",
    detail:
      "Execute the smoke-test checklist (all 6 personas, all 5 regions). Sign-off from Security, Legal, and IT Ops. Cut over DNS. Communicate go-live.",
  },
];

const PHASES = [
  { name: "Phase 1 — Foundation", weeks: "Weeks 1-2", steps: [1, 2, 3] },
  { name: "Phase 2 — Identity & Storage", weeks: "Weeks 3-4", steps: [4, 5] },
  { name: "Phase 3 — App & API", weeks: "Weeks 5-6", steps: [6, 7] },
  { name: "Phase 4 — Governance & Hand-off", weeks: "Weeks 7-8", steps: [8, 9, 10] },
];

const RESOURCING = [
  { role: "Cloud Platform Engineer", fte: "1.0", notes: "Azure, IaC, networking" },
  { role: ".NET / API Developer", fte: "1.0", notes: "Function API + Graph integration" },
  { role: "React Developer", fte: "0.75", notes: "SPA polish + backend integration" },
  { role: "SharePoint / M365 Admin", fte: "0.5", notes: "Site provisioning, labels, DLP" },
  { role: "Security Engineer", fte: "0.5", notes: "Entra CA, Sentinel, controls" },
  { role: "Program Manager", fte: "0.5", notes: "Coordination, comms, sign-offs" },
  { role: "QA / Test", fte: "0.5", notes: "Smoke tests + persona validation" },
];

const AZ_STEPS = [
  {
    n: 1,
    icon: <Cloud className="h-4 w-4" />,
    title: "Create the resource group",
    portal: "Azure Portal → Resource groups → + Create",
    detail:
      "Subscription = SecureShare-Prod (or -Dev). Region = East US 2. Name = rg-secureshare-dev. Tags: env=dev, owner=signode-it, costcenter=securshare.",
    artifact: "IaC parameters file — no code loaded directly; the RG is the container everything else lands in.",
  },
  {
    n: 2,
    icon: <KeyRound className="h-4 w-4" />,
    title: "Register the SPA + API app registrations in Entra",
    portal: "Entra admin center → Applications → App registrations → + New registration",
    detail:
      "Two registrations: spa-secureshare (SPA redirect URI = https://secureshare.pkgconnect.com/auth/callback) and api-secureshare (expose an API + define scopes: Files.Read, Files.Write, Admin.All).",
    artifact:
      "appsettings.json in Function API — set TenantId, ClientId, Audience from the created app IDs.",
  },
  {
    n: 3,
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Configure Conditional Access",
    portal: "Entra admin center → Protection → Conditional Access → + New policy",
    detail:
      "Users: All external + all internal. Cloud apps: spa-secureshare. Grant: Require authentication strength = Phishing-resistant MFA. Sign-in frequency: 8 hours.",
    artifact:
      "ca-secureshare-mfa.json exported from CA templates (see Source & IaC → Bicep tab).",
  },
  {
    n: 4,
    icon: <Database className="h-4 w-4" />,
    title: "Create the Storage account (Function backing)",
    portal: "Azure Portal → Storage accounts → + Create",
    detail:
      "Name = stsecureshareDEV0001. Redundancy = ZRS. TLS 1.2 minimum. Public access disabled. Private endpoint into the hub VNet.",
    artifact:
      "storage.bicep from the IaC tab — deploys this + the private endpoint together.",
  },
  {
    n: 5,
    icon: <KeyRound className="h-4 w-4" />,
    title: "Create the Key Vault",
    portal: "Azure Portal → Key vaults → + Create",
    detail:
      "Name = kv-secureshare-dev. RBAC permission model. Soft-delete + purge protection ON. Private endpoint. Access via the Function App's managed identity only.",
    artifact:
      "keyvault.bicep from the IaC tab — creates the vault; secrets are added by the CI/CD workflow post-deploy.",
  },
  {
    n: 6,
    icon: <Server className="h-4 w-4" />,
    title: "Create the Function App",
    portal: "Azure Portal → Function App → + Create",
    detail:
      "Runtime = .NET 8 isolated. Plan = Consumption for Dev, Premium for Prod. Attach the storage account and the app insights instance. Enable system-assigned managed identity.",
    artifact:
      "The .NET 8 API skeleton from the Source & IaC → API tab — deploys via GitHub Actions.",
  },
  {
    n: 7,
    icon: <Globe className="h-4 w-4" />,
    title: "Create the Static Web App",
    portal: "Azure Portal → Static Web Apps → + Create",
    detail:
      "Plan = Standard (for custom domain + auth). Source = GitHub, org = signode, repo = signode-secureshare-portal, branch = main. Build presets = React. App location = /, output location = dist.",
    artifact:
      "swa-config.json + .github/workflows/deploy-swa.yml — auto-generated on create, then customized via IaC.",
  },
  {
    n: 8,
    icon: <Database className="h-4 w-4" />,
    title: "Provision the SharePoint site collection",
    portal:
      "SharePoint admin center → Active sites → + Create → Team site (private)",
    detail:
      "Name = SecureShare. Primary admin = the Signode IT service account. Storage quota = 100 GB Dev / 1 TB Prod. Sensitivity label = Confidential — External Sharing Permitted.",
    artifact:
      "Provision-SecureShare.ps1 from the Source & IaC → SharePoint tab — creates the library + folder tree + permission groups.",
  },
  {
    n: 9,
    icon: <ShieldCheck className="h-4 w-4" />,
    title: "Author Purview labels + DLP policies",
    portal:
      "Purview compliance portal → Information protection → Labels & policies",
    detail:
      "Publish labels: Public, Internal, Confidential, Confidential-External. DLP policy: block outbound Confidential without label; quarantine PII/PCI in unlabeled uploads.",
    artifact:
      "purview-labels.json + purview-dlp-policy.json — imported via PowerShell (Source & IaC → SharePoint tab).",
  },
  {
    n: 10,
    icon: <Activity className="h-4 w-4" />,
    title: "Deploy Sentinel & connect data sources",
    portal:
      "Microsoft Sentinel → + Add → Log Analytics workspace = law-secureshare",
    detail:
      "Enable data connectors: Entra ID sign-in logs, SharePoint audit, Purview DLP, Defender for Cloud. Deploy the SecureShare content pack (rules + workbooks).",
    artifact:
      "sentinel-analytic-rules.kql + workbook.json — imported through the Sentinel Repositories feature from GitHub.",
  },
  {
    n: 11,
    icon: <Globe className="h-4 w-4" />,
    title: "Configure DNS",
    portal: "Your DNS provider → CNAME records",
    detail:
      "secureshare.pkgconnect.com → CNAME → <swa-name>.azurestaticapps.net. Add TXT for domain verification when prompted by Static Web Apps.",
    artifact:
      "No code — record values are surfaced by the Static Web App portal blade after domain add.",
  },
  {
    n: 12,
    icon: <FileCode className="h-4 w-4" />,
    title: "Push app + API code via CI/CD",
    portal:
      "GitHub → Actions tab → Run the 'Deploy to Dev' workflow",
    detail:
      "The pipeline builds the SPA + API, runs tests, deploys to the staging slot, then swaps to production. All secrets pulled from Key Vault via OIDC federated identity.",
    artifact:
      "deploy-dev.yml + azure-pipelines.yml — full files on the Source & IaC → CI/CD tab.",
  },
  {
    n: 13,
    icon: <CheckCircle2 className="h-4 w-4" />,
    title: "Verify: end-to-end smoke test",
    portal: "https://secureshare.pkgconnect.com (in an incognito browser)",
    detail:
      "Sign in as each persona. Verify scope enforcement. Upload a test file. Confirm DLP scans, expiry badge appears, download works, audit event lands in Sentinel.",
    artifact:
      "smoke-test-checklist.md — living document in the repo; also serves as the go-live sign-off form.",
  },
  {
    n: 14,
    icon: <Users className="h-4 w-4" />,
    title: "Hand-off & operational readiness",
    portal:
      "Sentinel → Automation → PagerDuty integration; SOC runbook review",
    detail:
      "SOC accepts alert rotation. Runbooks reviewed and drilled. Access-review campaigns scheduled. Comms sent to internal + vendor stakeholders with the go-live URL.",
    artifact:
      "See the Runbooks page — every operational playbook lives there; each links its escalation chain.",
  },
];

const ARTIFACT_MAP = [
  { file: "storage.bicep, keyvault.bicep, network.bicep", where: "Deployed to resource group via GitHub Actions or `az deployment group create`" },
  { file: "main.tf (Terraform equivalent)", where: "Alternative IaC path; state stored in stsecureshareDEV0001/tfstate container" },
  { file: "appsettings.json + Program.cs (.NET 8 API)", where: "Function App via CI/CD workflow — configuration overridden by App Settings" },
  { file: "swa-config.json", where: "Committed to repo root; consumed by Azure Static Web Apps at deploy time" },
  { file: "deploy-dev.yml (GitHub Actions)", where: ".github/workflows/ in the source repo — runs on push to main" },
  { file: "azure-pipelines.yml (Azure DevOps)", where: "Alternative CI/CD path; used only if org standard is Azure DevOps" },
  { file: "Provision-SecureShare.ps1 (PnP.PowerShell)", where: "Run once from a Cloud Shell or admin workstation to set up SharePoint" },
  { file: "purview-labels.json, purview-dlp-policy.json", where: "Imported via Set-Label / New-DlpCompliancePolicy in the Security & Compliance PS module" },
  { file: "sentinel-analytic-rules.kql", where: "Deployed via the Sentinel Repositories feature; synced automatically from GitHub main" },
  { file: "ca-secureshare-mfa.json", where: "Imported to Conditional Access via the CA templates portal or Graph API" },
];

export function DeploymentPage() {
  return (
    <DocPageShell
      title="Deployment Roadmap"
      subtitle="From empty subscription to a live Dev environment in 8 weeks — 10-step plan, phase timeline, resourcing, and a portal-by-portal build guide."
    >
      {/* 10-step plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            10-step Dev deployment plan
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signode-orange))] text-white text-xs font-bold">
                  {s.n}
                </div>
                <div>
                  <div className="font-semibold text-[hsl(var(--signode-black))]">
                    {s.title}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {s.detail}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Phase timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Phase timeline
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {PHASES.map((p) => (
              <div
                key={p.name}
                className="rounded-md border p-3 bg-[hsl(var(--signode-cream))]"
              >
                <div className="text-xs uppercase tracking-wider text-[hsl(var(--signode-orange-deep))] font-semibold">
                  {p.weeks}
                </div>
                <div className="mt-1 font-semibold text-[hsl(var(--signode-black))]">
                  {p.name}
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  {p.steps.map((n) => (
                    <Badge key={n} variant="outline" className="text-xs">
                      Step {n}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resourcing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Resourcing (Dev phase)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead className="w-[100px] text-right">FTE</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {RESOURCING.map((r) => (
                <TableRow key={r.role}>
                  <TableCell className="font-medium">{r.role}</TableCell>
                  <TableCell className="text-right">{r.fte}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.notes}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40 font-semibold">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">4.75</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  Part-time contributors OK; PM should be full-throttle
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* SharePoint + SWA path */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            SharePoint + Azure Static Web Apps deployment path
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            The recommended production path hosts the React SPA on{" "}
            <strong>Azure Static Web Apps</strong> at{" "}
            <code>secureshare.pkgconnect.com</code>, backed by a{" "}
            <strong>.NET 8 Azure Function API</strong> that brokers all storage
            operations to a dedicated <strong>SharePoint Online</strong> site.
            Identity is handled by <strong>Entra ID</strong>, with external
            partners invited as <strong>B2B guests</strong>; DLP by{" "}
            <strong>Microsoft Purview</strong>.
          </p>
          <p>
            The one-time creation of Azure resources is walked through below in
            the portal build guide. Once resources exist, all subsequent
            deployments run through the CI/CD workflow on the Source &amp; IaC
            page — no more portal clicks required.
          </p>
          <div className="rounded-md bg-muted/40 p-3 space-y-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
              Alternate paths
            </div>
            <div className="text-sm">
              <strong>SPFx web part</strong> — hosts the app inside SharePoint
              chrome; requires refactoring the SPA to SPFx conventions. Good
              if the org standardizes on SharePoint-native experiences.
            </div>
            <div className="text-sm">
              <strong>Viva Connections ACE</strong> — surfaces key entry points
              in the Viva dashboard. Best as a companion to the SWA-hosted
              portal, not a full replacement.
            </div>
          </div>
          <div className="rounded-md bg-[hsl(var(--signode-black))] text-white p-3 space-y-1">
            <div className="text-xs uppercase tracking-widest text-[hsl(var(--signode-orange-soft))] font-semibold">
              Cutover checklist
            </div>
            <ul className="ml-4 list-disc text-sm space-y-0.5">
              <li>DNS TTL lowered to 300s 24 hrs before cutover</li>
              <li>All 6 personas smoke-tested in the staging slot</li>
              <li>Sentinel alert rules armed; SOC accepts rotation</li>
              <li>Legal + IT ops sign-offs recorded in the change ticket</li>
              <li>Comms sent to internal stakeholders and vendor sponsors</li>
              <li>Rollback plan: swap staging slot back + revert DNS CNAME</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Azure Portal build guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Azure Portal build guide (14 steps)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <p className="text-muted-foreground">
            This is the click-by-click path through the Azure, Entra, Purview,
            and SharePoint portals — for teams who prefer building through the
            UI before switching to IaC. Each step lists the portal blade to
            open, what to configure, and the code artifact that should be
            loaded into the resource afterwards.
          </p>
          <ol className="space-y-3">
            {AZ_STEPS.map((s) => (
              <li key={s.n} className="rounded-md border p-3">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signode-orange))] text-white text-xs font-bold">
                    {s.n}
                  </div>
                  <div className="text-[hsl(var(--signode-orange))]">
                    {s.icon}
                  </div>
                  <div className="font-semibold text-[hsl(var(--signode-black))]">
                    {s.title}
                  </div>
                </div>
                <div className="mt-2 grid gap-2 md:grid-cols-3 text-sm">
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Portal path
                    </div>
                    <div className="font-mono text-xs text-[hsl(var(--signode-orange-deep))]">
                      {s.portal}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Configure
                    </div>
                    <div className="text-muted-foreground">{s.detail}</div>
                  </div>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                      Code artifact
                    </div>
                    <div className="text-muted-foreground">{s.artifact}</div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* Artifact mapping */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Where each code artifact lives
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[340px]">Artifact</TableHead>
                <TableHead>Where it lands</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ARTIFACT_MAP.map((a) => (
                <TableRow key={a.file}>
                  <TableCell className="font-mono text-xs">{a.file}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {a.where}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Kickstart CLI */}
      <Card>
        <CardHeader>
          <CardTitle>Kickstart — spin up the RG in one command</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-2">
            Once you have the Azure CLI installed and are logged in, this
            creates the Dev resource group and kicks off the Bicep deploy that
            provisions everything from step 4 onward:
          </p>
          <CodeBlock
            language="powershell"
            code={`az group create --name rg-secureshare-dev --location eastus2 \\
  --tags env=dev owner=signode-it costcenter=secureshare

az deployment group create \\
  --resource-group rg-secureshare-dev \\
  --template-file iac/main.bicep \\
  --parameters iac/parameters.dev.json`}
          />
          <p className="text-xs text-muted-foreground">
            The Bicep and parameters files live on the Source &amp; IaC page —
            copy them into the <code>iac/</code> folder in your repo before
            running.
          </p>
        </CardContent>
      </Card>
    </DocPageShell>
  );
}