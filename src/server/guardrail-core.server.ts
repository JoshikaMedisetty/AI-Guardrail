// Server-only orchestration: runs the guardrail engine and records telemetry.
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { checkRequest, scanResource, DEFAULT_POLICY, type CheckResult, type GuardrailPolicy, type ModelArtifact } from "@/lib/guardrail/engine";

type DB = SupabaseClient<Database>;
let modelPromise: Promise<ModelArtifact> | null = null;
export function loadModel() {
  modelPromise ??= import("@/lib/guardrail/model.json").then((m) => (m.default ?? m) as unknown as ModelArtifact);
  return modelPromise;
}

export async function loadPolicy(db: DB, userId: string): Promise<GuardrailPolicy> {
  const { data } = await db.from("guardrail_settings").select("*").eq("user_id", userId).maybeSingle();
  if (!data) return DEFAULT_POLICY;
  return {
    prompt_injection_enabled: data.prompt_injection_enabled, jailbreak_enabled: data.jailbreak_enabled,
    system_prompt_protection: data.system_prompt_protection, data_leakage_detection: data.data_leakage_detection,
    output_validation: data.output_validation, block_mode: data.block_mode === "WARN" ? "WARN" : "BLOCK",
    low_threshold: data.low_threshold, high_threshold: data.high_threshold,
  };
}

const rid = (p: string) => `${p}-${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

export async function runAndRecord(db: DB, opts: {
  userId: string; agentId: string; agentName: string; text: string; mode: "prompt" | "resource";
  resourceType?: string | undefined; url?: string | null | undefined; conversationId?: string | null | undefined; policy?: GuardrailPolicy | undefined;
}): Promise<CheckResult & { request_id: string }> {
  const model = await loadModel();
  const policy = opts.policy ?? (await loadPolicy(db, opts.userId));
  const res = opts.mode === "prompt" ? checkRequest(opts.text, model, policy) : scanResource(opts.text, model, policy);
  const request_id = rid(opts.mode === "prompt" ? "gr" : "scan");
  let domain: string | null = null;
  if (opts.url) { try { domain = new URL(opts.url).host; } catch { domain = opts.url; } }
  const threat = res.decision !== "ALLOW";
  await db.from("audit_logs").insert({
    id: request_id, agent_id: opts.agentId, user_id: opts.userId, conversation_id: opts.conversationId ?? null,
    website_url: opts.url ?? null, source_domain: domain, resource_type: opts.resourceType ?? (opts.mode === "prompt" ? "user_input" : "webpage_dom"),
    scan_status: threat ? "THREAT_DETECTED" : "CLEAN", action_taken: res.action_taken, request_text: opts.text.slice(0, 4000),
    decision: res.decision, risk_score: res.risk_score, confidence: res.confidence, attack_type: res.attack_type,
    severity: res.severity, model_prediction: res.model_prediction, model_score: res.model_score,
    detected_indicators: res.indicators as never, explanation: opts.url ? `Resource Scan [${opts.url}]: ${res.explanation}` : res.explanation,
    processing_time_ms: res.processing_time_ms,
  });
  if (threat && (res.severity === "HIGH" || res.severity === "CRITICAL" || res.decision === "BLOCK")) {
    await db.from("security_alerts").insert({
      id: rid("alert"), request_id, user_id: opts.userId, agent_id: opts.agentId, agent_name: opts.agentName,
      website_url: opts.url ?? null, attack_type: res.attack_type ?? "Prompt Injection", threat: res.attack_type ?? "Prompt Injection",
      severity: res.severity, risk_score: res.risk_score, confidence: res.confidence, model_prediction: res.model_prediction ?? "PROMPT_INJECTION",
      model_score: res.model_score, status: res.blocked ? "BLOCKED" : "WARNED", action_taken: res.action_taken,
      detected_input: opts.text.slice(0, 2000),
      what_detected: `Detected ${res.attack_type ?? "threat"} targeting ${opts.agentName}${opts.url ? ` via ${opts.url}` : ""}.`,
      why_blocked: res.explanation, indicators: res.indicators as never, recommendations: res.recommendations as never,
    });
  }
  // Agent counters (built-in agents are not user-writable, so use the admin client after the caller was verified).
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: a } = await supabaseAdmin.from("agents").select("request_count,threat_count").eq("id", opts.agentId).maybeSingle();
  if (a) await supabaseAdmin.from("agents").update({ request_count: a.request_count + 1, threat_count: a.threat_count + (res.blocked ? 1 : 0), last_activity: new Date().toISOString() }).eq("id", opts.agentId);
  return { ...res, request_id };
}
