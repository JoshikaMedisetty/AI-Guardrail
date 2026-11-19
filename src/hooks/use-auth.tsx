import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthState { session: Session | null; loading: boolean; isAdmin: boolean; name: string }
const Ctx = createContext<AuthState>({ session: null, loading: true, isAdmin: false, name: "" });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [name, setName] = useState("");
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setLoading(false); });
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    return () => sub.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    const uid = session?.user.id;
    if (!uid) { setIsAdmin(false); setName(""); return; }
    supabase.from("user_roles").select("role").eq("user_id", uid).then(({ data }) => setIsAdmin(!!data?.some((r) => r.role === "security_admin")));
    supabase.from("profiles").select("name").eq("id", uid).maybeSingle().then(({ data }) => setName(data?.name ?? ""));
  }, [session?.user.id]);
  return <Ctx.Provider value={{ session, loading, isAdmin, name }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);
