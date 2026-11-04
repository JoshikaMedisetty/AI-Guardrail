import re
import requests
from playwright.sync_api import sync_playwright


# =========================================================
# CONFIGURATION
# =========================================================

GUARDRAIL_URL = "http://127.0.0.1:8001/check"


# =========================================================
# PLAYWRIGHT GLOBALS
# =========================================================
# These keep the browser alive even after open_website()
# returns its result to Streamlit.
# =========================================================

_playwright = None
_browser = None


# =========================================================
# GUARDRAIL CHECK
# =========================================================

def check_website_content(content):

    try:

        response = requests.post(
            GUARDRAIL_URL,
            json={
                "content": content
            },
            timeout=30
        )

        response.raise_for_status()

        result = response.json()

        print("\n========== GUARDRAIL RESPONSE ==========")
        print(result)
        print("=========================================\n")

        if result.get("action") == "ALLOW":

            return {
                "allowed": True,
                "guardrail": result
            }

        return {
            "allowed": False,
            "guardrail": result
        }

    except requests.RequestException as e:

        return {
            "allowed": False,
            "guardrail": {
                "status": "ERROR",
                "action": "BLOCK",
                "message": f"Guardrail unavailable: {e}"
            }
        }


# =========================================================
# START BROWSER
# =========================================================

def get_browser():

    global _playwright
    global _browser

    # If browser already exists and is still connected,
    # reuse it.
    if (
        _browser is not None
        and _browser.is_connected()
    ):

        return _browser

    print("🚀 Starting Playwright browser...")

    _playwright = sync_playwright().start()

    _browser = _playwright.chromium.launch(
        headless=False
    )

    return _browser


# =========================================================
# CLOSE BROWSER
# =========================================================

def close_browser():

    global _playwright
    global _browser

    try:

        if _browser is not None:
            _browser.close()

    except Exception:
        pass

    try:

        if _playwright is not None:
            _playwright.stop()

    except Exception:
        pass

    _browser = None
    _playwright = None


# =========================================================
# EXTRACT WEBSITE CONTENT
# =========================================================

def get_page_content(page):

    try:

        visible_text = page.locator(
            "body"
        ).inner_text()

    except Exception:

        visible_text = ""


    try:

        html = page.content()

    except Exception:

        html = ""


    # Extract HTML comments because prompt injections
    # can sometimes be hidden inside comments.

    html_comments = re.findall(
        r"<!--(.*?)-->",
        html,
        re.DOTALL
    )

    comment_text = "\n".join(
        html_comments
    )


    content = (
        visible_text
        + "\n"
        + comment_text
    )

    return content


# =========================================================
# PERFORM USER ACTION
# =========================================================

def perform_action(page, action):

    action_lower = action.lower().strip()

    print(
        f"\n🎯 Processing action: {action}"
    )


    # =====================================================
    # SEARCH / FIND / SHOW
    # =====================================================

    query = None


    # Examples:
    #
    # search laptops in flipkart
    # find laptops on amazon
    # show phones in flipkart
    # look for shoes on myntra

    search_match = re.search(
        r"(?:search|find|show|look\s+for)"
        r"\s+(?:me\s+)?"
        r"(.+?)"
        r"(?:\s+(?:in|on)\s+.+)?$",
        action_lower
    )


    if search_match:

        query = search_match.group(1).strip()


    # =====================================================
    # SPECIAL CASE
    # =====================================================
    #
    # open laptops in flipkart
    # open shoes in amazon
    #
    # =====================================================

    if not query:

        open_search_match = re.search(
            r"open\s+(.+?)\s+(?:in|on)\s+"
            r"(?:flipkart|amazon|myntra|meesho|ajio)",
            action_lower
        )

        if open_search_match:

            query = (
                open_search_match
                .group(1)
                .strip()
            )


    # =====================================================
    # SEARCH ACTION FOUND
    # =====================================================

    if query:

        # Remove website names if they were captured
        query = re.sub(
            r"\b(?:in|on)\s+"
            r"(?:flipkart|amazon|myntra|meesho|ajio)\b",
            "",
            query,
            flags=re.IGNORECASE
        ).strip()


        if not query:

            return {
                "success": False,
                "message": (
                    "Could not determine "
                    "what to search for."
                )
            }


        print(
            f"🔎 Search query: {query}"
        )


        # =================================================
        # FIND SEARCH BOX
        # =================================================

        search_box = None


        # -------------------------------------------------
        # FLIPKART
        # -------------------------------------------------

        if "flipkart" in page.url.lower():

            search_box = page.locator(
                'input[name="q"]'
            ).first

            if search_box.count() == 0:

                search_box = page.get_by_placeholder(
                    "Search for Products, Brands and More"
                ).first


        # -------------------------------------------------
        # AMAZON
        # -------------------------------------------------

        elif "amazon" in page.url.lower():

            search_box = page.locator(
                "#twotabsearchtextbox"
            ).first

            if search_box.count() == 0:

                search_box = page.locator(
                    'input[name="field-keywords"]'
                ).first


        # -------------------------------------------------
        # GENERIC SEARCH BOX
        # -------------------------------------------------

        if (
            search_box is None
            or search_box.count() == 0
        ):

            search_box = page.locator(
                'input[type="search"]'
            ).first


        if search_box.count() == 0:

            search_box = page.locator(
                'input[placeholder*="Search" i]'
            ).first


        if search_box.count() == 0:

            search_box = page.locator(
                'input[name*="search" i]'
            ).first


        # =================================================
        # SEARCH BOX NOT FOUND
        # =================================================

        if search_box.count() == 0:

            return {
                "success": False,
                "message": (
                    "Search box not found "
                    "on the website."
                )
            }


        # =================================================
        # PERFORM SEARCH
        # =================================================

        print(
            "🔎 Search box found."
        )

        search_box.fill(query)

        print(
            f"⌨️ Entering search: {query}"
        )

        search_box.press("Enter")


        # =================================================
        # WAIT FOR RESULT
        # =================================================

        try:

            page.wait_for_load_state(
                "domcontentloaded",
                timeout=30000
            )

        except Exception:

            print(
                "⚠️ Page did not report "
                "domcontentloaded."
            )


        # Give dynamic websites time to update.

        page.wait_for_timeout(3000)


        print(
            "✅ Search completed."
        )


        return {
            "success": True,
            "action": "search",
            "query": query
        }


    # =====================================================
    # OPEN ONLY
    # =====================================================

    print(
        "ℹ️ No search action detected."
    )

    print(
        "🌐 Keeping the website homepage open."
    )


    return {
        "success": True,
        "action": "open"
    }


# =========================================================
# OPEN WEBSITE
# =========================================================

def open_website(
    url,
    action="open",
    wait_for_user=False
):

    print(
        f"\n🌐 Requested URL: {url}"
    )

    print(
        f"🎯 Requested action: {action}"
    )


    try:

        # =================================================
        # STEP 1 — START / REUSE BROWSER
        # =================================================

        browser = get_browser()


        # Create a new page.

        page = browser.new_page()


        # =================================================
        # STEP 2 — OPEN WEBSITE
        # =================================================

        print(
            "🌐 Opening website..."
        )

        page.goto(
            url,
            wait_until="domcontentloaded",
            timeout=30000
        )


        # =================================================
        # STEP 3 — READ INITIAL WEBSITE
        # =================================================

        print(
            "📄 Reading webpage content..."
        )

        content = get_page_content(
            page
        )


        # =================================================
        # STEP 4 — INITIAL GUARDRAIL
        # =================================================

        print(
            "🛡️ Checking webpage "
            "with Guardrail..."
        )

        result = check_website_content(
            content
        )


        print(
            "\n========== INITIAL GUARDRAIL =========="
        )

        print(
            "Status :",
            result["guardrail"].get(
                "status"
            )
        )

        print(
            "Action :",
            result["guardrail"].get(
                "action"
            )
        )

        print(
            "Message:",
            result["guardrail"].get(
                "message"
            )
        )

        print(
            "=======================================\n"
        )


        # =================================================
        # STEP 5 — BLOCK MALICIOUS WEBSITE
        # =================================================

        if not result["allowed"]:

            print(
                "🚨 WEBSITE BLOCKED"
            )

            print(
                "🔒 Closing browser..."
            )

            close_browser()


            return {
                "success": False,
                "blocked": True,
                "guardrail": result[
                    "guardrail"
                ]
            }


        # =================================================
        # STEP 6 — WEBSITE SAFE
        # =================================================

        print(
            "✅ WEBSITE APPROVED"
        )

        print(
            "🌐 Safe website opened."
        )


        # =================================================
        # STEP 7 — PERFORM USER ACTION
        # =================================================

        action_result = perform_action(
            page,
            action
        )


        # =================================================
        # ACTION FAILED
        # =================================================

        if not action_result["success"]:

            print(
                "❌ Could not perform action:",
                action_result["message"]
            )

            close_browser()


            return {
                "success": False,
                "blocked": True,
                "guardrail": {
                    "status": "ERROR",
                    "action": "BLOCK",
                    "message": action_result[
                        "message"
                    ]
                }
            }


        # =================================================
        # STEP 8 — IF ONLY OPENING WEBSITE
        # =================================================

        if action_result["action"] == "open":

            print(
                "ℹ️ No additional action required."
            )

            current_url = page.url
            title = page.title()


            print(
                "🌐 Browser will remain open."
            )


            # IMPORTANT:
            # Do NOT close browser here.
            # Streamlit receives the result immediately
            # while Playwright browser remains open.

            return {
                "success": True,
                "blocked": False,
                "url": current_url,
                "title": title,
                "action": action,
                "content": content
            }


        # =================================================
        # STEP 9 — READ RESULTING PAGE
        # =================================================

        print(
            "\n📄 Reading resulting webpage..."
        )

        content_after_action = (
            get_page_content(page)
        )


        # =================================================
        # STEP 10 — SECOND GUARDRAIL CHECK
        # =================================================

        print(
            "🛡️ Checking resulting page "
            "with Guardrail..."
        )

        result_after_action = (
            check_website_content(
                content_after_action
            )
        )


        print(
            "\n========== RESULTING PAGE GUARDRAIL =========="
        )

        print(
            "Status :",
            result_after_action[
                "guardrail"
            ].get("status")
        )

        print(
            "Action :",
            result_after_action[
                "guardrail"
            ].get("action")
        )

        print(
            "Message:",
            result_after_action[
                "guardrail"
            ].get("message")
        )

        print(
            "==============================================\n"
        )


        # =================================================
        # STEP 11 — BLOCK RESULTING PAGE
        # =================================================

        if not result_after_action[
            "allowed"
        ]:

            print(
                "🚨 RESULTING PAGE BLOCKED"
            )

            print(
                "🔒 Closing browser..."
            )

            close_browser()


            return {
                "success": False,
                "blocked": True,
                "guardrail":
                    result_after_action[
                        "guardrail"
                    ]
            }


        # =================================================
        # STEP 12 — RESULTING PAGE SAFE
        # =================================================

        print(
            "✅ RESULTING PAGE APPROVED"
        )

        print(
            "🌐 Safe results are displayed."
        )


        current_url = page.url
        title = page.title()


        # =================================================
        # IMPORTANT:
        # DO NOT CLOSE THE BROWSER
        # =================================================

        print(
            "🌐 Browser will remain open."
        )


        return {
            "success": True,
            "blocked": False,
            "url": current_url,
            "title": title,
            "action": action,
            "content": content_after_action
        }


    # =====================================================
    # BROWSER ERROR
    # =====================================================

    except Exception as e:

        print(
            f"\n❌ Browser error: {e}"
        )

        close_browser()


        return {
            "success": False,
            "blocked": True,
            "guardrail": {
                "status": "ERROR",
                "action": "BLOCK",
                "message": str(e)
            }
        }


# =========================================================
# DIRECT TEST
# =========================================================

if __name__ == "__main__":

    result = open_website(
        "https://www.flipkart.com",
        "open laptops in flipkart",
        wait_for_user=False
    )


    print(
        "\n========== RESULT =========="
    )

    print(result)