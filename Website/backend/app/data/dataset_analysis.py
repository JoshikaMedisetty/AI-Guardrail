import json
import os
from typing import Dict, Any, List
from collections import Counter
from app.data.dataset_generator import generate_guardrail_dataset, save_dataset_file
from app.data.preprocessor import TextPreprocessor

def analyze_dataset(dataset_path: str = "backend/app/data/dataset.json") -> Dict[str, Any]:
    """
    Computes rigorous analytical metrics across the real dataset using pure Python.
    Calculates class balance, attack distribution, vocabulary size, and text length stats.
    """
    if not os.path.exists(dataset_path):
        save_dataset_file(dataset_path)

    with open(dataset_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    total_raw = len(raw_data)
    missing_text = sum(1 for s in raw_data if not s.get("text"))
    missing_label = sum(1 for s in raw_data if not s.get("label"))

    # Preprocess & normalize
    seen = set()
    clean_samples: List[Dict[str, Any]] = []
    for s in raw_data:
        text = s.get("text", "")
        if not text:
            continue
        p = TextPreprocessor.normalize_text(text)
        if p in seen:
            continue
        seen.add(p)
        clean_samples.append({**s, "processed_text": p})

    total_clean = len(clean_samples)
    duplicates = total_raw - total_clean

    # Class breakdown
    label_counts = Counter(s.get("label", "unknown").lower() for s in clean_samples)
    benign_count = label_counts.get("benign", 0)
    malicious_count = label_counts.get("malicious", 0)

    # Attack category & severity breakdown
    attack_counts = Counter(s.get("attack_type", "unknown") for s in clean_samples)
    severity_counts = Counter(s.get("severity", "LOW") for s in clean_samples)
    source_counts = Counter(s.get("source", "unknown") for s in clean_samples)

    # Text length & vocabulary stats
    all_words = [w for s in clean_samples for w in s["processed_text"].lower().split()]
    vocab = set(all_words)
    char_lengths = [len(s["processed_text"]) for s in clean_samples]
    word_lengths = [len(s["processed_text"].split()) for s in clean_samples]

    summary = {
        "total_raw_samples": total_raw,
        "total_clean_samples": total_clean,
        "duplicate_count": duplicates,
        "missing_values": {
            "text": missing_text,
            "label": missing_label
        },
        "class_distribution": {
            "benign": {
                "count": benign_count,
                "percentage": round((benign_count / total_clean) * 100, 2)
            },
            "malicious": {
                "count": malicious_count,
                "percentage": round((malicious_count / total_clean) * 100, 2)
            }
        },
        "attack_categories": {
            k: {
                "count": int(v),
                "percentage": round((int(v) / total_clean) * 100, 2)
            } for k, v in attack_counts.items()
        },
        "severity_distribution": {
            k: int(v) for k, v in severity_counts.items()
        },
        "text_statistics": {
            "vocabulary_size": len(vocab),
            "total_tokens": len(all_words),
            "avg_char_length": round(sum(char_lengths) / len(char_lengths), 1) if char_lengths else 0,
            "max_char_length": max(char_lengths) if char_lengths else 0,
            "min_char_length": min(char_lengths) if char_lengths else 0,
            "avg_word_length": round(sum(word_lengths) / len(word_lengths), 1) if word_lengths else 0,
            "max_word_length": max(word_lengths) if word_lengths else 0,
            "min_word_length": min(word_lengths) if word_lengths else 0
        },
        "sources": {
            k: int(v) for k, v in source_counts.items()
        }
    }

    summary_path = "backend/app/data/dataset_summary.json"
    os.makedirs(os.path.dirname(summary_path), exist_ok=True)
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    return summary

if __name__ == "__main__":
    stats = analyze_dataset()
    print("Dataset Analysis Complete:")
    print(json.dumps(stats, indent=2))
