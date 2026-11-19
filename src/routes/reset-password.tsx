import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "@/components/guardrail/auth-card";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Choose a new password — Universal AI Guardrail" }, { name: "description", content: "Set a new password for your account." }, { property: "og:title", content: "Choose a new password — Universal AI Guardrail" }, { property: "og:description", content: "Set a new password for your account." }] }),
  component: () => {
    const nav = useNavigate(); const [pw, setPw] = useState("");
    const submit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated"); nav({ to: "/dashboard" });
    };
    return <AuthCard title="Choose a new password" subtitle="Enter a new password for your account."><form onSubmit={submit} className="grid gap-3"><Input type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /><Button>Save password</Button></form></AuthCard>;
  },
});
