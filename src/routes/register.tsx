import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthCard } from "@/components/guardrail/auth-card";
import { SocialButtons } from "@/components/guardrail/social-buttons";

export const Route = createFileRoute("/register")({
  head: () => ({ meta: [{ title: "Create account — Universal AI Guardrail" }, { name: "description", content: "Create an AI Guardrail account to protect your AI agents." }, { property: "og:title", content: "Create account — Universal AI Guardrail" }, { property: "og:description", content: "Create an AI Guardrail account to protect your AI agents." }] }),
  component: Register,
});

function Register() {
  const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("Use at least 8 characters for your password."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin + "/dashboard" } });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  };
  if (sent) return <AuthCard title="Check your email" subtitle={`We sent a verification link to ${email}. Open it to activate your account.`}><Button asChild variant="outline" className="w-full"><Link to="/login">Back to sign in</Link></Button></AuthCard>;
  return (
    <AuthCard title="Create your account" subtitle="Moving from the old app? Use the same email — your data reconnects once you verify it.">
      <form onSubmit={submit} className="grid gap-4">
        <div className="grid gap-2"><Label htmlFor="name">Full name</Label><Input id="name" required value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
        <div className="grid gap-2"><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
        <Button disabled={busy}>{busy ? "Creating…" : "Create account"}</Button>
      </form>
      <div className="my-4 text-center text-xs text-muted-foreground">or</div>
      <SocialButtons />
      <p className="mt-6 text-center text-sm text-muted-foreground">Already registered? <Link to="/login" className="text-primary">Sign in</Link></p>
    </AuthCard>
  );
}
