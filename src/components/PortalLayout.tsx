import { Link, Outlet, useRouter, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  X,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { classNames, getRoleColors } from "@/utils/helpers";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

interface Props {
  role: "citizen" | "collector" | "admin";
  items: NavItem[];
  brandLabel?: string;
}

export function PortalLayout({ role, items, brandLabel }: Props) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const colors = getRoleColors(role);

  useEffect(() => {
    setSidebarOpen(false);
  }, [path]);

  const handleLogout = () => {
    logout();
    router.navigate({ to: "/login" });
  };

  return (
    <div className="min-h-screen bg-sand-50 flex">
      {/* Overlay */}
      {sidebarOpen ? (
        <div
          className="fixed inset-0 bg-ink-950/30 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      {/* Sidebar */}
      <aside
        className={classNames(
          "fixed lg:static z-40 inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col transition-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="h-16 px-5 flex items-center gap-2 border-b border-border">
          <div className="w-8 h-8 rounded-md bg-forest-500 grid place-items-center">
            <span className="font-display font-bold text-ink-950">C</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display font-bold text-ink-950 leading-none">CleanCity</div>
            <div className={classNames("text-[10px] uppercase tracking-wider mt-0.5 inline-block px-1.5 rounded", colors.bg, colors.text)}>
              {brandLabel || role} portal
            </div>
          </div>
          <button
            className="lg:hidden p-1.5 rounded-md hover:bg-sand-100"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((it) => {
            const active =
              it.to === `/${role}`
                ? path === it.to
                : path === it.to || path.startsWith(it.to + "/");
            return (
              <Link
                key={it.to}
                to={it.to}
                className={classNames(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-forest-100 text-forest-900"
                    : "text-muted-foreground hover:bg-sand-100 hover:text-foreground"
                )}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-sand-100 hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="h-16 bg-card border-b border-border px-4 md:px-6 flex items-center justify-between sticky top-0 z-20">
          <button
            className="lg:hidden p-2 rounded-md hover:bg-sand-100"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <button className="relative p-2 rounded-full hover:bg-sand-100" aria-label="Notifications">
              <Bell className="w-5 h-5 text-muted-foreground" />
            </button>

            <div className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-full hover:bg-sand-100"
              >
                <div className={classNames("w-8 h-8 rounded-full grid place-items-center text-xs font-bold", colors.bg, colors.text)}>
                  {(user?.display_name || user?.email || "U").charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block text-sm font-medium max-w-[140px] truncate">
                  {user?.display_name || user?.email || "Account"}
                </span>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </button>
              {menuOpen ? (
                <div
                  className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-lg overflow-hidden"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="px-4 py-3 border-b border-border">
                    <div className="text-sm font-semibold truncate">{user?.display_name || "Account"}</div>
                    <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
                  </div>
                  <button className="w-full text-left px-4 py-2 text-sm hover:bg-sand-100">
                    Account settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
