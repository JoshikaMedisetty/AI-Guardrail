import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { LayoutDashboard, Bot, ShieldAlert, History, BarChart3, Settings2, User, Plug, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { alertsQuery } from "@/lib/guardrail/queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated")({ component: Layout });

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/agents", label: "Protected Agents", icon: Bot },
  { to: "/threats", label: "Security Alerts", icon: ShieldAlert, badge: true },
  { to: "/history", label: "History", icon: History },
  { to: "/analytics", label: "Security Analytics", icon: BarChart3 },
  { to: "/connect", label: "Connect Agent", icon: Plug },
  { to: "/settings", label: "Guardrail Configuration", icon: Settings2 },
  { to: "/profile", label: "Profile", icon: User },
] as const;

function Layout() {
  const { session, loading, isAdmin, name } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => { if (!loading && !session) navigate({ to: "/login" }); }, [loading, session, navigate]);
  const alerts = useQuery({ ...alertsQuery, enabled: !!session, refetchInterval: 15000 });
  if (loading || !session) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading console…</div>;
  const blocked = (alerts.data ?? []).filter((a) => a.status === "BLOCKED").length;
  const fullscreen = path.startsWith("/chat/");
  return (
    <div className="flex min-h-screen">
      {!fullscreen && (
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
          <Link to="/" className="mb-8 flex items-center gap-2 px-2 font-bold"><ShieldCheck className="h-6 w-6 text-primary" /><span>AI Guardrail</span></Link>
          <nav className="grid gap-1">
            {nav.map((n) => {
              const active = path === n.to || (n.to === "/agents" && path.startsWith("/chat"));
              return (
                <Link key={n.to} to={n.to} className={cn("flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent", active && "bg-sidebar-accent font-semibold text-sidebar-accent-foreground")}>
                  <n.icon className="h-4 w-4" /><span className="flex-1">{n.label}</span>
                  {"badge" in n && blocked > 0 && <span className="rounded-full bg-threat px-2 text-[10px] font-bold text-destructive-foreground">{blocked}</span>}
                </Link>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-sidebar-border pt-4">
            <div className="px-2 text-sm font-medium">{name || session.user.email}</div>
            <div className="px-2 font-mono text-[11px] text-muted-foreground">{isAdmin ? "SECURITY ADMIN" : "USER"}</div>
            <button onClick={() => supabase.auth.signOut()} className="mt-3 flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-sidebar-accent"><LogOut className="h-4 w-4" />Sign out</button>
          </div>
        </aside>
      )}
      <main className={cn("min-w-0 flex-1", !fullscreen && "p-6 md:p-8")}>
        {!fullscreen && (
          <div className="mb-4 flex gap-2 overflow-x-auto md:hidden">
            {nav.map((n) => <Link key={n.to} to={n.to} className="whitespace-nowrap rounded-md border px-3 py-1 text-xs">{n.label}</Link>)}
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
