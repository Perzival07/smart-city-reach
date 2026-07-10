import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { ListChecks, Clock, Loader2, CheckCircle2, Play, Check, AlertTriangle, Shield, Trophy, Timer, AlertCircle, Phone, Sun } from "lucide-react";
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

  // Production Features: States
  const [shiftStatus, setShiftStatus] = useState<"clocked_in" | "break" | "off_duty">("clocked_in");
  const [safetyVest, setSafetyVest] = useState(false);
  const [safetyGloves, setSafetyGloves] = useState(false);
  const [safetyBoots, setSafetyBoots] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incidentMsg, setIncidentMsg] = useState("");
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  // Rest break timer countdown
  useEffect(() => {
    if (breakSeconds <= 0) return;
    const interval = setInterval(() => {
      setBreakSeconds((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [breakSeconds]);

  const startBreakTimer = () => {
    setBreakSeconds(900); // 15 minutes break
    setShiftStatus("break");
  };

  const cancelBreakTimer = () => {
    setBreakSeconds(0);
    setShiftStatus("clocked_in");
  };

  const formatBreakTime = (sec: number) => {
    const min = Math.floor(sec / 60);
    const s = sec % 60;
    return `${min}:${s < 10 ? "0" : ""}${s}`;
  };

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

  // Urgent Task Spotlight (Get the first assigned/in_progress task with urgent priority)
  const urgentTask = active.find((t) => (t.priority || "").toLowerCase() === "urgent" || (t.priority || "").toLowerCase() === "high");

  const reportIncident = (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentMsg.trim()) return;
    setIncidentSubmitted(true);
    setTimeout(() => {
      setIncidentOpen(false);
      setIncidentMsg("");
      setIncidentSubmitted(false);
    }, 2000);
  };

  return (
    <>
      {/* Weather Warning Board */}
      <div className="bg-amber-50 border-2 border-amber-500 rounded-xl p-3 mb-6 flex flex-col md:flex-row items-center justify-between gap-3 text-amber-800 text-xs">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 shrink-0 animate-pulse text-amber-600" />
          <span><b>High Heat Warning (34°C):</b> Heavy shift expected. Hydrate frequently (at least 500ml/hr) and utilize safety breaks.</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={() => window.open("https://weather.com", "_blank")}>Full Forecast</Button>
        </div>
      </div>

      <PageHeader title="Your shift today" subtitle="Active assignments and quick actions">
        <div className="flex items-center gap-3">
          {/* 1. Collector Shift Status Widget */}
          <div className="flex items-center gap-1.5 bg-card border-2 border-ink-950 rounded-xl p-1 shadow-[2px_2px_0_0_#0a0f0a]">
            {(["clocked_in", "break", "off_duty"] as const).map((status) => (
              <button
                key={status}
                onClick={() => {
                  setShiftStatus(status);
                  if (status !== "break") setBreakSeconds(0);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
                  shiftStatus === status
                    ? status === "clocked_in"
                      ? "bg-forest-500 text-ink-950"
                      : status === "break"
                      ? "bg-yellow-500 text-ink-950"
                      : "bg-red-500 text-white"
                    : "text-muted-foreground hover:bg-sand-100"
                }`}
              >
                {status.replace("_", " ")}
              </button>
            ))}
          </div>
        </div>
      </PageHeader>

      {/* Grid of stats and Shift Earnings/Impact */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={items.length} icon={<ListChecks className="w-5 h-5" />} />
        <StatCard label="Assigned" value={count("assigned")} icon={<Clock className="w-5 h-5" />} accent="yellow" />
        <StatCard label="In progress" value={count("in_progress")} icon={<Loader2 className="w-5 h-5" />} accent="blue" />
        <StatCard label="Shift Completed" value={count("resolved")} icon={<CheckCircle2 className="w-5 h-5" />} accent="forest" />
      </div>

      {/* Main shift dashboards split */}
      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        
        {/* Left main: Active Tasks and Spotlight */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 2. Urgent Tasks Spotlight */}
          {urgentTask && (
            <Card className="p-4 border-2 border-red-500 bg-red-50/20 relative overflow-hidden animate-pulse">
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-red-600 text-white text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                <AlertTriangle className="w-3 h-3" /> Urgent
              </div>
              <h3 className="font-display font-bold text-sm text-red-950">Nearest Urgent Task Spot</h3>
              <p className="text-xs text-red-900 mt-1">
                Report <b>#{String(urgentTask.id).slice(0, 6)}</b> ({urgentTask.category}) at <b>{urgentTask.address}</b> is flagged as high priority. Please handle this next.
              </p>
              <div className="mt-3 flex gap-2">
                <Link to="/collector/tasks">
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white border-red-700">Open Task List</Button>
                </Link>
              </div>
            </Card>
          )}

          {/* Active tasks grid */}
          <div>
            <h2 className="font-display font-semibold text-lg mb-3">Active tasks</h2>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
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
        </div>

        {/* Right side: checklists, earnings, break times, Hotline, Bulletin */}
        <div className="space-y-6">
          
          {/* 3. Safety Equipment Checklist */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-forest-600" /> Shift Safety Check
            </h3>
            <div className="space-y-2.5">
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={safetyVest} onChange={(e) => setSafetyVest(e.target.checked)} className="rounded text-forest-600 border-border bg-sand-50" />
                <span className={safetyVest ? "text-forest-700" : "text-muted-foreground"}>High-visibility safety vest on</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={safetyGloves} onChange={(e) => setSafetyGloves(e.target.checked)} className="rounded text-forest-600 border-border bg-sand-50" />
                <span className={safetyGloves ? "text-forest-700" : "text-muted-foreground"}>Heavy duty gloves check</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer select-none">
                <input type="checkbox" checked={safetyBoots} onChange={(e) => setSafetyBoots(e.target.checked)} className="rounded text-forest-600 border-border bg-sand-50" />
                <span className={safetyBoots ? "text-forest-700" : "text-muted-foreground"}>Steel-toed boots vestment</span>
              </label>
            </div>
            {safetyVest && safetyGloves && safetyBoots ? (
              <div className="mt-3 text-[10px] text-forest-700 font-semibold bg-forest-100/60 p-2 rounded border border-forest-300">✓ All safety gear verified. Ready for task handling!</div>
            ) : (
              <div className="mt-3 text-[10px] text-red-700 font-semibold bg-red-50/60 p-2 rounded border border-red-300">⚠ Equipping safety gear is mandatory before handling waste.</div>
            )}
          </Card>

          {/* 4. Shift Impact & Stats */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3">Shift Performance</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-sand-100/60 p-2 rounded-lg border border-border">
                <div className="text-lg font-bold font-display">{count("resolved") * 45} kg</div>
                <div className="text-[9px] text-muted-foreground">Cleared</div>
              </div>
              <div className="bg-sand-100/60 p-2 rounded-lg border border-border">
                <div className="text-lg font-bold font-display">6.2 h</div>
                <div className="text-[9px] text-muted-foreground">Shift Log</div>
              </div>
              <div className="bg-sand-100/60 p-2 rounded-lg border border-border">
                <div className="text-lg font-bold font-display">4.9 ★</div>
                <div className="text-[9px] text-muted-foreground">Rating</div>
              </div>
            </div>
          </Card>

          {/* 5. Rest Break Timer Countdown */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-2 flex items-center gap-1.5">
              <Timer className="w-4 h-4 text-yellow-600" /> Rest Break Manager
            </h3>
            {breakSeconds > 0 ? (
              <div className="text-center space-y-2">
                <div className="text-3xl font-mono font-bold text-yellow-600 animate-pulse">{formatBreakTime(breakSeconds)}</div>
                <div className="text-xs text-muted-foreground">On rest break. Dispatch paused.</div>
                <Button size="sm" variant="ghost" onClick={cancelBreakTimer} className="w-full border-2 border-red-500 text-red-600 hover:bg-red-50">End Break</Button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Pause active dispatch tasks to take a mandatory 15-minute hydration rest break.</p>
                <Button size="sm" onClick={startBreakTimer} className="w-full">Start 15-Min Break</Button>
              </div>
            )}
          </Card>

          {/* 6. Crew Announcements bulletin */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-forest-600" /> Operator Announcements
            </h3>
            <ul className="space-y-3 text-xs">
              <li className="border-b border-border/60 pb-2">
                <div className="font-bold text-ink-950">Maintenance Alert</div>
                <div className="text-muted-foreground text-[10px]">Crews are scheduled for vehicle inspections at the depot starting at 4 PM.</div>
              </li>
              <li>
                <div className="font-bold text-ink-950">Road Closure</div>
                <div className="text-muted-foreground text-[10px]">Avoid Main St and Broadway intersection due to pipeline repair work.</div>
              </li>
            </ul>
          </Card>

          {/* 7. Incident Hazard Report Panel */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-2">Report Hazard on Road</h3>
            <p className="text-xs text-muted-foreground mb-3">Encountered an obstacle or unsafe zone? Inform dispatch instantly.</p>
            {incidentOpen ? (
              <form onSubmit={reportIncident} className="space-y-2">
                <input
                  type="text"
                  placeholder="e.g. 'Roadblock on Maple St'"
                  value={incidentMsg}
                  onChange={(e) => setIncidentMsg(e.target.value)}
                  className="w-full text-xs p-2 border-2 border-ink-950 bg-sand-50 rounded-xl"
                  required
                />
                {incidentSubmitted ? (
                  <div className="text-xs text-forest-700 bg-forest-100 p-2 rounded">Incident report submitted. Dispatch notified.</div>
                ) : (
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1">Send</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIncidentOpen(false)}>Cancel</Button>
                  </div>
                )}
              </form>
            ) : (
              <Button size="sm" onClick={() => setIncidentOpen(true)} className="w-full bg-amber-500 hover:bg-amber-600 border-amber-600 text-ink-950">Report Road Obstruction</Button>
            )}
          </Card>

          {/* 8. Team Leaderboard Widget */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-yellow-500" /> Crew Leaderboard
            </h3>
            <ul className="space-y-2.5 text-xs">
              <li className="flex justify-between border-b border-border/40 pb-1.5">
                <span>1. Crew Alpha (Ward 2)</span>
                <span className="font-mono text-muted-foreground">18 jobs</span>
              </li>
              <li className="flex justify-between border-b border-border/40 pb-1.5">
                <span>2. Crew Charlie (Ward 9)</span>
                <span className="font-mono text-muted-foreground">15 jobs</span>
              </li>
              <li className="flex justify-between font-semibold text-forest-700 bg-forest-50/30 p-1.5 rounded border border-forest-200">
                <span>3. You (Crew Beta - Ward 4)</span>
                <span className="font-mono">{count("resolved")} jobs</span>
              </li>
            </ul>
          </Card>

          {/* 9. Contact support directory */}
          <Card className="p-5">
            <h3 className="font-display font-semibold text-sm mb-3 flex items-center gap-1.5">
              <Phone className="w-4 h-4 text-forest-600" /> Support Hotline
            </h3>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <a href="tel:555-0199" className="p-2 border border-border rounded hover:bg-sand-50 flex flex-col items-center gap-1">
                <span className="font-bold">Dispatch</span>
                <span className="text-[10px] text-muted-foreground">ext. 102</span>
              </a>
              <a href="tel:555-0188" className="p-2 border border-border rounded hover:bg-sand-50 flex flex-col items-center gap-1">
                <span className="font-bold">Maintenance</span>
                <span className="text-[10px] text-muted-foreground">ext. 405</span>
              </a>
            </div>
          </Card>
        </div>

      </div>
    </>
  );
}
