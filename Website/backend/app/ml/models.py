import math
import random
from typing import List, Dict, Any, Tuple

class MultinomialNaiveBayesClassifier:
    """Multinomial Naive Bayes with Laplace Smoothing."""
    
    def __init__(self, alpha: float = 1.0):
        self.name = "MultinomialNaiveBayes"
        self.alpha = alpha
        self.log_priors: Dict[int, float] = {}
        self.feature_log_probs: Dict[int, Dict[int, float]] = {0: {}, 1: {}}
        self.classes = [0, 1]

    def fit(self, X: List[Dict[int, float]], y: List[int], n_features: int) -> 'MultinomialNaiveBayesClassifier':
        n_samples = len(y)
        n_c0 = sum(1 for label in y if label == 0)
        n_c1 = n_samples - n_c0

        self.log_priors[0] = math.log((n_c0 + 1e-5) / n_samples)
        self.log_priors[1] = math.log((n_c1 + 1e-5) / n_samples)

        feature_sums = {0: {i: 0.0 for i in range(n_features)}, 1: {i: 0.0 for i in range(n_features)}}
        total_counts = {0: 0.0, 1: 0.0}

        for vec, label in zip(X, y):
            for idx, val in vec.items():
                feature_sums[label][idx] += val
                total_counts[label] += val

        for c in [0, 1]:
            denom = total_counts[c] + self.alpha * n_features
            for i in range(n_features):
                num = feature_sums[c][i] + self.alpha
                self.feature_log_probs[c][i] = math.log(num / denom)

        return self

    def predict_proba(self, X: List[Dict[int, float]]) -> List[float]:
        probs: List[float] = []
        for vec in X:
            if not vec:
                probs.append(0.05)
                continue

            log_p0 = self.log_priors.get(0, -0.693)
            log_p1 = self.log_priors.get(1, -0.693)

            matched_count = 0
            for idx, val in vec.items():
                p0 = self.feature_log_probs[0].get(idx)
                p1 = self.feature_log_probs[1].get(idx)
                if p0 is not None and p1 is not None:
                    log_p0 += val * p0
                    log_p1 += val * p1
                    matched_count += 1

            if matched_count == 0:
                probs.append(0.05)
                continue

            max_log = max(log_p0, log_p1)
            exp0 = math.exp(log_p0 - max_log)
            exp1 = math.exp(log_p1 - max_log)
            p1 = exp1 / (exp0 + exp1)
            probs.append(round(p1, 4))
        return probs

    def predict(self, X: List[Dict[int, float]], threshold: float = 0.50) -> List[int]:
        probs = self.predict_proba(X)
        return [1 if p >= threshold else 0 for p in probs]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "MultinomialNaiveBayes",
            "alpha": self.alpha,
            "log_priors": {str(k): v for k, v in self.log_priors.items()},
            "feature_log_probs": {
                str(c): {str(k): v for k, v in d.items()} 
                for c, d in self.feature_log_probs.items()
            }
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MultinomialNaiveBayesClassifier':
        clf = cls(alpha=data.get("alpha", 1.0))
        clf.log_priors = {int(k): v for k, v in data["log_priors"].items()}
        clf.feature_log_probs = {
            int(c): {int(k): v for k, v in d.items()} 
            for c, d in data["feature_log_probs"].items()
        }
        return clf


class LogisticRegressionClassifier:
    """L2-Regularized Logistic Regression via SGD with Calibrated Sigmoid."""

    def __init__(self, lr: float = 0.1, epochs: int = 40, l2_reg: float = 0.001):
        self.name = "LogisticRegression"
        self.lr = lr
        self.epochs = epochs
        self.l2_reg = l2_reg
        self.weights: Dict[int, float] = {}
        self.bias: float = 0.0

    def fit(self, X: List[Dict[int, float]], y: List[int], n_features: int) -> 'LogisticRegressionClassifier':
        self.weights = {i: 0.0 for i in range(n_features)}
        self.bias = 0.0
        n_samples = len(y)

        rng = random.Random(42)
        indices = list(range(n_samples))

        for epoch in range(self.epochs):
            rng.shuffle(indices)
            for idx in indices:
                vec = X[idx]
                target = y[idx]

                score = self.bias + sum(self.weights[feat_idx] * val for feat_idx, val in vec.items())
                pred = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, score))))
                error = pred - target

                for feat_idx, val in vec.items():
                    grad = error * val + self.l2_reg * self.weights[feat_idx]
                    self.weights[feat_idx] -= self.lr * grad
                self.bias -= self.lr * error

        return self

    def predict_proba(self, X: List[Dict[int, float]]) -> List[float]:
        probs: List[float] = []
        for vec in X:
            if not vec:
                probs.append(0.05)
                continue
            score = self.bias + sum(self.weights.get(feat_idx, 0.0) * val for feat_idx, val in vec.items())
            prob = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, score))))
            probs.append(round(prob, 4))
        return probs

    def predict(self, X: List[Dict[int, float]], threshold: float = 0.50) -> List[int]:
        probs = self.predict_proba(X)
        return [1 if p >= threshold else 0 for p in probs]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "LogisticRegression",
            "weights": {str(k): v for k, v in self.weights.items()},
            "bias": self.bias,
            "lr": self.lr,
            "l2_reg": self.l2_reg
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LogisticRegressionClassifier':
        clf = cls(lr=data.get("lr", 0.1), l2_reg=data.get("l2_reg", 0.001))
        clf.weights = {int(k): v for k, v in data["weights"].items()}
        clf.bias = data["bias"]
        return clf


class LinearSVMClassifier:
    """Linear Support Vector Machine via Pegasos subgradient optimization."""

    def __init__(self, lambda_param: float = 0.01, iterations: int = 1500):
        self.name = "LinearSVM"
        self.lambda_param = lambda_param
        self.iterations = iterations
        self.weights: Dict[int, float] = {}
        self.bias: float = -0.1

    def fit(self, X: List[Dict[int, float]], y: List[int], n_features: int) -> 'LinearSVMClassifier':
        self.weights = {i: 0.0 for i in range(n_features)}
        self.bias = -0.1
        n_samples = len(y)
        y_svm = [1 if label == 1 else -1 for label in y]

        rng = random.Random(42)
        for t in range(1, self.iterations + 1):
            idx = rng.randint(0, n_samples - 1)
            eta = 1.0 / (self.lambda_param * t)
            vec = X[idx]
            target = y_svm[idx]

            margin = target * (self.bias + sum(self.weights[feat_idx] * val for feat_idx, val in vec.items()))
            if margin < 1.0:
                for feat_idx, val in vec.items():
                    self.weights[feat_idx] = (1.0 - eta * self.lambda_param) * self.weights[feat_idx] + eta * target * val
                self.bias += eta * target * 0.1
            else:
                for feat_idx in self.weights:
                    self.weights[feat_idx] *= (1.0 - eta * self.lambda_param)

        return self

    def decision_function(self, X: List[Dict[int, float]]) -> List[float]:
        scores: List[float] = []
        for vec in X:
            if not vec:
                scores.append(-1.0)
                continue
            s = self.bias + sum(self.weights.get(feat_idx, 0.0) * val for feat_idx, val in vec.items())
            scores.append(round(s, 4))
        return scores

    def predict_proba(self, X: List[Dict[int, float]]) -> List[float]:
        probs: List[float] = []
        for vec in X:
            if not vec:
                probs.append(0.04)
                continue
            score = self.bias + sum(self.weights.get(feat_idx, 0.0) * val for feat_idx, val in vec.items())
            p = 1.0 / (1.0 + math.exp(-max(-15.0, min(15.0, score * 2.5))))
            probs.append(round(p, 4))
        return probs

    def predict(self, X: List[Dict[int, float]], threshold: float = 0.50) -> List[int]:
        probs = self.predict_proba(X)
        return [1 if p >= threshold else 0 for p in probs]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "LinearSVM",
            "weights": {str(k): v for k, v in self.weights.items()},
            "bias": self.bias
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'LinearSVMClassifier':
        clf = cls()
        clf.weights = {int(k): v for k, v in data["weights"].items()}
        clf.bias = data["bias"]
        return clf


class RandomForestClassifier:
    """Random Subspace Ensemble Decision Forest."""

    def __init__(self, n_estimators: int = 20, max_features_per_tree: int = 50):
        self.name = "RandomForest"
        self.n_estimators = n_estimators
        self.max_features_per_tree = max_features_per_tree
        self.trees: List[Dict[str, Any]] = []

    def fit(self, X: List[Dict[int, float]], y: List[int], n_features: int) -> 'RandomForestClassifier':
        self.trees = []
        n_samples = len(y)
        rng = random.Random(42)

        for tree_idx in range(self.n_estimators):
            sampled_indices = [rng.randint(0, n_samples - 1) for _ in range(n_samples)]
            subspace = rng.sample(range(n_features), min(self.max_features_per_tree, n_features))

            best_feat = subspace[0]
            feat_scores: Dict[int, float] = {}
            for f in subspace:
                mal_sum = sum(X[i].get(f, 0.0) for i in sampled_indices if y[i] == 1)
                ben_sum = sum(X[i].get(f, 0.0) for i in sampled_indices if y[i] == 0)
                diff = mal_sum - ben_sum
                feat_scores[f] = diff

            self.trees.append({"subspace": subspace, "feat_scores": feat_scores})

        return self

    def predict_proba(self, X: List[Dict[int, float]]) -> List[float]:
        probs: List[float] = []
        for vec in X:
            if not vec:
                probs.append(0.05)
                continue
            votes = 0.0
            for tree in self.trees:
                score = sum(vec.get(f, 0.0) * tree["feat_scores"].get(f, 0.0) for f in tree["subspace"])
                p_tree = 1.0 / (1.0 + math.exp(-max(-10.0, min(10.0, score * 3.0))))
                votes += p_tree
            probs.append(round(votes / len(self.trees), 4))
        return probs

    def predict(self, X: List[Dict[int, float]], threshold: float = 0.50) -> List[int]:
        probs = self.predict_proba(X)
        return [1 if p >= threshold else 0 for p in probs]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_type": "RandomForest",
            "trees": [
                {
                    "subspace": t["subspace"],
                    "feat_scores": {str(k): v for k, v in t["feat_scores"].items()}
                }
                for t in self.trees
            ]
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'RandomForestClassifier':
        clf = cls()
        clf.trees = [
            {
                "subspace": t["subspace"],
                "feat_scores": {int(k): v for k, v in t["feat_scores"].items()}
            }
            for t in data["trees"]
        ]
        return clf
