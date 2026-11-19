import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, Brain, Globe, Lock, Activity, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Universal AI Guardrail — Secure your AI agents" },
      { name: "description", content: "Real-time protection for LLM agents against prompt injection, jailbreaks, system prompt leaks and data exfiltration." },
      { property: "og:title", content: "Universal AI Guardrail — Secure your AI agents" },
      { property: "og:description", content: "Rule engine + machine learning guardrail that inspects every agent prompt, web page and response." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: ShieldCheck, title: "Dual-pipeline detection", text: "Six rule analyzers plus a trained TF-IDF classifier score every prompt in under a millisecond." },
  { icon: Brain, title: "Risk decision engine", text: "Ensemble risk scoring maps each request to Allow, Warn or Block with a clear explanation." },
  { icon: Globe, title: "Indirect injection scanning", text: "Catches hidden instructions in web pages, API responses and tool outputs your agents read." },
  { icon: Lock, title: "Output guardrail", text: "Redacts API keys, private keys, card numbers and system prompt leaks before users see them." },
  { icon: Activity, title: "Security dashboard", text: "Live telemetry, threat forensics, audit history and analytics in one console." },
  { icon: Eye, title: "Per-user isolation", text: "People only see their own chats and logs; security admins see the whole picture." },
];

function Landing() {
  const { session } = useAuth();
  return (
    <div className="min-h-screen bg-glow">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-6 w-6 text-primary" /> Universal AI Guardrail</div>
        <div className="flex gap-2">
          {session ? <Button asChild><Link to="/dashboard">Open console</Link></Button> : <>
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/register">Get started</Link></Button>
          </>}
        </div>
      </header>
      <section className="mx-auto max-w-4xl px-6 pb-16 pt-20 text-center">
        <span className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-xs text-primary">OWASP LLM01 · LLM02 protection</span>
        <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight md:text-6xl">Securing LLM agents against <span className="text-brand">prompt injection</span></h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-muted-foreground">An agent-agnostic security layer that inspects every input, every web page and every response — and blocks attacks before they reach your model.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button size="lg" asChild><Link to={session ? "/agents" : "/register"}>Try a protected agent</Link></Button>
          <Button size="lg" variant="outline" asChild><Link to={session ? "/dashboard" : "/login"}>View dashboard</Link></Button>
        </div>
      </section>
      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-24 md:grid-cols-3">
        {features.map((f) => (
          <div key={f.title} className="panel p-6">
            <f.icon className="h-6 w-6 text-cyan" />
            <h3 className="mt-4 font-semibold">{f.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{f.text}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
