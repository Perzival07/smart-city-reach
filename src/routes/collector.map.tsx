import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/Card";
import { Button } from "@/components/portal/Button";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { classNames } from "@/utils/helpers";

export const Route = createFileRoute("/collector/map")({
  component: TaskMap,
});

interface Task {
  id: string | number;
  category?: string;
  tags?: string[];
  address?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
}

function TaskMap() {
  const { data, loading, error } = useApi<any>("/collector/tasks?limit=50", {}, []);
  const items: Task[] = Array.isArray(data) ? data : data?.items ?? [];
  const mapped = items.filter((t) => t.latitude != null && t.longitude != null);
  const [selected, setSelected] = useState<Task | null>(null);

  const bounds = useMemo(() => {
    if (mapped.length === 0) return null;
    const lats = mapped.map((t) => Number(t.latitude));
    const lngs = mapped.map((t) => Number(t.longitude));
    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLng: Math.min(...lngs),
      maxLng: Math.max(...lngs),
    };
  }, [mapped]);

  const project = (t: Task) => {
    if (!bounds) return { x: 50, y: 50 };
    const { minLat, maxLat, minLng, maxLng } = bounds;
    const w = maxLng - minLng || 1;
    const h = maxLat - minLat || 1;
    const x = ((Number(t.longitude) - minLng) / w) * 90 + 5;
    const y = 95 - ((Number(t.latitude) - minLat) / h) * 90;
    return { x, y };
  };

  const navigateTo = (t: Task) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader title="Task map" subtitle="Plotted by location for your route planning." />

      {loading ? (
        <Skeleton className="h-[520px] w-full" />
      ) : error ? (
        <EmptyState title="Couldn't load map" body={error} />
      ) : mapped.length === 0 ? (
        <EmptyState
          icon={<MapIcon className="w-5 h-5" />}
          title="No mapped tasks"
          body="Tasks need a latitude and longitude to appear here."
        />
      ) : (
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Map canvas placeholder */}
          <Card className="lg:col-span-2 relative overflow-hidden h-[520px] bg-gradient-to-br from-forest-50 to-sand-100">
            <div className="absolute inset-0 bg-noise opacity-40 pointer-events-none" />
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(10,15,10,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(10,15,10,0.06) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            {mapped.map((t) => {
              const { x, y } = project(t);
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelected(t)}
                  className={classNames(
                    "absolute -translate-x-1/2 -translate-y-full transition-transform",
                    active ? "scale-125 z-10" : "hover:scale-110"
                  )}
                  style={{ left: `${x}%`, top: `${y}%` }}
                  aria-label={`Task #${t.id}`}
                >
                  <div className={classNames(
                    "w-6 h-6 rounded-full border-2 border-ink-950 grid place-items-center shadow-md",
                    active ? "bg-forest-500" : "bg-sand-50"
                  )}>
                    <MapPin className="w-3.5 h-3.5 text-ink-950" />
                  </div>
                  <div className={classNames(
                    "w-1 h-2 mx-auto",
                    active ? "bg-forest-500" : "bg-ink-950"
                  )} />
                </button>
              );
            })}
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs font-mono">
              {mapped.length} task{mapped.length === 1 ? "" : "s"} plotted
            </div>
          </Card>

          {/* Sidebar list */}
          <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
            {selected ? (
              <Card className="p-4 border-forest-300 bg-forest-50/40">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">#{String(selected.id).slice(0, 6)}</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="font-display font-semibold">
                  {selected.category || selected.tags?.[0] || "Task"}
                </div>
                <div className="text-sm text-muted-foreground mt-0.5">
                  {selected.address || "Address unavailable"}
                </div>
                <Button size="sm" className="mt-3" onClick={() => navigateTo(selected)}>
                  <Navigation className="w-3.5 h-3.5" /> Navigate
                </Button>
              </Card>
            ) : (
              <Card className="p-4 text-sm text-muted-foreground">
                Select a marker to see details.
              </Card>
            )}
            {mapped.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelected(t)}
                className={classNames(
                  "w-full text-left rounded-xl border p-3 transition-colors",
                  selected?.id === t.id
                    ? "border-forest-400 bg-forest-50"
                    : "border-border bg-card hover:bg-sand-50"
                )}
              >
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs text-muted-foreground">#{String(t.id).slice(0, 6)}</span>
                  <StatusBadge status={t.status} />
                </div>
                <div className="text-sm font-medium mt-0.5">{t.category || t.tags?.[0] || "Task"}</div>
                <div className="text-xs text-muted-foreground truncate">{t.address || "—"}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
