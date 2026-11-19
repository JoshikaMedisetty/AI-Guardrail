import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Fragment, useMemo, useState } from "react";
import { logsQuery } from "@/lib/guardrail/queries";
import { PageHeader, StatusBadge, fmtDate, pct } from "@/components/guardrail/badges";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "Audit History — Universal AI Guardrail" }, { name: "description", content: "Ledger of every allowed, warned and blocked agent transaction." }, { property: "og:title", content: "Audit History — Universal AI Guardrail" }, { property: "og:description", content: "Ledger of every allowed, warned and blocked agent transaction." }] }),
  component: HistoryPage,
});

function HistoryPage() {
  const logs = useQuery(logsQuery).data ?? [];
  const [q, setQ] = useState(""); const [dec, setDec] = useState<string>("ALL"); const [open, setOpen] = useState<string | null>(null);
  const rows = useMemo(() => logs.filter((l) => (dec === "ALL" || l.decision === dec) && (!q || `${l.request_text} ${l.agent_id} ${l.attack_type ?? ""} ${l.website_url ?? ""}`.toLowerCase().includes(q.toLowerCase()))), [logs, q, dec]);
  const exportCsv = () => {
    const head = ["created_at", "agent_id", "decision", "severity", "risk_score", "attack_type", "resource_type", "website_url", "request_text"];
    const csv = [head.join(","), ...rows.map((r) => head.map((h) => JSON.stringify(String((r as Record<string, unknown>)[h] ?? ""))).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "guardrail-history.csv"; a.click();
  };
  return (
    <div>
      <PageHeader title="Complete Audit Log History" subtitle="Immutable ledger of all verified, allowed, warned, and blocked agent transactions"><Button variant="outline" onClick={exportCsv}>Export CSV</Button></PageHeader>
      <div className="mb-4 flex flex-wrap gap-2">
        <Input placeholder="Search input, agent, threat, URL…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        {["ALL", "ALLOW", "WARN", "BLOCK"].map((d) => <Button key={d} size="sm" variant={dec === d ? "default" : "outline"} onClick={() => setDec(d)}>{d}</Button>)}
      </div>
      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="p-3">Time</th><th>Agent</th><th>Source</th><th>Input</th><th>Threat</th><th>Risk</th><th>Decision</th></tr></thead>
          <tbody>
            {rows.map((l) => (<Fragment key={l.id}>
              <tr onClick={() => setOpen(open === l.id ? null : l.id)} className="cursor-pointer border-t hover:bg-accent/50">
                <td className="whitespace-nowrap p-3 text-xs text-muted-foreground">{fmtDate(l.created_at)}</td>
                <td className="font-mono text-xs">{l.agent_id}</td>
                <td className="text-xs">{l.resource_type}</td>
                <td className="max-w-sm truncate pr-2">{l.request_text}</td>
                <td className="text-xs">{l.attack_type ?? "—"}</td>
                <td className="font-mono text-xs">{pct(l.risk_score)}</td>
                <td className="pr-3"><StatusBadge value={l.decision} /></td>
              </tr>
              {open === l.id && <tr className="bg-muted/30"><td colSpan={7} className="p-4 text-xs"><pre className="whitespace-pre-wrap font-mono">{l.request_text}</pre><p className="mt-2 text-muted-foreground">{l.explanation}</p><p className="mt-1 font-mono text-muted-foreground">{l.processing_time_ms} ms · {l.model_prediction ?? "—"} · {l.website_url ?? ""}</p></td></tr>}
            </Fragment>))}
          </tbody>
        </table>
        {!rows.length && <p className="p-8 text-center text-muted-foreground">No matching records.</p>}
      </div>
    </div>
  );
}
