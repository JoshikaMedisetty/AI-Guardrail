import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { logsQuery, alertsQuery, agentsQuery } from "@/lib/guardrail/queries";
import { MetricCard, PageHeader, StatusBadge, fmtDate, pct } from "@/components/guardrail/badges";
import { LiveTester } from "@/components/guardrail/live-tester";
import { ThemeToggle } from "@/components/ThemeToggle";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Security Dashboard — Universal AI Guardrail" }, { name: "description", content: "Monitor AI agent traffic and neutralize threats in real time." }, { property: "og:title", content: "Security Dashboard — Universal AI Guardrail" }, { property: "og:description", content: "Monitor AI agent traffic and neutralize threats in real time." }] }),
  component: Dashboard,
});

const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };

function Dashboard() {
  const logs = useQuery({ ...logsQuery, refetchInterval: 10000 }).data ?? [];
  const alerts = useQuery(alertsQuery).data ?? [];
  const agents = useQuery(agentsQuery).data ?? [];
  const blocked = logs.filter((l) => l.decision === "BLOCK").length;
  const warned = logs.filter((l) => l.decision === "WARN").length;
  const avgRisk = logs.length ? logs.reduce((a, l) => a + l.risk_score, 0) / logs.length : 0;
  const avgMs = logs.length ? logs.reduce((a, l) => a + l.processing_time_ms, 0) / logs.length : 0;
  const byDay = new Map<string, { day: string; allowed: number; blocked: number; warned: number }>();
  for (const l of [...logs].reverse()) {
    const d = l.created_at.slice(0, 10);
    const e = byDay.get(d) ?? { day: d, allowed: 0, blocked: 0, warned: 0 };
    if (l.decision === "BLOCK") e.blocked++; else if (l.decision === "WARN") e.warned++; else e.allowed++;
    byDay.set(d, e);
  }
  return (
    <div>
      <div className="flex items-start justify-between gap-4"><PageHeader title="Executive Security Dashboard" subtitle="Central operations center for monitoring AI agent traffic and neutralizing threats in real time" /><ThemeToggle /></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard label="Inspected requests" value={logs.length} accent="cyan" />
        <MetricCard label="Threats blocked" value={blocked} accent="threat" />
        <MetricCard label="Warnings" value={warned} accent="warn" />
        <MetricCard label="Average risk" value={pct(avgRisk)} accent="primary" />
        <MetricCard label="Avg inspection" value={`${avgMs.toFixed(1)} ms`} hint={`${agents.filter((a) => a.enabled).length} protected agents`} accent="safe" />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="panel p-5 xl:col-span-2">
          <h3 className="font-semibold">Traffic & interceptions</h3>
          <div className="mt-4 h-64">
            <ResponsiveContainer>
              <AreaChart data={[...byDay.values()]}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={11} />
                <YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} />
                <Tooltip {...tip} />
                <Area type="monotone" dataKey="allowed" stackId="1" stroke="var(--safe)" fill="var(--safe)" fillOpacity={0.25} />
                <Area type="monotone" dataKey="warned" stackId="1" stroke="var(--warn)" fill="var(--warn)" fillOpacity={0.25} />
                <Area type="monotone" dataKey="blocked" stackId="1" stroke="var(--threat)" fill="var(--threat)" fillOpacity={0.35} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <LiveTester />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="panel overflow-x-auto p-5 xl:col-span-2">
          <div className="flex justify-between"><h3 className="font-semibold">Recent activity</h3><Link to="/history" className="text-xs text-primary">View all</Link></div>
          <table className="mt-3 w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Time</th><th>Agent</th><th>Input</th><th>Risk</th><th>Decision</th></tr></thead>
            <tbody>{logs.slice(0, 8).map((l) => <tr key={l.id} className="border-t"><td className="py-2 pr-2 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(l.created_at)}</td><td className="pr-2 font-mono text-xs">{l.agent_id}</td><td className="max-w-xs truncate pr-2">{l.request_text}</td><td className="font-mono text-xs">{pct(l.risk_score)}</td><td><StatusBadge value={l.decision} /></td></tr>)}</tbody>
          </table>
          {!logs.length && <p className="py-6 text-center text-sm text-muted-foreground">No traffic yet — chat with an agent or run the tester.</p>}
        </div>
        <div className="panel p-5">
          <div className="flex justify-between"><h3 className="font-semibold">Latest alerts</h3><Link to="/threats" className="text-xs text-primary">Open</Link></div>
          <div className="mt-3 grid gap-2">{alerts.slice(0, 6).map((a) => <Link key={a.id} to="/threats" search={{ id: a.id }} className="rounded-md border p-3 hover:bg-accent"><div className="flex items-center justify-between"><span className="text-sm font-medium">{a.threat}</span><StatusBadge value={a.severity} /></div><div className="mt-1 truncate text-xs text-muted-foreground">{a.agent_name}{a.website_url ? ` · ${a.website_url}` : ""}</div></Link>)}</div>
          {!alerts.length && <p className="py-6 text-center text-sm text-muted-foreground">No alerts.</p>}
        </div>
      </div>
    </div>
  );
}
