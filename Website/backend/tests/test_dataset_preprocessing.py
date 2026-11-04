import pytest
from app.data.preprocessor import TextPreprocessor
from app.data.dataset_generator import generate_guardrail_dataset

def test_text_normalization_whitespace_and_unicode():
    """Verify Unicode normalization (NFKC) and whitespace collapsing."""
    raw = "  Ignore \t\t previous \n\n\n instructions! \uFF21\uFF22\uFF23  "
    normalized = TextPreprocessor.normalize_text(raw)
    assert "Ignore previous" in normalized
    assert "ABC" in normalized  # Fullwidth ABC normalized to standard ASCII
    assert "\t" not in normalized

def test_prepare_dataset_stratified_split():
    """Verify dataset partitioning, deduplication, and label encoding."""
    data = generate_guardrail_dataset()
    assert len(data) >= 100

    train_df, test_df, stats = TextPreprocessor.prepare_dataset(data, test_size=0.20, random_state=42)
    assert len(train_df) > 0
    assert len(test_df) > 0
    assert stats["benign_total"] > 0
    assert stats["malicious_total"] > 0
    assert len(train_df) + len(test_df) == stats["deduplicated_samples"]
