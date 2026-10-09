import { Link } from "react-router-dom";
import { usePersona } from "@/lib/persona-context";
import { canSendInvitations } from "@/lib/personas";
import { useAuth, DEMO_MODE } from "@/lib/auth-context";
import { FILE_RETENTION_DAYS } from "@/lib/retention";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Folder,
  Upload,
  Clock,
  ShieldCheck,
  FileText,
  Users,
  ArrowRight,
} from "lucide-react";

const RECENT_ACTIVITY = [
  {
    user: "amer-sales",
    action: "uploaded",
    file: "Q3-forecast-vendor-a.xlsx",
    path: "Home/AMER/Sales/Vendor-A",
    when: "12 min ago",
  },
  {
    user: "corp-legal",
    action: "shared",
    file: "NDA-Bravo-2026.pdf",
    path: "Home/CORP/Legal/NDAs",
    when: "1 hr ago",
  },
  {
    user: "vendor-b",
    action: "downloaded",
    file: "RFQ-EMEA-2026-01.docx",
    path: "Home/EMEA/Procurement/Vendor-B",
    when: "3 hr ago",
  },
  {
    user: "amer-sales",
    action: "uploaded",
    file: "campaign-brief-Q4.pptx",
    path: "Home/AMER/Marketing/Campaigns",
    when: "yesterday",
  },
];

/**
 * Live home page.
 *
 * Deliberately sparse. The demo version below shows upload counts, expiring
 * file totals and a DLP status tile — all seeded values. Rendering those
 * against a live portal would state things that are not true: the activity
 * feed needs the Unified Audit Log (RB-26) and the DLP tile needs RB-18,
 * neither of which is built. An empty slot is better than a confident
 * fabrication.
 */
function LiveHomePage() {
  const { displayName, scopedPaths, isAdmin, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const folderCount = scopedPaths.includes("*")
    ? "All"
    : scopedPaths.length.toString();

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Welcome, {displayName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isAdmin
            ? "Administrator access to every region, department and partner folder."
            : "Browse and exchange files in the folders assigned to you."}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard
          icon={<Folder className="h-5 w-5" />}
          label="Folders in scope"
          value={folderCount}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="File retention"
          value={`${FILE_RETENTION_DAYS} days`}
          sub="then removed automatically"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="Access level"
          value={isAdmin ? "Administrator" : "Scoped"}
          sub="from Entra group membership"
        />
      </div>

      <div>
        <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
        <div className="grid gap-3 md:grid-cols-2">
          <QuickAction
            to="/browse"
            icon={<Folder className="h-6 w-6" />}
            title="Browse files"
            description="Navigate the folders in your scope"
          />
          <QuickAction
            to="/upload"
            icon={<Upload className="h-6 w-6" />}
            title="Upload files"
            description={`Drag and drop, retained ${FILE_RETENTION_DAYS} days`}
          />
        </div>
      </div>

      {isAdmin && (
        <Card className="border-[hsl(var(--signode-orange))]/40 bg-[hsl(var(--signode-orange))]/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-[hsl(var(--signode-black))]">
                Need to share with someone new?
              </div>
              {/* Points at the real path, not a button. In-portal invitation
                  is RB-31 and needs the API tier; until then partners are
                  invited as Entra B2B guests. "Use the Send Invitation
                  button" was accurate only while that mock button existed —
                  it was hidden from live mode on 9 Oct. */}
              <div className="text-sm text-muted-foreground">
                Partner access is granted by adding an Entra B2B guest to the
                folder&rsquo;s security group. Raise it with the Identity team —
                in-portal invitation is planned.
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function HomePage() {
  if (!DEMO_MODE) return <LiveHomePage />;
  return <DemoHomePage />;
}

function DemoHomePage() {
  const { persona } = usePersona();
  const canInvite = canSendInvitations(persona);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Welcome, {persona.displayName}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {persona.description}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          icon={<Folder className="h-5 w-5" />}
          label="Folders in scope"
          value={persona.scopedPaths.includes("*") ? "All" : persona.scopedPaths.length.toString()}
        />
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Recent uploads"
          value="24"
          sub="last 7 days"
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          label="Expiring soon"
          value="6"
          sub="within 48 hrs"
        />
        <StatCard
          icon={<ShieldCheck className="h-5 w-5" />}
          label="DLP status"
          value="Clear"
          sub="0 incidents today"
        />
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Quick actions</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <QuickAction
            to="/browse"
            icon={<Folder className="h-6 w-6" />}
            title="Browse files"
            description="Navigate the folders in your scope"
          />
          <QuickAction
            to="/upload"
            icon={<Upload className="h-6 w-6" />}
            title="Upload files"
            description="Drag and drop files into your scope"
          />
          <QuickAction
            to="/recent"
            icon={<Clock className="h-6 w-6" />}
            title="Recent activity"
            description="See uploads and downloads"
          />
        </div>
      </div>

      {/* Recent activity feed */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Recent activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RECENT_ACTIVITY.map((item, i) => (
              <div key={i} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">
                      {item.user}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {item.action}
                    </span>
                    <span className="font-medium text-sm truncate">
                      {item.file}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                    {item.path}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {item.when}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Internal-only helper strip */}
      {canInvite && (
        <Card className="border-[hsl(var(--signode-orange))]/40 bg-[hsl(var(--signode-orange))]/5">
          <CardContent className="p-4 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-[hsl(var(--signode-black))]">
                Need to share with someone new?
              </div>
              <div className="text-sm text-muted-foreground">
                Use the <strong>Send Invitation</strong> button in the top-right
                to generate a scoped, expiring link.
              </div>
            </div>
            <div className="text-[hsl(var(--signode-orange))]">
              <ArrowRight className="h-6 w-6" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--signode-orange))]">
          {icon}
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="mt-2 text-2xl font-bold text-[hsl(var(--signode-black))]">
          {value}
        </div>
        {sub && (
          <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
        )}
      </CardContent>
    </Card>
  );
}

function QuickAction({
  to,
  icon,
  title,
  description,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      className="group rounded-lg border bg-card p-4 hover:border-[hsl(var(--signode-orange))] hover:shadow-md transition-all"
    >
      <div className="flex items-start gap-3">
        <div className="rounded-md p-2 bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange))] group-hover:bg-[hsl(var(--signode-orange))] group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[hsl(var(--signode-black))]">
            {title}
          </div>
          <div className="text-sm text-muted-foreground">{description}</div>
        </div>
      </div>
    </Link>
  );
}