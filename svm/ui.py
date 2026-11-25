import streamlit as st
import ollama
import json
import re
import subprocess
import tempfile
import os
import time


# =========================================================
# PAGE CONFIG
# =========================================================

st.set_page_config(
    page_title="AI Browser Agent",
    page_icon="🤖",
    layout="centered"
)

st.title("🤖 AI Browser Agent")

# =========================================================
# LLAMA PLANNER
# =========================================================

def plan_task(user_task):

    # -----------------------------------------------------
    # If user directly provides URL
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # Dynamic website planning
    # -----------------------------------------------------

    system_prompt = """
You are an intelligent browser automation planner.

Your job is to determine:
1. Which website should be opened.
2. What browser action should be performed.

The user may ask to search for products,
food, information, posts, or other content.

Choose an appropriate real website dynamically.

Examples:
- Shopping -> Amazon, Flipkart, Myntra, etc.
- Food delivery -> Swiggy, Zomato, etc.
- Social/news -> appropriate website.

Do NOT invent URLs.

Return ONLY valid JSON:

{
  "url": "https://example.com",
  "action": "search something"
}

Do not include markdown.
Do not include explanations.
"""

    user_prompt = f"""
USER TASK:

{user_task}

Determine the appropriate website
and browser action.

Return ONLY valid JSON.
"""

    response = ollama.chat(

        model="llama3.2:3b",

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

    text = response[
        "message"
    ][
        "content"
    ].strip()

    # -----------------------------------------------------
    # Clean markdown
    # -----------------------------------------------------

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

    # -----------------------------------------------------
    # Extract JSON
    # -----------------------------------------------------

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

    if not url:

        raise ValueError(
            "Llama did not return a website URL."
        )

    action = plan.get(
        "action",
        ""
    ).strip()

    if not action:

        action = "open"

    if not url.startswith(
        "http://"
    ) and not url.startswith(
        "https://"
    ):

        url = "https://" + url

    return {
        "url": url,
        "action": action
    }


# =========================================================
# RUN BROWSER
# =========================================================

def run_browser(
    url,
    action
):

    result_file = tempfile.NamedTemporaryFile(
        delete=False,
        suffix=".json"
    )

    result_file.close()

    command = [
        "python",
        "browser_worker.py",
        url,
        action,
        result_file.name
    ]

    # -----------------------------------------------------
    # Pass environment variables to worker
    # -----------------------------------------------------

    worker_env = os.environ.copy()

    api_key = os.environ.get(
        "GUARDRAIL_API_KEY"
    )

    if api_key:

        worker_env[
            "GUARDRAIL_API_KEY"
        ] = api_key

    process = subprocess.Popen(
        command,
        env=worker_env
    )

    return (
        process,
        result_file.name
    )


# =========================================================
# DISPLAY RESULT
# =========================================================

def display_result(result):

    # =====================================================
    # SVM SECURITY BLOCK
    # =====================================================

    if result.get("blocked"):

        st.error(
            "🚨 **Blocked by SVM Security Gateway**"
        )

        st.write(
            "Prompt injection detected."
        )

        return

    # =====================================================
    # WEBSITE UNAVAILABLE
    # =====================================================

    if result.get(
        "error_type"
    ) == "website_unavailable":

        st.warning(
            "⚠️ **Website could not be opened.**"
        )

        st.write(
            "The website may be unavailable, "
            "restricted, or inaccessible from "
            "your current network."
        )

        return

    # =====================================================
    # BROWSER ERROR
    # =====================================================

    if result.get(
        "error_type"
    ) == "browser_error":

        st.warning(
            "⚠️ **Browser error occurred.**"
        )

        return

    # =====================================================
    # ACTION FAILURE
    # =====================================================

    if result.get(
        "error_type"
    ) == "action_failed":

        st.warning(
            "⚠️ **The browser could not "
            "complete the task.**"
        )

        return

    # =====================================================
    # SUCCESS
    # =====================================================

    if result.get("success"):

        st.success(
            "✅ **Task completed successfully.**"
        )

        return

    # =====================================================
    # UNKNOWN FAILURE
    # =====================================================

    st.warning(
        "⚠️ **The browser could not "
        "complete the task.**"
    )


# =========================================================
# CHAT HISTORY
# =========================================================

if "messages" not in st.session_state:

    st.session_state.messages = []


for message in st.session_state.messages:

    with st.chat_message(
        message["role"]
    ):

        st.markdown(
            message["content"]
        )


# =========================================================
# CHAT INPUT
# =========================================================

user_task = st.chat_input(
    "Ask your browser agent something..."
)


# =========================================================
# PROCESS USER REQUEST
# =========================================================

if user_task:

    # -----------------------------------------------------
    # User message
    # -----------------------------------------------------

    with st.chat_message("user"):

        st.markdown(
            user_task
        )

    st.session_state.messages.append(
        {
            "role": "user",
            "content": user_task
        }
    )

    # -----------------------------------------------------
    # Assistant
    # -----------------------------------------------------

    with st.chat_message("assistant"):

        try:

            # =============================================
            # CHECK API KEY
            # =============================================

            api_key = os.environ.get(
                "GUARDRAIL_API_KEY"
            )

            if not api_key:

                message = (
                    "❌ **Security gateway "
                    "is not configured.**"
                )

                st.error(
                    message
                )

                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": message
                    }
                )

                st.stop()

            # =============================================
            # THINKING
            # =============================================

            thinking = st.empty()

            thinking.markdown(
                "💭 **Thinking...**"
            )

            # =============================================
            # LLAMA PLANNING
            # =============================================

            plan = plan_task(
                user_task
            )

            url = plan[
                "url"
            ]

            action = plan[
                "action"
            ]

            thinking.empty()

            # =============================================
            # BROWSER STATUS
            # =============================================

            browser_status = st.empty()

            browser_status.markdown(
                "🌐 **Opening protected browser...**"
            )

            # =============================================
            # START WORKER
            # =============================================

            process, result_file = run_browser(
                url,
                action
            )

            # =============================================
            # WAIT FOR RESULT
            # =============================================

            result_found = False

            result = None

            for _ in range(120):

                if (
                    os.path.exists(
                        result_file
                    )
                    and
                    os.path.getsize(
                        result_file
                    ) > 0
                ):

                    result_found = True

                    break

                time.sleep(
                    0.5
                )

            browser_status.empty()

            # =============================================
            # READ RESULT
            # =============================================

            if result_found:

                try:

                    with open(
                        result_file,
                        "r",
                        encoding="utf-8"
                    ) as f:

                        result = json.load(
                            f
                        )

                except Exception as e:

                    result = {
                        "success": False,
                        "blocked": False,
                        "error_type":
                            "browser_error",
                        "message": str(e)
                    }

                # -----------------------------------------
                # DISPLAY
                # -----------------------------------------

                display_result(
                    result
                )

                # -----------------------------------------
                # CHAT RESPONSE
                # -----------------------------------------

                if result.get(
                    "blocked"
                ):

                    answer = (
                        "🚨 **Blocked by SVM "
                        "Security Gateway.**\n\n"
                        "Prompt injection detected."
                    )

                elif result.get(
                    "error_type"
                ) == "website_unavailable":

                    answer = (
                        "⚠️ **Website could not "
                        "be opened.**\n\n"
                        "The website may be unavailable, "
                        "restricted, or inaccessible "
                        "from your current network."
                    )

                elif result.get(
                    "error_type"
                ) == "browser_error":

                    answer = (
                        "⚠️ **Browser error occurred.**"
                    )

                elif result.get(
                    "error_type"
                ) == "action_failed":

                    answer = (
                        "⚠️ **The browser could not "
                        "complete the task.**"
                    )

                elif result.get(
                    "success"
                ):

                    answer = (
                        "✅ **Task completed successfully.**"
                    )

                else:

                    answer = (
                        "⚠️ **The browser could not "
                        "complete the task.**"
                    )

                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": answer
                    }
                )

                # -----------------------------------------
                # Cleanup
                # -----------------------------------------

                try:

                    os.remove(
                        result_file
                    )

                except Exception:

                    pass

            # =============================================
            # NO RESULT
            # =============================================

            else:

                answer = (
                    "⏳ **The browser worker "
                    "did not return a result.**"
                )

                st.warning(
                    answer
                )

                st.session_state.messages.append(
                    {
                        "role": "assistant",
                        "content": answer
                    }
                )

                try:

                    if process.poll() is None:

                        process.terminate()

                except Exception:

                    pass

                try:

                    os.remove(
                        result_file
                    )

                except Exception:

                    pass

        # =============================================
        # AGENT ERROR
        # =============================================

        except Exception as e:

            try:

                thinking.empty()

            except Exception:

                pass

            answer = (
                f"❌ **Agent error:** {e}"
            )

            st.error(
                answer
            )

            st.session_state.messages.append(
                {
                    "role": "assistant",
                    "content": answer
                }
            )