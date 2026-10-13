import * as React from "react";
import * as d3 from "d3";
import { DocPageShell } from "@/components/signode/DocPageShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  AlertTriangle,
  Bug,
  Users,
  KeyRound,
  Lock,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

// --- Mock data -------------------------------------------------------------

const MFA_COMPLIANCE = {
  overall: 98.7,
  internal: 100,
  external: 96.4,
  target: 99,
};

const DLP_INCIDENTS = {
  today: 0,
  last7d: 4,
  last30d: 17,
  quarantined: 3,
  falsePositive: 1,
};

const VULN_SLA = [
  { severity: "Critical", open: 0, target: "7 days", inSla: 100 },
  { severity: "High", open: 2, target: "14 days", inSla: 100 },
  { severity: "Medium", open: 11, target: "30 days", inSla: 92 },
  { severity: "Low", open: 34, target: "90 days", inSla: 88 },
];

const ACCESS_REVIEWS = {
  campaignsThisQuarter: 4,
  completed: 3,
  inProgress: 1,
  revocations: 12,
  reviewers: 18,
};

const RECENT_ALERTS = [
  { time: "08:14", severity: "Medium", title: "Impossible travel — vendor-b", status: "Triaging" },
  { time: "yesterday 16:02", severity: "Low", title: "Mass download attempt — throttled", status: "Closed" },
  { time: "yesterday 09:41", severity: "High", title: "Sign-in from unfamiliar IP — global-admin (BG account)", status: "Closed — expected" },
  { time: "2 days ago", severity: "Medium", title: "DLP: PII in unlabeled upload — quarantined", status: "Closed" },
  { time: "3 days ago", severity: "Low", title: "Guest sign-in outside business hours", status: "Closed" },
];

// --- D3 alert-trend chart --------------------------------------------------

const TREND_DAYS = 30;

function generateAlertSeries() {
  const today = new Date();
  const arr: {
    date: Date;
    low: number;
    medium: number;
    high: number;
    critical: number;
  }[] = [];
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push({
      date: d,
      low: Math.floor(Math.random() * 6),
      medium: Math.floor(Math.random() * 4),
      high: Math.random() < 0.15 ? 1 : 0,
      critical: Math.random() < 0.03 ? 1 : 0,
    });
  }
  return arr;
}

type AlertRow = {
  date: Date;
  low: number;
  medium: number;
  high: number;
  critical: number;
};

function AlertTrendChart({ data }: { data: AlertRow[] }) {
  const ref = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = 300;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const keys = ["low", "medium", "high", "critical"] as const;
    const colors: Record<(typeof keys)[number], string> = {
      low: "hsl(210 12% 70%)",
      medium: "hsl(38 92% 55%)",
      high: "hsl(20 92% 48%)",
      critical: "hsl(0 72% 45%)",
    };

    const stack = d3
      .stack<AlertRow>()
      .keys(keys)(data);

    const x = d3
      .scaleBand<Date>()
      .domain(data.map((d) => d.date))
      .range([0, innerW])
      .padding(0.15);

    const yMax = d3.max(stack, (layer) => d3.max(layer, (d) => d[1])) || 0;
    const y = d3
      .scaleLinear()
      .domain([0, Math.max(yMax, 4) * 1.15])
      .range([innerH, 0]);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Y grid
    g.append("g")
      .attr("class", "grid")
      .call(
        d3
          .axisLeft(y)
          .ticks(5)
          .tickSize(-innerW)
          .tickFormat(() => "")
      )
      .selectAll("line")
      .style("stroke", "#eee");
    g.select(".grid .domain").remove();

    // Axes
    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
          .tickValues(x.domain().filter((_, i) => i % 4 === 0))
      )
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    // Stacked bars
    stack.forEach((layer, idx) => {
      const key = keys[idx];
      g.selectAll(`.bar-${key}`)
        .data(layer)
        .enter()
        .append("rect")
        .attr("x", (d) => x(d.data.date)!)
        .attr("y", (d) => y(d[1]))
        .attr("height", (d) => y(d[0]) - y(d[1]))
        .attr("width", x.bandwidth())
        .attr("fill", colors[key])
        .append("title")
        .text((d) => {
          const total = d.data.low + d.data.medium + d.data.high + d.data.critical;
          return `${d3.timeFormat("%b %d")(d.data.date)}: ${total} alerts (${d.data.critical} crit, ${d.data.high} high, ${d.data.medium} med, ${d.data.low} low)`;
        });
    });

    // 7-day rolling total line
    const totalPerDay = data.map((d) => d.low + d.medium + d.high + d.critical);
    const rolling: { date: Date; value: number }[] = data.map((d, i) => {
      const start = Math.max(0, i - 6);
      const slice = totalPerDay.slice(start, i + 1);
      return {
        date: d.date,
        value: slice.reduce((s, v) => s + v, 0) / slice.length,
      };
    });

    const line = d3
      .line<{ date: Date; value: number }>()
      .x((d) => x(d.date)! + x.bandwidth() / 2)
      .y((d) => y(d.value))
      .curve(d3.curveMonotoneX);

    g.append("path")
      .datum(rolling)
      .attr("fill", "none")
      .attr("stroke", "hsl(0 0% 10%)")
      .attr("stroke-width", 2)
      .attr("stroke-dasharray", "4 3")
      .attr("d", line);
  }, [data]);

  return (
    <div className="w-full">
      <svg ref={ref} className="w-full" />
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
        <LegendSwatch color="hsl(210 12% 70%)" label="Low" />
        <LegendSwatch color="hsl(38 92% 55%)" label="Medium" />
        <LegendSwatch color="hsl(20 92% 48%)" label="High" />
        <LegendSwatch color="hsl(0 72% 45%)" label="Critical" />
        <div className="flex items-center gap-1.5">
          <span
            className="inline-block h-0.5 w-4"
            style={{
              background:
                "repeating-linear-gradient(to right, hsl(0 0% 10%) 0 4px, transparent 4px 7px)",
            }}
          />
          <span>7-day rolling avg</span>
        </div>
      </div>
    </div>
  );
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: color }}
      />
      {label}
    </div>
  );
}

// --- Page ------------------------------------------------------------------

export function SecurityPage() {
  const [alertData] = React.useState(() => generateAlertSeries());

  const mfaHealthy = MFA_COMPLIANCE.overall >= MFA_COMPLIANCE.target;

  return (
    <DocPageShell
      title="Security"
      subtitle="Operational dashboard — MFA posture, DLP incidents, vulnerability SLA, access reviews, and Sentinel alert trends."
    >
      {/* KPI strip */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          icon={<KeyRound className="h-5 w-5" />}
          label="MFA compliance"
          value={`${MFA_COMPLIANCE.overall}%`}
          sub={`Target ${MFA_COMPLIANCE.target}%`}
          trend={mfaHealthy ? "up" : "down"}
          tone={mfaHealthy ? "good" : "warn"}
        />
        <KpiCard
          icon={<AlertTriangle className="h-5 w-5" />}
          label="DLP incidents (7d)"
          value={DLP_INCIDENTS.last7d.toString()}
          sub={`${DLP_INCIDENTS.quarantined} quarantined`}
          trend="flat"
          tone={DLP_INCIDENTS.last7d < 10 ? "good" : "warn"}
        />
        <KpiCard
          icon={<Bug className="h-5 w-5" />}
          label="Vuln SLA"
          value={`${Math.round(
            VULN_SLA.reduce((s, v) => s + v.inSla, 0) / VULN_SLA.length
          )}%`}
          sub={`${VULN_SLA.reduce((s, v) => s + v.open, 0)} open findings`}
          trend="up"
          tone="good"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label="Access reviews"
          value={`${ACCESS_REVIEWS.completed}/${ACCESS_REVIEWS.campaignsThisQuarter}`}
          sub={`${ACCESS_REVIEWS.revocations} revocations this quarter`}
          trend="up"
          tone="good"
        />
      </div>

      {/* Alert trend chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Sentinel alert trend — last {TREND_DAYS} days
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AlertTrendChart data={alertData} />
        </CardContent>
      </Card>

      {/* Two-column details */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* MFA compliance breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <KeyRound className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
              MFA compliance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ComplianceBar label="Internal users" value={MFA_COMPLIANCE.internal} />
            <ComplianceBar label="External users" value={MFA_COMPLIANCE.external} />
            <ComplianceBar label="Overall" value={MFA_COMPLIANCE.overall} highlight />
            <p className="mt-4 text-xs text-muted-foreground">
              Phishing-resistant MFA (FIDO2 or Authenticator with number matching)
              is required on every sign-in via Entra Conditional Access. The
              external gap of {(100 - MFA_COMPLIANCE.external).toFixed(1)}% is
              tracked as an open finding — see the DLP quarantine review runbook
              for exception handling.
            </p>
          </CardContent>
        </Card>

        {/* DLP incidents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
              DLP incidents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 text-center">
              <MiniStat label="Today" value={DLP_INCIDENTS.today} />
              <MiniStat label="Last 7d" value={DLP_INCIDENTS.last7d} />
              <MiniStat label="Last 30d" value={DLP_INCIDENTS.last30d} />
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quarantined</span>
                <span className="font-semibold">{DLP_INCIDENTS.quarantined}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">False positives</span>
                <span className="font-semibold">
                  {DLP_INCIDENTS.falsePositive}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reviewed &amp; released</span>
                <span className="font-semibold">
                  {DLP_INCIDENTS.last30d -
                    DLP_INCIDENTS.quarantined -
                    DLP_INCIDENTS.falsePositive}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Vulnerability SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bug className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
              Vulnerability SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground border-b">
                  <th className="text-left py-2">Severity</th>
                  <th className="text-right">Open</th>
                  <th className="text-right">Target</th>
                  <th className="text-right">In SLA</th>
                </tr>
              </thead>
              <tbody>
                {VULN_SLA.map((v) => (
                  <tr key={v.severity} className="border-b last:border-0">
                    <td className="py-2">{v.severity}</td>
                    <td className="text-right">{v.open}</td>
                    <td className="text-right text-muted-foreground">
                      {v.target}
                    </td>
                    <td className="text-right">
                      <SlaBadge value={v.inSla} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Access reviews */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
              Access reviews (this quarter)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              <MiniStat label="Campaigns" value={ACCESS_REVIEWS.campaignsThisQuarter} />
              <MiniStat label="Completed" value={ACCESS_REVIEWS.completed} />
              <MiniStat label="In progress" value={ACCESS_REVIEWS.inProgress} />
              <MiniStat label="Revocations" value={ACCESS_REVIEWS.revocations} />
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              {ACCESS_REVIEWS.reviewers} reviewers across the 5 regions. Reviews
              are driven by Entra Access Reviews and closed via the
              access-review campaigns runbook.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent alerts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-[hsl(var(--signode-orange))]" />
            Recent Sentinel alerts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RECENT_ALERTS.map((a, i) => (
              <div
                key={i}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <SeverityBadge severity={a.severity} />
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {a.time}
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {a.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Posture summary */}
      <Card className="bg-[hsl(var(--signode-black))] text-white">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[hsl(var(--signode-orange-soft))] mb-2">
            <Lock className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-widest">
              Posture summary
            </span>
          </div>
          <p className="text-sm text-white/90">
            SecureShare is currently rated <strong>HEALTHY</strong>. MFA is above
            target, no open critical vulnerabilities, and access review campaigns
            are on track. The external MFA gap and one open impossible-travel
            investigation are the only items requiring attention this cycle.
          </p>
        </CardContent>
      </Card>
    </DocPageShell>
  );
}

// --- Helper components -----------------------------------------------------

function KpiCard({
  icon,
  label,
  value,
  sub,
  trend,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  trend?: "up" | "down" | "flat";
  tone?: "good" | "warn" | "bad";
}) {
  const toneColor =
    tone === "good"
      ? "text-emerald-600"
      : tone === "warn"
      ? "text-amber-600"
      : tone === "bad"
      ? "text-red-600"
      : "text-muted-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[hsl(var(--signode-orange))]">
          {icon}
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span className={`ml-auto ${toneColor}`}>
            {trend === "up" ? (
              <TrendingUp className="h-4 w-4" />
            ) : trend === "down" ? (
              <TrendingDown className="h-4 w-4" />
            ) : (
              <Minus className="h-4 w-4" />
            )}
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

function ComplianceBar({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="flex justify-between text-sm mb-1">
        <span className={highlight ? "font-semibold" : ""}>{label}</span>
        <span
          className={
            highlight
              ? "font-bold text-[hsl(var(--signode-orange-deep))]"
              : "font-medium"
          }
        >
          {value}%
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={
            highlight
              ? "h-full bg-[hsl(var(--signode-orange))]"
              : "h-full bg-[hsl(var(--signode-black))]"
          }
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border p-2">
      <div className="text-2xl font-bold text-[hsl(var(--signode-black))]">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function SlaBadge({ value }: { value: number }) {
  const color =
    value >= 95
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : value >= 85
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-red-100 text-red-800 border-red-200";
  return <Badge className={color}>{value}%</Badge>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const color =
    severity === "Critical"
      ? "bg-red-100 text-red-800 border-red-200"
      : severity === "High"
      ? "bg-[hsl(var(--signode-orange))]/15 text-[hsl(var(--signode-orange-deep))] border-[hsl(var(--signode-orange))]/40"
      : severity === "Medium"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : "bg-slate-100 text-slate-700 border-slate-200";
  return <Badge className={`shrink-0 ${color}`}>{severity}</Badge>;
}