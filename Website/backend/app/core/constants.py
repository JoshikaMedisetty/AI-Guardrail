from enum import Enum

class Decision(str, Enum):
    ALLOW = "ALLOW"
    WARN = "WARN"
    BLOCK = "BLOCK"

class Severity(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class AttackType(str, Enum):
    PROMPT_INJECTION = "Prompt Injection"
    JAILBREAK = "Jailbreak"
    SYSTEM_PROMPT_LEAK = "System Prompt Leakage"
    DATA_EXFILTRATION = "Data Exfiltration"
    OBFUSCATION = "Obfuscation Attack"
    BENIGN = "Benign"
