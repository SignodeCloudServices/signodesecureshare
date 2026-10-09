import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Globe, HelpCircle, ShieldCheck, Upload, KeyRound } from "lucide-react";

const FAQS = [
  {
    q: "How long do uploaded files remain accessible?",
    a: "Files uploaded through SecureShare are retained for 90 days, then removed automatically. Look for the color-coded expiry badge next to each file — green (fresh), amber (three weeks or less remaining), red (one week or less). Note this is separate from invitation link expiry, which is 7 days by default.",
  },
  {
    q: "Why can't I see a folder I know exists?",
    a: "SecureShare uses a scoped access model — each user only sees folders assigned to their role. If you need access to a folder outside your current scope, contact IT Service Center.",
  },
  {
    q: "How do I invite an external vendor to a folder?",
    a: "Partner access is arranged internally: a Signode administrator has the partner added as a guest and granted the specific folder. Inviting from inside the portal is planned. External parties can never invite anyone.",
  },
  {
    q: "What file types are blocked?",
    a: "Executables (.exe, .bat, .ps1, .msi), archives with encrypted payloads, and files that trigger upload scanning policies (e.g., unlabeled files containing PII or PCI data) are blocked at upload.",
  },
  {
    q: "How is my sign-in secured?",
    a: "SecureShare requires phishing-resistant MFA on every sign-in — either a FIDO2 security key (or Windows Hello) or Microsoft Authenticator with number matching. Passwords alone are not accepted.",
  },
  {
    q: "Where are my files actually stored?",
    a: "Files are stored in a Signode-owned SharePoint Online site with data classification and protection controls applied automatically. Encryption at rest and in transit is enforced end-to-end.",
  },
];

export function HelpPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Help &amp; Support
        </h1>
        <p className="mt-2 text-muted-foreground">
          Get answers to common questions or reach out to the Signode IT Service
          Center.
        </p>
      </div>

      {/* Contact strip */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-[hsl(var(--signode-orange))]/40">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="rounded-md p-2 bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange))]">
              <Mail className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Support contact
              </div>
              {/* No address and no SLA until the dedicated SecureShare inbox
                  exists. The previous 24/5 / 4-business-hour commitment was
                  the IT Service Center's; it cannot be promised on behalf of
                  whoever a given partner's internal Signode contact is. */}
              <div className="text-sm text-[hsl(var(--signode-black))]">
                Your internal Signode Support Contact
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-[hsl(var(--signode-orange))]/40">
          <CardContent className="p-5 flex items-start gap-3">
            <div className="rounded-md p-2 bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange))]">
              <Globe className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Portal URL
              </div>
              https://secureshare.pkgconnect.com
              <div className="text-xs text-muted-foreground mt-1">
                Bookmark this — direct portal access
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick tips */}
      <div className="grid gap-4 md:grid-cols-3">
        <TipCard
          icon={<Upload className="h-5 w-5" />}
          title="Uploading files"
          body="Drag files onto the Upload page or click to browse. Files are scanned by security software before they land in the shared folder."
        />
        <TipCard
          icon={<KeyRound className="h-5 w-5" />}
          title="MFA on every sign-in"
          body="You'll be asked to re-authenticate with FIDO2 or Authenticator each time your session expires. This is a policy requirement, not a bug."
        />
        <TipCard
          icon={<ShieldCheck className="h-5 w-5" />}
          title="Access reviews"
          body="External access is reviewed quarterly. If your access lapses, contact your Signode sponsor to renew."
        />
      </div>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Frequently asked questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {FAQS.map((faq, i) => (
              <div key={i} className="py-4">
                <div className="font-semibold text-[hsl(var(--signode-black))]">
                  {faq.q}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {faq.a}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Escalation */}
      <Card className="bg-[hsl(var(--signode-black))] text-white">
        <CardContent className="p-6">
          <div className="text-xs uppercase tracking-widest text-[hsl(var(--signode-orange-soft))] font-semibold">
            Security incident?
          </div>
          <div className="mt-2 text-lg font-semibold">
            If you suspect a compromised account or leaked file, contact your
            internal Signode Support Contact immediately.
          </div>
          <div className="mt-3 text-sm text-white/80">
            Report it as urgent and reference SecureShare.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TipCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--signode-orange))]">
          {icon}
          <span className="font-semibold text-[hsl(var(--signode-black))]">
            {title}
          </span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  );
}