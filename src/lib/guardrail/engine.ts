/**
 * Universal AI Guardrail engine — TypeScript port of the original Python pipeline:
 * 6 rule detectors + TF-IDF / Multinomial Naive Bayes classifier + ensemble risk + decision engine.
 * Pure functions; the model artifact is passed in so this file stays browser-safe for tests.
 */

export type Decision = "ALLOW" | "WARN" | "BLOCK";
export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export interface Indicator { indicator_type: string; matched_text: string; confidence: number | null }

export const AttackType = {
  PROMPT_INJECTION: "Prompt Injection",
  JAILBREAK: "Jailbreak",
  SYSTEM_PROMPT_LEAK: "System Prompt Leakage",
  DATA_EXFILTRATION: "Data Exfiltration",
  OBFUSCATION: "Obfuscation Attack",
  INDIRECT: "Indirect Prompt Injection",
} as const;

export interface ModelArtifact {
  vectorizer: { min_ngram: number; max_ngram: number; vocabulary: Record<string, number>; idf_values: Record<string, number> };
  classifier: { log_priors: Record<string, number>; feature_log_probs: Record<string, Record<string, number>> };
}

export interface GuardrailPolicy {
  prompt_injection_enabled: boolean;
  jailbreak_enabled: boolean;
  system_prompt_protection: boolean;
  data_leakage_detection: boolean;
  output_validation: boolean;
  block_mode: "BLOCK" | "WARN";
  low_threshold: number;
  high_threshold: number;
}
export const DEFAULT_POLICY: GuardrailPolicy = {
  prompt_injection_enabled: true, jailbreak_enabled: true, system_prompt_protection: true,
  data_leakage_detection: true, output_validation: true, block_mode: "BLOCK", low_threshold: 0.4, high_threshold: 0.7,
};

interface RuleResult { matched: boolean; attack_type: string; severity: Severity; rule_score: number; confidence: number; indicators: Indicator[]; explanation: string; recommendations: string[] }
interface DetectorResult { is_threat: boolean; risk_score: number; confidence: number | null; attack_type: string | null; model_prediction: string | null; model_score: number | null; indicators: Indicator[]; explanation: string; recommendations: string[]; is_ml: boolean }

type Pat = [RegExp, string, number];
const r = (s: string, f = "") => new RegExp(s, f);

interface RuleDef { key: keyof GuardrailPolicy | null; name: string; attack: string; severity: Severity; score: number; lower: boolean; patterns: Pat[]; explanation: string; recs: string[]; truncate?: number }

const RULES: RuleDef[] = [
  { key: "prompt_injection_enabled", name: "PromptInjectionRule", attack: AttackType.PROMPT_INJECTION, severity: "HIGH", score: 0.92, lower: true,
    patterns: [
      [r(String.raw`ignore\s+(all\s+|your\s+|the\s+)?(previous|prior|above)?\s*(instructions?|rules?|directives?|prompts?|tasks?)`), "direct_instruction_override", 0.95],
      [r(String.raw`disregard\s+(all\s+|your\s+|the\s+)?(previous|prior|above)?\s*(instructions?|rules?|constraints?|tasks?)`), "disregard_directive", 0.94],
      [r(String.raw`forget\s+(everything\s+)?(you\s+(were|have\s+been)\s+told|prior\s+instructions?|previous\s+tasks?)`), "context_forget_command", 0.93],
      [r(String.raw`system\s*override\b|###\s*instruction\s*override\b|---?\s*end\s+of\s+prompt\s*---?`), "delimiter_override_syntax", 0.96],
      [r(String.raw`your\s+new\s+(objective|task|instruction|persona)\s+is\s+to\b`), "new_objective_injection", 0.91],
      [r(String.raw`stop\s*[\.\!]\s*disregard\s+previous\b`), "imperative_override_sequence", 0.92],
      [r(String.raw`bypass\s+(all\s+)?(safety|security|financial|transaction)\s+(filters?|rules?|checks?|guardrails?)`), "guardrail_bypass_command", 0.95],
      [r(String.raw`override\s+(level\s+max|system\s+prompt|safety\s+policy)`), "explicit_override_token", 0.93],
    ],
    explanation: "An attempt was detected to override or manipulate the agent's baseline instructions.",
    recs: ["Preserve the agent's immutable base system instructions.", "Do not execute injected directives.", "Verify the authenticity and authorization of the user request."] },
  { key: "jailbreak_enabled", name: "JailbreakRule", attack: AttackType.JAILBREAK, severity: "CRITICAL", score: 0.96, lower: true,
    patterns: [
      // Python lowercases the text, so the original uppercase "DAN" literal never matched; kept faithful.
      [r(String.raw`\bDAN\s*(mode|\d+\.\d+)?\b|\bdo\s+anything\s+now\b`), "dan_jailbreak_token", 0.98],
      [r(String.raw`developer\s+mode\s+(enabled|activated|on)\b`), "developer_mode_simulation", 0.96],
      [r(String.raw`act\s+as\s+(an?\s+)?(unrestricted|jailbroken|evil|unfiltered|black-hat|chaosgpt)\b`), "unrestricted_persona_shift", 0.95],
      [r(String.raw`(broken\s+free\s+of|without\s+applying\s+any)\s+(safety|ethics|filters|limitations)`), "safety_bypass_assertion", 0.94],
      [r(String.raw`in\s+this\s+(simulation|alternate\s+reality|movie\s+script)[,\s]+(ethics|rules|laws)\s+do\s+not\s+exist`), "hypothetical_frame_bypass", 0.92],
      [r(String.raw`(aim|stan|evilbot|godmode)\s+(mode\s+)?(activated|persona)`), "known_jailbreak_persona", 0.96],
      [r(String.raw`answer\s+all\s+(questions|inquiries)\s+without\s+(restrictions?|censorship|filters?)`), "unrestricted_compliance_demand", 0.94],
    ],
    explanation: "Jailbreak attempt detected trying to enforce unrestricted persona or bypass agent safety controls.",
    recs: ["Block persona alteration commands.", "Enforce immutable base system boundary policies.", "Terminate unsafe conversation session context.", "Log security incident for telemetry review."] },
  { key: "system_prompt_protection", name: "SystemPromptRule", attack: AttackType.SYSTEM_PROMPT_LEAK, severity: "HIGH", score: 0.9, lower: true,
    patterns: [
      [r(String.raw`repeat\s+(all\s+)?(your\s+)?(initial\s+|secret\s+|hidden\s+)?(instructions?|system\s+prompts?|developer\s+guidelines?)\s+(verbatim|completely|in\s+json)`), "verbatim_prompt_dump", 0.95],
      [r(String.raw`output\s+(your\s+)?(initial|hidden|secret)\s+system\s+(prompt|instructions?)\s+in\s+json`), "json_prompt_extraction", 0.94],
      [r(String.raw`what\s+(were|are)\s+the\s+exact\s+words\s+of\s+your\s+system\s+prompt`), "direct_prompt_query", 0.93],
      [r(String.raw`dump\s+(your\s+)?(entire\s+)?context\s+window\s+including\s+developer`), "context_dump_extraction", 0.96],
      [r(String.raw`print\s+the\s+text\s+above\s+starting\s+from\s+["']?you\s+are`), "delimiter_reflection_attack", 0.92],
      [r(String.raw`show\s+me\s+the\s+secret\s+prompt\s+(that\s+was\s+)?injected\s+before`), "secret_prompt_query", 0.93],
      [r(String.raw`(reveal|display|leak)\s+(all\s+)?(internal\s+rules|developer\s+instructions|system\s+message)`), "system_message_disclosure", 0.94],
    ],
    explanation: "Attempt detected to extract confidential system instructions or internal guardrail configuration.",
    recs: ["Block reflection of internal system prompt tokens.", "Do not expose developer configuration in agent output.", "Verify user permissions for administrative prompts."] },
  { key: "data_leakage_detection", name: "DataExfiltrationRule", attack: AttackType.DATA_EXFILTRATION, severity: "CRITICAL", score: 0.97, lower: false, truncate: 80,
    patterns: [
      [r(String.raw`!\[.*?\]\(https?:\/\/[^\s\)]+[\?&](data|q|leak|token|keys?|secret)=.*?\)`, "i"), "markdown_image_exfil_tag", 0.98],
      [r(String.raw`(exfiltrate|silently\s+transmit|ping\s+webhook|c2-server)\s+.*?(https?:\/\/|http:\/\/)`, "i"), "unauthorized_egress_channel", 0.96],
      [r(String.raw`(send|transmit|exfiltrate|post)\s+.*?(private|sensitive|secret|confidential).*?(to\s+[a-z0-9\.\-_]+\.[a-z]{2,}|attacker\.com|http)`, "i"), "unauthorized_data_transfer", 0.96],
      [r(String.raw`(discord\.com\/api\/webhooks|webhook\.site|webhook\?data=)`, "i"), "known_exfiltration_sink", 0.97],
      [r(String.raw`(list|dump|extract)\s+all\s+(database\s+user\s+passwords|social\s+security\s+numbers|aws\s+access\s+key|private\s+rsa\s+keys)`, "i"), "credential_harvesting_query", 0.95],
      [r(String.raw`(credit_cards?|auth_users|users_credentials|\/etc\/passwd|\.env\s+file)\s+and\s+(send|render|append|export)\b`, "i"), "sensitive_data_export_command", 0.96],
    ],
    explanation: "Data exfiltration pattern detected trying to leak sensitive credentials or embed outbound callbacks.",
    recs: ["Block generation of external image or webhook callback URLs.", "Sanitize outbound markdown tags in agent response.", "Verify credential access authorizations."] },
  { key: "prompt_injection_enabled", name: "IndirectInjectionRule", attack: AttackType.INDIRECT, severity: "HIGH", score: 0.91, lower: false, truncate: 80,
    patterns: [
      [r(String.raw`\[SYSTEM\s+INSTRUCTION:.*?\]`, "is"), "bracketed_system_injection", 0.94],
      [r(String.raw`<\s*system\s*>.*?<\/\s*system\s*>`, "is"), "xml_system_tag_injection", 0.95],
      [r(String.raw`<!--\s*Note:\s*Override.*?-->`, "is"), "html_comment_override_injection", 0.93],
      [r(String.raw`\[ADMIN\s+OVERRIDE:.*?\]`, "is"), "admin_override_tag_injection", 0.96],
      [r(String.raw`<\s*payload\s*>.*?<\/\s*payload\s*>`, "is"), "payload_tag_injection", 0.92],
      [r(String.raw`###\s*INSTRUCTION:\s*(Give|Ignore|Rate|Execute).*?\n`, "is"), "markdown_header_injection", 0.91],
    ],
    explanation: "Indirect prompt injection detected embedded inside structured document tags or external content.",
    recs: ["Strip HTML/XML pseudo-system directives from ingested context.", "Treat all external data retrieved by agents as untrusted data rather than instructions.", "Enforce strict delimiter isolation between data and system prompts."] },
];

const OBF_TRIGGERS = ["ignore all", "system prompt", "dan mode", "rm -rf", "drop table", "exfiltrate", "bypass", "disregard", "password", "leak"];
const hasTrigger = (s: string) => OBF_TRIGGERS.some((t) => s.toLowerCase().includes(t));

function b64(s: string): string | null {
  if (s.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(s)) return null;
  try {
    const bin = atob(s);
    const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\uFFFD/g, "");
  } catch { return null; }
}
function hex(s: string): string | null {
  if (s.length % 2 !== 0) return null;
  const bytes = new Uint8Array(s.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes).replace(/\uFFFD/g, "");
}
const rot13 = (s: string) => s.replace(/[a-zA-Z]/g, (c) => { const b = c <= "Z" ? 65 : 97; return String.fromCharCode(((c.charCodeAt(0) - b + 13) % 26) + b); });

function obfuscationRule(text: string): RuleResult | null {
  const ind: Indicator[] = [];
  for (const m of text.match(/[A-Za-z0-9+/]{16,}={0,2}/g) ?? []) {
    const d = b64(m);
    if (d && d.length > 8 && hasTrigger(d)) { ind.push({ indicator_type: "base64_encoded_attack_payload", matched_text: `Decoded Base64: '${d}'`, confidence: 0.96 }); break; }
  }
  for (const m of text.match(/\b[0-9a-fA-F]{20,}\b/g) ?? []) {
    const d = hex(m);
    if (d && d.length > 8 && hasTrigger(d)) { ind.push({ indicator_type: "hex_encoded_attack_payload", matched_text: `Decoded Hex: '${d}'`, confidence: 0.95 }); break; }
  }
  if (text.toLowerCase().includes("rot13")) {
    const d = rot13(text);
    if (hasTrigger(d)) ind.push({ indicator_type: "rot13_encoded_attack_payload", matched_text: `Decoded ROT13: '${d.slice(0, 60)}...'`, confidence: 0.93 });
  }
  const leet = text.toLowerCase().match(/1gn0r3|pr3v10u5|1n5truct10n5|byp455/);
  if (leet) ind.push({ indicator_type: "leetspeak_obfuscation", matched_text: leet[0], confidence: 0.91 });
  if (!ind.length) return null;
  return { matched: true, attack_type: AttackType.OBFUSCATION, severity: "HIGH", rule_score: 0.93, confidence: 0.95, indicators: ind,
    explanation: "Obfuscated attack payload detected attempting to hide malicious instructions through encoding transformations.",
    recommendations: ["Decode and inspect non-standard payload encodings prior to execution.", "Disallow execution of raw decoded string directives.", "Log obfuscated attack pattern for threat intelligence."] };
}

function ruleDetector(text: string, policy: GuardrailPolicy): DetectorResult {
  const results: RuleResult[] = [];
  const ordered: (RuleDef | null)[] = [...RULES.slice(0, 4), null, RULES[4]!]; // original order: PI, JB, SP, DE, Obfuscation, Indirect
  for (const rule of ordered) {
    if (rule === null) { const o = obfuscationRule(text); if (o) results.push(o); continue; }
    if (rule.key && !policy[rule.key]) continue;
    const subject = rule.lower ? text.toLowerCase() : text;
    const ind: Indicator[] = [];
    let maxConf = 0;
    for (const [re, type, conf] of rule.patterns) {
      const m = subject.match(re);
      if (m) { ind.push({ indicator_type: type, matched_text: rule.truncate ? m[0].slice(0, rule.truncate) : m[0], confidence: conf }); maxConf = Math.max(maxConf, conf); }
    }
    if (ind.length) results.push({ matched: true, attack_type: rule.attack, severity: rule.severity, rule_score: rule.score, confidence: maxConf, indicators: ind, explanation: rule.explanation, recommendations: rule.recs });
  }
  if (!results.length) return { is_threat: false, risk_score: 0.03, confidence: 0.96, attack_type: null, model_prediction: null, model_score: null, indicators: [], explanation: "Rule Engine: No known attack signatures or instruction overrides detected.", recommendations: [], is_ml: false };
  let hs = 0, hc = 0, at: string | null = null, ex = "";
  const all: Indicator[] = [], recs: string[] = [];
  for (const x of results) {
    all.push(...x.indicators);
    if (x.rule_score > hs) { hs = x.rule_score; at = x.attack_type; ex = x.explanation; }
    if (x.confidence > hc) hc = x.confidence;
    recs.push(...x.recommendations);
  }
  return { is_threat: true, risk_score: hs, confidence: hc, attack_type: at, model_prediction: null, model_score: null, indicators: all, explanation: ex, recommendations: [...new Set(recs)], is_ml: false };
}

const STOP = new Set("a an the in on of to for with at by from up about into over after is are was were be been being have has had do does did and or but if while it this that these those my your his her its our their me him them us following".split(" "));

export function tokenize(text: string): string[] {
  const t = text.toLowerCase();
  let w = t.match(/\b[a-zA-Z0-9_-]{2,}\b|<!--|-->|<[^>]+>|![^\]]*\]\([^)]+\)/g) ?? [];
  if (!w.length) w = t.match(/\b\w+\b/g) ?? [];
  return w;
}

export function mlProbability(text: string, model: ModelArtifact): number {
  const { vectorizer: v, classifier: c } = model;
  const tokens = tokenize(text);
  const grams: string[] = [];
  for (let n = v.min_ngram; n <= v.max_ngram; n++)
    for (let i = 0; i + n <= tokens.length; i++) {
      const g = tokens.slice(i, i + n).join(" ");
      if (n === 1 && STOP.has(g)) continue;
      grams.push(g);
    }
  if (!grams.length) return 0.05;
  const tf = new Map<string, number>();
  for (const g of grams) if (g in v.vocabulary) tf.set(g, (tf.get(g) ?? 0) + 1);
  const vec = new Map<number, number>();
  let sq = 0;
  for (const [g, cnt] of tf) { const w = (cnt / grams.length) * (v.idf_values[g] ?? 0); vec.set(v.vocabulary[g]!, w); sq += w * w; }
  if (!vec.size) return 0.05;
  const norm = Math.sqrt(sq);
  let l0 = c.log_priors["0"] ?? -0.693, l1 = c.log_priors["1"] ?? -0.693;
  for (const [idx, val] of vec) {
    const p0 = c.feature_log_probs["0"]?.[String(idx)], p1 = c.feature_log_probs["1"]?.[String(idx)];
    if (p0 !== undefined && p1 !== undefined) { l0 += (val / norm) * p0; l1 += (val / norm) * p1; }
  }
  const mx = Math.max(l0, l1);
  const e0 = Math.exp(l0 - mx), e1 = Math.exp(l1 - mx);
  return Math.round((e1 / (e0 + e1)) * 10000) / 10000;
}

function attributeAttack(text: string): string {
  const t = text.toLowerCase();
  if (["dan", "developer mode", "unrestricted", "chaosgpt", "jailbreak"].some((k) => t.includes(k))) return AttackType.JAILBREAK;
  if (["system prompt", "repeat", "initial prompt", "verbatim", "reveal"].some((k) => t.includes(k))) return AttackType.SYSTEM_PROMPT_LEAK;
  if (["![exfil]", "http://", "webhook", "exfiltrate"].some((k) => t.includes(k))) return AttackType.DATA_EXFILTRATION;
  if (["base64", "decode", "rot13"].some((k) => t.includes(k))) return AttackType.OBFUSCATION;
  return AttackType.PROMPT_INJECTION;
}

function mlDetector(text: string, model: ModelArtifact): DetectorResult {
  const prob = mlProbability(text, model);
  if (prob >= 0.5) {
    const risk = Math.min(0.98, 0.8 + 0.05 * Math.min(3.5, prob));
    const ind = text.split(/\s+/).slice(0, 6).filter((w) => w.length > 3).slice(0, 3).map((w) => ({ indicator_type: "ml_feature_trigger", matched_text: w, confidence: null }));
    return { is_threat: true, risk_score: Math.round(risk * 10000) / 10000, confidence: null, attack_type: attributeAttack(text), model_prediction: "PROMPT_INJECTION", model_score: prob, indicators: ind,
      explanation: `The request was classified as a prompt injection attempt by the trained Naive Bayes detector (score: ${prob}).`,
      recommendations: ["Do not execute the injected instruction.", "Preserve the original agent instructions.", "Do not expose system prompts or sensitive information.", "Verify the source of the request.", "Review the affected agent action."], is_ml: true };
  }
  return { is_threat: false, risk_score: 0.05, confidence: null, attack_type: null, model_prediction: "NORMAL", model_score: prob, indicators: [], explanation: "The request was classified as normal by the trained detector.", recommendations: [], is_ml: true };
}

const SEV_W: Record<Severity, number> = { LOW: 0.05, MEDIUM: 0.5, HIGH: 0.85, CRITICAL: 1 };
const round4 = (n: number) => Math.round(n * 10000) / 10000;

export function ensembleRisk(results: DetectorResult[], sev: Severity): number {
  if (!results.length) return 0.05;
  let ml = 0, rule = 0, hasRule = false, hasMl = false, total = 0;
  for (const x of results) {
    total += x.indicators.length;
    if (x.is_ml) { ml = x.risk_score; if (x.is_threat) hasMl = true; }
    else { rule = Math.max(rule, x.risk_score); if (x.is_threat) hasRule = true; }
  }
  const s = SEV_W[sev];
  const boost = hasRule || hasMl ? Math.min(0.1, total * 0.03) : 0;
  if (hasRule && hasMl) return round4(Math.min(1, Math.max(0.85, 0.55 * ml + 0.3 * rule + 0.15 * s + boost)));
  if (hasMl) return round4(Math.min(1, Math.max(0.75, 0.75 * ml + 0.1 * rule + 0.15 * s)));
  if (hasRule) return round4(Math.min(1, Math.max(0.75, 0.8 * rule + 0.2 * s)));
  return round4(Math.min(0.2, Math.max(0.02, ml * 0.5)));
}

export function decide(risk: number, low = 0.4, high = 0.7): [Decision, Severity] {
  const c = Math.max(0, Math.min(1, risk));
  if (c < low) return ["ALLOW", "LOW"];
  if (c < high) return ["WARN", "MEDIUM"];
  if (c < 0.9) return ["BLOCK", "HIGH"];
  return ["BLOCK", "CRITICAL"];
}

export function explain(decision: Decision, attack: string | null) {
  if (decision === "ALLOW") return { summary: "Request analyzed by Guardrail. No malicious patterns or instruction overrides detected. Request appears safe.", recommendations: [] as string[] };
  let what = "An attempt was detected to override or manipulate the agent's baseline instructions.";
  let why = "The request contained directives attempting to manipulate the agent into performing unauthorized actions.";
  if (attack === AttackType.JAILBREAK) { what = "Jailbreak attempt detected trying to enforce unrestricted persona or bypass agent safety controls."; why = "The request contained behavioral override tokens attempting to force compliance beyond safety policies."; }
  else if (attack === AttackType.SYSTEM_PROMPT_LEAK) { what = "System prompt reflection and extraction attack detected."; why = "The input requested verbatim disclosure of proprietary developer system instructions or hidden guardrail configurations."; }
  else if (attack === AttackType.DATA_EXFILTRATION) { what = "Data exfiltration attempt detected trying to leak internal credentials or inject external callback channels."; why = "Request attempted to embed unauthorized markdown image pixels, webhooks, or credential export pipelines."; }
  else if (attack === AttackType.OBFUSCATION) { what = "Obfuscated attack payload detected attempting to hide malicious directives via encoding transformations."; why = "Decoded base64/hex sequences contained prohibited instructions attempting to evade static filters."; }
  const recs = ["Do not execute the injected instruction.", "Preserve the agent's original instructions.", "Do not expose system prompts or sensitive internal state.", "Verify the source and authentication of the request.", "Review the affected agent actions and session logs."];
  if (attack === AttackType.DATA_EXFILTRATION) recs.push("Enforce egress filtering on outbound URLs and markdown rendering.");
  else if (attack === AttackType.JAILBREAK) recs.push("Terminate unsafe session context and enforce immutable base system prompts.");
  return { summary: `${what} ${why}`, recommendations: recs };
}

export const normalizeText = (t: string) => (t ? t.normalize("NFKD").replace(/[\r\n\t]+/g, " ").replace(/ +/g, " ").trim() : "");

export interface CheckResult {
  decision: Decision; severity: Severity; risk_score: number; confidence: number; attack_type: string | null;
  model_prediction: string | null; model_score: number | null; indicators: Indicator[]; indicator_labels: string[];
  explanation: string; recommendations: string[]; processing_time_ms: number; blocked: boolean; action_taken: "ALLOWED" | "WARNED" | "BLOCKED";
}

function finalize(results: DetectorResult[], extra: Indicator[], policy: GuardrailPolicy, start: number, extraAttack?: string): CheckResult {
  const indicators = results.flatMap((x) => x.indicators).concat(extra);
  let attack = results.find((x) => x.attack_type)?.attack_type ?? null;
  if (!attack && extra.length) attack = extraAttack ?? null;
  const threat = results.some((x) => x.is_threat) || extra.length > 0;
  const prelim: Severity = threat ? (attack === AttackType.JAILBREAK || attack === AttackType.DATA_EXFILTRATION ? "CRITICAL" : "HIGH") : "LOW";
  let risk = ensembleRisk(results, prelim);
  if (extra.length) risk = Math.max(risk, 0.88);
  const confs = results.map((x) => x.confidence).filter((c): c is number => c !== null);
  const confidence = confs.length ? round4(confs.reduce((a, b) => a + b, 0) / confs.length) : 0.95;
  let [decision, severity] = decide(risk, policy.low_threshold, policy.high_threshold);
  if (decision === "BLOCK" && policy.block_mode === "WARN") decision = "WARN";
  const ex = explain(decision, attack);
  const ml = results.find((x) => x.is_ml);
  return {
    decision, severity, risk_score: risk, confidence, attack_type: decision === "ALLOW" ? null : attack,
    model_prediction: ml?.model_prediction ?? null, model_score: ml?.model_score ?? null,
    indicators, indicator_labels: [...new Set(indicators.map((i) => i.indicator_type))],
    explanation: ex.summary, recommendations: ex.recommendations,
    processing_time_ms: Math.round((performance.now() - start) * 100) / 100,
    blocked: decision === "BLOCK", action_taken: decision === "BLOCK" ? "BLOCKED" : decision === "WARN" ? "WARNED" : "ALLOWED",
  };
}

/** Input guardrail: inspect a prompt sent to an agent. */
export function checkRequest(text: string, model: ModelArtifact, policy: GuardrailPolicy = DEFAULT_POLICY): CheckResult {
  const start = performance.now();
  const n = normalizeText(text);
  return finalize([ruleDetector(n, policy), mlDetector(n, model)], [], policy, start);
}

/** Indirect-injection scan of external content (web page DOM, API response, tool output). */
export function scanResource(content: string, model: ModelArtifact, policy: GuardrailPolicy = DEFAULT_POLICY): CheckResult {
  const start = performance.now();
  const n = normalizeText(content);
  const dom: Indicator[] = [];
  for (const m of content.matchAll(/<!--([\s\S]*?)-->/g)) {
    const c = (m[1] ?? "").toLowerCase();
    if (["ignore previous", "new instruction", "exfiltrate", "system prompt", "send to", "leak", "bypass", "assistant:"].some((k) => c.includes(k)))
      dom.push({ indicator_type: "hidden_comment_instruction", matched_text: (m[1] ?? "").trim().slice(0, 120), confidence: 0.95 });
  }
  for (const m of content.matchAll(/<[a-z0-9]+[^>]*(?:display:\s*none|visibility:\s*hidden|font-size:\s*0|opacity:\s*0)[^>]*>([\s\S]*?)<\/[a-z0-9]+>/gi)) {
    const h = (m[1] ?? "").toLowerCase();
    if (["ignore", "password", "token", "key", "secret", "override", "instruction"].some((k) => h.includes(k)))
      dom.push({ indicator_type: "invisible_text_injection", matched_text: (m[1] ?? "").trim().slice(0, 120), confidence: 0.92 });
  }
  for (const m of content.matchAll(/!\[.*?\]\((https?:\/\/[^)]*(?:leak|exfil|token|key|pwd|cred|steal)[^)]*)\)/gi))
    dom.push({ indicator_type: "data_exfiltration_channel", matched_text: (m[1] ?? "").slice(0, 120), confidence: 0.96 });
  return finalize([ruleDetector(n, policy), mlDetector(n, model)], dom, policy, start, AttackType.INDIRECT);
}

/** Output guardrail: redact secrets / PII / system-prompt leaks from model responses. */
export function inspectOutput(text: string) {
  if (!text) return { verdict: "SAFE", sanitized_text: "", risk_score: 0, leakage_types: [] as string[], redacted_count: 0, explanation: "Empty response cleared." };
  let s = text; const leaks: string[] = []; let count = 0;
  const secrets: [RegExp, string, string][] = [
    [/(sk_live_[0-9a-zA-Z]{24,})/g, "stripe_live_secret_key", "[REDACTED_STRIPE_KEY]"],
    [/(AKIA[0-9A-Z]{16})/g, "aws_access_key", "[REDACTED_AWS_KEY]"],
    [/(ghp_[0-9a-zA-Z]{36})/g, "github_personal_token", "[REDACTED_GITHUB_TOKEN]"],
    [/(AIza[0-9A-Za-z\-_]{35})/g, "google_api_key", "[REDACTED_GOOGLE_KEY]"],
    [/-----BEGIN\s+(RSA|OPENSSH|PRIVATE)\s+KEY-----[\s\S]+?-----END\s+\1\s+KEY-----/g, "private_rsa_key", "[REDACTED_PRIVATE_KEY]"],
    [/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\b/g, "credit_card_number", "[REDACTED_CREDIT_CARD]"],
  ];
  for (const [re, t, rep] of secrets) { const m = s.match(re); if (m) { leaks.push(t); count += m.length; s = s.replace(re, rep); } }
  const sys: [RegExp, string][] = [
    [/(You are a (helpful|specialized|travel|banking|shopping|coding|research)?\s*AI assistant\..*?(system instructions|rules are):[\s\S]*?)(?=\n\n|$)/gi, "verbatim_system_prompt_leak"],
    [/(Developer Prompt:|Internal System Instructions:|Guardrail Config:)[\s\S]*?(?=\n\n|$)/gi, "developer_instruction_leak"],
    [/(Your system instructions are:[\s\S]*?)(?=\n\n|$)/gi, "system_instruction_leak"],
  ];
  for (const [re, t] of sys) { if (s.search(re) >= 0) { leaks.push(t); s = s.replace(re, "[REDACTED_SYSTEM_PROMPT]"); count++; } }
  if (!leaks.length) return { verdict: "SAFE", sanitized_text: text, risk_score: 0.02, leakage_types: [], redacted_count: 0, explanation: "Output Guardrail: No sensitive secrets, system prompts, or credentials detected in generated response." };
  const critical = leaks.some((t) => ["stripe_live_secret_key", "aws_access_key", "private_rsa_key", "verbatim_system_prompt_leak", "system_instruction_leak"].includes(t));
  return { verdict: critical ? "BLOCK" : "SANITIZED", sanitized_text: s, risk_score: critical ? 0.95 : 0.65, leakage_types: leaks, redacted_count: count, explanation: `Output Guardrail: Redacted ${count} sensitive token(s) (${leaks.join(", ")}) to prevent data disclosure.` };
}
