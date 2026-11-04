from flask import Flask, request, jsonify
import joblib
import os

app = Flask(__name__)

model = joblib.load("prompt_injection_model.pkl")
tfidf = joblib.load("tfidf_vectorizer.pkl")

THRESHOLD = -0.05

# No shared API key: keep this service private and expose it only to trusted backend services.


@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "service": "Prompt Injection Security Gateway",
        "status": "online",
        "endpoint": "/check"
    })


@app.route("/check", methods=["POST"])
def check_content():

    data = request.get_json(silent=True)

    print("DEBUG CONTENT TYPE:", request.content_type)
    print("DEBUG BODY:", request.get_data(as_text=True))

    if not data or "content" not in data:
        return jsonify({
            "status": "ERROR",
            "action": "ERROR",
            "message": "No content provided."
        }), 400

    content = data["content"]

    if not isinstance(content, str):
        return jsonify({
            "status": "ERROR",
            "action": "ERROR",
            "message": "Content must be a string."
        }), 400

    try:

        X = tfidf.transform([content])

        score = float(model.decision_function(X)[0])

        prediction = int(score >= THRESHOLD)

        if prediction == 1:
            action = "BLOCK"
            message = "Prompt injection detected."
        else:
            action = "ALLOW"
            message = "Content appears safe."

        return jsonify({
            "status": "OK",
            "action": action,
            "message": message,
            "score": score,
            "prediction": prediction,
            "threshold": THRESHOLD
        })

    except Exception as e:

        return jsonify({
            "status": "ERROR",
            "action": "ERROR",
            "message": str(e)
        }), 500


if __name__ == "__main__":

    print("🛡️ Prompt Injection Security Gateway")
    print("📡 http://127.0.0.1:8001")
    print("🧠 TF-IDF + Linear SVM")
    print("🎯 Threshold:", THRESHOLD)

    app.run(
        host=os.getenv("GUARDRAIL_BIND_HOST", "127.0.0.1"),
        port=int(os.getenv("GUARDRAIL_PORT", "8001")),
        debug=False
    )