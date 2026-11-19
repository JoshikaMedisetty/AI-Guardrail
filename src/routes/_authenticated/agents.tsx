import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { agentsQuery } from "@/lib/guardrail/queries";
import { PageHeader, StatusBadge } from "@/components/guardrail/badges";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/agents")({
  head: () => ({ meta: [{ title: "Protected Agents — Universal AI Guardrail" }, { name: "description", content: "Choose an AI assistant protected by input and output guardrails." }, { property: "og:title", content: "Protected Agents — Universal AI Guardrail" }, { property: "og:description", content: "Choose an AI assistant protected by input and output guardrails." }] }),
  component: Agents,
});

function Agents() {
  const { data = [], isLoading } = useQuery(agentsQuery);
  return (
    <div>
      <PageHeader title="Choose Protected AI Agent" subtitle="Select an autonomous assistant with end-to-end Input & Output Guardrail protection">
        <Button variant="outline" asChild><Link to="/connect">Connect your own agent</Link></Button>
      </PageHeader>
      {isLoading ? <p className="text-muted-foreground">Loading agents…</p> : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data.map((a) => {
            const usable = a.enabled && a.status !== "Disconnected";
            return (
              <div key={a.id} className="panel flex flex-col p-5">
                <div className="flex items-start justify-between">
                  <div className="text-3xl">{a.icon}</div>
                  <StatusBadge value={usable ? "PROTECTED" : "DISCONNECTED"} />
                </div>
                <h3 className="mt-3 font-semibold">{a.name}</h3>
                <p className="text-xs text-cyan">{a.role_title ?? a.category}</p>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{a.description}</p>
                {a.sample_topics.length > 0 && <div className="mt-3 flex flex-wrap gap-1">{a.sample_topics.slice(0, 4).map((t) => <span key={t} className="rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{t}</span>)}</div>}
                <div className="mt-4 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
                  <span>{a.request_count} requests · {a.threat_count} threats</span>
                </div>
                <Button className="mt-4" disabled={!usable} asChild={usable}>{usable ? <Link to="/chat/$agentId" params={{ agentId: a.id }}>Start secure chat</Link> : <span>Unavailable</span>}</Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
