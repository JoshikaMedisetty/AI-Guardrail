# 📊 AI Guardrail: Empirical Experiments & Benchmark Evaluation

## 1. Overview
To evaluate the detection performance, precision-recall trade-offs, and latency characteristics of the **Universal AI Guardrail**, we conducted empirical experiments comparing:
1. **Rule-Based Detector Only** (6 specialized heuristic rules)
2. **Classical Machine Learning Classifier Only** (TF-IDF + Multinomial Naive Bayes)
3. **Multi-Detector Ensemble Guardrail** (Rule + ML + Risk Scoring Engine)
4. **Risk Threshold Optimization** ($0.30/0.60$ vs $0.40/0.70$ vs $0.50/0.75$)
5. **AgentDojo Synthetic Benchmark Suite** (10 adversarial agent scenarios)

---

## 2. Model Selection & Candidate Comparisons

We evaluated four baseline machine learning classifiers on a stratified $80/20$ split of our curated dataset (287 samples, 1,505 vocabulary size):

| Model Classifier | Accuracy | Precision | Recall (Security) | F1-Score | False Positive Rate (FPR) | Latency (ms) | Selection Status |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Multinomial Naive Bayes** | **94.64%** | **93.10%** | **96.43%** | **94.74%** | **7.14%** | **0.007 ms** | 🏆 **SELECTED** |
| **Logistic Regression** (L2 SGD) | 91.07% | 87.10% | 96.43% | 91.53% | 14.29% | 0.004 ms | Baseline |
| **Linear SVM** (Pegasos) | 87.50% | 86.21% | 89.29% | 87.72% | 14.29% | 0.004 ms | Baseline |
| **Random Forest** (Subspace Tree) | 87.50% | 81.82% | 96.43% | 88.52% | 21.43% | 0.418 ms | Baseline |

### Selection Rationale:
- **Multinomial Naive Bayes** was selected for production because it achieved the highest security recall (**96.43%**) and F1-score (**94.74%**) while maintaining the lowest False Positive Rate (**7.14%**) and lightning-fast inference latency (**0.007ms** per query).

---

## 3. Comparative Detection Architecture Experiments

| Architecture Configuration | Accuracy | Precision | Recall | F1-Score | FPR | Latency | Key Characteristic |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Experiment 1: Rule-Based Only** | 67.86% | **100.0%** | 35.71% | 52.63% | **0.0%** | 0.285 ms | 0% false positives, but misses novel/rephrased attacks |
| **Experiment 2: ML-Based Only** | **94.64%** | 93.10% | **96.43%** | **94.74%** | 7.14% | **0.035 ms** | High recall across diverse attack phrasing |
| **Experiment 3: Ensemble Guardrail (Rule + ML + Risk Engine)** | 91.07% | **100.0%** | 82.14% | **90.20%** | **0.0%** | 0.088 ms | Optimal real-world balance with multi-vector corroboration |

---

## 4. Decision Engine Threshold Optimization

We evaluated three decision threshold configurations on the ensemble risk distribution:

| Configuration Profile | Thresholds | Accuracy | Precision | Recall | F1-Score | FPR | Recommended Use Case |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :--- |
| **Strict Security** | Low: 0.30, High: 0.60 | **91.07%** | **100.0%** | **82.14%** | **90.20%** | **0.0%** | High-security financial & banking agents |
| **Balanced Default** | Low: 0.40, High: 0.70 | 73.21% | **100.0%** | 46.43% | 63.41% | **0.0%** | General customer support & travel agents |
| **Permissive** | Low: 0.50, High: 0.75 | 67.86% | **100.0%** | 35.71% | 52.63% | **0.0%** | Creative writing & sandbox environments |

---

## 5. AgentDojo Synthetic Benchmark Results

The Guardrail was tested against the 10-scenario AgentDojo synthetic benchmark:
- **Total Scenarios**: 10
- **Successful Defenses**: 10 (100.0%)
- **Failed Defenses**: 0
- **Average Benchmark Latency**: 0.15ms per scenario
