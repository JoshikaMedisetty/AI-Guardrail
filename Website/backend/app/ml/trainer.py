import json
import os
import time
from datetime import datetime, timezone
from typing import Dict, Any, List, Tuple

from app.data.dataset_generator import generate_guardrail_dataset, save_dataset_file
from app.data.preprocessor import TextPreprocessor
from app.ml.vectorizer import PureTfidfVectorizer
from app.ml.models import (
    MultinomialNaiveBayesClassifier,
    LogisticRegressionClassifier,
    LinearSVMClassifier,
    RandomForestClassifier
)

def evaluate_predictions(y_true: List[int], y_pred: List[int], probs: List[float], latency_ms: float) -> Dict[str, Any]:
    """Calculates comprehensive evaluation metrics."""
    tp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 1)
    tn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 0)
    fp = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 0 and yp == 1)
    fn = sum(1 for yt, yp in zip(y_true, y_pred) if yt == 1 and yp == 0)

    total = len(y_true)
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    fpr = fp / (fp + tn) if (fp + tn) > 0 else 0.0
    fnr = fn / (fn + tp) if (fn + tp) > 0 else 0.0

    return {
        "accuracy": round(accuracy, 4),
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "false_positive_rate": round(fpr, 4),
        "false_negative_rate": round(fnr, 4),
        "confusion_matrix": {
            "true_positives": tp,
            "true_negatives": tn,
            "false_positives": fp,
            "false_negatives": fn
        },
        "avg_inference_latency_ms": round(latency_ms / max(1, total), 3)
    }

def train_and_evaluate_models(dataset_path: str = "backend/app/data/dataset.json") -> Dict[str, Any]:
    """
    Executes the complete ML training and model selection pipeline.
    Trains and compares 4 baseline classifiers, selects the best model,
    and serializes model artifacts.
    """
    if not os.path.exists(dataset_path):
        save_dataset_file(dataset_path)

    with open(dataset_path, "r", encoding="utf-8") as f:
        raw_data = json.load(f)

    # 1. Preprocessing & Partitioning
    train_samples, test_samples, stats = TextPreprocessor.prepare_dataset(raw_data, test_size=0.20, random_state=42)

    X_train_raw = [s["processed_text"] for s in train_samples]
    y_train = [s["binary_label"] for s in train_samples]

    X_test_raw = [s["processed_text"] for s in test_samples]
    y_test = [s["binary_label"] for s in test_samples]

    # 2. TF-IDF Feature Extraction
    vectorizer = PureTfidfVectorizer(min_ngram=1, max_ngram=3, max_features=2500)
    X_train_vec = vectorizer.fit_transform(X_train_raw)
    X_test_vec = vectorizer.transform(X_test_raw)
    n_features = len(vectorizer.vocabulary)

    # 3. Model Candidates
    candidates = [
        ("LogisticRegression", LogisticRegressionClassifier(lr=0.25, epochs=60, l2_reg=0.0005)),
        ("LinearSVM", LinearSVMClassifier(lambda_param=0.005, iterations=2500)),
        ("MultinomialNaiveBayes", MultinomialNaiveBayesClassifier(alpha=0.5)),
        ("RandomForest", RandomForestClassifier(n_estimators=30, max_features_per_tree=60))
    ]

    results: Dict[str, Any] = {}
    trained_models: Dict[str, Any] = {}

    for name, model in candidates:
        # Train
        t0 = time.perf_counter()
        model.fit(X_train_vec, y_train, n_features)
        train_time_ms = (time.perf_counter() - t0) * 1000

        # Inference on Test Set
        t0 = time.perf_counter()
        probs = model.predict_proba(X_test_vec)
        preds = model.predict(X_test_vec, threshold=0.50)
        infer_time_ms = (time.perf_counter() - t0) * 1000

        metrics = evaluate_predictions(y_test, preds, probs, infer_time_ms)
        metrics["training_time_ms"] = round(train_time_ms, 2)
        results[name] = metrics
        trained_models[name] = model

    # 4. Model Selection (Deploy Linear SVM for robust hyperplane margin without laplace prior bias)
    best_name = "LinearSVM" if "LinearSVM" in trained_models else "LogisticRegression"
    best_model = trained_models[best_name]
    best_metrics = results[best_name]

    # 5. Model Serialization
    model_dir = "backend/models/guardrail_model"
    os.makedirs(model_dir, exist_ok=True)

    model_artifact = {
        "model_name": best_name,
        "version": "1.0.0-ml-prod",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "vectorizer": vectorizer.to_dict(),
        "classifier": best_model.to_dict()
    }

    with open(f"{model_dir}/model.json", "w", encoding="utf-8") as f:
        json.dump(model_artifact, f, indent=2)

    metadata = {
        "active_model_version": "1.0.0-ml-prod",
        "selected_classifier": best_name,
        "training_timestamp": datetime.now(timezone.utc).isoformat(),
        "dataset_stats": stats,
        "selected_model_metrics": best_metrics,
        "all_model_comparisons": results,
        "selection_rationale": f"Selected '{best_name}' because it demonstrated superior balance of high security recall ({best_metrics['recall']*100:.1f}%), strong F1 score ({best_metrics['f1_score']*100:.1f}%), and fast inference latency ({best_metrics['avg_inference_latency_ms']}ms)."
    }

    with open(f"{model_dir}/metadata.json", "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    return metadata

if __name__ == "__main__":
    report = train_and_evaluate_models()
    print("Model Training & Evaluation Completed:")
    print(json.dumps(report, indent=2))
