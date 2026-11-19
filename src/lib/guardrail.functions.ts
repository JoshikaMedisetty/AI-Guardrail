import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MODEL = "openai/gpt-6.1-sol" as const;

export const sendChatMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agentId: z.string().min(1).max(100), message: z.string().trim().min(1).max(8000), conversationId: z.string().max(100).nullish() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runAndRecord, loadPolicy } = await import("@/server/guardrail-core.server");
    const { inspectOutput } = await import("@/lib/guardrail/engine");
    const db = context.supabase; const userId = context.userId;
    const { data: agent } = await db.from("agents").select("*").eq("id", data.agentId).maybeSingle();
    if (!agent || !agent.enabled || agent.status === "Disconnected") throw new Error("This AI agent is currently unavailable or disabled.");

    let convId = data.conversationId ?? null;
    if (convId) {
      const { data: c } = await db.from("conversations").select("id,agent_id,user_id").eq("id", convId).maybeSingle();
      if (!c || c.user_id !== userId) throw new Error("Conversation not found or unauthorized.");
      if (c.agent_id !== agent.id) throw new Error("This conversation belongs to a different agent.");
    } else {
      const title = data.message.slice(0, 40) + (data.message.length > 40 ? "..." : "");
      const { data: c, error } = await db.from("conversations").insert({ user_id: userId, agent_id: agent.id, title }).select("id").single();
      if (error) throw new Error(error.message);
      convId = c.id;
    }
    const policy = await loadPolicy(db, userId);
    const g = await runAndRecord(db, { userId, agentId: agent.id, agentName: agent.name, text: data.message, mode: "prompt", conversationId: convId, policy });
    await db.from("messages").insert({ conversation_id: convId, user_id: userId, sender: "user", content: data.message, risk_score: g.risk_score, risk_level: g.severity, decision: g.decision, detection_reason: g.explanation, triggered_rules: g.indicator_labels, ml_score: g.model_score });
    await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);

    const base = { conversation_id: convId, decision: g.decision, risk_score: g.risk_score, risk_level: g.severity, ml_score: g.model_score, attack_type: g.attack_type, triggered_rules: g.indicator_labels, reason: g.explanation, latency_ms: g.processing_time_ms };
    if (g.decision === "BLOCK") {
      const text = `🛡️ **Security Alert — Prompt Blocked by Universal AI Guardrail**\n\nYour request was intercepted and blocked before reaching the **${agent.name}**.\n\n- **Risk Score**: \`${Math.round(g.risk_score * 100)}%\` (${g.severity} Risk)\n- **Threat Category**: \`${g.attack_type ?? "Prompt Injection"}\`\n- **Triggered Security Rules**: ${g.indicator_labels.join(", ") || "Statistical ML boundary"}\n- **Detection Reason**: ${g.explanation}\n\nPlease refine your prompt to comply with AI safety policies.`;
      await db.from("messages").insert({ conversation_id: convId, user_id: userId, sender: "assistant", content: text, risk_score: g.risk_score, risk_level: g.severity, decision: "BLOCK", detection_reason: g.explanation, triggered_rules: g.indicator_labels });
      return { ...base, assistant_response: text, output_guardrail: { verdict: "NOT_CALLED", sanitized: false, redacted_count: 0, leakage_types: [] as string[] } };
    }

    const { data: hist } = await db.from("messages").select("sender,content,decision").eq("conversation_id", convId).order("created_at", { ascending: false }).limit(9);
    const history = (hist ?? []).reverse().slice(0, -1).filter((m) => m.decision !== "BLOCK");
    const { generateResponse, GatewayError } = await import("@lovable.dev/ai-gateway");
    let raw = "";
    try {
      const resp = await generateResponse({
        model: MODEL,
        instructions: agent.system_prompt ?? `You are ${agent.name}, an AI assistant (${agent.category}). ${agent.description}`,
        input: [...history.map((m) => ({ role: (m.sender === "user" ? "user" : "assistant") as "user" | "assistant", content: m.content })), { role: "user" as const, content: data.message }],
      });
      for (const item of resp.output ?? []) if (item.type === "message") for (const c of item.content) if (c.type === "output_text") raw += c.text;
    } catch (e) {
      if (e instanceof GatewayError) {
        if (e.code === "payment_required" || e.httpStatus === 402) throw new Error("AI credits are exhausted. Please add credits to continue chatting.");
        if (e.httpStatus === 429) throw new Error("The AI is busy right now. Please wait a moment and try again.");
        throw new Error("The AI provider could not answer this message. Please try again.");
      }
      throw e;
    }
    if (!raw) raw = "I couldn't produce a response for that request.";
    const out = policy.output_validation ? inspectOutput(raw) : { verdict: "SAFE", sanitized_text: raw, risk_score: 0.02, leakage_types: [] as string[], redacted_count: 0, explanation: "Output validation disabled." };
    await db.from("messages").insert({ conversation_id: convId, user_id: userId, sender: "assistant", content: out.sanitized_text, risk_score: out.risk_score, risk_level: out.verdict === "BLOCK" ? "HIGH" : "LOW", decision: out.verdict, detection_reason: out.explanation, triggered_rules: out.leakage_types });
    return { ...base, assistant_response: out.sanitized_text, output_guardrail: { verdict: out.verdict, sanitized: out.redacted_count > 0, redacted_count: out.redacted_count, leakage_types: out.leakage_types, explanation: out.explanation } };
  });

export const testGuardrail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ text: z.string().trim().min(1).max(20000), mode: z.enum(["prompt", "resource"]), agentId: z.string().max(100), url: z.string().max(500).nullish(), resourceType: z.enum(["webpage_dom", "api_response", "tool_output"]).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { runAndRecord } = await import("@/server/guardrail-core.server");
    const { data: agent } = await context.supabase.from("agents").select("id,name").eq("id", data.agentId).maybeSingle();
    if (!agent) throw new Error("Agent not found.");
    return runAndRecord(context.supabase, { userId: context.userId, agentId: agent.id, agentName: agent.name, text: data.text, mode: data.mode, url: data.url, resourceType: data.resourceType });
  });

export const createApiKey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ agentId: z.string().min(1).max(100), name: z.string().trim().min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const bytes = crypto.getRandomValues(new Uint8Array(24));
    const key = "grd_live_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    const { sha256 } = await import("@/server/hash.server");
    const { error } = await context.supabase.from("api_keys").insert({ user_id: context.userId, agent_id: data.agentId, name: data.name, key_prefix: key.slice(0, 16), key_hash: await sha256(key) });
    if (error) throw new Error("Only the owner of a connected agent can create keys for it.");
    return { key };
  });
