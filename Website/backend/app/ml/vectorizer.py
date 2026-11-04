import math
import re
from typing import List, Dict, Tuple, Set, Any

class PureTfidfVectorizer:
    """
    Pure-Python TF-IDF N-gram Feature Extractor.
    
    Extracts unigrams, bigrams, and trigrams without requiring external native C-extensions.
    Filters isolated common functional stop words while preserving security-relevant n-grams.
    Fully serializable to JSON for cross-platform deployment.
    """

    STOP_WORDS = {
        "a", "an", "the", "in", "on", "of", "to", "for", "with", "at", "by", "from",
        "up", "about", "into", "over", "after", "is", "are", "was", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "and", "or",
        "but", "if", "while", "it", "this", "that", "these", "those", "my", "your",
        "his", "her", "its", "our", "their", "me", "him", "them", "us", "following"
    }

    def __init__(self, min_ngram: int = 1, max_ngram: int = 3, max_features: int = 2500):
        self.min_ngram = min_ngram
        self.max_ngram = max_ngram
        self.max_features = max_features
        self.vocabulary: Dict[str, int] = {}
        self.idf_values: Dict[str, float] = {}
        self.total_docs: int = 0

    def _tokenize(self, text: str) -> List[str]:
        words = re.findall(r"\b[a-zA-Z0-9_-]{2,}\b|<!--|-->|<[^>]+>|![^\]]*\]\([^)]+\)", text.lower())
        if not words:
            words = re.findall(r"\b\w+\b", text.lower())
        return words

    def _extract_ngrams(self, tokens: List[str]) -> List[str]:
        ngrams: List[str] = []
        n_tokens = len(tokens)
        for n in range(self.min_ngram, self.max_ngram + 1):
            for i in range(n_tokens - n + 1):
                gram = " ".join(tokens[i:i + n])
                if n == 1 and gram in self.STOP_WORDS:
                    continue
                ngrams.append(gram)
        return ngrams

    def fit(self, texts: List[str]) -> 'PureTfidfVectorizer':
        """Learn vocabulary and IDF weights from corpus."""
        self.total_docs = len(texts)
        doc_freqs: Dict[str, int] = {}

        for text in texts:
            tokens = self._tokenize(text)
            ngrams = set(self._extract_ngrams(tokens))
            for ng in ngrams:
                doc_freqs[ng] = doc_freqs.get(ng, 0) + 1

        # Select top max_features by document frequency
        sorted_ngrams = sorted(doc_freqs.items(), key=lambda x: x[1], reverse=True)[:self.max_features]
        self.vocabulary = {ng: idx for idx, (ng, _) in enumerate(sorted_ngrams)}
        
        # Calculate smooth IDF: log((1 + N) / (1 + df)) + 1
        for ng, df in sorted_ngrams:
            self.idf_values[ng] = math.log((1.0 + self.total_docs) / (1.0 + df)) + 1.0

        return self

    def transform(self, texts: List[str]) -> List[Dict[int, float]]:
        """Transform text list into sparse TF-IDF vectors (feature_index -> weight)."""
        vectors: List[Dict[int, float]] = []

        for text in texts:
            tokens = self._tokenize(text)
            ngrams = self._extract_ngrams(tokens)
            if not ngrams:
                vectors.append({})
                continue

            tf_counts: Dict[str, int] = {}
            for ng in ngrams:
                if ng in self.vocabulary:
                    tf_counts[ng] = tf_counts.get(ng, 0) + 1

            total_terms = len(ngrams)
            vec: Dict[int, float] = {}
            sum_sq = 0.0

            for ng, count in tf_counts.items():
                idx = self.vocabulary[ng]
                tf = count / total_terms
                idf = self.idf_values[ng]
                weight = tf * idf
                vec[idx] = weight
                sum_sq += weight * weight

            # L2 normalization
            if sum_sq > 0:
                l2_norm = math.sqrt(sum_sq)
                for idx in vec:
                    vec[idx] /= l2_norm

            vectors.append(vec)

        return vectors

    def fit_transform(self, texts: List[str]) -> List[Dict[int, float]]:
        return self.fit(texts).transform(texts)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "min_ngram": self.min_ngram,
            "max_ngram": self.max_ngram,
            "max_features": self.max_features,
            "vocabulary": self.vocabulary,
            "idf_values": self.idf_values,
            "total_docs": self.total_docs
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'PureTfidfVectorizer':
        vec = cls(
            min_ngram=data["min_ngram"],
            max_ngram=data["max_ngram"],
            max_features=data["max_features"]
        )
        vec.vocabulary = data["vocabulary"]
        vec.idf_values = data["idf_values"]
        vec.total_docs = data["total_docs"]
        return vec
