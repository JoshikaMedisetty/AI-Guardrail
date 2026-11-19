import { cn } from "@/lib/utils";

const safe = "bg-safe/15 text-safe border-safe/30", warn = "bg-warn/15 text-warn border-warn/30", bad = "bg-threat/15 text-threat border-threat/30";
const tone: Record<string, string> = {
  ALLOW: safe, SAFE: safe, ALLOWED: safe, LOW: safe, CLEAN: safe, PROTECTED: safe,
  WARN: warn, WARNED: warn, MEDIUM: warn, SANITIZED: warn, STANDBY: warn,
  BLOCK: bad, BLOCKED: bad, HIGH: bad, CRITICAL: "bg-threat/25 text-threat border-threat/50", THREAT_DETECTED: bad, DISCONNECTED: bad,
};
export function StatusBadge({ value, className }: { value: string | null | undefined; className?: string }) {
  const v = (value ?? "—").toUpperCase();
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold tracking-wide", tone[v] ?? "bg-muted text-muted-foreground border-border", className)}>{v}</span>;
}
export function MetricCard({ label, value, hint, accent = "primary" }: { label: string; value: string | number; hint?: string; accent?: "primary" | "safe" | "warn" | "threat" | "cyan" }) {
  const c = { primary: "text-primary", safe: "text-safe", warn: "text-warn", threat: "text-threat", cyan: "text-cyan" }[accent];
  return (
    <div className="panel p-5">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-2 font-mono text-3xl font-bold", c)}>{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
export function PageHeader({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>
      {children}
    </div>
  );
}
export const pct = (n: number | null | undefined) => (n == null ? "—" : `${Math.round(n * 100)}%`);
export const fmtDate = (s: string) => new Date(s).toLocaleString();
