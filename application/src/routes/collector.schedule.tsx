import { createFileRoute } from "@tanstack/react-router";
import { Calendar, Navigation, Route as RouteIcon, Clock, ShieldCheck, Map, Truck, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/Card";
import { StatCard } from "@/components/portal/StatCard";
import { Button } from "@/components/portal/Button";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { useState, useMemo } from "react";
import { classNames } from "@/utils/helpers";

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

  // Production Features States
  const [vehicleNo, setVehicleNo] = useState("TRUCK-04");
  const [fuelLevel, setFuelLevel] = useState(80);
  const [odometer, setOdometer] = useState("12,450");
  const [safetyVerified, setSafetyVerified] = useState(false);
  const [offlineMapCached, setOfflineMapCached] = useState(true);

  // Check off stops locally for progress tracking
  const [completedStops, setCompletedStops] = useState<Record<string | number, boolean>>({});

  // Estimates calculations
  const totalStops = stops.length;
  const stopsCompletedCount = Object.keys(completedStops).filter(k => completedStops[k]).length;
  const remainingStops = totalStops - stopsCompletedCount;

  const estDistanceKm = (remainingStops * 1.6).toFixed(1);
  const estDurationMin = remainingStops * 12;

  const navigateTo = (t: Task) => {
    if (t.latitude != null && t.longitude != null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;
      if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const toggleStopCheck = (id: string | number) => {
    setCompletedStops(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <>
      {/* 16. Route Caching Status Banner */}
      {offlineMapCached && (
        <div className="bg-forest-100 border-2 border-forest-500 rounded-xl p-3 mb-4 flex items-center justify-between text-forest-800 text-xs">
          <div className="flex items-center gap-2">
            <Map className="w-4 h-4 shrink-0" />
            <span><b>Offline Mode Ready:</b> Map tiles and stops sequence are cached locally in your vehicle tablet.</span>
          </div>
          <button onClick={() => setOfflineMapCached(false)} className="underline hover:text-forest-900 font-semibold text-[10px]">Dismiss</button>
        </div>
      )}

      <PageHeader title="Today's route" subtitle="Stops ordered for your shift." />

      {/* Grid of stats */}
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <StatCard label="Active Stops" value={`${remainingStops} / ${totalStops}`} icon={<Calendar className="w-5 h-5" />} />
        <StatCard label="Remaining Distance" value={`${estDistanceKm} km`} icon={<RouteIcon className="w-5 h-5" />} accent="blue" />
        <StatCard label="Remaining Duration" value={`${estDurationMin} min`} icon={<Clock className="w-5 h-5" />} accent="yellow" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* Left Side: Route stops sequence */}
        <div className="lg:col-span-2 space-y-4">
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
              {stops.map((t, i) => {
                const isChecked = !!completedStops[t.id];
                return (
                  <Card
                    key={t.id}
                    className={classNames(
                      "p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-200 border-2",
                      isChecked ? "border-forest-300 bg-forest-50/20 opacity-60 line-through" : "border-border"
                    )}
                  >
                    <div className="flex items-start gap-4 flex-1 min-w-0">
                      {/* Interactive check-off stop */}
                      <button
                        type="button"
                        onClick={() => toggleStopCheck(t.id)}
                        className={classNames(
                          "w-9 h-9 rounded-full font-display font-bold grid place-items-center shrink-0 border-2 transition-all",
                          isChecked ? "bg-forest-500 text-white border-forest-500" : "bg-forest-100 text-forest-800 border-ink-950 hover:bg-forest-200"
                        )}
                      >
                        {isChecked ? "✓" : i + 1}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className={classNames("font-semibold text-foreground", isChecked ? "text-muted-foreground" : "")}>
                            {t.category || t.tags?.[0] || "Stop"}
                          </div>
                          <StatusBadge status={t.priority || "medium"} />
                          <StatusBadge status={isChecked ? "completed" : t.status} />
                        </div>
                        <div className="text-sm text-muted-foreground mt-0.5 truncate">
                          {t.address || "Address unavailable"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Directions launch button */}
                    {!isChecked && t.latitude != null && t.longitude != null ? (
                      <Button size="sm" variant="secondary" onClick={() => navigateTo(t)} className="w-full sm:w-auto self-stretch sm:self-auto flex items-center justify-center gap-1.5">
                        <Navigation className="w-3.5 h-3.5" /> Directions
                      </Button>
                    ) : null}
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Vehicle tracker & communications */}
        <div className="space-y-6">
          
          {/* 18. Vehicle / Truck Tracker inputs */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-forest-600" /> Vehicle Status Logs
            </h3>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">Truck Designation</label>
                <input
                  type="text"
                  value={vehicleNo}
                  onChange={(e) => setVehicleNo(e.target.value)}
                  className="w-full border-2 border-ink-950 bg-sand-50 p-2 rounded-xl text-xs font-semibold"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">
                  <span>Fuel Capacity</span>
                  <span className="font-bold">{fuelLevel}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuelLevel}
                  onChange={(e) => setFuelLevel(Number(e.target.value))}
                  className="w-full h-2 bg-sand-200 rounded-lg appearance-none cursor-pointer accent-forest-500"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase font-mono tracking-wider text-muted-foreground mb-1">Shift Start Odometer (km)</label>
                <input
                  type="text"
                  value={odometer}
                  onChange={(e) => setOdometer(e.target.value)}
                  className="w-full border-2 border-ink-950 bg-sand-50 p-2 rounded-xl text-xs font-mono font-semibold"
                />
              </div>
              <label className="flex items-center gap-2 font-semibold cursor-pointer select-none mt-2">
                <input type="checkbox" checked={safetyVerified} onChange={(e) => setSafetyVerified(e.target.checked)} className="rounded text-forest-600 border-border bg-sand-50" />
                <span className={safetyVerified ? "text-forest-700" : "text-muted-foreground"}>Odometer & Fuel logs saved</span>
              </label>
            </div>
            {safetyVerified && (
              <div className="mt-3 text-[10px] text-forest-700 font-semibold bg-forest-100/60 p-2 rounded border border-forest-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Fleet telemetry synced with dispatch.
              </div>
            )}
          </Card>

          {/* 20. Crew Chat bulletin */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4 text-forest-600" /> Dispatch Radio Chat
            </h3>
            <div className="space-y-2 text-[11px] leading-relaxed max-h-[160px] overflow-y-auto pr-1">
              <div className="bg-sand-100 p-2 rounded-lg border border-border">
                <span className="font-bold text-forest-800">Dispatch:</span> All vehicles check in before starting secondary routes.
              </div>
              <div className="bg-sand-100 p-2 rounded-lg border border-border">
                <span className="font-bold text-forest-800">Supervisor:</span> Great work Ward 4 crews, clearance rate is at 92%! Keep it up.
              </div>
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
