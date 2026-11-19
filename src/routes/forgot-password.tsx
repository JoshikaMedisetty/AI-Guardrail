import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/guardrail/auth-card";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({ meta: [{ title: "Reset password — Universal AI Guardrail" }, { name: "description", content: "Get a password reset link." }, { property: "og:title", content: "Reset password — Universal AI Guardrail" }, { property: "og:description", content: "Get a password reset link." }] }),
  component: () => {
    const [email, setEmail] = useState(""); const [sent, setSent] = useState(false);
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin + "/reset-password" });
      if (error) toast.error(error.message); else setSent(true);
    };
    return (
      <AuthCard title="Reset your password" subtitle={sent ? "If that email has an account, a reset link is on its way." : "Enter your email and we'll send a reset link."}>
        {!sent && <form onSubmit={submit} className="grid gap-3"><Input type="email" required placeholder="you@company.com" value={email} onChange={(e) => setEmail(e.target.value)} /><Button>Send reset link</Button></form>}
        <p className="mt-4 text-center text-sm"><Link to="/login" className="text-primary">Back to sign in</Link></p>
      </AuthCard>
    );
  },
});
