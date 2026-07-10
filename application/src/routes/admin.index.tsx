import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useMemo } from "react";
import { FileText, CheckCircle2, Clock, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatCard } from "@/components/portal/StatCard";
import { Card } from "@/components/portal/Card";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Button } from "@/components/portal/Button";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/utils/helpers";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const analytics = useApi<any>("/admin/analytics?period=30d", {}, []);
  const recent = useApi<any>("/reports/?limit=6", {}, []);
  const heatmapData = useApi<any>("/reports/?limit=200", {}, []);
  const summary = analytics.data?.summary ?? {};
  const reports: any[] = Array.isArray(recent.data) ? recent.data : recent.data?.items ?? [];
  const heatmapReports: any[] = Array.isArray(heatmapData.data) ? heatmapData.data : heatmapData.data?.items ?? [];

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  // Group reports geographically for heatmap density visualization
  const clusters = useMemo(() => {
    const mapped = heatmapReports.filter(
      (r) => r.latitude != null && r.longitude != null && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude))
    );
    const grid: Record<string, { latSum: number; lngSum: number; count: number }> = {};

    mapped.forEach((r) => {
      // Group by rounding to 3 decimal places (approx. 110m grid precision)
      const latGrid = Math.round(Number(r.latitude) * 1000) / 1000;
      const lngGrid = Math.round(Number(r.longitude) * 1000) / 1000;
      const key = `${latGrid},${lngGrid}`;
      if (!grid[key]) {
        grid[key] = { latSum: 0, lngSum: 0, count: 0 };
      }
      grid[key].latSum += Number(r.latitude);
      grid[key].lngSum += Number(r.longitude);
      grid[key].count += 1;
    });

    return Object.values(grid).map((g) => ({
      lat: g.latSum / g.count,
      lng: g.lngSum / g.count,
      count: g.count,
    }));
  }, [heatmapReports]);

  // Render Leaflet Map and Heatmap Layers
  useEffect(() => {
    if (!mapRef.current || clusters.length === 0) return;

    // Check if map already initialized
    if (mapInstance.current) {
      mapInstance.current.remove();
    }

    const map = L.map(mapRef.current);
    mapInstance.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const latLngs: [number, number][] = [];

    clusters.forEach((c) => {
      const lat = c.lat;
      const lng = c.lng;
      const count = c.count;

      latLngs.push([lat, lng]);

      // Heat coloring based on density count
      let color = "#10b981"; // Green (low intensity)
      if (count >= 5) {
        color = "#ef4444"; // Red (high intensity)
      } else if (count >= 2) {
        color = "#f59e0b"; // Orange (medium intensity)
      }

      // Outer glow circle
      const outerRadius = 150 + Math.min(count * 15, 150);
      const outer = L.circle([lat, lng], {
        radius: outerRadius,
        stroke: false,
        fillColor: color,
        fillOpacity: 0.15,
      }).addTo(map);

      // Inner heat intensity circle
      const innerRadius = 60 + Math.min(count * 5, 60);
      const inner = L.circle([lat, lng], {
        radius: innerRadius,
        stroke: false,
        fillColor: color,
        fillOpacity: 0.35,
      }).addTo(map);

      const popupText = `<b>${count} active report${count === 1 ? "" : "s"}</b> in this neighborhood`;
      outer.bindPopup(popupText);
      inner.bindPopup(popupText);
    });

    if (latLngs.length > 0) {
      map.fitBounds(latLngs, { padding: [40, 40] });
    } else {
      map.setView([12.9716, 77.5946], 13);
    }

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, [clusters]);

  return (
    <>
      <PageHeader title="Operations overview" subtitle="Live snapshot of the last 30 days.">
        <Link to="/admin/analytics"><Button variant="secondary">Full analytics</Button></Link>
      </PageHeader>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Reports (30d)"
          value={analytics.loading ? "—" : summary.total_reports ?? 0}
          icon={<FileText className="w-5 h-5" />}
        />
        <StatCard
          label="Resolved"
          value={analytics.loading ? "—" : summary.resolved ?? 0}
          accent="forest"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <StatCard
          label="Avg. resolution"
          value={analytics.loading ? "—" : summary.avg_resolution_hours ?? "—"}
          accent="yellow"
          icon={<Clock className="w-5 h-5" />}
        />
        <StatCard
          label="Resolution rate"
          value={
            analytics.loading
              ? "—"
              : summary.resolution_rate != null
              ? `${Math.round(summary.resolution_rate)}%`
              : "—"
          }
          accent="blue"
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>

      {/* Heatmap Section */}
      <div className="mt-8">
        <h2 className="font-display font-semibold text-lg mb-3">Request Intensity Heatmap</h2>
        {heatmapData.loading ? (
          <Skeleton className="h-[300px] sm:h-[400px] w-full" />
        ) : heatmapData.error ? (
          <EmptyState title="Couldn't load intensity map" body={heatmapData.error} />
        ) : clusters.length === 0 ? (
          <EmptyState title="No active coordinates" body="Reports need a latitude and longitude to appear on the heatmap." />
        ) : (
          <Card className="relative overflow-hidden h-[300px] sm:h-[400px] w-full">
            <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />
            <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs font-mono z-[1000] pointer-events-none">
              {clusters.length} neighborhood hotspots plotted
            </div>
          </Card>
        )}
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">Recent reports</h2>
          <Link to="/admin/reports" className="text-sm text-forest-700 hover:underline">
            View all
          </Link>
        </div>
        {recent.loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
          </div>
        ) : recent.error ? (
          <EmptyState title="Couldn't load reports" body={recent.error} />
        ) : reports.length === 0 ? (
          <EmptyState icon={<FileText className="w-5 h-5" />} title="No reports yet" />
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 6).map((r) => (
              <Card key={r.id} className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">
                      #{String(r.id).slice(0, 6)}
                    </span>
                    <StatusBadge status={r.priority || "medium"} />
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="font-semibold text-foreground mt-1">
                    {r.category || r.tags?.[0] || "Report"}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {r.address || r.block || "—"}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {formatDate(r.created_at)}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
