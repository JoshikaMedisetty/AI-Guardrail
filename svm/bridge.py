from flask import Flask, request, jsonify
import os
import sys
import json
import time
import tempfile
import subprocess
import re
import ollama

app = Flask(__name__)


# ============================================================
# CORS
# ============================================================

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, OPTIONS"
    return response


# ============================================================
# PATHS
# ============================================================

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
WORKER_PATH = os.path.join(BASE_DIR, "browser_worker.py")


# ============================================================
# LLAMA PLANNER
# Same concept as your original AI Browser Agent
# ============================================================

def plan_task(user_task):

    # --------------------------------------------------------
    # If user directly gives a URL
    # --------------------------------------------------------

    url_match = re.search(
        r"https?://[^\s]+",
        user_task
    )

    if url_match:

        url = url_match.group(0).rstrip(
            ".,)"
        )

        return {
            "url": url,
            "action": user_task
        }

    # --------------------------------------------------------
    # No URL -> Llama chooses website
    # --------------------------------------------------------

    system_prompt = """
You are an intelligent browser automation planner.

Your job is to determine:

1. Which website should be opened.
2. What browser action should be performed.

The user may ask to search for products,
food, information, travel, jobs, movies,
or other content.

Choose the most appropriate real website.

Supported examples:

Shopping:
- Amazon India: https://www.amazon.in/
- Flipkart: https://www.flipkart.com/
- Myntra: https://www.myntra.com/
- Meesho: https://www.meesho.com/

Travel:
- RedBus: https://www.redbus.in/

Movies:
- BookMyShow: https://in.bookmyshow.com/

Professional:
- LinkedIn: https://www.linkedin.com/

IMPORTANT RULES:

1. If the user explicitly mentions Amazon, use Amazon.
2. If the user explicitly mentions Flipkart, use Flipkart.
3. If the user explicitly mentions Myntra, use Myntra.
4. If the user explicitly mentions Meesho, use Meesho.
5. If the user explicitly mentions RedBus, use RedBus.
6. If the user explicitly mentions BookMyShow, use BookMyShow.
7. If the user explicitly mentions LinkedIn, use LinkedIn.
8. Do not choose a different website when the user explicitly names one.
9. Extract the user's actual task as the action.
10. Do not invent URLs.
11. Return ONLY valid JSON.

Return exactly:

{
    "url": "https://example.com",
    "action": "the browser action to perform"
}

Do not include markdown.
Do not include explanations.
"""

    user_prompt = f"""
USER TASK:

{user_task}

Determine the appropriate website and browser action.

Return ONLY valid JSON.
"""

    ollama_client = ollama.Client(host=os.getenv("OLLAMA_HOST", "http://localhost:11434"))
    response = ollama_client.chat(
        model=os.getenv("OLLAMA_PLANNER_MODEL", "llama3.2:3b"),
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_prompt
            }
        ],
        options={
            "temperature": 0
        }
    )

    text = response["message"]["content"].strip()

    # Remove markdown if Llama adds it
    text = re.sub(
        r"```json",
        "",
        text,
        flags=re.IGNORECASE
    )

    text = re.sub(
        r"```",
        "",
        text
    ).strip()

    # Extract JSON
    json_match = re.search(
        r"\{.*\}",
        text,
        re.DOTALL
    )

    if not json_match:
        raise ValueError(
            "Llama did not return valid JSON."
        )

    plan = json.loads(
        json_match.group(0)
    )

    url = plan.get(
        "url",
        ""
    ).strip()

    action = plan.get(
        "action",
        ""
    ).strip()

    if not url:
        raise ValueError(
            "Llama did not return a website URL."
        )

    if not action:
        action = user_task

    if not url.startswith("http://") and not url.startswith("https://"):
        url = "https://" + url

    print("\n========== LLAMA PLAN ==========")
    print("User Task :", user_task)
    print("Website   :", url)
    print("Action    :", action)
    print("================================\n")

    return {
        "url": url,
        "action": action
    }


# ============================================================
# HOME
# ============================================================

@app.route("/", methods=["GET"])
def home():

    return jsonify({
        "service": "Universal AI Guardrail Agent Bridge",
        "status": "online"
    })


# ============================================================
# AGENT RUN
# ============================================================

@app.route(
    "/agent/run",
    methods=["POST", "OPTIONS"]
)
def run_agent():

    # Browser CORS preflight
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(
        silent=True
    ) or {}

    # --------------------------------------------------------
    # NEW: Receive natural-language task
    # --------------------------------------------------------

    task = data.get(
        "task",
        ""
    ).strip()

    if not task:

        return jsonify({
            "success": False,
            "error": "Task is required"
        }), 400

    # --------------------------------------------------------
    # Browser worker check
    # --------------------------------------------------------

    if not os.path.exists(WORKER_PATH):

        return jsonify({
            "success": False,
            "error": f"browser_worker.py not found: {WORKER_PATH}"
        }), 500

    try:

        # ====================================================
        # LLAMA PLANNING
        # ====================================================

        plan = plan_task(task)

        url = plan["url"]
        action = plan["action"]

        # ====================================================
        # RESULT FILE
        # ====================================================

        result_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix=".json"
        )

        result_file.close()

        print("\n========================================")
        print("🤖 REACT → LLAMA → PLAYWRIGHT")
        print("========================================")
        print("TASK   :", task)
        print("URL    :", url)
        print("ACTION :", action)
        print("WORKER :", WORKER_PATH)
        print("========================================")

        # ====================================================
        # WORKER ENVIRONMENT
        # ====================================================

        env = os.environ.copy()

        # ====================================================
        # RUN EXISTING BROWSER WORKER
        # ====================================================

        command = [
            sys.executable,
            WORKER_PATH,
            url,
            action,
            result_file.name
        ]

        process = subprocess.Popen(
            command,
            cwd=BASE_DIR,
            env=env
        )

        # ====================================================
        # WAIT FOR RESULT
        # ====================================================

        timeout = 120

        start_time = time.time()

        while time.time() - start_time < timeout:

            if os.path.exists(
                result_file.name
            ):

                if os.path.getsize(
                    result_file.name
                ) > 0:

                    with open(
                        result_file.name,
                        "r",
                        encoding="utf-8"
                    ) as f:

                        result = json.load(f)

                    # Add planning information
                    result["planned_url"] = url
                    result["planned_action"] = action

                    print("\n========== AGENT RESULT ==========")
                    print(result)
                    print("===================================\n")

                    try:
                        os.remove(
                            result_file.name
                        )
                    except Exception:
                        pass

                    return jsonify(
                        result
                    )

            if process.poll() is not None:
                break

            time.sleep(0.5)

        # ====================================================
        # TIMEOUT
        # ====================================================

        return jsonify({
            "success": False,
            "blocked": True,
            "error": "Browser worker timed out or exited without a result"
        }), 504

    # ========================================================
    # LLAMA / BRIDGE ERROR
    # ========================================================

    except Exception as e:

        print(
            "❌ Bridge error:",
            e
        )

        return jsonify({
            "success": False,
            "blocked": False,
            "error": str(e)
        }), 500

    finally:

        try:

            if (
                "result_file" in locals()
                and os.path.exists(
                    result_file.name
                )
            ):

                os.remove(
                    result_file.name
                )

        except Exception:
            pass


# ============================================================
# START SERVER
# ============================================================

if __name__ == "__main__":

    print("\n========================================")
    print("🚀 UNIVERSAL AI AGENT BRIDGE")
    print("========================================")
    print("📡 http://127.0.0.1:8002")
    print("🔗 POST /agent/run")
    print("🧠 Llama 3.2:3B Planner")
    print("🛡️ Existing Llama + Playwright + SVM")
    print("========================================\n")

    app.run(
        host="127.0.0.1",
        port=8002,
        debug=False
    )