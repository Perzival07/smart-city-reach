import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, History, CheckCircle2, Clock, Calendar } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { FormField } from "@/components/portal/FormField";
import { StatCard } from "@/components/portal/StatCard";
import { Table, Th, Td } from "@/components/portal/Table";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { useApi } from "@/hooks/useApi";
import { classNames, formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/collector/history")({
  component: JobHistory,
});

const PERIODS: { key: string; label: string; days: number | null }[] = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "all", label: "All time", days: null },
];

function JobHistory() {
  const [period, setPeriod] = useState("30d");
  const [search, setSearch] = useState("");
  const { data, loading, error } = useApi<any>(
    "/collector/tasks?status=resolved&limit=200",
    {},
    []
  );
  const all: any[] = Array.isArray(data) ? data : data?.items ?? [];

  const filtered = useMemo(() => {
    const days = PERIODS.find((p) => p.key === period)?.days;
    const cutoff = days ? Date.now() - days * 86400000 : 0;
    const q = search.trim().toLowerCase();
    return all.filter((t) => {
      const ts = new Date(t.resolved_at || t.updated_at || t.created_at || 0).getTime();
      if (cutoff && ts < cutoff) return false;
      if (q) {
        const hay = `${t.address || ""} ${t.block || ""} ${t.category || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [all, period, search]);

  const avgResolution = useMemo(() => {
    const durations = filtered
      .map((t) => {
        const start = new Date(t.created_at || 0).getTime();
        const end = new Date(t.resolved_at || t.updated_at || 0).getTime();
        return end > start ? (end - start) / 3600000 : null;
      })
      .filter((v): v is number => v != null);
    if (durations.length === 0) return "—";
    const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
    return avg >= 24 ? `${(avg / 24).toFixed(1)}d` : `${avg.toFixed(1)}h`;
  }, [filtered]);

  const thisMonth = useMemo(() => {
    const now = new Date();
    return all.filter((t) => {
      const d = new Date(t.resolved_at || t.updated_at || t.created_at || 0);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }, [all]);

  return (
    <>
      <PageHeader title="Job history" subtitle="Everything you've completed." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total completed" value={filtered.length} icon={<CheckCircle2 className="w-5 h-5" />} accent="forest" />
        <StatCard label="Avg. resolution" value={avgResolution} icon={<Clock className="w-5 h-5" />} accent="yellow" />
        <StatCard label="This month" value={thisMonth} icon={<Calendar className="w-5 h-5" />} accent="blue" />
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <FormField
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search address or category"
            className="pl-9"
          />
        </div>
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
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load history" body={error} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<History className="w-5 h-5" />}
          title="No completed jobs"
          body="Once you finish tasks, they'll show up here."
          action={<Button variant="secondary" onClick={() => setPeriod("all")}>View all time</Button>}
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>ID</Th>
              <Th>Category</Th>
              <Th>Address</Th>
              <Th>Completed</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className="hover:bg-sand-50">
                <Td className="font-mono text-xs">#{String(t.id).slice(0, 6)}</Td>
                <Td>{t.category || t.tags?.[0] || "—"}</Td>
                <Td className="max-w-[280px] truncate">{t.address || t.block || "—"}</Td>
                <Td className="text-muted-foreground">{formatDate(t.resolved_at || t.updated_at || t.created_at)}</Td>
                <Td><StatusBadge status={t.status} /></Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}
