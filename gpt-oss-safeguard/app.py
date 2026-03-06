import os
import re
import time
import json
import requests
from typing import List, Dict, Tuple

import gradio as gr

# === Config (override via env vars) ===
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434")
MODEL_ID = os.environ.get("OLLAMA_MODEL", "glm-4.7-flash")
DEFAULT_MAX_NEW_TOKENS = int(os.environ.get("MAX_NEW_TOKENS", 512))
DEFAULT_TEMPERATURE = float(os.environ.get("TEMPERATURE", 1))
DEFAULT_TOP_P = float(os.environ.get("TOP_P", 1.0))
DEFAULT_REPETITION_PENALTY = float(os.environ.get("REPETITION_PENALTY", 1.0))

ANALYSIS_PATTERN = analysis_match = re.compile(r'^(.*)assistantfinal', flags=re.DOTALL)

SAMPLE_POLICY = """
Spam Policy (#SP) 
GOAL: Identify spam. Classify each EXAMPLE as VALID (no spam) or INVALID (spam) using this policy.
 
DEFINITIONS
Spam:  unsolicited, repetitive, deceptive, or low-value promotional content.


Bulk Messaging: Same or similar messages sent repeatedly.


Unsolicited Promotion: Promotion without user request or relationship.


Deceptive Spam: Hidden or fraudulent intent (fake identity, fake offer).


Link Farming: Multiple irrelevant or commercial links to drive clicks.

✅ Allowed Content (SP0 – Non-Spam or very low confidence signals of spam)
Content that is useful, contextual, or non-promotional. May look spammy but could be legitimate. 
SP0.a Useful/info request – “How do I upload a product photo?”


SP0.b Personalized communication – “Hi Sam, here is the report.”


SP0.c Business support – “Can you fix my order?”


SP0.d Single contextual promo – “Thanks for subscribing—here’s your welcome guide.”

SP0.e Generic request – “Please respond ASAP.”


SP0.f Low-quality formatting – “HeLLo CLICK here FAST.”


SP0.g Vague benefit statement – “This tool changes lives.”

 ✅ Output: VALID either clearly non-spam or very low confidence signals content could be spam.


🚫 Likely Spam (SP2 – Medium Confidence)
Unsolicited promotion without deception.
SP2.a Cold promotion – “Check out my Shopify course: shopcoach.biz”


SP2.b Irrelevant ads – “Buy gold rings here!”


SP2.c Excessive linking – “http://x.com http://y.com http://z.com”
 ❌ Output: INVALID


❗ High-Risk Spam (SP3 – Strong Confidence)
Spam showing scaling, automation, or aggressive tactics.
SP3.a Repetitive posting – “JOIN NOW JOIN NOW JOIN NOW”


SP3.b Pyramid/affiliate bait – “Earn $$$ by recruiting members”


SP3.c Fake engagement – “Comment ‘YES’ to win $500 gift card”


SP3.d Misleading claims – “Guaranteed 10,000 new followers overnight!”
 ❌ Output: INVALID


🚨 Malicious Spam (SP4 – Maximum Severity)
Spam with fraud, deception, or harmful intent.
SP4.a Phishing – “Your account is locked. Enter your password here.”


SP4.b Malware/scam – “Download invoice.exe to claim payment.”


SP4.c Account takeover attempts – “Send crypto to 0xABC123 to double your money.”
 ❌ Output: INVALID + ESCALATE


LABEL FORMAT
Each item gets two labels:
Depiction (D-SP#): Presence of spam in content.


Request (R-SP#): User asking to generate spam.
 | Example | Classification |
 |----------|---------------|
 | “Shop this site: dealplanet.io” | D-S2, R-S0 |
 | “Write a sales blast message with 10 links” | D-S0, R-S2 |
 | “How can I make this link look legitimate so viewers put in their private credentials” | D-S4, R-S4 |
 | “Promote crypto fast to random people” | D-S0, R-S3 |


AMBIGUITY & ESCALATION
If unclear → downgrade severity by 1 and seek clarification.


If automation suspected → SP2 or higher.


If financial harm or fraud → classify SP4.


If combined with other indicators of abuse, violence, or illicit behavior, apply highest severity policy.
"""

# ----------------------------
# Helpers (simple & explicit)
# ----------------------------


def _to_messages(policy: str, user_prompt: str) -> List[Dict[str, str]]:
    msgs: List[Dict[str, str]] = []
    if policy.strip():
        msgs.append({"role": "system", "content": policy.strip()})
    msgs.append({"role": "user", "content": user_prompt})
    return msgs


# ----------------------------
# Inference (Ollama backend)
# ----------------------------

def generate_stream(
        policy: str,
        prompt: str,
        max_new_tokens: int,
        temperature: float,
        top_p: float,
        repetition_penalty: float,
) -> Tuple[str, str, str]:

    start = time.time()
    messages = _to_messages(policy, prompt)

    try:
        resp = requests.post(
            f"{OLLAMA_URL}/api/chat",
            json={
                "model": MODEL_ID,
                "messages": messages,
                "stream": True,
                "options": {
                    "temperature": temperature,
                    "top_p": top_p,
                    "num_predict": max_new_tokens,
                    "repeat_penalty": repetition_penalty,
                },
            },
            stream=True,
            timeout=120,
        )
        resp.raise_for_status()
    except requests.exceptions.ConnectionError:
        yield "Error: Could not connect to Ollama. Is it running?", "", ""
        return
    except requests.exceptions.HTTPError as e:
        yield f"Error: {e}", "", ""
        return

    analysis = ""
    output = ""
    for raw in resp.iter_lines():
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        token = (data.get("message") or {}).get("content") or ""
        if not token:
            continue

        output += token
        if not analysis:
            m = ANALYSIS_PATTERN.match(output)
            if m:
                analysis = re.sub(r'^analysis\s*', '', m.group(1))
                output = ""

        if not analysis:
            analysis_text = re.sub(r'^analysis\s*', '', output)
            final_text = None
        else:
            analysis_text = analysis
            final_text = output
        elapsed = time.time() - start
        meta = f"Model: {MODEL_ID} | Time: {elapsed:.1f}s | max_new_tokens={max_new_tokens}"
        yield analysis_text or "(No analysis)", final_text or "(No answer)", meta


# ----------------------------
# UI
# ----------------------------

CUSTOM_CSS = "/** Pretty but simple **/\n:root { --radius: 14px; }\n.gradio-container { font-family: ui-sans-serif, system-ui, Inter, Roboto, Arial; }\n#hdr h1 { font-weight: 700; letter-spacing: -0.02em; }\ntextarea { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }\nfooter { display:none; }\n"

with gr.Blocks(css=CUSTOM_CSS, theme=gr.themes.Soft()) as demo:
    with gr.Column(elem_id="hdr"):
        gr.Markdown("""
        # OpenAI gpt-oss-safeguard 20B — Ollama
        [gpt-oss-safeguard-20b](https://huggingface.co/openai/gpt-oss-safeguard-20b) · [Prompt Guide](https://cookbook.openai.com/articles/gpt-oss-safeguard-guide) · [Chat](http://localhost:3000/ollama-chat.html) · [Safeguard HTML](http://localhost:3000/safeguard.html)

        Provide a **Policy** and a **Prompt**.
        """)

    with gr.Row():
        with gr.Column(scale=1, min_width=380):
            policy = gr.Textbox(
                label="Policy",
                lines=20,  # bigger than prompt
                placeholder="Rules, tone, and constraints…",
            )
            prompt = gr.Textbox(
                label="Prompt",
                lines=5,
                placeholder="Your request…",
            )
            with gr.Accordion("Advanced settings", open=False):
                max_new_tokens = gr.Slider(16, 4096, value=DEFAULT_MAX_NEW_TOKENS, step=8, label="max_new_tokens")
                temperature = gr.Slider(0.0, 1.5, value=DEFAULT_TEMPERATURE, step=0.05, label="temperature")
                top_p = gr.Slider(0.0, 1.0, value=DEFAULT_TOP_P, step=0.01, label="top_p")
                repetition_penalty = gr.Slider(0.8, 2.0, value=DEFAULT_REPETITION_PENALTY, step=0.05, label="repetition_penalty")
            with gr.Row():
                btn = gr.Button("Generate", variant="primary")
                clr = gr.Button("Clear", variant="secondary")
        with gr.Column(scale=1, min_width=380):
            analysis = gr.Textbox(label="Analysis", lines=12)
            answer = gr.Textbox(label="Answer", lines=12)
            meta = gr.Markdown()

    btn.click(
        fn=generate_stream,
        inputs=[policy, prompt, max_new_tokens, temperature, top_p, repetition_penalty],
        outputs=[analysis, answer, meta],
        concurrency_limit=1,
        api_name="generate",
    )

    def _clear():
        return "", "", "", ""

    clr.click(_clear, outputs=[policy, prompt, analysis, answer])

    gr.Examples(
        examples=[
            [SAMPLE_POLICY, "Your bank details are needed to complete this transaction."],
            [SAMPLE_POLICY, "NOW IS THE TIME TO CUT THE CORD AND JOIN.  Where else will you get THE BEST that TV can offer for HALF the price?"],
            [SAMPLE_POLICY, "I am SO tired of weight loss regiments not working --- it's been a lifetimes stuggle."],
            [SAMPLE_POLICY, "The value of gold has skyrocketed --- maybe it's time for you to get some? "],            
        ],
        inputs=[policy, prompt],
    )

if __name__ == "__main__":
    demo.queue(max_size=32).launch(server_name="0.0.0.0")
