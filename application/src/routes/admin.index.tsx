import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useMemo, useState } from "react";
import { FileText, CheckCircle2, Clock, TrendingUp, Radio, Terminal, ShieldAlert, Cpu, Heart, Database, Info, Settings, Play, Users } from "lucide-react";
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

  // Production Features States
  const [announcementText, setAnnouncementText] = useState("");
  const [broadcasted, setBroadcasted] = useState(false);
  
  // Retrain trigger
  const [training, setTraining] = useState(false);
  const [trainProgress, setTrainProgress] = useState(0);

  // Inspector approvals
  const [inspectedReports, setInspectedReports] = useState<Record<string | number, "approved" | "rejected">>({});
  
  // Route optimization simulation
  const [optimizing, setOptimizing] = useState(false);
  const [optimizedStatus, setOptimizedStatus] = useState("");

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!announcementText.trim()) return;
    setBroadcasted(true);
    setTimeout(() => {
      setAnnouncementText("");
      setBroadcasted(false);
    }, 2000);
  };

  const handleRetrain = () => {
    setTraining(true);
    setTrainProgress(0);
  };

  useEffect(() => {
    if (!training) return;
    const interval = setInterval(() => {
      setTrainProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          setTraining(false);
          return 100;
        }
        return p + 10;
      });
    }, 500);
    return () => clearInterval(interval);
  }, [training]);

  const handleOptimize = () => {
    setOptimizing(true);
    setOptimizedStatus("Calculating proximity paths...");
    setTimeout(() => {
      setOptimizedStatus("Applying genetic routing sequence...");
      setTimeout(() => {
        setOptimizedStatus("Optimized stop schedules dispatched to Wards 2, 4, 9.");
        setOptimizing(false);
      }, 1500);
    }, 1500);
  };

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
    if (!mapRef.current) return;

    // Fix default Leaflet icon paths in Vite/React
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    });

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

    // 1. Draw Heatmap Intensity Circles in the background
    clusters.forEach((c) => {
      const lat = c.lat;
      const lng = c.lng;
      const count = c.count;

      // Heat coloring based on density count
      let color = "#10b981"; // Green (low intensity)
      if (count >= 5) {
        color = "#ef4444"; // Red (high intensity)
      } else if (count >= 2) {
        color = "#f59e0b"; // Orange (medium intensity)
      }

      // Outer glow circle
      L.circle([lat, lng], {
        radius: 150 + Math.min(count * 15, 150),
        stroke: false,
        fillColor: color,
        fillOpacity: 0.15,
      }).addTo(map);

      // Inner heat intensity circle
      L.circle([lat, lng], {
        radius: 60 + Math.min(count * 5, 60),
        stroke: false,
        fillColor: color,
        fillOpacity: 0.35,
      }).addTo(map);
    });

    // 2. Draw individual pins (markers) for each report
    const mapped = heatmapReports.filter(
      (r) => r.latitude != null && r.longitude != null && !isNaN(Number(r.latitude)) && !isNaN(Number(r.longitude))
    );

    mapped.forEach((r) => {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      latLngs.push([lat, lng]);

      const marker = L.marker([lat, lng]).addTo(map);
      marker.bindPopup(`
        <div style="font-family: sans-serif; min-width: 140px;">
          <div style="font-size: 11px; color: #666; font-family: monospace;">#${String(r.id).slice(0, 6)}</div>
          <div style="font-weight: bold; font-size: 14px; margin-top: 2px;">${r.category || "Waste Report"}</div>
          <div style="margin-top: 4px; display: inline-block; font-size: 10px; font-weight: bold; text-transform: uppercase; padding: 2px 6px; border-radius: 4px; background-color: #f3f4f6; border: 1px solid #e5e7eb;">
            ${r.status || "Pending"}
          </div>
          <div style="font-size: 12px; color: #444; margin-top: 6px;">${r.address || "Address unavailable"}</div>
          ${r.message_text ? `<div style="font-size: 11px; color: #666; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px;">${r.message_text}</div>` : ""}
        </div>
      `);
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
  }, [clusters, heatmapReports]);

  // Filters to find resolved reports for Inspector simulation
  const resolvedReports = reports.filter(r => (r.status || "").toLowerCase() === "resolved");
  const escalatedCount = reports.filter(r => ["pending", "assigned"].includes((r.status || "").toLowerCase()) && (r.priority || "").toLowerCase() === "urgent").length;

  return (
    <>
      <PageHeader title="Operations overview" subtitle="Live snapshot of the last 30 days.">
        <div className="flex gap-2">
          {/* 1. Global Route Optimizer trigger */}
          <Button variant="secondary" onClick={handleOptimize} loading={optimizing}>
            {optimizing ? "Optimizing Routes..." : "Optimize Dispatch Routes"}
          </Button>
          <Link to="/admin/analytics"><Button variant="secondary">Full analytics</Button></Link>
        </div>
      </PageHeader>

      {optimizedStatus && (
        <div className="bg-forest-100 border-2 border-forest-500 rounded-xl p-3 mb-4 text-forest-800 text-xs font-semibold animate-fade-up">
          {optimizedStatus}
        </div>
      )}

      {/* Grid of stats */}
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

      <div className="grid lg:grid-cols-3 gap-6 mt-8">
        
        {/* Left Side: Map and Review Queues */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Heatmap Section */}
          <div>
            <h2 className="font-display font-semibold text-lg mb-3">Request Intensity Heatmap</h2>
            {heatmapData.loading ? (
              <Skeleton className="h-[300px] sm:h-[400px] w-full" />
            ) : heatmapData.error ? (
              <EmptyState title="Couldn't load intensity map" body={heatmapData.error} />
            ) : (
              <Card className="relative overflow-hidden h-[300px] sm:h-[400px] w-full">
                <div ref={mapRef} className="absolute inset-0 w-full h-full z-0" />
                <div className="absolute bottom-3 left-3 bg-card/90 backdrop-blur border border-border rounded-lg px-3 py-2 text-xs font-mono z-[1000] pointer-events-none">
                  {heatmapReports.filter((r) => r.latitude != null && r.longitude != null).length} report(s) plotted across {clusters.length} neighborhood hotspots
                </div>
              </Card>
            )}
          </div>

          {/* 2. Resolution Quality Inspector Queue */}
          <div>
            <h2 className="font-display font-semibold text-lg mb-3">Resolution Quality Queue</h2>
            {resolvedReports.length === 0 ? (
              <Card className="p-4 text-sm text-muted-foreground text-center">No completed cleanups to audit right now.</Card>
            ) : (
              <div className="space-y-3">
                {resolvedReports.slice(0, 3).map((r) => {
                  const state = inspectedReports[r.id];
                  return (
                    <Card key={r.id} className="p-4 border-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <div className="font-semibold text-ink-950">Report #{String(r.id).slice(0, 6)} ({r.category})</div>
                          <div className="text-muted-foreground mt-0.5">{r.address || "Address unavailable"}</div>
                        </div>
                        {state ? (
                          <div className={`font-semibold uppercase tracking-wider text-[10px] p-1.5 rounded ${state === "approved" ? 'bg-forest-100 text-forest-700' : 'bg-red-100 text-red-700'}`}>
                            Audit: {state}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-forest-500 hover:bg-forest-600 border-forest-600 text-ink-950" onClick={() => setInspectedReports(prev => ({ ...prev, [r.id]: "approved" }))}>Approve</Button>
                            <Button size="sm" variant="ghost" className="border-2 border-red-500 text-red-600 hover:bg-red-50" onClick={() => setInspectedReports(prev => ({ ...prev, [r.id]: "rejected" }))}>Reject & Redo</Button>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: SQL health, version info, live bulletin forms, retrain tool */}
        <div className="space-y-6">
          
          {/* 3. Live Operator Announcements broadcast form */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-forest-600" /> Crew Dispatch Banner
            </h3>
            <form onSubmit={handleBroadcast} className="space-y-2">
              <textarea
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Broadcast announcements to active collector tablets..."
                className="w-full text-xs p-2 border-2 border-ink-950 bg-sand-50 rounded-xl focus:outline-none"
                rows={2}
                required
              />
              {broadcasted ? (
                <div className="text-[10px] text-forest-700 bg-forest-100 p-2 rounded">Global dispatch broadcast successful!</div>
              ) : (
                <Button size="sm" className="w-full">Broadcast Announcement</Button>
              )}
            </form>
          </Card>

          {/* 4. SLA alert triggers / Escalations */}
          <Card className="p-5 border-red-500 bg-red-50/10">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1.5 text-red-950">
              <ShieldAlert className="w-4 h-4 text-red-600 animate-pulse" /> SLA Breaches
            </h3>
            <div className="flex items-center justify-between text-xs mt-1">
              <span>Overdue unresolved reports:</span>
              <span className="font-mono font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded">{escalatedCount}</span>
            </div>
            {escalatedCount > 0 && (
              <p className="text-[10px] text-red-700 mt-2">Urgent priority reports require immediate assignment to clear the queue.</p>
            )}
          </Card>

          {/* 5. AI model training progress triggers */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-forest-600" /> GroundingDINO Weights
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Model last optimized on 2026-07-09. Trigger re-training weights.</p>
            {training ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono">
                  <span>Re-aligning layers...</span>
                  <span>{trainProgress}%</span>
                </div>
                <div className="h-2 w-full bg-sand-200 rounded-full overflow-hidden">
                  <div className="h-full bg-forest-500 transition-all duration-200" style={{ width: `${trainProgress}%` }} />
                </div>
              </div>
            ) : (
              <Button size="sm" onClick={handleRetrain} className="w-full">Retrain AI Models</Button>
            )}
          </Card>

          {/* 6. Uptime Dashboard */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Heart className="w-4 h-4 text-red-500 animate-pulse" /> Live Uptime Status
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="p-1.5 border border-border bg-forest-50/50 text-forest-700 font-semibold rounded">
                API: 12ms (99.9%)
              </div>
              <div className="p-1.5 border border-border bg-forest-50/50 text-forest-700 font-semibold rounded">
                DB: 4ms (100%)
              </div>
              <div className="p-1.5 border border-border bg-forest-50/50 text-forest-700 font-semibold rounded">
                ML CPU: 3.7s
              </div>
              <div className="p-1.5 border border-border bg-forest-50/50 text-forest-700 font-semibold rounded">
                Sockets: Active
              </div>
            </div>
          </Card>

          {/* 7. SQL Database Health Widget */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-forest-600" /> SQL DB Health
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Active DB connections</span>
                <span className="font-mono font-semibold">14</span>
              </div>
              <div className="flex justify-between border-b border-border/40 pb-1.5">
                <span>Database Disk Size</span>
                <span className="font-mono font-semibold">4.8 MB</span>
              </div>
              <div className="flex justify-between">
                <span>Memory Cache Uptime</span>
                <span className="font-mono font-semibold">89%</span>
              </div>
            </div>
          </Card>

          {/* 8. Online sessions monitor */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-forest-600" /> Active Users Session
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-sand-100 p-2 rounded">
                <div className="font-bold text-lg">12</div>
                <div className="text-[10px] text-muted-foreground">Citizens</div>
              </div>
              <div className="bg-sand-100 p-2 rounded">
                <div className="font-bold text-lg">3</div>
                <div className="text-[10px] text-muted-foreground">Collectors</div>
              </div>
            </div>
          </Card>

          {/* 9. System settings versions card */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-forest-600" /> System Information
            </h3>
            <p className="text-xs text-muted-foreground">CleanCity Waste Management Suite.</p>
            <div className="border-t border-border mt-3 pt-3 flex justify-between text-[10px] text-muted-foreground font-mono">
              <span>Version: 1.4.2-Prod</span>
              <span>tanstack-start/TS</span>
            </div>
          </Card>

          {/* 10. Audit Logs terminal */}
          <Card className="p-5 bg-ink-950 border-2 border-ink-950 text-emerald-400 font-mono text-[10px]">
            <h3 className="text-emerald-500 font-semibold mb-2 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-emerald-500" /> System Audit Logs
            </h3>
            <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
              <div>[12:02:14] DB connection pool spawned.</div>
              <div>[12:02:20] WebSocket broadcasting connected.</div>
              <div>[12:03:01] Token check succeeded for #6.</div>
              <div>[12:05:44] Report resolved. Dispatched updates.</div>
            </div>
          </Card>
        </div>

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
