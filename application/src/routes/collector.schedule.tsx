import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Navigation, Route as RouteIcon, Clock } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/Card";
import { StatCard } from "@/components/portal/StatCard";
import { Button } from "@/components/portal/Button";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useApi } from "@/hooks/useApi";

export const Route = createFileRoute("/collector/schedule")({
  component: CollectorSchedule,
});

interface Task {
  id: string | number;
  category?: string;
  tags?: string[];
  address?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  priority?: string;
}

function CollectorSchedule() {
  const { data, loading, error } = useApi<any>("/collector/tasks?limit=50", {}, []);
  const items: Task[] = Array.isArray(data) ? data : data?.items ?? [];
  const stops = items.filter((t) =>
    ["assigned", "in_progress"].includes((t.status || "").toLowerCase())
  );

  // placeholder estimates (real impl would call Routes API)
  const estDistanceKm = (stops.length * 1.6).toFixed(1);
  const estDurationMin = stops.length * 12;

  const navigateTo = (t: Task) => {
    if (t.latitude != null && t.longitude != null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <>
      <PageHeader title="Today's route" subtitle="Stops ordered for your shift." />

      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Stops" value={stops.length} icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Est. distance" value={`${estDistanceKm} km`} icon={<RouteIcon className="w-5 h-5" />} accent="blue" />
        <StatCard label="Est. duration" value={`${estDurationMin} min`} icon={<Clock className="w-5 h-5" />} accent="yellow" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load schedule" body={error} />
      ) : stops.length === 0 ? (
        <EmptyState
          icon={<Calendar className="w-5 h-5" />}
          title="No stops scheduled"
          body="When tasks are assigned to you, they'll appear here as an ordered route."
        />
      ) : (
        <div className="space-y-2">
          {stops.map((t, i) => (
            <Card key={t.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-forest-100 text-forest-800 font-display font-bold grid place-items-center shrink-0">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-semibold text-foreground">
                      {t.category || t.tags?.[0] || "Stop"}
                    </div>
                    <StatusBadge status={t.priority || "medium"} />
                    <StatusBadge status={t.status} />
                  </div>
                  <div className="text-sm text-muted-foreground mt-0.5 truncate">
                    {t.address || "Address unavailable"}
                  </div>
                </div>
              </div>
              {t.latitude != null && t.longitude != null ? (
                <Button size="sm" variant="secondary" onClick={() => navigateTo(t)} className="w-full sm:w-auto self-stretch sm:self-auto">
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </Button>
              ) : null}
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
