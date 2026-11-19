import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader, StatusBadge } from "@/components/guardrail/badges";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Profile — Universal AI Guardrail" }, { name: "description", content: "Manage your account and password." }, { property: "og:title", content: "Profile — Universal AI Guardrail" }, { property: "og:description", content: "Manage your account and password." }] }),
  component: Profile,
});

function Profile() {
  const { session, isAdmin, name: n } = useAuth();
  const [name, setName] = useState(n); const [pw, setPw] = useState("");
  useEffect(() => setName(n), [n]);
  const saveName = async () => {
    const { error } = await supabase.from("profiles").update({ name, updated_at: new Date().toISOString() }).eq("id", session!.user.id);
    error ? toast.error(error.message) : toast.success("Profile updated");
  };
  const savePw = async () => {
    if (pw.length < 8) { toast.error("Use at least 8 characters."); return; }
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message); else { toast.success("Password changed"); setPw(""); }
  };
  return (
    <div className="max-w-2xl">
      <PageHeader title="Profile & Security" subtitle="Manage your credentials and active guardrail session" />
      <div className="panel grid gap-4 p-6">
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Email</span><span className="font-mono text-sm">{session?.user.email}</span></div>
        <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Role</span><StatusBadge value={isAdmin ? "SECURITY ADMIN" : "USER"} /></div>
        <div className="grid gap-2"><Label htmlFor="name">Display name</Label><div className="flex gap-2"><Input id="name" value={name} onChange={(e) => setName(e.target.value)} /><Button onClick={saveName}>Save</Button></div></div>
      </div>
      <div className="panel mt-6 grid gap-2 p-6"><Label htmlFor="pw">New password</Label><div className="flex gap-2"><Input id="pw" type="password" value={pw} onChange={(e) => setPw(e.target.value)} /><Button onClick={savePw}>Change password</Button></div></div>
    </div>
  );
}
