import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// External agents / SDK call these with an agent API key (X-API-Key or Authorization: Bearer grd_live_...).
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-api-key, authorization", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (b: unknown, status = 200) => Response.json(b, { status, headers: cors });

const Body = z.object({
  request: z.string().max(20000).optional(), content: z.string().max(50000).optional(), text: z.string().max(50000).optional(),
  url: z.string().max(500).nullish(), resource_type: z.enum(["webpage_dom", "api_response", "tool_output", "user_input"]).optional(),
});

export const Route = createFileRoute("/api/public/v1/guardrail/$action")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request, params }) => {
        const action = params.action;
        if (!["check", "scan", "check-output"].includes(action)) return json({ error: "Unknown action" }, 404);
        const raw = request.headers.get("x-api-key") ?? request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
        if (!raw.startsWith("grd_live_") || raw.length > 100) return json({ error: "Missing or invalid API key" }, 401);
        const parsed = Body.safeParse(await request.json().catch(() => null));
        if (!parsed.success) return json({ error: "Invalid body" }, 400);
        const text = parsed.data.request ?? parsed.data.content ?? parsed.data.text ?? "";
        if (!text.trim()) return json({ error: "Text is required" }, 400);

        const { sha256 } = await import("@/server/hash.server");
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: key } = await supabaseAdmin.from("api_keys").select("id,user_id,agent_id,revoked_at").eq("key_hash", await sha256(raw)).maybeSingle();
        if (!key || key.revoked_at) return json({ error: "Missing or invalid API key" }, 401);
        const { data: agent } = await supabaseAdmin.from("agents").select("id,name,enabled,status").eq("id", key.agent_id).maybeSingle();
        if (!agent || !agent.enabled || agent.status === "Disconnected") return json({ error: "Agent disconnected" }, 403);
        await supabaseAdmin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", key.id);

        if (action === "check-output") {
          const { inspectOutput } = await import("@/lib/guardrail/engine");
          return json(inspectOutput(text));
        }
        const { runAndRecord } = await import("@/server/guardrail-core.server");
        const res = await runAndRecord(supabaseAdmin, { userId: key.user_id, agentId: agent.id, agentName: agent.name, text, mode: action === "check" ? "prompt" : "resource", url: parsed.data.url, resourceType: parsed.data.resource_type });
        return json({ allowed: !res.blocked, agent_id: agent.id, ...res });
      },
    },
  },
});
