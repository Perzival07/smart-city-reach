import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Map as MapIcon } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { Card } from "@/components/portal/Card";
import { Button } from "@/components/portal/Button";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { useApi } from "@/hooks/useApi";
import { classNames } from "@/utils/helpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  const mapped = useMemo(() => items.filter((t) => t.latitude != null && t.longitude != null), [items]);
  const [selected, setSelected] = useState<Task | null>(null);

  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);
  const markersRef = useRef<Record<string | number, L.Marker>>({});

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current || mapped.length === 0) return;

    // Fix default Leaflet icon paths in Vite/React
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });

    const map = L.map(mapRef.current);
    leafletMap.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(map);

    const markers: Record<string | number, L.Marker> = {};
    const latLngs: [number, number][] = [];

    mapped.forEach((t) => {
      const lat = Number(t.latitude);
      const lng = Number(t.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      latLngs.push([lat, lng]);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`<b>${t.category || t.tags?.[0] || "Task"}</b><br/>${t.address || "Address unavailable"}`);
      marker.on("click", () => {
        setSelected(t);
      });
      markers[t.id] = marker;
    });

    markersRef.current = markers;

    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [50, 50] });
    } else {
      map.setView([12.9716, 77.5946], 13);
    }

    return () => {
      map.remove();
      leafletMap.current = null;
      markersRef.current = {};
    };
  }, [mapped]);

  // Sync map view if selection changes
  useEffect(() => {
    if (!leafletMap.current || !selected) return;
    const lat = Number(selected.latitude);
    const lng = Number(selected.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      leafletMap.current.setView([lat, lng], 15);
      const marker = markersRef.current[selected.id];
      if (marker) {
        marker.openPopup();
      }
    }
  }, [selected]);

  const navigateTo = (t: Task) => {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`;
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <PageHeader title="Task map" subtitle="Plotted by location for your route planning." />

       {loading ? (
        <Skeleton className="h-[350px] sm:h-[450px] lg:h-[520px] w-full" />
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
          {/* Leaflet Map Card */}
          <Card className="lg:col-span-2 relative overflow-hidden h-[350px] sm:h-[450px] lg:h-[520px]">
            <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs font-mono z-[1000] pointer-events-none">
              {mapped.length} task{mapped.length === 1 ? "" : "s"} plotted
            </div>
          </Card>

          {/* Sidebar list */}
          <div className="space-y-2 max-h-[300px] lg:max-h-[520px] overflow-y-auto pr-1">
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
