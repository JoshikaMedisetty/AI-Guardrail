import re
import base64
import codecs
from typing import List, Optional
from app.detectors.rules.base_rule import BaseRule, RuleMatchResult
from app.schemas.response import ThreatIndicator
from app.core.constants import Severity, AttackType

class ObfuscationRule(BaseRule):
    """Detects Base64, Hex, Leetspeak, and ROT13 encoded adversarial payloads."""

    def __init__(self):
        super().__init__(name="ObfuscationRule", enabled=True)
        # Malicious trigger words to search inside decoded payloads
        self.malicious_triggers = [
            "ignore all", "system prompt", "dan mode", "rm -rf", "drop table", 
            "exfiltrate", "bypass", "disregard", "password", "leak"
        ]

    def _try_decode_base64(self, text: str) -> Optional[str]:
        # Look for Base64 token candidate (length >= 16)
        b64_matches = re.findall(r"[A-Za-z0-9+/]{16,}={0,2}", text)
        for cand in b64_matches:
            try:
                decoded = base64.b64decode(cand, validate=True).decode("utf-8", errors="ignore")
                if len(decoded) > 8 and any(trig in decoded.lower() for trig in self.malicious_triggers):
                    return f"Decoded Base64: '{decoded}'"
            except Exception:
                continue
        return None

    def _try_decode_hex(self, text: str) -> Optional[str]:
        # Look for Hex sequences (length >= 20)
        hex_matches = re.findall(r"\b[0-9a-fA-F]{20,}\b", text)
        for cand in hex_matches:
            try:
                decoded = bytes.fromhex(cand).decode("utf-8", errors="ignore")
                if len(decoded) > 8 and any(trig in decoded.lower() for trig in self.malicious_triggers):
                    return f"Decoded Hex: '{decoded}'"
            except Exception:
                continue
        return None

    def _try_decode_rot13(self, text: str) -> Optional[str]:
        if "rot13" in text.lower():
            try:
                decoded = codecs.decode(text, 'rot_13')
                if any(trig in decoded.lower() for trig in self.malicious_triggers):
                    return f"Decoded ROT13: '{decoded[:60]}...'"
            except Exception:
                pass
        return None

    def evaluate(self, text: str, agent_id: str) -> RuleMatchResult:
        if not self.enabled or not text:
            return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.OBFUSCATION.value)

        indicators: List[ThreatIndicator] = []

        # 1. Base64
        b64_res = self._try_decode_base64(text)
        if b64_res:
            indicators.append(
                ThreatIndicator(indicator_type="base64_encoded_attack_payload", matched_text=b64_res, confidence=0.96)
            )

        # 2. Hex
        hex_res = self._try_decode_hex(text)
        if hex_res:
            indicators.append(
                ThreatIndicator(indicator_type="hex_encoded_attack_payload", matched_text=hex_res, confidence=0.95)
            )

        # 3. ROT13
        rot_res = self._try_decode_rot13(text)
        if rot_res:
            indicators.append(
                ThreatIndicator(indicator_type="rot13_encoded_attack_payload", matched_text=rot_res, confidence=0.93)
            )

        # 4. Leetspeak instruction override
        leet_match = re.search(r"1gn0r3|pr3v10u5|1n5truct10n5|byp455", text.lower())
        if leet_match:
            indicators.append(
                ThreatIndicator(indicator_type="leetspeak_obfuscation", matched_text=leet_match.group(0), confidence=0.91)
            )

        if indicators:
            return RuleMatchResult(
                matched=True,
                rule_name=self.name,
                attack_type=AttackType.OBFUSCATION.value,
                severity=Severity.HIGH,
                rule_score=0.93,
                confidence=0.95,
                indicators=indicators,
                explanation="Obfuscated attack payload detected attempting to hide malicious instructions through encoding transformations.",
                recommendations=[
                    "Decode and inspect non-standard payload encodings prior to execution.",
                    "Disallow execution of raw decoded string directives.",
                    "Log obfuscated attack pattern for threat intelligence."
                ]
            )

        return RuleMatchResult(matched=False, rule_name=self.name, attack_type=AttackType.OBFUSCATION.value)
