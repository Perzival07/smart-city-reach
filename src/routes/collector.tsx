import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, ListChecks, Map, Calendar, History } from "lucide-react";
import { PortalLayout, type NavItem } from "@/components/PortalLayout";
import { useAuth } from "@/context/AuthContext";

export const Route = createFileRoute("/collector")({
  ssr: false,
  head: () => ({ meta: [{ title: "Collector — CleanCity" }] }),
  component: CollectorPortal,
});

const items: NavItem[] = [
  { to: "/collector", label: "Dashboard", icon: LayoutDashboard },
  { to: "/collector/tasks", label: "Tasks", icon: ListChecks },
  { to: "/collector/map", label: "Map", icon: Map },
  { to: "/collector/schedule", label: "Schedule", icon: Calendar },
  { to: "/collector/history", label: "Job history", icon: History },
];

function CollectorPortal() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) navigate({ to: "/login" });
    else if (user.role !== "collector") navigate({ to: "/unauthorized" });
  }, [user, loading, navigate]);

  if (loading || !user || user.role !== "collector") {
    return (
      <div className="min-h-screen grid place-items-center bg-sand-50">
        <div className="h-8 w-8 border-2 border-ink-950 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <PortalLayout role="collector" items={items} brandLabel="Collector" />;
}
