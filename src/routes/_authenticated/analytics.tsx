import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { logsQuery } from "@/lib/guardrail/queries";
import { MetricCard, PageHeader, pct } from "@/components/guardrail/badges";

export const Route = createFileRoute("/_authenticated/analytics")({
  head: () => ({ meta: [{ title: "Security Analytics — Universal AI Guardrail" }, { name: "description", content: "Threat categories, targeted websites and attack frequency." }, { property: "og:title", content: "Security Analytics — Universal AI Guardrail" }, { property: "og:description", content: "Threat categories, targeted websites and attack frequency." }] }),
  component: Analytics,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)", "var(--cyan)"];
const tip = { contentStyle: { background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 } };
const count = <T,>(xs: T[], k: (x: T) => string | null) => { const m = new Map<string, number>(); for (const x of xs) { const v = k(x); if (v) m.set(v, (m.get(v) ?? 0) + 1); } return [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value); };

function Analytics() {
  const logs = useQuery(logsQuery).data ?? [];
  const threats = logs.filter((l) => l.decision !== "ALLOW");
  const byType = count(threats, (l) => l.attack_type);
  const byDomain = count(threats, (l) => l.source_domain).slice(0, 8);
  const byAgent = count(logs, (l) => l.agent_id).slice(0, 8);
  const bySeverity = count(logs, (l) => l.severity);
  const byResource = count(logs, (l) => l.resource_type);
  return (
    <div>
      <PageHeader title="Cybersecurity Analytics & Intelligence" subtitle="Threat categories, targeted external websites, and attack frequency distributions" />
      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard label="Detection rate" value={pct(logs.length ? threats.length / logs.length : 0)} accent="threat" />
        <MetricCard label="Attack categories" value={byType.length} accent="primary" />
        <MetricCard label="Hostile domains" value={byDomain.length} accent="warn" />
        <MetricCard label="Web/API scans" value={logs.filter((l) => l.resource_type !== "user_input").length} accent="cyan" />
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Chart title="Threats by attack type"><PieChart><Pie data={byType} dataKey="value" nameKey="name" innerRadius={50} outerRadius={90}>{byType.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></Chart>
        <Chart title="Severity distribution"><BarChart data={bySeverity}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} /><YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{bySeverity.map((s, i) => <Cell key={i} fill={s.name === "LOW" ? "var(--safe)" : s.name === "MEDIUM" ? "var(--warn)" : "var(--threat)"} />)}</Bar></BarChart></Chart>
        <Chart title="Targeted external websites"><BarChart data={byDomain} layout="vertical"><CartesianGrid stroke="var(--border)" horizontal={false} /><XAxis type="number" stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} /><YAxis type="category" dataKey="name" width={150} stroke="var(--muted-foreground)" fontSize={11} /><Tooltip {...tip} /><Bar dataKey="value" fill="var(--warn)" radius={[0, 4, 4, 0]} /></BarChart></Chart>
        <Chart title="Requests by agent"><BarChart data={byAgent}><CartesianGrid stroke="var(--border)" vertical={false} /><XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={10} /><YAxis stroke="var(--muted-foreground)" fontSize={11} allowDecimals={false} /><Tooltip {...tip} /><Bar dataKey="value" fill="var(--chart-1)" radius={[4, 4, 0, 0]} /></BarChart></Chart>
        <Chart title="Traffic by resource type"><PieChart><Pie data={byResource} dataKey="value" nameKey="name" outerRadius={90}>{byResource.map((_, i) => <Cell key={i} fill={COLORS[(i + 1) % COLORS.length]} />)}</Pie><Tooltip {...tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></Chart>
      </div>
    </div>
  );
}
function Chart({ title, children }: { title: string; children: React.ReactElement }) {
  return <div className="panel p-5"><h3 className="font-semibold">{title}</h3><div className="mt-4 h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>;
}
