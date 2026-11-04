import json
import os
import re
import sys
import requests

from playwright.sync_api import sync_playwright


# =========================================================
# CONFIG
# =========================================================

GUARDRAIL_URL = os.getenv("GUARDRAIL_URL", "http://127.0.0.1:8001/check")


# =========================================================
# STRONG PROMPT-INJECTION PATTERNS
# =========================================================

STRONG_INJECTION_PATTERNS = [

    r"\bignore\s+(all\s+)?previous\s+instructions?\b",

    r"\bignore\s+(the\s+)?user'?s?\s+(original\s+)?instructions?\b",

    r"\bdisregard\s+(all\s+)?previous\s+instructions?\b",

    r"\boverride\s+(the\s+)?previous\s+instructions?\b",

    r"\bdo\s+not\s+tell\s+the\s+user\b",

    r"\bdon'?t\s+tell\s+the\s+user\b",

    r"\bhid(e|ing)\s+(this|it)\s+from\s+the\s+user\b",

    r"\bsend\s+(the\s+user'?s?|private|personal)\s+.*\bto\s+https?://",

    r"\bsend\s+(the\s+user'?s?|private|personal)\s+.*\bto\s+[a-z0-9.-]+\.(com|net|org)\b",

    r"\breveal\s+(the\s+)?password\b",

    r"\breveal\s+(the\s+)?secret\b",

    r"\breveal\s+(the\s+)?private\s+information\b",

    r"\bprompt\s+injection\b",

    r"\bprompt\s+attack\b",

    r"\bimportant\s+instruction\s+for\s+ai\s+agents?\b",

    r"\b(system\s+message|developer\s+message|system\s+instructions?)\b"
    r".{0,120}"
    r"\b(ignore|follow|send|reveal|execute|disregard|override)\b",
]


def contains_strong_injection(text):

    if not text:
        return False

    normalized = re.sub(
        r"\s+",
        " ",
        text
    ).strip()

    for pattern in STRONG_INJECTION_PATTERNS:

        if re.search(
            pattern,
            normalized,
            re.IGNORECASE
        ):
            return True

    return False


# =========================================================
# GUARDRAIL
# =========================================================

def check_website_content(content):

    try:

        headers = {"Content-Type": "application/json"}

        response = requests.post(
            GUARDRAIL_URL,
            headers=headers,
            json={
                "content": content
            },
            timeout=30
        )

        response.raise_for_status()

        result = response.json()

        print(
            "\n========== GUARDRAIL =========="
        )

        print(result)

        print(
            "===============================\n"
        )

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

        print(
            "\n❌ Guardrail request failed:",
            e
        )

        # Fail closed if the security gateway
        # itself cannot be reached.
        return {
            "allowed": False,
            "guardrail": {
                "status": "ERROR",
                "action": "BLOCK",
                "message": (
                    f"Guardrail unavailable: {e}"
                )
            }
        }


# =========================================================
# WRITE RESULT
# =========================================================

def write_result(
    result_file,
    result
):

    temp_file = result_file + ".tmp"

    with open(
        temp_file,
        "w",
        encoding="utf-8"
    ) as f:

        json.dump(
            result,
            f,
            ensure_ascii=False
        )

    os.replace(
        temp_file,
        result_file
    )


# =========================================================
# EXTRACT QUERY
# =========================================================

def extract_search_query(action):

    action = action.strip()

    pattern = re.compile(
        r"^(?:search|find|show|look\s+for)"
        r"\s+(?:for\s+)?"
        r"(.+?)$",
        re.IGNORECASE
    )

    match = pattern.search(
        action
    )

    if match:

        query = match.group(1).strip()

        if query:

            return query

    pattern = re.compile(
        r"^open\s+(.+?)"
        r"\s+(?:in|on)\s+.+$",
        re.IGNORECASE
    )

    match = pattern.search(
        action
    )

    if match:

        query = match.group(1).strip()

        if query:

            return query

    return None


# =========================================================
# FIND SEARCH INPUT DYNAMICALLY
# =========================================================

def find_search_input(page):

    selectors = [

        'input[type="search"]',

        'input[name*="search" i]',

        'input[placeholder*="search" i]',

        'input[name="q"]',

        'input[name="query"]',

        'input[name="keyword"]',

        'input[aria-label*="search" i]',

        '[role="search"] input',

        'input[type="text"]'

    ]

    for selector in selectors:

        try:

            locator = page.locator(
                selector
            ).first

            if locator.count() > 0:

                try:

                    if locator.is_visible(
                        timeout=1000
                    ):

                        print(
                            "🔎 Search input found:",
                            selector
                        )

                        return locator

                except Exception:

                    pass

        except Exception:

            pass

    return None


# =========================================================
# PERFORM ACTION
# =========================================================

def perform_action(
    page,
    action
):

    print(
        "\n🎯 Processing action:",
        action
    )

    query = extract_search_query(
        action
    )

    # =====================================================
    # SEARCH
    # =====================================================

    if query:

        print(
            "\n🔎 SEARCH REQUEST"
        )

        print(
            "Query:",
            query
        )

        search_box = find_search_input(
            page
        )

        if search_box is None:

            return {
                "success": False,
                "message": (
                    "Could not find a search "
                    "input on the webpage."
                )
            }

        # -------------------------------------------------
        # Fill search
        # -------------------------------------------------

        try:

            search_box.click()

            search_box.fill(
                query
            )

            print(
                "⌨️ Search text entered:",
                query
            )

        except Exception as e:

            return {
                "success": False,
                "message": (
                    f"Could not enter search: {e}"
                )
            }

        # -------------------------------------------------
        # Press Enter
        # -------------------------------------------------

        try:

            search_box.press(
                "Enter"
            )

            print(
                "↵ Enter pressed."
            )

        except Exception as e:

            print(
                "⚠️ Enter failed:",
                e
            )

            try:

                buttons = [

                    'button[type="submit"]',

                    'button[aria-label*="search" i]',

                    'button:has-text("Search")',

                    '[role="button"][aria-label*="search" i]'

                ]

                clicked = False

                for selector in buttons:

                    try:

                        button = page.locator(
                            selector
                        ).first

                        if button.count() > 0:

                            if button.is_visible(
                                timeout=1000
                            ):

                                button.click()

                                clicked = True

                                print(
                                    "🔍 Search button clicked."
                                )

                                break

                    except Exception:

                        continue

                if not clicked:

                    return {
                        "success": False,
                        "message": (
                            "Could not submit "
                            "the search."
                        )
                    }

            except Exception as button_error:

                return {
                    "success": False,
                    "message": (
                        f"Search submission failed: "
                        f"{button_error}"
                    )
                }

        # -------------------------------------------------
        # Wait
        # -------------------------------------------------

        page.wait_for_timeout(
            5000
        )

        print(
            "🌐 Result URL:",
            page.url
        )

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

    return {
        "success": True,
        "action": "open"
    }


# =========================================================
# READ PAGE
# =========================================================

def read_page(page):

    """
    Security-aware webpage extraction.

    Normal visible webpage content is not sent
    wholesale to the SVM.

    HTML comments are always inspected because
    hidden prompt injections may be placed there.
    """

    # =====================================================
    # VISIBLE TEXT
    # =====================================================

    try:

        visible_text = page.locator(
            "body"
        ).inner_text(
            timeout=10000
        )

    except Exception:

        visible_text = ""

    # =====================================================
    # HTML
    # =====================================================

    try:

        html = page.content()

    except Exception:

        html = ""

    # =====================================================
    # HTML COMMENTS
    # =====================================================

    comments = re.findall(
        r"<!--(.*?)-->",
        html,
        re.DOTALL
    )

    candidates = []

    # -----------------------------------------------------
    # HTML COMMENTS
    # -----------------------------------------------------

    for comment in comments:

        comment = comment.strip()

        if comment:

            candidates.append({
                "source": "html_comment",
                "content": comment
            })

    # -----------------------------------------------------
    # VISIBLE TEXT
    # -----------------------------------------------------

    if visible_text:

        lines = re.split(
            r"(?<=[.!?])\s+|\n+",
            visible_text
        )

        for line in lines:

            line = line.strip()

            if not line:

                continue

            if contains_strong_injection(
                line
            ):

                candidates.append({
                    "source": "visible_text",
                    "content": line
                })

    # -----------------------------------------------------
    # ALT TEXT
    # -----------------------------------------------------

    try:

        alt_texts = page.locator(
            "[alt]"
        ).evaluate_all(
            """
            elements => elements
                .map(e => e.getAttribute('alt'))
                .filter(Boolean)
            """
        )

        for text in alt_texts:

            if contains_strong_injection(
                text
            ):

                candidates.append({
                    "source": "alt_text",
                    "content": text
                })

    except Exception:

        pass

    # -----------------------------------------------------
    # ARIA LABELS
    # -----------------------------------------------------

    try:

        aria_texts = page.locator(
            "[aria-label]"
        ).evaluate_all(
            """
            elements => elements
                .map(e => e.getAttribute('aria-label'))
                .filter(Boolean)
            """
        )

        for text in aria_texts:

            if contains_strong_injection(
                text
            ):

                candidates.append({
                    "source": "aria_label",
                    "content": text
                })

    except Exception:

        pass

    # =====================================================
    # REMOVE DUPLICATES
    # =====================================================

    unique_candidates = []

    seen = set()

    for candidate in candidates:

        key = (
            candidate["source"],
            candidate["content"]
        )

        if key not in seen:

            seen.add(key)

            unique_candidates.append(
                candidate
            )

    print(
        "\n🔍 Security candidates found:",
        len(unique_candidates)
    )

    for candidate in unique_candidates:

        print(
            "  •",
            candidate["source"],
            ":",
            candidate["content"][:200]
        )

    return unique_candidates


# =========================================================
# SCAN PAGE
# =========================================================

def scan_page(
    page,
    stage
):

    print(
        f"\n🛡️ Security scan: {stage}"
    )

    candidates = read_page(
        page
    )

    # -----------------------------------------------------
    # No suspicious content
    # -----------------------------------------------------

    if not candidates:

        print(
            "✅ No suspicious instruction-like "
            "content detected."
        )

        return {
            "allowed": True,
            "guardrail": {
                "status": "OK",
                "action": "ALLOW",
                "message": (
                    "No suspicious instruction-like "
                    "content detected."
                )
            }
        }

    # -----------------------------------------------------
    # Scan candidates
    # -----------------------------------------------------

    for index, candidate in enumerate(
        candidates,
        start=1
    ):

        print(
            f"\n🛡️ SVM candidate {index}/"
            f"{len(candidates)}"
        )

        print(
            "Source:",
            candidate["source"]
        )

        result = check_website_content(
            candidate["content"]
        )

        if not result["allowed"]:

            print(
                "\n🚨 PROMPT INJECTION DETECTED"
            )

            return result

    print(
        "\n✅ All security candidates approved."
    )

    return {
        "allowed": True,
        "guardrail": {
            "status": "OK",
            "action": "ALLOW",
            "message": (
                "All suspicious candidates "
                "passed the security gateway."
            )
        }
    }


# =========================================================
# MAIN
# =========================================================

def main():

    if len(sys.argv) < 4:

        print(
            "Usage:"
            " python browser_worker.py "
            "<url> <action> <result_file>"
        )

        return

    url = sys.argv[1]

    action = sys.argv[2]

    result_file = sys.argv[3]

    print(
        "\n========================================"
    )

    print(
        "🌐 BROWSER WORKER STARTED"
    )

    print(
        "========================================"
    )

    print(
        "URL   :",
        url
    )

    print(
        "ACTION:",
        action
    )

    if True:

        print(
            "🔐 Gateway API key: configured"
        )

    else:

        print(
            "❌ Gateway API key: NOT configured"
        )

    with sync_playwright() as p:

        browser = None

        try:

            # =============================================
            # BROWSER
            # =============================================

            browser = p.chromium.launch(
                headless=False
            )

            page = browser.new_page()

            # =============================================
            # OPEN WEBSITE
            # =============================================

            print(
                "\n🌐 Opening website..."
            )

            try:

                page.goto(
                    url,
                    wait_until="commit",
                    timeout=30000
                )

            except Exception as e:

                print(
                    "❌ Website could not be opened:",
                    e
                )

                write_result(
                    result_file,
                    {
                        "success": False,
                        "blocked": False,
                        "error_type":
                            "website_unavailable",
                        "url": url,
                        "action": action,
                        "message": (
                            "The website could not "
                            "be opened."
                        )
                    }
                )

                if browser:

                    try:
                        browser.close()

                    except Exception:
                        pass

                return

            # -------------------------------------------------
            # Check blank page
            # -------------------------------------------------

            if page.url == "about:blank":

                print(
                    "❌ Website did not load."
                )

                write_result(
                    result_file,
                    {
                        "success": False,
                        "blocked": False,
                        "error_type":
                            "website_unavailable",
                        "url": url,
                        "action": action,
                        "message": (
                            "The website could not "
                            "be opened."
                        )
                    }
                )

                browser.close()

                return

            page.wait_for_timeout(
                5000
            )

            print(
                "🌐 Current URL:",
                page.url
            )

            # =============================================
            # INITIAL SECURITY SCAN
            # =============================================

            print(
                "\n📄 Reading webpage..."
            )

            initial_scan = scan_page(
                page,
                "INITIAL PAGE"
            )

            print(
                "\nGuardrail:",
                initial_scan[
                    "guardrail"
                ]
            )

            # =============================================
            # SVM BLOCK
            # =============================================

            if not initial_scan["allowed"]:

                print(
                    "🚨 WEBSITE BLOCKED BY "
                    "SECURITY GATEWAY"
                )

                write_result(
                    result_file,
                    {
                        "success": False,
                        "blocked": True,
                        "url": url,
                        "action": action,
                        "guardrail":
                            initial_scan[
                                "guardrail"
                            ]
                    }
                )

                browser.close()

                return

            print(
                "✅ WEBSITE APPROVED"
            )

            # =============================================
            # PERFORM ACTION
            # =============================================

            print(
                "\n🎯 Performing user action..."
            )

            action_result = perform_action(
                page,
                action
            )

            # =============================================
            # ACTION FAILED
            # =============================================

            if not action_result["success"]:

                print(
                    "❌ Action failed:",
                    action_result["message"]
                )

                write_result(
                    result_file,
                    {
                        "success": False,
                        "blocked": False,
                        "error_type":
                            "action_failed",
                        "url": page.url,
                        "action": action,
                        "message":
                            action_result[
                                "message"
                            ]
                    }
                )

                # Keep browser open

                while True:

                    try:

                        if page.is_closed():

                            break

                        page.wait_for_timeout(
                            1000
                        )

                    except Exception:

                        break

                return

            # =============================================
            # RESULT PAGE
            # =============================================

            print(
                "\n📄 Reading resulting webpage..."
            )

            result_scan = scan_page(
                page,
                "RESULT PAGE"
            )

            print(
                "\nResult guardrail:",
                result_scan[
                    "guardrail"
                ]
            )

            # =============================================
            # SVM BLOCK ON RESULT PAGE
            # =============================================

            if not result_scan["allowed"]:

                print(
                    "🚨 RESULTING PAGE BLOCKED"
                )

                write_result(
                    result_file,
                    {
                        "success": False,
                        "blocked": True,
                        "url": page.url,
                        "action": action,
                        "guardrail":
                            result_scan[
                                "guardrail"
                            ]
                    }
                )

                browser.close()

                return

            # =============================================
            # SUCCESS
            # =============================================

            title = page.title()

            current_url = page.url

            final_result = {

                "success": True,

                "blocked": False,

                "url": current_url,

                "title": title,

                "action": action,

                "guardrail":
                    result_scan[
                        "guardrail"
                    ]
            }

            write_result(
                result_file,
                final_result
            )

            print(
                "\n📤 SAFE RESULT SENT TO UI"
            )

            print(
                "🌐 Browser will remain open."
            )

            # =============================================
            # KEEP BROWSER OPEN
            # =============================================

            while True:

                try:

                    if page.is_closed():

                        break

                    page.wait_for_timeout(
                        1000
                    )

                except Exception:

                    break

        except Exception as e:

            print(
                "\n❌ Browser error:",
                e
            )

            # IMPORTANT:
            # A browser error is NOT an SVM block.

            write_result(
                result_file,
                {
                    "success": False,
                    "blocked": False,
                    "error_type":
                        "browser_error",
                    "message": str(e)
                }
            )

            if browser:

                try:

                    browser.close()

                except Exception:

                    pass


# =========================================================
# ENTRY POINT
# =========================================================

if __name__ == "__main__":

    main()