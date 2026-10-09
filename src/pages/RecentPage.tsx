// ---------------------------------------------------------------------------
// Recent activity.
//
// LIVE MODE  — a placeholder. No activity data, because there is none to show:
//              file activity is not available from Microsoft Graph, it lives
//              in the Unified Audit Log (RB-19 → RB-26).
//
// DEMO MODE  — the seeded version below: invented filenames and a random
//              series, for illustrating the intended shape.
//
// Gated 9 Oct 2026. The page had no mode branch at all, and while it was
// removed from the nav on 6 Oct the route stayed registered — so
// /recent rendered fabricated activity, with invented legal and compliance
// filenames, to any signed-in user including a scoped partner. Removing the
// nav link concealed it rather than fixing it.
// ---------------------------------------------------------------------------

import * as React from "react";
import * as d3 from "d3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload as UploadIcon, Download, Clock } from "lucide-react";
import { EXPIRY_CRITICAL_DAYS, expirySeverity } from "@/lib/retention";
import { DEMO_MODE } from "@/lib/auth-context";

const DAYS = 14;

function generateSeries() {
  const today = new Date();
  const arr: { date: Date; uploads: number; downloads: number }[] = [];
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push({
      date: d,
      uploads: Math.floor(4 + Math.random() * 18),
      downloads: Math.floor(6 + Math.random() * 24),
    });
  }
  return arr;
}

const RECENT_UPLOADS = [
  { name: "Q3-forecast-vendor-a.xlsx", path: "Home/AMER/Sales/Vendor-A", by: "amer-sales", size: "184 KB", when: "12 min ago", expiresInDays: 90 },
  { name: "NDA-Bravo-2026.pdf", path: "Home/CORP/Legal/NDAs", by: "corp-legal", size: "412 KB", when: "1 hr ago", expiresInDays: 90 },
  { name: "campaign-brief-Q4.pptx", path: "Home/AMER/Marketing/Campaigns", by: "amer-sales", size: "2.1 MB", when: "yesterday", expiresInDays: 89 },
  { name: "audit-notes-Q3.txt", path: "Home/CORP/Compliance/Audits", by: "global-admin", size: "22 KB", when: "2 days ago", expiresInDays: 88 },
  { name: "RFQ-EMEA-2026-01.docx", path: "Home/EMEA/Procurement/RFQs", by: "global-admin", size: "76 KB", when: "3 days ago", expiresInDays: 15 },
  { name: "phoenix-scope-v2.pdf", path: "Home/CORP/Projects/Phoenix", by: "global-admin", size: "890 KB", when: "5 days ago", expiresInDays: 4 },
];

function expiryBadge(days: number) {
  switch (expirySeverity(days)) {
    case "expired":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Expired</Badge>;
    case "critical":
      return <Badge className="bg-red-100 text-red-800 border-red-200">Expires in {days}d</Badge>;
    case "warning":
      return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Expires in {days}d</Badge>;
    default:
      return <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200">Expires in {days}d</Badge>;
  }
}

function ActivityChart({ data }: { data: { date: Date; uploads: number; downloads: number }[] }) {
  const ref = React.useRef<SVGSVGElement>(null);

  React.useEffect(() => {
    if (!ref.current) return;
    const svg = d3.select(ref.current);
    svg.selectAll("*").remove();

    const width = ref.current.clientWidth;
    const height = 260;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const x = d3
      .scaleBand<Date>()
      .domain(data.map((d) => d.date))
      .range([0, innerW])
      .padding(0.2);

    const yMax = d3.max(data, (d) => Math.max(d.uploads, d.downloads)) || 0;
    const y = d3.scaleLinear().domain([0, yMax * 1.1]).range([innerH, 0]);

    const g = svg
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    g.append("g")
      .attr("transform", `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickFormat((d) => d3.timeFormat("%b %d")(d as Date))
          .tickValues(x.domain().filter((_, i) => i % 2 === 0))
      )
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    g.append("g")
      .call(d3.axisLeft(y).ticks(5))
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#666");

    const bw = x.bandwidth() / 2;

    g.selectAll(".bar-up")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.date)!)
      .attr("y", (d) => y(d.uploads))
      .attr("width", bw)
      .attr("height", (d) => innerH - y(d.uploads))
      .attr("fill", "hsl(20 92% 48%)")
      .append("title")
      .text((d) => `${d3.timeFormat("%b %d")(d.date)}: ${d.uploads} uploads`);

    g.selectAll(".bar-dn")
      .data(data)
      .enter()
      .append("rect")
      .attr("x", (d) => x(d.date)! + bw)
      .attr("y", (d) => y(d.downloads))
      .attr("width", bw)
      .attr("height", (d) => innerH - y(d.downloads))
      .attr("fill", "hsl(0 0% 20%)")
      .append("title")
      .text((d) => `${d3.timeFormat("%b %d")(d.date)}: ${d.downloads} downloads`);
  }, [data]);

  return (
    <div className="w-full">
      <svg ref={ref} className="w-full" />
      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--signode-orange))]" />
          Uploads
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(var(--signode-black))]" />
          Downloads
        </div>
      </div>
    </div>
  );
}

function DemoRecentPage() {
  const [data] = React.useState(() => generateSeries());

  const totalUp = data.reduce((s, d) => s + d.uploads, 0);
  const totalDn = data.reduce((s, d) => s + d.downloads, 0);

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Recent activity
        </h1>
        <p className="mt-2 text-muted-foreground">
          Uploads and downloads across your scope in the last {DAYS} days.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--signode-orange))]">
              <UploadIcon className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Uploads ({DAYS}d)
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalUp}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-[hsl(var(--signode-black))]">
              <Download className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Downloads ({DAYS}d)
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold">{totalDn}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-600">
              <FileText className="h-5 w-5" />
              <span className="text-xs uppercase tracking-wider text-muted-foreground">
                Expiring &le; {EXPIRY_CRITICAL_DAYS}d
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold">
              {RECENT_UPLOADS.filter((r) => r.expiresInDays <= EXPIRY_CRITICAL_DAYS).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Activity by day</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityChart data={data} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent uploads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y">
            {RECENT_UPLOADS.map((r, i) => (
              <div
                key={i}
                className="py-3 flex items-center justify-between gap-3 flex-wrap"
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <div className="text-sm truncate">{r.name}</div>
                    <div className="text-xs text-muted-foreground font-mono truncate">
                      {r.path}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground whitespace-nowrap">
                  {r.by} &middot; {r.size} &middot; {r.when}
                </div>
                {expiryBadge(r.expiresInDays)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Live placeholder.
 *
 * Says what is coming and why it is not here, rather than showing a number.
 * Deliberately contains no file names, paths or counts — a placeholder that
 * invents plausible-looking detail is the problem this replaced.
 */
function LiveRecentPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[hsl(var(--signode-black))]">
          Recent activity
        </h1>
        <p className="mt-2 text-muted-foreground">
          Upload and download history for the folders assigned to you.
        </p>
      </div>

      <Card>
        <CardContent className="p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[hsl(var(--signode-orange))]/10 text-[hsl(var(--signode-orange))]">
            <Clock className="h-7 w-7" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-[hsl(var(--signode-black))]">
            Not available yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Activity history is being built on the Microsoft 365 audit trail.
            Until that is in place this page has nothing to show, and we would
            rather show nothing than an estimate.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export function RecentPage() {
  return DEMO_MODE ? <DemoRecentPage /> : <LiveRecentPage />;
}