import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { settingsQuery } from "@/lib/guardrail/queries";
import { PageHeader } from "@/components/guardrail/badges";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Guardrail Configuration — Universal AI Guardrail" }, { name: "description", content: "Configure scanning engines, enforcement mode and risk thresholds." }, { property: "og:title", content: "Guardrail Configuration — Universal AI Guardrail" }, { property: "og:description", content: "Configure scanning engines, enforcement mode and risk thresholds." }] }),
  component: Settings,
});

const DEF = { prompt_injection_enabled: true, jailbreak_enabled: true, system_prompt_protection: true, data_leakage_detection: true, output_validation: true, webpage_scanning: true, api_response_scanning: true, tool_output_scanning: true, block_mode: "BLOCK", low_threshold: 0.4, high_threshold: 0.7, notify_critical: true, notify_blocked: true, notify_warnings: false };
type S = typeof DEF;
const toggles: [keyof S, string, string][] = [
  ["prompt_injection_enabled", "Prompt injection detection", "Instruction overrides and indirect injections in tags and comments."],
  ["jailbreak_enabled", "Jailbreak detection", "DAN, developer mode and unrestricted persona attacks."],
  ["system_prompt_protection", "System prompt protection", "Blocks attempts to extract hidden instructions."],
  ["data_leakage_detection", "Data exfiltration detection", "Webhook sinks, markdown image beacons and credential harvesting."],
  ["output_validation", "Output guardrail", "Redacts secrets, card numbers and prompt leaks from AI responses."],
];

function Settings() {
  const { session } = useAuth(); const uid = session!.user.id;
  const qc = useQueryClient();
  const { data, isLoading } = useQuery(settingsQuery(uid));
  const [s, setS] = useState<S>(DEF);
  useEffect(() => { if (data) setS({ ...DEF, ...(data as Partial<S>) } as S); }, [data]);
  const save = async () => {
    if (s.low_threshold >= s.high_threshold) { toast.error("The warning threshold must be lower than the block threshold."); return; }
    const { error } = await supabase.from("guardrail_settings").upsert({ user_id: uid, ...s, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    toast.success("Guardrail policy saved"); qc.invalidateQueries({ queryKey: ["settings", uid] });
  };
  if (isLoading) return null;
  return (
    <div className="max-w-3xl">
      <PageHeader title="Guardrail Policies & Security Settings" subtitle="Configure active scanning engines, enforcement mode (Automatic Block vs Warning), and risk thresholds"><Button onClick={save}>Save policy</Button></PageHeader>
      <div className="panel divide-y">
        {toggles.map(([k, label, hint]) => (
          <div key={k} className="flex items-center justify-between gap-4 p-5"><div><div className="font-medium">{label}</div><div className="text-xs text-muted-foreground">{hint}</div></div><Switch checked={s[k] as boolean} onCheckedChange={(v) => setS({ ...s, [k]: v })} /></div>
        ))}
      </div>
      <div className="panel mt-6 p-5">
        <div className="font-medium">Enforcement mode</div>
        <div className="mt-3 flex gap-2">{(["BLOCK", "WARN"] as const).map((m) => <Button key={m} variant={s.block_mode === m ? "default" : "outline"} onClick={() => setS({ ...s, block_mode: m })}>{m === "BLOCK" ? "Automatic block" : "Warn only"}</Button>)}</div>
        <p className="mt-2 text-xs text-muted-foreground">Warn only lets high-risk prompts through but still records them as alerts.</p>
      </div>
      <div className="panel mt-6 grid gap-6 p-5">
        <div><div className="flex justify-between text-sm"><span>Warn at risk ≥</span><span className="font-mono">{Math.round(s.low_threshold * 100)}%</span></div><Slider className="mt-3" min={5} max={95} step={1} value={[s.low_threshold * 100]} onValueChange={([v]) => setS({ ...s, low_threshold: (v ?? 40) / 100 })} /></div>
        <div><div className="flex justify-between text-sm"><span>Block at risk ≥</span><span className="font-mono">{Math.round(s.high_threshold * 100)}%</span></div><Slider className="mt-3" min={10} max={99} step={1} value={[s.high_threshold * 100]} onValueChange={([v]) => setS({ ...s, high_threshold: (v ?? 70) / 100 })} /></div>
      </div>
    </div>
  );
}
