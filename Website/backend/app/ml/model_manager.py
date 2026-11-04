import os
import json
from typing import Optional, Dict, Any, Tuple, List
from app.utils.logger import logger
from app.ml.vectorizer import PureTfidfVectorizer
from app.ml.models import (
    MultinomialNaiveBayesClassifier,
    LogisticRegressionClassifier,
    LinearSVMClassifier,
    RandomForestClassifier
)

class ModelManager:
    """
    Centralized Model Lifecycle & Inference Manager.
    
    Loads pre-trained Guardrail model and matching TF-IDF vectorizer.
    Supports both pure-python JSON artifacts (guardrail_model/model.json) and scikit-learn joblib pkls.
    Performs startup validation and thread-safe inference.
    """
    _instance: Optional['ModelManager'] = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(ModelManager, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(
        self,
        json_model_path: str = "backend/models/guardrail_model/model.json",
        pkl_model_path: str = "backend/models/prompt_injection_model.pkl",
        pkl_vectorizer_path: str = "backend/models/tfidf_vectorizer.pkl"
    ):
        if self._initialized:
            return
        
        self.json_model_paths = [
            json_model_path,
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "guardrail_model", "model.json"),
            "models/guardrail_model/model.json",
            "backend/models/guardrail_model/model.json"
        ]
        self.pkl_model_paths = [
            pkl_model_path,
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "prompt_injection_model.pkl"),
            "models/prompt_injection_model.pkl"
        ]
        self.pkl_vectorizer_paths = [
            pkl_vectorizer_path,
            os.path.join(os.path.dirname(__file__), "..", "..", "models", "tfidf_vectorizer.pkl"),
            "models/tfidf_vectorizer.pkl"
        ]
        
        self.model: Any = None
        self.vectorizer: Any = None
        self.is_loaded: bool = False
        self.model_type: str = "Unknown"
        self.classes: List[Any] = [0, 1]
        self.has_decision_function: bool = False
        self.has_predict_proba: bool = False
        self.load_error: Optional[str] = None
        self.normal_class_label: int = 0
        self.injection_class_label: int = 1
        self.is_pure_python: bool = False
        
        self._load_and_validate()
        self._initialized = True

    def _resolve_path(self, candidate_paths: List[str]) -> Optional[str]:
        for p in candidate_paths:
            normalized = os.path.normpath(p)
            if os.path.exists(normalized) and os.path.isfile(normalized):
                return normalized
        return None

    def _load_and_validate(self) -> None:
        """Safe startup loading and validation of model artifacts."""
        # 1. Try loading pure-python JSON artifact first (zero-dependency, cross-platform)
        json_file = self._resolve_path(self.json_model_paths)
        if json_file:
            try:
                with open(json_file, "r", encoding="utf-8") as f:
                    artifact = json.load(f)

                self.vectorizer = PureTfidfVectorizer.from_dict(artifact["vectorizer"])
                clf_data = artifact["classifier"]
                clf_type = clf_data.get("model_type")

                if clf_type == "MultinomialNaiveBayes":
                    self.model = MultinomialNaiveBayesClassifier.from_dict(clf_data)
                elif clf_type == "LogisticRegression":
                    self.model = LogisticRegressionClassifier.from_dict(clf_data)
                elif clf_type == "LinearSVM":
                    self.model = LinearSVMClassifier.from_dict(clf_data)
                elif clf_type == "RandomForest":
                    self.model = RandomForestClassifier.from_dict(clf_data)
                else:
                    self.model = MultinomialNaiveBayesClassifier.from_dict(clf_data)

                self.is_pure_python = True
                self.model_type = clf_type or artifact.get("model_name", "MultinomialNaiveBayes")
                self.has_predict_proba = hasattr(self.model, "predict_proba")
                self.has_decision_function = False
                self.classes = [0, 1]
                self.normal_class_label = 0
                self.injection_class_label = 1

                # Verify with quick test inference
                test_vec = self.vectorizer.transform(["Sanity check test prompt"])
                _ = self.model.predict(test_vec)

                self.is_loaded = True
                self.load_error = None
                logger.info(f"ModelManager: Successfully loaded JSON model artifact '{self.model_type}' from {json_file}.")
                return
            except Exception as e:
                logger.warning(f"ModelManager: Failed loading JSON artifact ({e}), attempting joblib fallback.")

        # 2. Try joblib pkl fallback
        model_file = self._resolve_path(self.pkl_model_paths)
        vec_file = self._resolve_path(self.pkl_vectorizer_paths)

        if model_file and vec_file:
            try:
                import joblib
                self.vectorizer = joblib.load(vec_file)
                self.model = joblib.load(model_file)
                self.is_pure_python = False
                self.model_type = self.model.__class__.__name__
                self.has_decision_function = hasattr(self.model, "decision_function")
                self.has_predict_proba = hasattr(self.model, "predict_proba")
                if hasattr(self.model, "classes_"):
                    self.classes = [int(c) if isinstance(c, (int, float)) else str(c) for c in self.model.classes_]
                else:
                    self.classes = [0, 1]
                if len(self.classes) >= 2:
                    self.normal_class_label = self.classes[0]
                    self.injection_class_label = self.classes[1]

                test_vec = self.vectorizer.transform(["Sanity check test prompt"])
                _ = self.model.predict(test_vec)

                self.is_loaded = True
                self.load_error = None
                logger.info(f"ModelManager: Successfully loaded PKL model '{self.model_type}' from {model_file}.")
                return
            except Exception as e:
                logger.warning(f"ModelManager: Failed loading PKL artifacts: {e}")

        # 3. If neither loaded, train on the fly using trainer
        try:
            from app.ml.trainer import train_and_evaluate_models
            logger.info("ModelManager: No pre-existing artifact loaded. Running trainer once to create model artifact...")
            train_and_evaluate_models()
            self._load_and_validate()
        except Exception as e:
            self.is_loaded = False
            self.load_error = f"Model artifact unavailable and training failed: {e}"
            logger.error(f"ModelManager: {self.load_error}")

    def predict(self, text: str) -> Dict[str, Any]:
        """
        Execute inference on raw user prompt without modifying model or refitting vectorizer.
        """
        if not self.is_loaded or self.vectorizer is None or self.model is None:
            return {
                "prediction": 0,
                "model_prediction": "UNAVAILABLE",
                "model_score": None,
                "is_threat": False,
                "probability": 0.0,
                "error": self.load_error or "Model is not loaded"
            }

        # 1. Transform raw text using fitted TF-IDF vectorizer
        features = self.vectorizer.transform([text])

        # 2. Model prediction & probability / score
        raw_pred = self.model.predict(features)[0]
        pred_label = int(raw_pred) if isinstance(raw_pred, (int, float)) else raw_pred

        prob_score: Optional[float] = None
        if self.has_predict_proba:
            probs = self.model.predict_proba(features)
            if probs and len(probs) > 0:
                prob_score = float(probs[0]) if isinstance(probs[0], (int, float)) else float(probs[0][1])

        decision_score: Optional[float] = None
        if self.has_decision_function:
            df_val = self.model.decision_function(features)
            val = float(df_val[0]) if hasattr(df_val, "__len__") else float(df_val)
            decision_score = round(val, 4)

        is_threat = (pred_label == self.injection_class_label)
        model_prediction_str = "PROMPT_INJECTION" if is_threat else "NORMAL"

        return {
            "prediction": pred_label,
            "model_prediction": model_prediction_str,
            "model_score": decision_score if decision_score is not None else prob_score,
            "probability": prob_score if prob_score is not None else (0.95 if is_threat else 0.05),
            "is_threat": is_threat,
            "error": None
        }

    def get_status(self) -> Dict[str, Any]:
        """
        Return safe status metadata.
        """
        return {
            "model_status": "READY" if self.is_loaded else "UNAVAILABLE",
            "model_type": self.model_type if self.is_loaded else None,
            "vectorizer_status": "READY" if self.is_loaded else "UNAVAILABLE",
            "classes": self.classes if self.is_loaded else [],
            "prediction_method": "predict" if self.is_loaded else "unavailable",
            "decision_score_available": self.has_decision_function if self.is_loaded else False,
            "predict_proba_available": self.has_predict_proba if self.is_loaded else False,
            "detail": f"{self.model_type} classifier with TF-IDF N-gram feature extraction" if self.is_loaded else self.load_error
        }

# Global singleton instance
model_manager = ModelManager()
