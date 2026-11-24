---
title: Build Your First Agent in Python with the Claude API (Hands-on)
level: 3
tags: agents, claude api, python, tool use, tool runner
minutes: 120
---
<!-- deepened -->

## Start here: the basics

### What you'll build
A **support agent** for a food-delivery company that can look up orders, check the refund policy, issue small refunds, and escalate to a human. You'll build it three ways:
1. One tool call by hand — to see exactly what goes over the wire.
2. A full agent loop you write yourself — the thing interviewers ask you to explain.
3. The same agent using the SDK's **tool runner**, which writes the loop for you.

### Setup (10 minutes)
```bash
uv init support-agent && cd support-agent        # or: python -m venv .venv && pip install anthropic
uv add anthropic
export ANTHROPIC_API_KEY="sk-ant-..."             # from the Claude Console; never commit it
```
Model used throughout: `claude-opus-5-5` (Anthropic's current Opus model).

### Step 1 — one tool call, by hand
```python
import anthropic

client = anthropic.Anthropic()

tools = [{
    "name": "get_order",
    "description": "Look up a customer order by numeric id. Returns status, promised and actual "
                   "delivery time (ISO 8601) and amount in INR.",
    "input_schema": {
        "type": "object",
        "properties": {"order_id": {"type": "integer", "description": "Numeric order id"}},
        "required": ["order_id"],
    },
}]

response = client.messages.create(
    model="claude-opus-5-5",
    max_tokens=2048,
    tools=tools,
    messages=[{"role": "user", "content": "Where is my order 8842?"}],
)
print(response.stop_reason)                      # "tool_use"
for block in response.content:
    print(block.type, getattr(block, "name", ""), getattr(block, "input", ""))
# tool_use get_order {'order_id': 8842}
```
The model didn't answer — it asked for a tool. Your program must run `get_order(8842)` and send back a `tool_result` block with the same `tool_use_id`. Then the model can answer.
<!-- -->

---

## Step 2 — the agent loop, written by hand

```python
# agent.py
import json
from datetime import datetime
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-opus-5-5"

# ---------- fake backend (replace with real services) ----------
ORDERS = {
    8842: {"status": "delivered", "promised_at": "2026-11-20T20:00:00+05:30",
           "delivered_at": "2026-11-20T20:47:00+05:30", "amount_inr": 640, "refunded": False},
    9001: {"status": "out_for_delivery", "promised_at": "2026-11-24T21:00:00+05:30",
           "delivered_at": None, "amount_inr": 1250, "refunded": False},
}
POLICY = ("Late delivery refunds: if delivered more than 30 minutes after the promised time, "
          "refund 20% of the order amount, capped at INR 200. One refund per order.")

# ---------- tools ----------
def get_order(order_id: int) -> dict:
    order = ORDERS.get(order_id)
    if not order:
        raise ValueError(f"Order {order_id} not found. Order ids are 4-digit numbers.")
    return order

def get_refund_policy() -> str:
    return POLICY

def issue_refund(order_id: int, amount_inr: int, reason: str) -> dict:
    order = get_order(order_id)
    # Business rules enforced in CODE, not trusted to the model:
    if order["refunded"]:
        raise ValueError("This order was already refunded.")
    if amount_inr > min(200, order["amount_inr"]):
        raise ValueError("Amount exceeds the policy cap of INR 200.")
    order["refunded"] = True
    return {"refund_id": f"rf_{order_id}", "amount_inr": amount_inr, "reason": reason}

def escalate_to_human(summary: str) -> dict:
    return {"ticket": "HUM-1042", "summary": summary}

HANDLERS = {"get_order": get_order, "get_refund_policy": get_refund_policy,
            "issue_refund": issue_refund, "escalate_to_human": escalate_to_human}

TOOLS = [
    {"name": "get_order",
     "description": "Look up an order by numeric id. Returns status, promised_at, delivered_at "
                    "(ISO 8601, null if not delivered), amount_inr and whether it was refunded.",
     "input_schema": {"type": "object", "properties": {"order_id": {"type": "integer"}},
                      "required": ["order_id"]}},
    {"name": "get_refund_policy",
     "description": "Return the current refund policy text. Check it before deciding on any refund.",
     "input_schema": {"type": "object", "properties": {}}},
    {"name": "issue_refund",
     "description": "Issue a refund. Only call after confirming eligibility under the policy. "
                    "The backend rejects refunds that break policy.",
     "input_schema": {"type": "object",
                      "properties": {"order_id": {"type": "integer"},
                                     "amount_inr": {"type": "integer"},
                                     "reason": {"type": "string"}},
                      "required": ["order_id", "amount_inr", "reason"]}},
    {"name": "escalate_to_human",
     "description": "Hand the case to a human agent when the request is outside policy, unclear, "
                    "or the customer is upset.",
     "input_schema": {"type": "object", "properties": {"summary": {"type": "string"}},
                      "required": ["summary"]}},
]

SYSTEM = f"""You are a support agent for a food-delivery app in India.
Today is {datetime.now():%Y-%m-%d}. Use the tools to look up facts; never guess order details.
Follow the refund policy exactly. If something is outside policy, escalate instead of improvising.
Finish with a short, friendly message to the customer stating what you did."""

def run_tool(name: str, args: dict) -> tuple[str, bool]:
    """Returns (content, is_error)."""
    try:
        result = HANDLERS[name](**args)
        return (result if isinstance(result, str) else json.dumps(result)), False
    except Exception as e:                       # errors go back to the model so it can recover
        return f"Error: {e}", True

def run_agent(user_request: str, max_turns: int = 8) -> str:
    messages = [{"role": "user", "content": user_request}]
    for turn in range(max_turns):
        response = client.messages.create(
            model=MODEL, max_tokens=4096, system=SYSTEM, tools=TOOLS, messages=messages,
        )
        # Always append the full content (text + tool_use blocks) — not just the text.
        messages.append({"role": "assistant", "content": response.content})

        if response.stop_reason == "end_turn":
            return "".join(b.text for b in response.content if b.type == "text")
        if response.stop_reason == "refusal":
            return "Sorry, I can't help with that request."
        if response.stop_reason == "max_tokens":
            raise RuntimeError("Response truncated; raise max_tokens or simplify the task.")

        # stop_reason == "tool_use": run every requested tool, return ALL results in ONE user message
        results = []
        for block in response.content:
            if block.type == "tool_use":
                content, is_error = run_tool(block.name, block.input)
                print(f"  [tool] {block.name}({block.input}) -> {content[:80]}")
                results.append({"type": "tool_result", "tool_use_id": block.id,
                                "content": content, "is_error": is_error})
        messages.append({"role": "user", "content": results})
    return "I couldn't finish within the step limit; escalating to a human."

if __name__ == "__main__":
    print(run_agent("My order 8842 arrived really late. Can I get something back?"))
```
Expected trace: `get_order(8842)` → `get_refund_policy()` → computes 47 min late → 20% of 640 = 128 → `issue_refund(8842, 128, ...)` → friendly message. Try `"Refund my whole order 9001"` — it isn't delivered, so the agent should escalate or explain.

### What makes this loop correct
| Rule | Why |
|---|---|
| Append `response.content` (all blocks) as the assistant turn | Tool results must follow the exact `tool_use` blocks that requested them |
| Return every `tool_result` in **one** user message | Splitting them trains the model away from parallel tool calls |
| Match `tool_use_id` | Links each result to its call |
| Send errors back with `is_error: true` | The model can retry with corrected arguments or escalate |
| Enforce business rules in code | The model's arguments are suggestions, not authority |
| `max_turns` limit | Prevents runaway loops and cost |
| Handle `refusal` and `max_tokens` | Not every response is a normal answer |

## Step 3 — the same agent with the SDK tool runner

The Python SDK can run the loop for you. Define tools as typed functions with docstrings; the schema is generated from the signature:

```python
import anthropic
from anthropic import beta_tool

client = anthropic.Anthropic()

@beta_tool
def get_order_tool(order_id: int) -> str:
    """Look up an order by numeric id.

    Args:
        order_id: The 4-digit numeric order id.
    """
    content, _ = run_tool("get_order", {"order_id": order_id})
    return content

@beta_tool
def get_refund_policy_tool() -> str:
    """Return the current refund policy text. Check it before deciding on any refund."""
    return POLICY

runner = client.beta.messages.tool_runner(
    model="claude-opus-5-5",
    max_tokens=4096,
    system=SYSTEM,
    tools=[get_order_tool, get_refund_policy_tool],
    messages=[{"role": "user", "content": "Was order 8842 late?"}],
)
for message in runner:                 # yields each model turn; tools run automatically in between
    for block in message.content:
        if block.type == "text":
            print(block.text)
```
Use the runner for most agents; write the manual loop when you need full control (custom approval flows, unusual transports) — and understand it either way, because interviews ask you to explain it.

## Production hardening

### Human-in-the-loop approval
Gate dangerous tools inside the handler:
```python
def issue_refund_with_approval(order_id: int, amount_inr: int, reason: str) -> dict:
    if amount_inr > 100 and not ask_supervisor(order_id, amount_inr, reason):   # UI prompt / Slack approval
        raise PermissionError("Supervisor declined the refund. Explain this to the customer.")
    return issue_refund(order_id, amount_inr, reason)
```

### Refusal fallbacks
Safety classifiers can occasionally decline a request (`stop_reason == "refusal"`). For production agents on current Claude models, opt into server-side fallbacks so a declined request is automatically retried on a fallback model in the same call:
```python
response = client.beta.messages.create(
    model="claude-opus-5-5",
    max_tokens=4096,
    betas=["server-side-fallback-2026-07-01"],
    fallbacks="default",                 # the API picks a suitable fallback model per refusal category
    system=SYSTEM, tools=TOOLS, messages=messages,
)
```
Still check `stop_reason` afterwards — the fallback can also decline.

### Streaming, cost and latency
- **Stream** responses (`client.messages.stream(...)` → `.get_final_message()`) for long outputs and to show progress in UIs.
- **Prompt caching** for the long, stable prefix (system prompt + tool definitions) cuts cost and time-to-first-token on every loop iteration.
- **Effort**: `output_config={"effort": "low"}` for simple routing agents, `"high"` for hard multi-step tasks — measure on your evals.
- Log `response.usage` per turn; set per-task budgets (max turns, max tokens, max cost).

### Async and concurrency
Use `AsyncAnthropic` in web servers; run independent tool calls in parallel with `asyncio.gather`; cap concurrency with a semaphore.

### Observability
Log every turn: model, stop_reason, tool name + arguments (redact PII), tool latency and errors, token usage. You'll need this trace to debug "why did the agent do that?" — the single most common production question.

## Quick check questions

<details><summary>What breaks if you append only the text of the assistant response to `messages`?</summary>

The `tool_use` blocks are lost, so the next request contains `tool_result` blocks with no matching tool calls — the API rejects it (and the model loses track of what it asked for).
</details>

<details><summary>Why raise exceptions inside tools instead of letting the model "know the rules"?</summary>

Prompts are guidance; code is enforcement. A bug, an ambiguous message or a prompt injection could make the model request an invalid refund — the backend must reject it regardless.
</details>

## Questions asked at top companies

<details><summary>Walk me through the code of an agent loop. <em>· AI startups, Microsoft, Atlassian, Uber (2025–26 loops)</em></summary>

Messages + tools → model → if stop_reason is tool_use: append assistant content, execute each tool_use (validated, permissioned), append all tool_results (matching ids, is_error on failure) in one user turn, loop; stop on end_turn, refusal, max_tokens or turn/budget limits; log everything.
</details>

<details><summary>How do you prevent an agent from looping forever or burning money? <em>· Google, Amazon</em></summary>

Max turns, token/cost budgets, timeouts per tool and overall, detection of repeated identical tool calls, clear success criteria in the prompt, and fallback to escalation when limits hit.
</details>

<details><summary>How do you handle tool errors? <em>· Microsoft, Salesforce</em></summary>

Catch exceptions, return a concise, actionable error as a tool_result with `is_error: true`; the model can retry with corrected inputs or choose another path. Retry transient infrastructure errors (timeouts, 5xx) in code with backoff before surfacing them.
</details>

<details><summary>How would you add human approval to an agent? <em>· Atlassian, ServiceNow-style</em></summary>

Classify tools by risk; for side-effecting ones, the handler pauses for approval (UI, Slack, ticket) with a summary of the proposed action and arguments; a decline returns an explanatory tool result; log decisions for audit.
</details>

<details><summary>Parallel tool calls — what are they and how do you handle them? <em>· Uber, Google</em></summary>

The model may request several tool calls in one turn (e.g., look up three orders). Execute them concurrently where safe and return all results together in a single user message, each with its own tool_use_id.
</details>

<details><summary>Manual loop vs SDK tool runner vs agent frameworks? <em>· AI startups</em></summary>

Manual loop: full control, more code. Tool runner: SDK handles the loop with typed tools and hooks. Frameworks/hosted agents (e.g., LangGraph, Claude Agent SDK, managed agent platforms) add state, memory, orchestration, built-in tools and hosting — more power, more abstraction. Choose the simplest that meets requirements.
</details>

## End-to-end scenarios

<details><summary>Scenario: Extend the support agent to handle "my food was cold" complaints with photo evidence.</summary>

Accept an image in the user message (vision input); add a `log_quality_issue(order_id, issue_type, evidence_summary)` tool and a policy for quality complaints (e.g., voucher not refund). System prompt explains when photos are required. Evaluate on a set of real complaints with images; guard against fake or irrelevant images by escalating low-confidence cases.
</details>

<details><summary>Scenario: The agent sometimes issues the refund twice when the network times out. Fix it.</summary>

The tool call succeeded but the response was lost, so the model (or your retry) called it again. Make `issue_refund` idempotent with an idempotency key (order id + refund type) enforced in the backend; return the existing refund on duplicates; separate infrastructure retries (in code) from model-level retries; log tool call ids.
</details>
