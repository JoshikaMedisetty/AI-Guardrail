import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Plus, Send, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { agentsQuery, conversationsQuery, messagesQuery } from "@/lib/guardrail/queries";
import { sendChatMessage } from "@/lib/guardrail.functions";
import { StatusBadge, pct } from "@/components/guardrail/badges";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$agentId")({
  head: () => ({ meta: [{ title: "Secure Chat — Universal AI Guardrail" }, { name: "description", content: "Chat with an AI agent while every message is inspected by the guardrail." }, { property: "og:title", content: "Secure Chat — Universal AI Guardrail" }, { property: "og:description", content: "Chat with an AI agent while every message is inspected by the guardrail." }] }),
  component: Chat,
});

type Verdict = Awaited<ReturnType<typeof sendChatMessage>>;

function Chat() {
  const { agentId } = Route.useParams();
  const qc = useQueryClient();
  const send = useServerFn(sendChatMessage);
  const agents = useQuery(agentsQuery);
  const agent = agents.data?.find((a) => a.id === agentId);
  const convs = useQuery(conversationsQuery(agentId));
  const [convId, setConvId] = useState<string | null>(null);
  const msgs = useQuery(messagesQuery(convId));
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const [last, setLast] = useState<Verdict | null>(null);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs.data, pending]);

  const submit = async () => {
    const m = text.trim(); if (!m || pending) return;
    setPending(m); setText("");
    try {
      const r = await send({ data: { agentId, message: m, conversationId: convId } });
      setLast(r); setConvId(r.conversation_id);
      if (r.decision === "BLOCK") toast.error(`Blocked: ${r.attack_type ?? "malicious prompt"}`);
      await Promise.all([qc.invalidateQueries({ queryKey: ["messages", r.conversation_id] }), qc.invalidateQueries({ queryKey: ["conversations", agentId] }), qc.invalidateQueries({ queryKey: ["audit_logs"] }), qc.invalidateQueries({ queryKey: ["alerts"] })]);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Message failed"); setText(m); }
    finally { setPending(null); }
  };
  const remove = async (id: string) => {
    await supabase.from("conversations").delete().eq("id", id);
    if (convId === id) setConvId(null);
    qc.invalidateQueries({ queryKey: ["conversations", agentId] });
  };

  return (
    <div className="flex h-screen">
      <aside className="hidden w-72 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link to="/agents" className="mb-4 flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />All agents</Link>
        <Button variant="outline" onClick={() => { setConvId(null); setLast(null); }}><Plus className="h-4 w-4" />New conversation</Button>
        <div className="mt-4 grid gap-1 overflow-y-auto">
          {(convs.data ?? []).map((c) => (
            <div key={c.id} className={cn("group flex items-center rounded-md px-2 py-2 text-sm hover:bg-sidebar-accent", convId === c.id && "bg-sidebar-accent")}>
              <button className="flex-1 truncate text-left" onClick={() => { setConvId(c.id); setLast(null); }}>{c.title.replace(/^\[model=[^\]]*\]\s*/, "")}</button>
              <button aria-label="Delete conversation" onClick={() => remove(c.id)} className="opacity-0 group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-muted-foreground" /></button>
            </div>
          ))}
        </div>
      </aside>
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b px-6 py-4">
          <Link to="/agents" className="md:hidden"><ArrowLeft className="h-4 w-4" /></Link>
          <span className="text-2xl">{agent?.icon}</span>
          <div className="flex-1"><div className="font-semibold">{agent?.name ?? "Agent"}</div><div className="flex items-center gap-1 text-xs text-safe"><ShieldCheck className="h-3 w-3" />Input & output guardrail active</div></div>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto grid max-w-3xl gap-4">
            {!convId && !pending && <div className="panel p-6 text-center text-sm text-muted-foreground">Ask {agent?.name ?? "the agent"} anything. Try a prompt injection like “Ignore all previous instructions…” to watch the guardrail block it.</div>}
            {(msgs.data ?? []).map((m) => (
              <div key={m.id} className={cn("max-w-[85%] rounded-xl px-4 py-3 text-sm", m.sender === "user" ? "ml-auto bg-primary/20" : "panel", m.decision === "BLOCK" && "border-threat/40")}>
                <div className="md"><ReactMarkdown>{m.content}</ReactMarkdown></div>
                <div className="mt-2 flex items-center gap-2 font-mono text-[10px] text-muted-foreground"><StatusBadge value={m.decision} />{m.sender === "user" && <span>risk {pct(m.risk_score)}</span>}</div>
              </div>
            ))}
            {pending && <><div className="ml-auto max-w-[85%] rounded-xl bg-primary/20 px-4 py-3 text-sm">{pending}</div><div className="panel w-fit animate-pulse px-4 py-3 text-sm text-muted-foreground">Guardrail inspecting & agent thinking…</div></>}
            <div ref={end} />
          </div>
        </div>
        <div className="border-t p-4">
          <div className="mx-auto flex max-w-3xl gap-2">
            <Textarea value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); } }} placeholder="Message the protected agent…" className="min-h-12 resize-none" maxLength={8000} />
            <Button onClick={submit} disabled={!text.trim() || !!pending} aria-label="Send"><Send className="h-4 w-4" /></Button>
          </div>
        </div>
      </section>
      <aside className="hidden w-80 shrink-0 border-l p-5 xl:block">
        <h3 className="text-sm font-semibold">Guardrail verdict</h3>
        {!last ? <p className="mt-2 text-xs text-muted-foreground">Send a message to see its live risk analysis.</p> : (
          <div className="mt-4 grid gap-4 text-sm">
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Decision</span><StatusBadge value={last.decision} /></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Risk</span><span className="font-mono">{pct(last.risk_score)} · {last.risk_level}</span></div>
            <div className="h-2 rounded bg-muted"><div className={cn("h-2 rounded", last.risk_score >= 0.7 ? "bg-threat" : last.risk_score >= 0.4 ? "bg-warn" : "bg-safe")} style={{ width: `${Math.round(last.risk_score * 100)}%` }} /></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">ML score</span><span className="font-mono">{last.ml_score ?? "—"}</span></div>
            {last.attack_type && <div><div className="text-muted-foreground">Threat</div><div className="font-mono text-threat">{last.attack_type}</div></div>}
            {last.triggered_rules.length > 0 && <div><div className="text-muted-foreground">Triggered rules</div><div className="mt-1 flex flex-wrap gap-1">{last.triggered_rules.map((r) => <span key={r} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">{r}</span>)}</div></div>}
            <div><div className="text-muted-foreground">Reason</div><p className="mt-1 text-xs">{last.reason}</p></div>
            <div className="flex items-center justify-between"><span className="text-muted-foreground">Output guardrail</span><StatusBadge value={last.output_guardrail.verdict} /></div>
            {last.output_guardrail.redacted_count > 0 && <p className="text-xs text-warn">{last.output_guardrail.redacted_count} sensitive item(s) redacted.</p>}
            <div className="font-mono text-[10px] text-muted-foreground">inspection {last.latency_ms} ms</div>
          </div>
        )}
      </aside>
    </div>
  );
}
