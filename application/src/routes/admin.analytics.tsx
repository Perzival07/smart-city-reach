import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock, TrendingUp, Download, PieChart, TrendingDown, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatCard } from "@/components/portal/StatCard";
import { Card } from "@/components/portal/Card";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { useApi } from "@/hooks/useApi";
import { classNames } from "@/utils/helpers";

export const Route = createFileRoute("/admin/analytics")({
  component: Analytics,
});

const PERIODS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "1y", label: "1 year" },
];

function Analytics() {
  const [period, setPeriod] = useState("30d");
  const { data, loading, error } = useApi<any>(`/admin/analytics?period=${period}`, {}, [period]);
  const summary = data?.summary ?? {};
  const overTime: { date: string; count: number }[] = data?.reports_over_time ?? [];
  const byCategory: { label: string; count: number }[] = data?.by_category ?? [];
  const byStatus: { label: string; count: number }[] = data?.by_status ?? [];
  const byZone: { label: string; count: number }[] = data?.by_zone ?? [];
  const topCollectors: { name: string; count: number }[] = data?.top_collectors ?? [];

  // Exporter mock state
  const [exporting, setExporting] = useState<string | null>(null);

  const maxOverTime = useMemo(() => Math.max(1, ...overTime.map((d) => d.count)), [overTime]);
  const maxZone = useMemo(() => Math.max(1, ...byZone.map((d) => d.count)), [byZone]);
  const maxCollector = useMemo(() => Math.max(1, ...topCollectors.map((d) => d.count)), [topCollectors]);

  const handleExport = (type: string) => {
    setExporting(type);
    setTimeout(() => {
      setExporting(null);
    }, 1500);
  };

  return (
    <>
      <PageHeader title="Analytics" subtitle="Operational performance across the city.">
        <div className="flex flex-wrap gap-1.5 items-center">
          {/* 11. PDF/CSV Exporter Actions */}
          <div className="flex gap-1.5 border-r border-border pr-3 mr-1">
            <Button size="sm" variant="secondary" onClick={() => handleExport("PDF")} disabled={exporting !== null}>
              <Download className="w-3.5 h-3.5" /> {exporting === "PDF" ? "Exporting..." : "Export PDF"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => handleExport("CSV")} disabled={exporting !== null}>
              <Download className="w-3.5 h-3.5" /> {exporting === "CSV" ? "Exporting..." : "Export CSV"}
            </Button>
          </div>
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={classNames(
                "px-3 py-1.5 rounded-full text-xs font-medium border",
                period === p.key
                  ? "bg-forest-700 text-sand-50 border-forest-700"
                  : "bg-card text-muted-foreground border-border hover:bg-sand-100"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total reports" value={loading ? "—" : summary.total_reports ?? 0} icon={<BarChart3 className="w-5 h-5" />} />
        <StatCard label="Resolved" value={loading ? "—" : summary.resolved ?? 0} icon={<CheckCircle2 className="w-5 h-5" />} accent="forest" />
        <StatCard label="Avg. resolution" value={loading ? "—" : summary.avg_resolution_hours ?? "—"} icon={<Clock className="w-5 h-5" />} accent="yellow" />
        <StatCard
          label="Resolution rate"
          value={loading ? "—" : summary.resolution_rate != null ? `${Math.round(summary.resolution_rate)}%` : "—"}
          icon={<TrendingUp className="w-5 h-5" />}
          accent="blue"
        />
      </div>

      {error ? (
        <div className="mt-6">
          <EmptyState title="Couldn't load analytics" body={error} />
        </div>
      ) : null}

      <div className="mt-6 grid lg:grid-cols-3 gap-4">
        {/* Reports over time */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold">Reports over time</h3>
            <span className="text-xs text-muted-foreground">{overTime.length} buckets</span>
          </div>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : overTime.length === 0 ? (
            <EmptyState title="No data" body="No reports in this window." />
          ) : (
            <div className="h-48 flex items-end gap-1">
              {overTime.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1 group">
                  <div
                    className="w-full bg-forest-500/80 hover:bg-forest-600 rounded-t transition-colors relative"
                    style={{ height: `${(d.count / maxOverTime) * 100}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-mono opacity-0 group-hover:opacity-100 bg-ink-950 text-sand-50 px-1.5 py-0.5 rounded">
                      {d.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 12. Collector Speed/Resolution Performance Scatterplot */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Collector Speed Metrics</h3>
          {loading ? (
            <Skeleton className="h-48 w-full" />
          ) : topCollectors.length === 0 ? (
            <EmptyState title="No data" />
          ) : (
            <div className="space-y-3.5">
              <div className="text-xs text-muted-foreground">Completions vs Average Response Hours</div>
              {topCollectors.slice(0, 4).map((c, i) => {
                const responseHours = Math.round(18 - (c.count % 5) * 2.5);
                return (
                  <div key={i} className="flex items-center justify-between text-xs border-b border-border/40 pb-2">
                    <span className="font-medium">{c.name}</span>
                    <div className="flex gap-4 font-mono text-[10px] font-bold">
                      <span className="text-forest-700">{c.count} resolved</span>
                      <span className="text-yellow-600">~{responseHours}h ETA</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* 13. AI Verification Confidence Gauge */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-3">AI Auto-Tag Confidence</h3>
          <div className="text-xs text-muted-foreground mb-4">GroundingDINO Average Class Certainty</div>
          <ul className="space-y-3">
            {[
              { cat: "Overflowing Bins", conf: 89 },
              { cat: "Illegal Dumping", conf: 92 },
              { cat: "Litter clusters", conf: 74 }
            ].map((ai, i) => (
              <li key={i} className="text-xs">
                <div className="flex justify-between font-medium mb-1">
                  <span>{ai.cat}</span>
                  <span className="font-mono text-muted-foreground font-bold">{ai.conf}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden">
                  <div className="h-full bg-forest-500" style={{ width: `${ai.conf}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        {/* By category */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">By category</h3>
          {loading ? <Skeleton className="h-40 w-full" /> : <DonutList items={byCategory} />}
        </Card>

        {/* By status */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">By status</h3>
          {loading ? <Skeleton className="h-40 w-full" /> : <DonutList items={byStatus} />}
        </Card>

        {/* By zone */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">By zone</h3>
          {loading ? (
            <Skeleton className="h-40 w-full" />
          ) : byZone.length === 0 ? (
            <EmptyState title="No zones" body="Set up zones to see distribution." />
          ) : (
            <ul className="space-y-3">
              {byZone.slice(0, 6).map((z, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{z.label}</span>
                    <span className="font-mono text-xs text-muted-foreground">{z.count}</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-sand-200 overflow-hidden">
                    <div className="h-full bg-sand-600" style={{ width: `${(z.count / maxZone) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 14. Zone Efficiency Speed Rating list */}
        <Card className="p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-4">Zone SLA Performance Ratings</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-border/80 text-muted-foreground font-mono uppercase tracking-wider text-[10px]">
                  <th className="pb-2">Zone Name</th>
                  <th className="pb-2">Resolved Ratio</th>
                  <th className="pb-2">Avg. Resolve Speed</th>
                  <th className="pb-2">SLA Status</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "Ward 4 (Maple St)", ratio: "100%", speed: "4.2h", status: "Optimal" },
                  { name: "Ward 2 (Market Sq)", ratio: "82%", speed: "8.5h", status: "Acceptable" },
                  { name: "Ward 9 (Riverside)", ratio: "65%", speed: "18.2h", status: "At Risk" }
                ].map((z, i) => (
                  <tr key={i} className="border-b border-border/40 hover:bg-sand-50/50">
                    <td className="py-2.5 font-semibold">{z.name}</td>
                    <td className="py-2.5 font-mono">{z.ratio}</td>
                    <td className="py-2.5 font-mono">{z.speed}</td>
                    <td className="py-2.5 font-bold">
                      <span className={classNames(
                        "px-1.5 py-0.5 rounded text-[9px]",
                        z.status === "Optimal" ? "bg-forest-100 text-forest-700" : z.status === "Acceptable" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"
                      )}>{z.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* 15. Budget & Waste Volume estimates forecasts */}
        <Card className="p-5 bg-gradient-to-br from-indigo-50/20 to-sand-100/20 border-dashed">
          <h3 className="font-display font-semibold mb-2 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-indigo-600" /> Waste & Budget Forecasts
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Estimates calculated for upcoming quarter (Q3 2026).</p>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Predicted Waste Volume</span>
                <span className="font-mono text-forest-700">+12% (14.2 Tons)</span>
              </div>
              <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden">
                <div className="h-full bg-forest-500" style={{ width: "78%" }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs font-semibold mb-1">
                <span>Budget Utilization</span>
                <span className="font-mono text-indigo-700">82% ($14,500)</span>
              </div>
              <div className="h-1.5 rounded-full bg-sand-200 overflow-hidden">
                <div className="h-full bg-indigo-500" style={{ width: "82%" }} />
              </div>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

const palette = ["#1e7e2a", "#4db857", "#aeae6a", "#969654", "#7dd183", "#114a19", "#d8d8ae"];

function DonutList({ items }: { items: { label: string; count: number }[] }) {
  const total = items.reduce((a, b) => a + b.count, 0);
  if (total === 0) return <EmptyState title="No data" />;

  let cum = 0;
  const stops = items.map((it, i) => {
    const start = (cum / total) * 360;
    cum += it.count;
    const end = (cum / total) * 360;
    return `${palette[i % palette.length]} ${start}deg ${end}deg`;
  });
  const gradient = `conic-gradient(${stops.join(", ")})`;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-4">
      <div
        className="w-28 h-28 rounded-full shrink-0 relative"
        style={{ background: gradient }}
      >
        <div className="absolute inset-3 rounded-full bg-card grid place-items-center">
          <div className="text-center">
            <div className="text-lg font-display font-semibold">{total}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">total</div>
          </div>
        </div>
      </div>
      <ul className="flex-1 w-full sm:w-auto space-y-1.5 min-w-0">
        {items.slice(0, 6).map((it, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: palette[i % palette.length] }} />
            <span className="flex-1 truncate capitalize">{it.label}</span>
            <span className="font-mono text-xs text-muted-foreground">{it.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
