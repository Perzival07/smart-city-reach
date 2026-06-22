import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ListChecks, Clock, Loader2, CheckCircle2, Play, Check } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatCard } from "@/components/portal/StatCard";
import { Card } from "@/components/portal/Card";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { useApi } from "@/hooks/useApi";
import { apiFetch } from "@/lib/api";
import { formatDate } from "@/utils/helpers";

export const Route = createFileRoute("/collector/")({
  component: CollectorDashboard,
});

interface Task {
  id: string | number;
  category?: string;
  tags?: string[];
  priority?: string;
  address?: string;
  block?: string;
  status?: string;
  created_at?: string;
  assigned_at?: string;
}

function CollectorDashboard() {
  const { data, loading, error, refetch } = useApi<any>("/collector/tasks?limit=20", {}, []);
  const items: Task[] = Array.isArray(data) ? data : data?.items ?? [];
  const [updating, setUpdating] = useState<string | number | null>(null);

  const count = (s: string) =>
    items.filter((r) => (r.status ?? "").toLowerCase() === s).length;

  const update = async (id: string | number, status: string) => {
    setUpdating(id);
    try {
      await apiFetch(`/collector/tasks/${id}`, { method: "PATCH", body: { status } });
      await refetch();
    } catch (e) {
      console.error(e);
    } finally {
      setUpdating(null);
    }
  };

  const active = items.filter((t) =>
    ["assigned", "in_progress"].includes((t.status || "").toLowerCase())
  );

  return (
    <>
      <PageHeader title="Your shift today" subtitle="Active assignments and quick actions">
        <Link to="/collector/tasks"><Button variant="secondary">View all tasks</Button></Link>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={items.length} icon={<ListChecks className="w-5 h-5" />} />
        <StatCard label="Assigned" value={count("assigned")} icon={<Clock className="w-5 h-5" />} accent="yellow" />
        <StatCard label="In progress" value={count("in_progress")} icon={<Loader2 className="w-5 h-5" />} accent="blue" />
        <StatCard label="Completed" value={count("resolved")} icon={<CheckCircle2 className="w-5 h-5" />} accent="forest" />
      </div>

      <div className="mt-8">
        <h2 className="font-display font-semibold text-lg mb-3">Active tasks</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load tasks" body={error} />
        ) : active.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="w-5 h-5" />}
            title="All clear"
            body="Nothing active right now. New assignments will appear here."
          />
        ) : (
          <div className="grid md:grid-cols-2 gap-3">
            {active.slice(0, 6).map((t) => {
              const isAssigned = (t.status || "").toLowerCase() === "assigned";
              const isInProgress = (t.status || "").toLowerCase() === "in_progress";
              return (
                <Card key={t.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-muted-foreground">#{String(t.id).slice(0, 6)}</span>
                        <StatusBadge status={t.priority || "medium"} />
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="font-display font-semibold text-foreground mt-1">
                        {t.category || t.tags?.[0] || "Task"}
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5 truncate">
                        {t.address || t.block || "Address unavailable"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Assigned {formatDate(t.assigned_at || t.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    {isAssigned ? (
                      <Button size="sm" loading={updating === t.id} onClick={() => update(t.id, "in_progress")}>
                        <Play className="w-3.5 h-3.5" /> Start
                      </Button>
                    ) : null}
                    {isInProgress ? (
                      <Button size="sm" loading={updating === t.id} onClick={() => update(t.id, "resolved")}>
                        <Check className="w-3.5 h-3.5" /> Complete
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
