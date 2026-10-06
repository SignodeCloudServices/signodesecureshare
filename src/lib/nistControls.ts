export type NistControl = {
  id: string;
  family: string;
  title: string;
  baseline: "Low" | "Moderate" | "High";
  status: "Implemented" | "Partial" | "Planned";
  owner: string;
  evidence: string;
};

export const CONTROL_FAMILIES = [
  "AC — Access Control",
  "AT — Awareness & Training",
  "AU — Audit & Accountability",
  "CA — Assessment & Authorization",
  "CM — Configuration Management",
  "CP — Contingency Planning",
  "IA — Identification & Authentication",
  "IR — Incident Response",
  "MP — Media Protection",
  "PE — Physical & Environmental",
  "PL — Planning",
  "PS — Personnel Security",
  "RA — Risk Assessment",
  "SA — System & Services Acquisition",
  "SC — System & Communications Protection",
  "SI — System & Information Integrity",
] as const;

export const NIST_CONTROLS: NistControl[] = [
  // AC
  { id: "AC-2", family: "AC — Access Control", title: "Account Management", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "Entra lifecycle policies + quarterly access reviews" },
  { id: "AC-3", family: "AC — Access Control", title: "Access Enforcement", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Function API path check + SharePoint permissions" },
  { id: "AC-4", family: "AC — Access Control", title: "Information Flow Enforcement", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Private endpoints + Azure Firewall egress rules" },
  { id: "AC-6", family: "AC — Access Control", title: "Least Privilege", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "Entra PIM + scopedPaths per persona" },
  { id: "AC-17", family: "AC — Access Control", title: "Remote Access", baseline: "Moderate", status: "Implemented", owner: "IT Ops", evidence: "Conditional Access + Bastion for admin" },

  // AT
  { id: "AT-2", family: "AT — Awareness & Training", title: "Literacy Training & Awareness", baseline: "Moderate", status: "Implemented", owner: "HR + CISO", evidence: "Annual training via KnowBe4; phishing simulations quarterly" },
  { id: "AT-3", family: "AT — Awareness & Training", title: "Role-Based Training", baseline: "Moderate", status: "Partial", owner: "CISO", evidence: "Dev + admin tracks defined; ops track in build" },

  // AU
  { id: "AU-2", family: "AU — Audit & Accountability", title: "Event Logging", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "All resources → Log Analytics with 2yr retention" },
  { id: "AU-3", family: "AU — Audit & Accountability", title: "Content of Audit Records", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Structured JSON logs from Function API" },
  { id: "AU-6", family: "AU — Audit & Accountability", title: "Audit Record Review, Analysis, Reporting", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Sentinel content pack + custom KQL detections" },
  { id: "AU-11", family: "AU — Audit & Accountability", title: "Audit Record Retention", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "24-month retention policy on workspace" },

  // CA
  { id: "CA-2", family: "CA — Assessment & Authorization", title: "Control Assessments", baseline: "Moderate", status: "Implemented", owner: "GRC", evidence: "Annual assessment + external SOC 2 Type II" },
  { id: "CA-7", family: "CA — Assessment & Authorization", title: "Continuous Monitoring", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Defender for Cloud enforce mode" },

  // CM
  { id: "CM-2", family: "CM — Configuration Management", title: "Baseline Configuration", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Bicep/Terraform IaC in version control" },
  { id: "CM-3", family: "CM — Configuration Management", title: "Configuration Change Control", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "PR reviews + CAB for prod deploys" },
  { id: "CM-6", family: "CM — Configuration Management", title: "Configuration Settings", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "CIS Benchmarks enforced via Azure Policy" },
  { id: "CM-8", family: "CM — Configuration Management", title: "System Component Inventory", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Defender for Cloud inventory + SBOM per build" },

  // CP
  { id: "CP-2", family: "CP — Contingency Planning", title: "Contingency Plan", baseline: "Moderate", status: "Implemented", owner: "IT Ops", evidence: "DR runbook + quarterly failover test" },
  { id: "CP-9", family: "CP — Contingency Planning", title: "System Backup", baseline: "Moderate", status: "Implemented", owner: "IT Ops", evidence: "SharePoint native + retention labels" },
  { id: "CP-10", family: "CP — Contingency Planning", title: "System Recovery & Reconstitution", baseline: "Moderate", status: "Implemented", owner: "IT Ops", evidence: "RTO 4h / RPO 15m validated in test" },

  // IA
  { id: "IA-2", family: "IA — Identification & Authentication", title: "Identification & Authentication (Users)", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "Entra CA + phishing-resistant MFA" },
  { id: "IA-5", family: "IA — Identification & Authentication", title: "Authenticator Management", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "FIDO2 + Authenticator w/ number match" },
  { id: "IA-8", family: "IA — Identification & Authentication", title: "Identification & Authentication (Non-Org Users)", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "Entra B2B guests + guest-scoped CA" },

  // IR
  { id: "IR-4", family: "IR — Incident Response", title: "Incident Handling", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "IR runbook + PagerDuty rotation" },
  { id: "IR-6", family: "IR — Incident Response", title: "Incident Reporting", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "48hr regulator reporting workflow" },
  { id: "IR-8", family: "IR — Incident Response", title: "Incident Response Plan", baseline: "Moderate", status: "Implemented", owner: "CISO", evidence: "Reviewed annually; tabletop twice/year" },

  // MP
  { id: "MP-6", family: "MP — Media Protection", title: "Media Sanitization", baseline: "Moderate", status: "Implemented", owner: "IT Ops", evidence: "NIST 800-88 wipe on decom" },

  // PE
  { id: "PE-3", family: "PE — Physical & Environmental", title: "Physical Access Control", baseline: "Moderate", status: "Implemented", owner: "Facilities", evidence: "Inherited from Microsoft Azure (SOC 2)" },

  // PL
  { id: "PL-2", family: "PL — Planning", title: "System Security & Privacy Plans", baseline: "Moderate", status: "Implemented", owner: "GRC", evidence: "SSPP maintained in Confluence; reviewed yearly" },
  { id: "PL-8", family: "PL — Planning", title: "Security & Privacy Architectures", baseline: "Moderate", status: "Implemented", owner: "Architecture", evidence: "This Architecture page + Visio diagrams" },

  // PS
  { id: "PS-3", family: "PS — Personnel Security", title: "Personnel Screening", baseline: "Moderate", status: "Implemented", owner: "HR", evidence: "Background checks pre-hire" },
  { id: "PS-4", family: "PS — Personnel Security", title: "Personnel Termination", baseline: "Moderate", status: "Implemented", owner: "HR + IAM", evidence: "Deprovisioning runbook triggered by Workday" },

  // RA
  { id: "RA-3", family: "RA — Risk Assessment", title: "Risk Assessment", baseline: "Moderate", status: "Implemented", owner: "GRC", evidence: "Annual + on material change" },
  { id: "RA-5", family: "RA — Risk Assessment", title: "Vulnerability Monitoring & Scanning", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Defender for Cloud + Snyk continuous" },

  // SA
  { id: "SA-11", family: "SA — System & Services Acquisition", title: "Developer Testing & Evaluation", baseline: "Moderate", status: "Implemented", owner: "Dev", evidence: "CodeQL SAST + Snyk SCA on every PR" },
  { id: "SA-15", family: "SA — System & Services Acquisition", title: "Development Process, Standards, Tools", baseline: "Moderate", status: "Implemented", owner: "Dev", evidence: "SSDLC standard v3.1 in Confluence" },
  { id: "SA-22", family: "SA — System & Services Acquisition", title: "Unsupported System Components", baseline: "Moderate", status: "Planned", owner: "Platform Eng", evidence: "Auto-EOL tracking in build" },

  // SC
  { id: "SC-7", family: "SC — System & Communications Protection", title: "Boundary Protection", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Azure Firewall + API Management + private endpoints" },
  { id: "SC-8", family: "SC — System & Communications Protection", title: "Transmission Confidentiality & Integrity", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "TLS 1.2+ enforced end-to-end" },
  { id: "SC-12", family: "SC — System & Communications Protection", title: "Cryptographic Key Establishment & Management", baseline: "Moderate", status: "Implemented", owner: "IAM Team", evidence: "Key Vault HSM + CMK rotation quarterly" },
  { id: "SC-28", family: "SC — System & Communications Protection", title: "Protection of Information at Rest", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "FIPS 140-2 validated encryption" },

  // SI
  { id: "SI-2", family: "SI — System & Information Integrity", title: "Flaw Remediation", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Critical patched in 7d; SLA tracked on Security page" },
  { id: "SI-3", family: "SI — System & Information Integrity", title: "Malicious Code Protection", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Defender AV + Purview + endpoint DLP" },
  { id: "SI-4", family: "SI — System & Information Integrity", title: "System Monitoring", baseline: "Moderate", status: "Implemented", owner: "SOC", evidence: "Sentinel + Defender for Cloud + custom KQL" },
  { id: "SI-7", family: "SI — System & Information Integrity", title: "Software, Firmware & Information Integrity", baseline: "Moderate", status: "Implemented", owner: "Platform Eng", evidence: "Signed artifacts + Notary v2 for containers" },
];