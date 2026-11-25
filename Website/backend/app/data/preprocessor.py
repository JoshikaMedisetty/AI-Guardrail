import unicodedata
import re
import random
from typing import Dict, Any, List, Tuple

class TextPreprocessor:
    """
    Standardized Pure-Python Text Preprocessor for AI Guardrail.
    
    Normalizes input text without destroying adversarial characteristics
    (e.g., preserving punctuation, casing cues, and encoded patterns for analysis).
    Operates in pure Python to guarantee 100% cross-platform compatibility across
    restricted enterprise environments without native C-extension DLL constraints.
    """

    @staticmethod
    def normalize_text(text: str) -> str:
        """
        Apply Unicode normalization (NFKC) and clean excessive whitespace.
        Preserves special characters essential for detecting injection tokens.
        """
        if not isinstance(text, str) or not text.strip():
            return ""
        
        # 1. Unicode Normalization (NFKC to standardize fullwidth / accented chars)
        normalized = unicodedata.normalize("NFKC", text)
        
        # 2. Strip null bytes and control characters (except standard newlines/tabs)
        normalized = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", normalized)
        
        # 3. Collapse multiple whitespace while preserving word boundaries
        normalized = re.sub(r"[ \t]+", " ", normalized)
        normalized = re.sub(r"\n{3,}", "\n\n", normalized)
        
        return normalized.strip()

    @staticmethod
    def prepare_dataset(
        raw_samples: List[Dict[str, Any]], 
        test_size: float = 0.20, 
        random_state: int = 42
    ) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]], Dict[str, Any]]:
        """
        Preprocess list of raw samples, deduplicate, and perform stratified train/test split.
        """
        initial_count = len(raw_samples)
        seen_texts = set()
        clean_samples: List[Dict[str, Any]] = []

        for sample in raw_samples:
            text = sample.get("text", "")
            label = sample.get("label", "")
            if not text or not label:
                continue
            
            processed = TextPreprocessor.normalize_text(text)
            if not processed or processed in seen_texts:
                continue
            
            seen_texts.add(processed)
            sample_copy = dict(sample)
            sample_copy["original_text"] = text
            sample_copy["processed_text"] = processed
            sample_copy["binary_label"] = 1 if label.lower() == "malicious" else 0
            clean_samples.append(sample_copy)

        dedup_count = len(clean_samples)

        # Stratified split into benign and malicious buckets
        benign = [s for s in clean_samples if s["binary_label"] == 0]
        malicious = [s for s in clean_samples if s["binary_label"] == 1]

        rng = random.Random(random_state)
        rng.shuffle(benign)
        rng.shuffle(malicious)

        benign_test_cnt = int(len(benign) * test_size)
        malicious_test_cnt = int(len(malicious) * test_size)

        test_samples = benign[:benign_test_cnt] + malicious[:malicious_test_cnt]
        train_samples = benign[benign_test_cnt:] + malicious[malicious_test_cnt:]

        rng.shuffle(train_samples)
        rng.shuffle(test_samples)

        attack_categories: Dict[str, int] = {}
        for s in clean_samples:
            cat = s.get("attack_type", "unknown")
            attack_categories[cat] = attack_categories.get(cat, 0) + 1

        stats = {
            "initial_samples": initial_count,
            "deduplicated_samples": dedup_count,
            "train_samples": len(train_samples),
            "test_samples": len(test_samples),
            "benign_total": len(benign),
            "malicious_total": len(malicious),
            "attack_categories": attack_categories
        }
        
        return train_samples, test_samples, stats
