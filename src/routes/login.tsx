import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/guardrail/auth-card";
import { SocialButtons } from "@/components/guardrail/social-buttons";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Universal AI Guardrail" }, { name: "description", content: "Sign in to your AI Guardrail security console." }, { property: "og:title", content: "Sign in — Universal AI Guardrail" }, { property: "og:description", content: "Sign in to your AI Guardrail security console." }] }),
  component: Login,
});

function Login() {
  const { session } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (session) nav({ to: "/dashboard" }); }, [session, nav]);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) toast.error(error.message === "Invalid login credentials" ? "Wrong email or password. Moved from the old app? Create your account again with the same email." : error.message);
  };
  return (
    <AuthCard title="Welcome back" subtitle="Sign in to the security operations console.">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-2"><div className="flex justify-between"><Label htmlFor="pw">Password</Label><Link to="/forgot-password" className="text-xs text-primary">Forgot password?</Link></div><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button disabled={busy}>{busy ? "Signing in…" : "Sign in"}</Button>
      </form>
      <div className="my-4 text-center text-xs text-muted-foreground">or</div>
      <SocialButtons />
      <p className="mt-6 rounded-md border border-cyan/30 bg-cyan/10 p-3 text-xs text-muted-foreground">Had an account in the previous version? <Link to="/register" className="text-cyan">Create it again with the same email</Link> — after you verify it, your agents, chats and history come back.</p>
      <p className="mt-4 text-center text-sm text-muted-foreground">No account? <Link to="/register" className="text-primary">Create one</Link></p>
    </AuthCard>
  );
}
