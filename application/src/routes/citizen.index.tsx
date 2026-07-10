import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, Clock, Loader2, CheckCircle2, Plus, Leaf, Search, ShieldCheck, Sun, Moon, Bell, Award, User } from "lucide-react";
import { PageHeader } from "@/components/portal/PageHeader";
import { StatCard } from "@/components/portal/StatCard";
import { Table, Th, Td } from "@/components/portal/Table";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Skeleton } from "@/components/portal/Skeleton";
import { EmptyState } from "@/components/portal/EmptyState";
import { Button } from "@/components/portal/Button";
import { Card } from "@/components/portal/Card";
import { useApi } from "@/hooks/useApi";
import { formatDate } from "@/utils/helpers";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/citizen/")({
  component: CitizenDashboard,
});

interface Report {
  id: number | string;
  category?: string;
  tags?: string[];
  priority?: string;
  address?: string;
  block?: string;
  status?: string;
  created_at?: string;
}

const ecoTips = [
  "Rinse food tins and drink cans before recycling to keep containers clean.",
  "Squash plastic bottles and cardboard boxes to save space in collection bins.",
  "Keep organic waste separate to reduce methane emissions in regular trash dumps.",
  "Old electronics and batteries contain heavy metals — discard them at specialized recycling hubs.",
];

function CitizenDashboard() {
  const { data, loading, error } = useApi<{ items?: Report[] } | Report[]>(
    "/reports/?limit=10",
    {},
    []
  );
  const reports: Report[] = Array.isArray(data) ? data : data?.items ?? [];

  // State for mobile portal optimizations
  const [guideSearch, setGuideSearch] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [pushDismissed, setPushDismissed] = useState(false);
  const [avatar, setAvatar] = useState("avatar-1");
  const [showBeforeAfter, setShowBeforeAfter] = useState<number | string | null>(null);

  // Waste category guide database
  const guideResults = (() => {
    if (!guideSearch.trim()) return null;
    const q = guideSearch.toLowerCase();
    if ("bottle plastic milk wrapper cup container".includes(q)) return { bin: "Recycling (Blue Bin)", instructions: "Rinse and squash." };
    if ("paper cardboard newspaper magazine box".includes(q)) return { bin: "Paper & Cardboard (Yellow Bin)", instructions: "Must be dry and flat." };
    if ("banana food peel apple shell waste tea coffee egg".includes(q)) return { bin: "Compost / Organic (Green Bin)", instructions: "No plastics or animal bones." };
    if ("glass jar container mirror plate window".includes(q)) return { bin: "Glass (Green/White Bin)", instructions: "Remove metal lids." };
    if ("battery battery phone wire charger laptop cable screen".includes(q)) return { bin: "E-Waste Hub", instructions: "Drop off at specialized collection depots only." };
    return { bin: "General Waste (Black Bin)", instructions: "Safe to dispose in daily trash." };
  })();

  const count = (s: string) =>
    reports.filter((r) => (r.status ?? "").toLowerCase() === s).length;

  // Impact calculations based on resolved reports
  const resolvedCount = count("resolved");
  const co2Offset = (resolvedCount * 4.2).toFixed(1);
  const plasticDiverted = (resolvedCount * 1.5).toFixed(1);

  // Rotate tips
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % ecoTips.length);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <>
      {/* 1. Push Notification Opt-In Banner */}
      {!pushDismissed && (
        <div className="bg-forest-100 border-2 border-forest-500 rounded-xl p-4 mb-6 flex flex-col md:flex-row items-center justify-between gap-3 brutal-shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-forest-500 text-white grid place-items-center shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="font-semibold text-forest-900 text-sm">Stay updated in real time!</div>
              <div className="text-xs text-forest-700">Enable notifications to track cleanup status updates on your reports instantly.</div>
            </div>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <Button size="sm" onClick={() => setPushDismissed(true)} className="flex-1 md:flex-none">Enable</Button>
            <Button size="sm" variant="ghost" onClick={() => setPushDismissed(true)} className="flex-1 md:flex-none">Dismiss</Button>
          </div>
        </div>
      )}

      <PageHeader title="Welcome back" subtitle="Here's what's happening with your reports">
        <div className="flex items-center gap-3">
          {/* 2. Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
            className="p-2 border-2 border-ink-950 rounded-lg bg-card hover:bg-sand-100 transition-colors"
            title="Toggle theme mode"
            aria-label="Toggle theme"
          >
            {darkMode ? <Sun className="w-4 h-4 text-yellow-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
          </button>
          <Link to="/citizen/new">
            <Button><Plus className="w-4 h-4" /> New report</Button>
          </Link>
        </div>
      </PageHeader>

      {/* Grid of stats and community parameters */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total" value={reports.length} icon={<FileText className="w-5 h-5" />} />
        <StatCard label="Pending" value={count("pending")} icon={<Clock className="w-5 h-5" />} accent="yellow" />
        <StatCard label="In progress" value={count("in_progress")} icon={<Loader2 className="w-5 h-5" />} accent="blue" />
        <StatCard label="Resolved" value={count("resolved")} icon={<CheckCircle2 className="w-5 h-5" />} accent="forest" />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        {/* Left Side Column: Community & Eco-tools */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid sm:grid-cols-2 gap-4">
            {/* 3. Neighborhood Cleanliness Scorecard */}
            <Card className="p-5 flex flex-col justify-between border-forest-500 bg-forest-50/20">
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-muted-foreground">Local Zone Rating</div>
                <div className="text-4xl font-display font-black text-forest-700 mt-2">A-</div>
                <p className="text-xs text-muted-foreground mt-2">
                  Ward 4 Cleanliness Rating. <b>{resolvedCount} resolved</b> issues, <b>{count("pending")} pending</b>.
                </p>
              </div>
              <div className="border-t border-border mt-3 pt-3 flex justify-between text-[11px] text-muted-foreground">
                <span>Rank #3 of 12 Wards</span>
                <span className="text-forest-600 font-semibold">Active Crew</span>
              </div>
            </Card>

            {/* 4. Eco-Calculator Widget */}
            <Card className="p-5 flex flex-col justify-between">
              <div>
                <div className="text-xs uppercase font-mono tracking-wider text-muted-foreground">Your Environmental Impact</div>
                <div className="flex gap-4 mt-3">
                  <div>
                    <div className="text-2xl font-bold font-display">{co2Offset} kg</div>
                    <div className="text-[10px] text-muted-foreground">CO₂ Offset</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold font-display">{plasticDiverted} kg</div>
                    <div className="text-[10px] text-muted-foreground">Plastics Diverted</div>
                  </div>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground mt-3 border-t border-border pt-3 flex items-center gap-1">
                <Leaf className="w-3.5 h-3.5 text-forest-500" />
                Calculated from verified resolutions.
              </p>
            </Card>
          </div>

          {/* 5. Waste Category Guide Search Bar */}
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
              <Search className="w-4 h-4 text-forest-600" /> Waste Category Guide
            </h3>
            <p className="text-xs text-muted-foreground mb-3">Unsure where to dispose an item? Search to find the correct recycling bin.</p>
            <div className="relative">
              <input
                type="text"
                value={guideSearch}
                onChange={(e) => setGuideSearch(e.target.value)}
                placeholder="Type 'plastic bottle', 'newspaper', 'banana peel', etc."
                className="w-full bg-sand-50 border-2 border-ink-950 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-0 focus:border-forest-500 font-medium"
              />
              {guideSearch && (
                <button onClick={() => setGuideSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground">Clear</button>
              )}
            </div>
            {guideResults && (
              <div className="mt-3 bg-sand-100/50 p-3 rounded-lg border border-border flex items-start gap-2 animate-fade-up">
                <div className="w-2.5 h-2.5 rounded-full bg-forest-500 mt-1 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold text-ink-950">Bin: {guideResults.bin}</div>
                  <div className="text-muted-foreground mt-0.5">{guideResults.instructions}</div>
                </div>
              </div>
            )}
          </Card>

          {/* 6. Recent Cleanliness Activity comparisons */}
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Neighborhood Cleared Zones</h3>
            <div className="space-y-3">
              {[
                { id: "act-1", title: "Litter sweep resolved near Park Lane", address: "Park Lane Circle", date: "Today", before: "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&w=300&h=200&q=80", after: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&h=200&q=80" },
                { id: "act-2", title: "Organic waste container cleared in Ward 4", address: "Block B-12", date: "Yesterday", before: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=300&h=200&q=80", after: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?auto=format&fit=crop&w=300&h=200&q=80" }
              ].map((act) => (
                <div key={act.id} className="border border-border rounded-xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:bg-sand-50/50 transition-colors">
                  <div>
                    <div className="text-xs font-semibold text-ink-950">{act.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{act.address} · {act.date}</div>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setShowBeforeAfter(showBeforeAfter === act.id ? null : act.id)}>
                    {showBeforeAfter === act.id ? "Close Preview" : "Before / After"}
                  </Button>
                  {showBeforeAfter === act.id && (
                    <div className="w-full grid grid-cols-2 gap-2 mt-3 animate-fade-up">
                      <div className="relative">
                        <img src={act.before} className="w-full h-24 object-cover rounded-lg border border-border" alt="Before" />
                        <span className="absolute bottom-1 left-1 bg-red-600 text-white text-[9px] font-mono px-1 rounded">Before</span>
                      </div>
                      <div className="relative">
                        <img src={act.after} className="w-full h-24 object-cover rounded-lg border border-border" alt="After" />
                        <span className="absolute bottom-1 left-1 bg-forest-600 text-white text-[9px] font-mono px-1 rounded">After</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Side Column: User Badges, Avatar, Leaderboard, Tips */}
        <div className="space-y-6">
          {/* 7. Profile Impact Badges & 8. Custom Profile Avatars */}
          <Card className="p-5 text-center flex flex-col items-center">
            <div className="relative group cursor-pointer" onClick={() => setAvatar(avatar === "avatar-1" ? "avatar-2" : "avatar-1")}>
              <div className="w-16 h-16 rounded-full bg-forest-100 border-2 border-forest-500 grid place-items-center shadow-md overflow-hidden hover:scale-105 transition-transform">
                {avatar === "avatar-1" ? (
                  <User className="w-8 h-8 text-forest-700" />
                ) : (
                  <Award className="w-8 h-8 text-yellow-500" />
                )}
              </div>
              <span className="absolute bottom-0 right-0 bg-ink-950 text-white text-[8px] px-1 rounded-full border border-border">Change</span>
            </div>
            <div className="font-display font-semibold mt-3">Citizen Advocate</div>
            <div className="text-xs text-muted-foreground">Eco Rank Level 4</div>

            <div className="w-full border-t border-border mt-4 pt-4">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground text-left mb-2">Impact Badges</div>
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-forest-100 text-forest-700 border border-forest-200">
                  <ShieldCheck className="w-3.5 h-3.5" /> Eco-Warrior
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-yellow-50 text-yellow-700 border border-yellow-200">
                  <Award className="w-3.5 h-3.5" /> Waste Patrol
                </span>
              </div>
            </div>
          </Card>

          {/* 9. Citizen Leaderboard Widget */}
          <Card className="p-5">
            <h3 className="font-display font-semibold mb-3">Community Leaderboard</h3>
            <ul className="space-y-2.5">
              {[
                { rank: 1, name: "Marcus A.", points: "1,240 pts", current: false },
                { rank: 2, name: "Sarah K.", points: "980 pts", current: false },
                { rank: 3, name: "You (Citizen)", points: `${resolvedCount * 100} pts`, current: true }
              ].map((usr, i) => (
                <li key={i} className={`flex items-center justify-between text-xs p-2 rounded-lg ${usr.current ? 'bg-forest-50/50 border border-forest-300' : 'hover:bg-sand-50/50'}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground w-4">#{usr.rank}</span>
                    <span className="font-medium">{usr.name}</span>
                  </div>
                  <span className="font-mono text-muted-foreground font-semibold">{usr.points}</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* 10. Eco-Tips Daily Card */}
          <Card className="p-5 bg-gradient-to-br from-forest-50/30 to-sand-100/30 border-dashed">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase font-mono tracking-wider text-forest-700 font-bold">Daily Eco Tip</span>
              <Leaf className="w-3.5 h-3.5 text-forest-500" />
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed italic">
              "{ecoTips[tipIndex]}"
            </p>
          </Card>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-lg">My recent reports</h2>
          <Link to="/citizen/reports" className="text-sm text-forest-700 hover:underline">
            View all
          </Link>
        </div>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        ) : error ? (
          <EmptyState
            title="Couldn't load reports"
            body={error}
            action={<Link to="/citizen/new"><Button>Create your first report</Button></Link>}
          />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-5 h-5" />}
            title="No reports yet"
            body="Spotted a problem in your neighborhood? File your first report."
            action={<Link to="/citizen/new"><Button>New report</Button></Link>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Category</Th>
                <Th>Priority</Th>
                <Th>Address</Th>
                <Th>Date</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {reports.slice(0, 5).map((r) => (
                <tr key={r.id} className="hover:bg-sand-50">
                  <Td className="font-mono text-xs">#{String(r.id).slice(0, 6)}</Td>
                  <Td>{r.category || r.tags?.[0] || "—"}</Td>
                  <Td><StatusBadge status={r.priority || "medium"} /></Td>
                  <Td className="max-w-[240px] truncate">{r.address || r.block || "—"}</Td>
                  <Td className="text-muted-foreground">{formatDate(r.created_at)}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </>
  );
}
