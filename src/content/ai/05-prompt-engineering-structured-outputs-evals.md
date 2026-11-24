---
title: Prompt Engineering, Structured Outputs & Evals — Making LLM Features Reliable
level: 3
tags: prompt engineering, structured outputs, evals, llm-as-judge, claude api
---
<!-- deepened -->

## Start here: the basics

### Your first API call
```python
# pip install anthropic   (reads ANTHROPIC_API_KEY from the environment)
import anthropic

client = anthropic.Anthropic()
response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=1024,
    system="You are a concise assistant for a food-delivery app.",
    messages=[{"role": "user", "content": "Explain what 'surge pricing' means in two sentences."}],
)
print(next(b.text for b in response.content if b.type == "text"))
print(response.usage)           # input/output tokens → cost
```
Building blocks of every request:
- **system** — the role, rules and context that apply to the whole conversation.
- **messages** — alternating `user` / `assistant` turns. The API is stateless: send the history each time.
- **max_tokens** — upper bound on output length.
- Response: `content` blocks, `stop_reason` (`end_turn`, `max_tokens`, `tool_use`, `refusal` …), and `usage`.

### What a "prompt" really is
A prompt is a **specification**. The model can't read your mind, see your codebase, or know your business rules unless you tell it. Most bad LLM output is an under-specified prompt.

**Weak**: "Summarise this ticket."
**Strong**:
```
You are triaging customer support tickets for an Indian food-delivery app.
Summarise the ticket below for the on-call agent in at most 3 bullet points:
1. What the customer wants, 2. What already went wrong, 3. Any amount or order id mentioned.
If the ticket is abusive or not about an order, reply only with "NOT_ACTIONABLE".

<ticket>
{ticket_text}
</ticket>
```
<!-- -->

---

## Prompt engineering techniques that work

| Technique | Why it helps |
|---|---|
| **Be explicit and specific** | State the task, audience, length, format, and what to do in edge cases |
| **Give context / the "why"** | "Users read this on a phone, so keep it short" lets the model generalise correctly |
| **Delimit inputs with XML-style tags** | `<document>…</document>` separates instructions from data (and reduces prompt injection risk) |
| **Examples (few-shot)** | 2–5 diverse input→output examples set format and tone better than descriptions |
| **Ask for reasoning on hard tasks** | Let the model think before answering (thinking/effort settings, or "work through it step by step before the final answer") |
| **Specify the output format** | Use structured outputs (below) instead of hoping for parseable text |
| **Break big tasks into steps (prompt chaining)** | Extract → analyse → write, each a focused call you can test |
| **Positive instructions** | "Write in plain prose paragraphs" works better than a list of "don't"s |
| **Role in the system prompt** | Sets expertise and tone |
| **Long documents first, question last** | For long contexts, put the material at the top and the specific question at the end |

Notes on current Claude models:
- **No assistant prefill**: older techniques pre-filled the start of the assistant's reply to force a format; current models reject it — use structured outputs or system instructions.
- Sampling parameters (`temperature`, `top_p`, `top_k`) are no longer accepted; steer with prompts and the **effort** setting (`output_config={"effort": "low" | "medium" | "high" | "xhigh" | "max"}`), which trades depth of reasoning for speed and cost.
- Recent models follow instructions literally and precisely — over-prescriptive, shouty prompts written for older models ("CRITICAL!!! YOU MUST…") often make outputs worse. Say it once, clearly.

### Prompt templates in code
Keep prompts in version control as templates with named variables, review changes like code, and tie each prompt version to eval results.

## Structured outputs — JSON you can trust

Parsing free text with regexes is fragile. Ask the API to return data matching a schema:

```python
from typing import Literal
from pydantic import BaseModel, Field
import anthropic

class Triage(BaseModel):
    category: Literal["refund", "late_delivery", "wrong_item", "account", "other"]
    priority: Literal["p1", "p2", "p3"]
    order_id: str | None = Field(description="Order id if mentioned, else null")
    summary: str

client = anthropic.Anthropic()
response = client.messages.parse(
    model="claude-opus-5-5",
    max_tokens=2048,
    messages=[{"role": "user", "content": f"Triage this ticket:\n<ticket>{ticket}</ticket>"}],
    output_format=Triage,
)
triage: Triage = response.parsed_output      # validated Pydantic object
```
The schema constrains the output; your code still validates business rules (e.g., the order id exists). Tools can also be made schema-exact with `strict: true` on the tool definition.

## Evals — the most important skill interviewers look for

> "How do you know your prompt change made it better?" If your answer is "I tried a few examples", you'll lose to the candidate who says "I ran our eval set."

### What an eval is
A dataset of realistic inputs + a way to grade outputs + a score you can compare across prompt/model/parameter changes. It's the unit test suite for non-deterministic systems.

### Building one (step by step)
1. **Collect inputs**: real user requests (anonymised), plus tricky edge cases (ambiguous, adversarial, empty, long, other languages). Start with 30–100; grow over time.
2. **Define success** per case: exact label, reference answer, or a rubric ("mentions the refund timeline; does not promise a refund amount").
3. **Choose graders**:
| Grader | Use for |
|---|---|
| Code checks | Exact match, JSON validity, regex, numeric tolerance, "did it call the right tool" |
| LLM-as-judge | Open-ended quality against a rubric (faithfulness, helpfulness, tone) — validate it against human labels first |
| Human review | Calibration, high-stakes outputs, a sample each release |
4. **Run** the current version → baseline score. Change one thing → re-run → compare. Keep a held-out test split you don't tune on.
5. **Automate** in CI for prompt changes; track cost and latency alongside quality.

```python
import json
cases = [json.loads(l) for l in open("triage_eval.jsonl")]   # {"ticket": ..., "expected_category": ...}
correct = 0
for c in cases:
    out = triage(c["ticket"])                   # your function under test
    correct += out.category == c["expected_category"]
print(f"accuracy {correct}/{len(cases)} = {correct/len(cases):.1%}")
```

### LLM-as-judge done right
Give the judge the input, the output, the reference/rubric, and ask for a **structured verdict** (score + short justification). Use binary or small ordinal scales, judge one criterion at a time, randomise order when comparing two outputs (position bias), and measure agreement with human labels before trusting it.

## Guardrails and safety basics
- Validate inputs (length, PII redaction where required) and outputs (schema, allowed values, policy checks).
- Handle `stop_reason == "refusal"` and `max_tokens` explicitly.
- Never let generated text directly execute privileged actions without validation or approval.
- **Prompt injection**: untrusted content (web pages, emails, retrieved docs) can contain instructions. Delimit it, tell the model it's data, restrict tools, require confirmation for side effects.
- Log prompts/outputs with privacy controls for debugging and audits.

## Cost and latency levers (know these for interviews)
1. **Prompt caching** for long, stable prefixes (system prompt, documents, tool definitions) — large savings on repeated requests.
2. **Effort/model choice**: lower effort or a faster model for simple routes — measured on evals.
3. **Fewer tokens**: concise prompts, retrieve less but better, cap output length via instructions.
4. **Batching** for non-urgent bulk work (Message Batches API: discounted, asynchronous).
5. **Streaming** to improve perceived latency.

## Quick check questions

<details><summary>Why use XML-style tags around user-provided documents?</summary>

They separate instructions from data so the model knows what to operate on, make it easy to reference ("the <ticket>"), and reduce (not eliminate) prompt-injection risk.
</details>

<details><summary>Your prompt tweak fixed the bug report you were looking at. Is it safe to ship?</summary>

Not yet — run the full eval set to check it didn't regress other cases, and add the failing case to the set.
</details>

## Questions asked at top companies

<details><summary>How do you evaluate an LLM feature? <em>· Microsoft, Google, Atlassian, AI startups</em></summary>

Build a representative labelled dataset including edge cases; define success criteria; grade with code checks where possible and calibrated LLM-as-judge/human review otherwise; track quality, latency and cost; compare versions on the same set; keep a held-out test split; monitor online metrics (thumbs, escalations) after launch.
</details>

<details><summary>How do you get reliable JSON from an LLM? <em>· Amazon, Uber, Razorpay</em></summary>

Use the API's structured outputs / schema-constrained decoding (e.g., Pydantic models with `messages.parse`) or strict tool schemas; validate with Pydantic; handle refusals and max-token truncation; retry with error feedback or fall back.
</details>

<details><summary>What is prompt injection and how do you defend against it? <em>· Microsoft, Google, security-focused teams</em></summary>

Malicious instructions embedded in untrusted input that try to override the system's instructions. Defences: separate and label untrusted content, least-privilege tools, human confirmation for side effects, output validation, monitoring, and adversarial test cases. No prompt-only defence is complete — design so a successful injection can't do much damage.
</details>

<details><summary>Few-shot vs zero-shot prompting? <em>· Amazon, Infosys (GenAI roles)</em></summary>

Zero-shot gives only instructions; few-shot adds examples of input→output. Few-shot improves format consistency and edge-case handling; examples should be diverse and representative to avoid the model copying surface features.
</details>

<details><summary>How would you reduce the cost of an LLM feature by 50%? <em>· Swiggy, Flipkart, startups</em></summary>

Measure token profile first; then prompt caching, trimming context (better retrieval), shorter outputs, lower effort or smaller model on easy routes validated by evals, batching for offline work, caching full responses for repeated questions, and avoiding unnecessary multi-call chains.
</details>

<details><summary>What is LLM-as-a-judge and its pitfalls? <em>· Google, Meta</em></summary>

Using a model to grade outputs against a rubric. Pitfalls: position and verbosity bias, self-preference, inconsistency, rubric ambiguity. Mitigate with clear rubrics, structured verdicts, randomised ordering, and validation against human labels.
</details>

## End-to-end scenarios

<details><summary>Scenario: Ship an "auto-reply draft" feature for support agents. Plan prompts, outputs, evals and rollout.</summary>

Prompt: system role + policy excerpts + tone guide; ticket and order data in tags; output via structured schema (draft, confidence, needs_escalation, cited_policy_ids). Eval: 150 historical tickets with agent-approved replies; graders for policy compliance (LLM-judge with rubric validated on 40 human-labelled cases), no invented refunds (code check against order data), tone. Rollout: shadow mode (drafts not shown) → visible drafts for 10% of agents → measure edit distance between draft and sent reply, handle time, CSAT; feedback loop adds failures to the eval set.
</details>

<details><summary>Scenario: After switching to a newer model, some outputs got worse. How do you handle migration?</summary>

Run the eval suite on both models; inspect regressions by category; adjust prompts for the new model's behaviour (newer models are often more literal — remove over-prescriptive instructions, re-tune effort); check API changes (removed parameters, structured output differences); roll out gradually with monitoring and a fallback.
</details>
