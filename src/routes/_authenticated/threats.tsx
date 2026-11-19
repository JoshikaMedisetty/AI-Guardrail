import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { alertsQuery } from "@/lib/guardrail/queries";
import { PageHeader, StatusBadge, fmtDate, pct } from "@/components/guardrail/badges";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/threats")({
  validateSearch: z.object({ id: z.string().optional() }),
  head: () => ({ meta: [{ title: "Security Alerts — Universal AI Guardrail" }, { name: "description", content: "Threat forensics: attack payloads, indicators and mitigation advice." }, { property: "og:title", content: "Security Alerts — Universal AI Guardrail" }, { property: "og:description", content: "Threat forensics: attack payloads, indicators and mitigation advice." }] }),
  component: Threats,
});

function Threats() {
  const { id } = Route.useSearch();
  const nav = useNavigate({ from: "/threats" });
  const alerts = useQuery(alertsQuery).data ?? [];
  const sel = alerts.find((a) => a.id === id) ?? alerts[0];
  return (
    <div>
      <PageHeader title="Detected Security Threats & Forensics" subtitle="Incident response center: detailed threat taxonomy, attack payloads, and mitigation advice" />
      {!alerts.length ? <div className="panel p-10 text-center text-muted-foreground">No threats detected yet.</div> : (
        <div className="grid gap-6 lg:grid-cols-5">
          <div className="grid content-start gap-2 lg:col-span-2">
            {alerts.map((a) => (
              <button key={a.id} onClick={() => nav({ search: { id: a.id } })} className={cn("panel p-4 text-left hover:bg-accent", sel?.id === a.id && "border-primary")}>
                <div className="flex items-center justify-between"><span className="font-medium">{a.threat}</span><StatusBadge value={a.severity} /></div>
                <div className="mt-1 text-xs text-muted-foreground">{a.agent_name} · {fmtDate(a.created_at)}</div>
              </button>
            ))}
          </div>
          {sel && (
            <div className="panel grid content-start gap-5 p-6 lg:col-span-3">
              <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-bold">{sel.threat}</h2><StatusBadge value={sel.status} /><StatusBadge value={sel.severity} /></div>
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                <div><div className="text-xs text-muted-foreground">Risk score</div><div className="font-mono text-lg text-threat">{pct(sel.risk_score)}</div></div>
                <div><div className="text-xs text-muted-foreground">Confidence</div><div className="font-mono text-lg">{pct(sel.confidence)}</div></div>
                <div><div className="text-xs text-muted-foreground">Model</div><div className="font-mono text-xs">{sel.model_name}</div></div>
                <div><div className="text-xs text-muted-foreground">Agent</div><div className="text-sm">{sel.agent_name}</div></div>
              </div>
              {sel.website_url && <div className="text-sm"><span className="text-muted-foreground">Source: </span><span className="font-mono text-cyan">{sel.website_url}</span></div>}
              <div><h4 className="text-sm font-semibold">Detected payload</h4><pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border border-threat/30 bg-threat/5 p-3 font-mono text-xs">{sel.detected_input}</pre></div>
              <div><h4 className="text-sm font-semibold">What was detected</h4><p className="mt-1 text-sm text-muted-foreground">{sel.what_detected}</p></div>
              <div><h4 className="text-sm font-semibold">Why it was blocked</h4><p className="mt-1 text-sm text-muted-foreground">{sel.why_blocked}</p></div>
              {(sel.indicators as { indicator_type: string; matched_text: string }[]).length > 0 && <div><h4 className="text-sm font-semibold">Indicators</h4><div className="mt-2 grid gap-1">{(sel.indicators as { indicator_type: string; matched_text: string }[]).map((i, k) => <div key={k} className="flex gap-2 text-xs"><span className="font-mono text-warn">{i.indicator_type}</span><span className="truncate text-muted-foreground">{i.matched_text}</span></div>)}</div></div>}
              {(sel.recommendations as string[]).length > 0 && <div><h4 className="text-sm font-semibold">Recommended actions</h4><ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">{(sel.recommendations as string[]).map((r) => <li key={r}>{r}</li>)}</ul></div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
