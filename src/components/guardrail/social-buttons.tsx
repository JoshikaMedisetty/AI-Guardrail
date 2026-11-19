import { toast } from "sonner";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";

export function SocialButtons() {
  const go = async (p: "google" | "lovable") => {
    const r = await lovable.auth.signInWithOAuth(p, { redirect_uri: window.location.origin + "/login" });
    if (r.error) toast.error(r.error.message ?? "Sign-in failed");
  };
  return (
    <div className="grid gap-2">
      <Button type="button" variant="outline" onClick={() => go("google")}>Continue with Google</Button>
      <Button type="button" variant="outline" onClick={() => go("lovable")}><LovableMark />Continue with Lovable</Button>
    </div>
  );
}
