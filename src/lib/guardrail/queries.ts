import { queryOptions } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const unwrap = <T,>(r: { data: T | null; error: { message: string } | null }) => { if (r.error) throw new Error(r.error.message); return r.data as T; };

export const agentsQuery = queryOptions({ queryKey: ["agents"], queryFn: async () => unwrap(await supabase.from("agents").select("*").order("is_builtin", { ascending: false }).order("created_at")) });
export const logsQuery = queryOptions({ queryKey: ["audit_logs"], queryFn: async () => unwrap(await supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(1000)) });
export const alertsQuery = queryOptions({ queryKey: ["alerts"], queryFn: async () => unwrap(await supabase.from("security_alerts").select("*").order("created_at", { ascending: false }).limit(500)) });
export const conversationsQuery = (agentId: string) => queryOptions({ queryKey: ["conversations", agentId], queryFn: async () => unwrap(await supabase.from("conversations").select("*").eq("agent_id", agentId).order("updated_at", { ascending: false })) });
export const messagesQuery = (conversationId: string | null) => queryOptions({ queryKey: ["messages", conversationId], enabled: !!conversationId, queryFn: async () => unwrap(await supabase.from("messages").select("*").eq("conversation_id", conversationId!).order("created_at")) });
export const settingsQuery = (uid: string) => queryOptions({ queryKey: ["settings", uid], queryFn: async () => unwrap(await supabase.from("guardrail_settings").select("*").eq("user_id", uid).maybeSingle()) });
export const apiKeysQuery = queryOptions({ queryKey: ["api_keys"], queryFn: async () => unwrap(await supabase.from("api_keys").select("id,agent_id,name,key_prefix,created_at,last_used_at,revoked_at").order("created_at", { ascending: false })) });
