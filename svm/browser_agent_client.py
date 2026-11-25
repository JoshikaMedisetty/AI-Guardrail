import requests
from playwright.sync_api import sync_playwright

# =========================================================
# CONFIGURATION
# =========================================================

GATEWAY_URL = "http://127.0.0.1:8001/check"

API_KEY = "pMQMvQ1SgAP9Y-7YLFTiXobeywSslA7TIVeBnx9mYBU"

# Website for testing
URL = "https://www.flipkart.com"


# =========================================================
# SECURITY GATEWAY
# =========================================================

def check_with_gateway(content):

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "content": content
    }

    response = requests.post(
        GATEWAY_URL,
        headers=headers,
        json=payload,
        timeout=10
    )

    response.raise_for_status()

    return response.json()


# =========================================================
# BROWSER AGENT
# =========================================================

def browser_agent():

    print("======================================")
    print("🤖 PERSONAL BROWSER AGENT")
    print("🛡️ PROMPT-INJECTION SECURITY GATEWAY")
    print("======================================")

    with sync_playwright() as p:

        browser = p.chromium.launch(
            headless=False
        )

        page = browser.new_page()

        print("\n🌐 Opening website...")
        print(URL)

        try:
            page.goto(
                URL,
                wait_until="commit",
                timeout=30000
            )
        except Exception as e:
            print("⚠️ Navigation warning:", e)

        # Give page some time to render
        page.wait_for_timeout(3000)

        # =================================================
        # EXTRACT WEBPAGE CONTENT
        # =================================================

        print("\n📄 Reading webpage...")

        try:
            webpage_content = page.locator("body").inner_text(
                timeout=10000
            )
        except Exception as e:
            print("❌ Could not read webpage:", e)
            browser.close()
            return

        # Limit content sent to gateway
        webpage_content = webpage_content[:100000]

        print(
            f"📊 Extracted {len(webpage_content)} characters"
        )

        # =================================================
        # SECURITY CHECK
        # =================================================

        print("\n🛡️ Sending webpage to security gateway...")

        try:

            result = check_with_gateway(webpage_content)

        except Exception as e:

            print("❌ Gateway error:", e)
            print("🚨 FAIL CLOSED — Agent stopped.")

            browser.close()
            return

        # =================================================
        # DISPLAY SECURITY RESULT
        # =================================================

        print("\n========== GATEWAY RESULT ==========")

        print("Action    :", result.get("action"))
        print("Score     :", result.get("score"))
        print("Prediction:", result.get("prediction"))
        print("Message   :", result.get("message"))

        print("=====================================")

        # =================================================
        # SECURITY DECISION
        # =================================================

        if result.get("action") == "BLOCK":

            print("\n🚨 PROMPT INJECTION DETECTED")
            print("🛑 Browser agent stopped.")
            print("🛡️ Website interaction BLOCKED.")

            browser.close()
            return

        elif result.get("action") == "ALLOW":

            print("\n✅ WEBPAGE PASSED SECURITY CHECK")
            print("🤖 Browser agent can continue.")

        else:

            print("\n⚠️ Unknown gateway response.")
            print("🚨 FAIL CLOSED — Agent stopped.")

            browser.close()
            return

        # =================================================
        # SIMULATED AGENT ACTION
        # =================================================

        print("\n🤖 Agent is continuing...")
        print("👀 Browser remains open.")

        input("\nPress ENTER to close the browser...")

        browser.close()


# =========================================================
# START
# =========================================================

if __name__ == "__main__":
    browser_agent()