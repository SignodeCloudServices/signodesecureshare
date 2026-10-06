import { DocPageShell } from "@/components/signode/DocPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Cloud,
  ShieldCheck,
  KeyRound,
  Database,
  Activity,
  Lock,
  Server,
  Users,
  GitBranch,
  AlertTriangle,
  ClipboardCheck,
  Package,
  Eye,
} from "lucide-react";

export function ArchitecturePage() {
  return (
    <DocPageShell
      title="Architecture"
      subtitle="End-to-end design of the Signode SecureShare Portal on Microsoft 365 and Azure."
    >
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Solution overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            SecureShare is a Signode-branded, internet-facing file exchange portal
            for structured collaboration with third parties. The frontend is a
            React SPA hosted on Azure Static Web Apps. It calls a .NET 8 Azure
            Function API which brokers all storage operations to a dedicated
            SharePoint Online site collection. Identity is federated through
            Microsoft Entra External ID for CIAM (customers/vendors) and internal
            Entra ID for Signode staff. Data protection is enforced by Microsoft
            Purview sensitivity labels and DLP policies.
          </p>
          <p>
            Every request is authenticated with phishing-resistant MFA (FIDO2 or
            Authenticator with number matching), authorized against the persona's
            scoped folder set, logged to Microsoft Sentinel, and evaluated
            against DLP policies before files land in the shared library.
          </p>
        </CardContent>
      </Card>

      {/* Components */}
      <Card>
        <CardHeader>
          <CardTitle>Core components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <ComponentTile
              icon={<Server className="h-5 w-5" />}
              title="Azure Static Web Apps"
              detail="Hosts the React SPA at secureshare.pkgconnect.com. Global CDN, managed TLS, GitHub Actions deploy pipeline, staging slots for pre-prod validation."
            />
            <ComponentTile
              icon={<Activity className="h-5 w-5" />}
              title=".NET 8 Azure Function API"
              detail="Broker between the SPA and SharePoint / Graph. Consumption-plan initially; upgrade to Premium for VNet integration and always-on. Managed identity used for downstream calls."
            />
            <ComponentTile
              icon={<Users className="h-5 w-5" />}
              title="Entra External ID (CIAM)"
              detail="External vendor identities live in a separate CIAM tenant. Custom user flows enforce MFA (FIDO2 or Authenticator + number match), acceptable use acceptance, and just-in-time provisioning."
            />
            <ComponentTile
              icon={<Database className="h-5 w-5" />}
              title="SharePoint Online site collection"
              detail="Single site collection with a document library per region (AMER, EMEA, APAC, APT, CORP). Fine-grained permissions per department/BU/vendor folder via SharePoint groups mapped to Entra security groups."
            />
            <ComponentTile
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Microsoft Purview DLP"
              detail="Sensitivity labels applied automatically at upload. DLP policies quarantine files containing PII, PCI, or unlabeled confidential data. Endpoint DLP extends coverage to downloads."
            />
            <ComponentTile
              icon={<Eye className="h-5 w-5" />}
              title="Microsoft Sentinel + Log Analytics"
              detail="Central SIEM. Function API sends structured logs via App Insights. Sign-in events from Entra, SharePoint audit logs, and DLP alerts all feed Sentinel for correlation and hunting."
            />
          </div>
        </CardContent>
      </Card>

      {/* Data flow */}
      <Card>
        <CardHeader>
          <CardTitle>End-to-end request flow (upload)</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <FlowStep
              n={1}
              title="User authenticates"
              body="User hits secureshare.pkgconnect.com. Static Web App redirects to Entra External ID (external vendors) or Signode Entra ID (internal). Conditional Access requires FIDO2 or Authenticator MFA on every session start."
            />
            <FlowStep
              n={2}
              title="Session bootstrap"
              body="On successful auth, SPA calls /api/session on the Function API. Function reads Entra group claims, maps to a persona, returns the persona's scoped folder set and signed session token."
            />
            <FlowStep
              n={3}
              title="Upload request"
              body="SPA POSTs the file to /api/upload?path=Home/AMER/Sales/Vendor-A. Function validates the path is within the persona's scope and the file passes size/type checks."
            />
            <FlowStep
              n={4}
              title="DLP inline scan"
              body="Function submits the file to a Purview DLP evaluation endpoint. If a policy match blocks upload, the file is rejected with a user-visible reason. Matches that only warn proceed but are logged."
            />
            <FlowStep
              n={5}
              title="SharePoint write"
              body="Function uses its managed identity + delegated Graph token to write the file to the target SharePoint library. Sensitivity label is auto-applied. The Extranet-AutoCleanup-90d retention label governs cleanup after 90 days."
            />
            <FlowStep
              n={6}
              title="Audit + notify"
              body="Function emits a structured log to App Insights → Log Analytics → Sentinel. If configured, a notification is sent to the folder owner via Graph. The SPA receives a success response and updates the UI."
            />
          </ol>
        </CardContent>
      </Card>

      {/* Enterprise Security & Governance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Enterprise Security &amp; Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <GovSection
            icon={<GitBranch className="h-4 w-4" />}
            title="Secure SDLC"
            items={[
              "All source in Signode-owned GitHub org with branch protection, required reviews, and CODEOWNERS.",
              "SAST (GitHub CodeQL) + SCA (Dependabot + Snyk) run on every PR.",
              "Threat model reviewed quarterly and after any material change.",
              "Feature flags used to dark-ship risky changes to Dev/Test only.",
            ]}
          />
          <GovSection
            icon={<KeyRound className="h-4 w-4" />}
            title="Hardened identity"
            items={[
              "Entra Conditional Access requires phishing-resistant MFA (FIDO2 or Authenticator + number matching) for all users.",
              "Privileged access is time-bound via Entra PIM with approval workflow and Just-in-Time elevation.",
              "External identities use a separate CIAM tenant with lifecycle policies (auto-disable after 90 days of inactivity).",
              "Break-glass accounts stored in a physical safe; usage triggers Sentinel high-severity alert.",
            ]}
          />
          <GovSection
            icon={<Lock className="h-4 w-4" />}
            title="Data protection"
            items={[
              "Purview sensitivity labels auto-applied at upload based on content inspection.",
              "DLP policies block outbound movement of Confidential-labeled content to unmanaged endpoints.",
              "Customer-managed keys (CMK) for SharePoint via Key Vault HSM-backed keys.",
              "TLS 1.2+ enforced end-to-end. All storage encrypted at rest with FIPS 140-2 validated cryptography.",
            ]}
          />
          <GovSection
            icon={<Server className="h-4 w-4" />}
            title="App and API security"
            items={[
              "Function API secured behind Azure API Management with IP allowlists for admin endpoints.",
              "OWASP ASVS Level 2 baseline. Input validation, output encoding, parameterized queries.",
              "Anti-CSRF tokens on state-changing endpoints. Strict Content Security Policy on the SPA.",
              "Rate limiting and adaptive throttling to mitigate credential-stuffing and enumeration attacks.",
            ]}
          />
          <GovSection
            icon={<Cloud className="h-4 w-4" />}
            title="Infrastructure security"
            items={[
              "Private endpoints for Function → SharePoint, Function → Key Vault, Function → Storage.",
              "Azure Firewall + NSGs govern egress. Public ingress only via Static Web App and API Management.",
              "Microsoft Defender for Cloud in enforce mode across the subscription with regulatory compliance baselines (NIST SP 800-53).",
              "Bastion for any admin JIT access to backend hosts; no persistent public RDP/SSH.",
            ]}
          />
          <GovSection
            icon={<Activity className="h-4 w-4" />}
            title="Logging, monitoring, SIEM"
            items={[
              "All Azure resources ship diagnostics to a central Log Analytics workspace with 2-year retention.",
              "Microsoft Sentinel content packs: Entra sign-ins, SharePoint audit, DLP alerts, and Defender for Cloud.",
              "Custom KQL detection rules for impossible-travel, mass-download, and out-of-scope access attempts.",
              "Alerts route to the Signode SOC via PagerDuty; runbooks link from each alert.",
            ]}
          />
          <GovSection
            icon={<AlertTriangle className="h-4 w-4" />}
            title="Resilience and DR"
            items={[
              "Static Web App is globally replicated by Azure. Function API deployed active-passive across two regions.",
              "SharePoint has native geo-redundancy. Recycle bin + preservation hold + retention labels for compliance holds.",
              "Recovery Time Objective (RTO): 4 hours. Recovery Point Objective (RPO): 15 minutes.",
              "DR failover tested quarterly; runbook lives on the Runbooks page.",
            ]}
          />
          <GovSection
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="Compliance"
            items={[
              "Control baseline: NIST SP 800-53 Rev 5 Moderate + CIS Benchmarks for Azure, M365, Windows.",
              "Aligned to SOC 2 Type II and ISO 27001 for external attestation eligibility.",
              "Data residency respected per region: EMEA data pinned to EU tenants; APAC to Australia East where applicable.",
              "Quarterly access reviews via Entra Access Reviews; annual policy review by CORP Legal + IT.",
            ]}
          />
          <GovSection
            icon={<Package className="h-4 w-4" />}
            title="Supply chain security"
            items={[
              "Software Bill of Materials (SBOM) generated on every build (CycloneDX).",
              "Container images (where used) signed with Notary v2 and scanned by Defender for Containers.",
              "Third-party npm/NuGet packages restricted to an internal Artifactory mirror with malware scanning.",
              "Vendor risk assessment required before any new SaaS integration is added to the pipeline.",
            ]}
          />
          <GovSection
            icon={<ClipboardCheck className="h-4 w-4" />}
            title="Ongoing assurance"
            items={[
              "Quarterly external penetration test scoped to the SPA + API + SharePoint boundary.",
              "Continuous vulnerability scanning via Defender for Cloud; critical CVEs patched within 7 days.",
              "Purple-team exercises twice yearly covering identity, data exfiltration, and ransomware scenarios.",
              "KPI dashboard reviewed monthly by CISO office: MFA compliance, DLP incidents, SLA adherence.",
            ]}
          />
        </CardContent>
      </Card>

      {/* Scoped Access Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Scoped Access Model
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            Every persona has a defined <strong>scopedPaths</strong> list that
            enumerates the folder prefixes they are allowed to see and interact
            with. The Function API enforces scope on every request; the SPA
            enforces it visually (hiding out-of-scope tree nodes and rendering an
            "Access restricted" screen if a user navigates via URL to an
            unauthorized path).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <ScopeTile
              label="Global Admin"
              scope="*"
              detail="Signode IT — full access to every region, department, and BU. Can send invitations, manage user lifecycle, and run access reviews."
              internal
            />
            <ScopeTile
              label="AMER Sales"
              scope="Home/AMER/Sales, Home/AMER/Marketing"
              detail="Regional sales lead. Can invite external vendors into folders within scope."
              internal
            />
            <ScopeTile
              label="CORP Legal"
              scope="Home/CORP/Legal, Home/CORP/Compliance"
              detail="Corporate counsel. Can invite outside counsel and contract counterparties."
              internal
            />
            <ScopeTile
              label="Vendor A"
              scope="Home/AMER/Sales/Vendor-A"
              detail="External vendor. Cannot invite others. All access is time-boxed and reviewed quarterly."
            />
            <ScopeTile
              label="Vendor B"
              scope="Home/EMEA/Procurement/Vendor-B"
              detail="External vendor. Cannot invite others. All access is time-boxed and reviewed quarterly."
            />
            <ScopeTile
              label="Project Phoenix"
              scope="Home/CORP/Projects/Phoenix"
              detail="External project team. Access expires at project close-out per PMO handoff."
            />
          </div>
          <p>
            Scope is enforced at three layers:{" "}
            <strong>Entra group membership</strong> (grants API access),{" "}
            <strong>Function API path check</strong> (rejects out-of-scope
            requests with 403), and <strong>SharePoint permissions</strong>{" "}
            (defense in depth — even if the API is bypassed, the underlying store
            rejects the operation).
          </p>
        </CardContent>
      </Card>
    </DocPageShell>
  );
}

function ComponentTile({
  icon,
  title,
  detail,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center gap-2 text-[hsl(var(--signode-orange))]">
        {icon}
        <span className="font-semibold text-[hsl(var(--signode-black))]">
          {title}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function FlowStep({
  n,
  title,
  body,
}: {
  n: number;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--signode-orange))] text-white text-xs font-bold">
        {n}
      </div>
      <div>
        <div className="font-semibold text-[hsl(var(--signode-black))]">
          {title}
        </div>
        <div className="text-muted-foreground">{body}</div>
      </div>
    </li>
  );
}

function GovSection({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[hsl(var(--signode-orange-deep))] mb-1">
        {icon}
        <span className="font-semibold text-sm uppercase tracking-wider">
          {title}
        </span>
      </div>
      <ul className="ml-6 space-y-1 text-sm text-muted-foreground list-disc">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function ScopeTile({
  label,
  scope,
  detail,
  internal,
}: {
  label: string;
  scope: string;
  detail: string;
  internal?: boolean;
}) {
  return (
    <div className="rounded-md border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-semibold text-[hsl(var(--signode-black))]">
          {label}
        </span>
        <Badge
          variant="outline"
          className={
            internal
              ? "border-[hsl(var(--signode-orange))]/40 text-[hsl(var(--signode-orange-deep))]"
              : ""
          }
        >
          {internal ? "Internal" : "External"}
        </Badge>
      </div>
      <div className="mt-1 font-mono text-xs text-muted-foreground break-all">
        {scope}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}