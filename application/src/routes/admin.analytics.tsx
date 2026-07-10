import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, CheckCircle2, Clock, TrendingUp } from "lucide-react";
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

  const maxOverTime = useMemo(() => Math.max(1, ...overTime.map((d) => d.count)), [overTime]);
  const maxZone = useMemo(() => Math.max(1, ...byZone.map((d) => d.count)), [byZone]);
  const maxCollector = useMemo(() => Math.max(1, ...topCollectors.map((d) => d.count)), [topCollectors]);

  return (
    <>
      <PageHeader title="Analytics" subtitle="Operational performance across the city.">
        <div className="flex flex-wrap gap-1.5">
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

        {/* Top collectors */}
        <Card className="p-5">
          <h3 className="font-display font-semibold mb-4">Top collectors</h3>
          {loading ? (
            <div className="space-y-2">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
          ) : topCollectors.length === 0 ? (
            <EmptyState title="No data" body="No completions yet." />
          ) : (
            <ul className="space-y-3">
              {topCollectors.slice(0, 5).map((c, i) => (
                <li key={i}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium truncate">{c.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{c.count}</span>
                  </div>
                  <div className="h-1.5 mt-1 rounded-full bg-sand-200 overflow-hidden">
                    <div className="h-full bg-forest-500" style={{ width: `${(c.count / maxCollector) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
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
