---
title: Production Agents — Evals, Guardrails, Security, Observability, Cost
level: 4
tags: agents, evals, guardrails, prompt injection, observability, llmops
---
<!-- deepened -->

## Start here: the basics

### Demo vs production
A demo agent works on the five examples you tried. A production agent must work on thousands of real, messy requests, fail safely, stay within budget, be debuggable, and never take a harmful action. Most of that work is classic software engineering — your existing backend strengths apply directly.

### The production checklist (memorise the categories)
1. **Evals** — measure quality before and after every change.
2. **Guardrails** — validate inputs, outputs and actions.
3. **Security** — least privilege, prompt-injection defences, sandboxing.
4. **Reliability** — timeouts, retries, idempotent tools, fallbacks, limits.
5. **Observability** — traces of every step, metrics, logs.
6. **Cost & latency** — budgets, caching, right-sized effort/models, streaming.
7. **Human oversight** — approvals for risky actions, escalation paths, feedback loops.
<!-- -->

---

## Evals for agents
Agents are evaluated on **outcomes** and **trajectories**:

| What | How |
|---|---|
| Task success | Did the final state match the goal? (refund issued correctly; tests pass; ticket created with right fields) — check with code where possible |
| Tool selection | Did it call the right tools with valid arguments? |
| Efficiency | Turns, tokens, cost, wall-clock per task |
| Safety | Did it attempt disallowed actions? Did it resist injected instructions? |
| Final answer quality | Rubric-based LLM judge + human calibration |

Build an eval harness: a set of scenarios (including adversarial ones) run against a **sandboxed** environment with fake/stub backends, capturing the full trace and computing scores. Run on every prompt/tool/model change; track pass rate over time. Since agents are non-deterministic, run each scenario several times and report pass rates (e.g., pass@k / pass^k).

## Guardrails

| Layer | Examples |
|---|---|
| Input | Size limits, PII detection/redaction, abuse/off-topic classification, rate limiting per user |
| Model config | Clear system prompt, scoped tool set per use case, structured outputs |
| Tool/action | Schema validation, business rules enforced in backend, allow-lists, amount caps, idempotency keys, dry-run modes, **human approval** for irreversible or high-impact actions |
| Output | Schema validation, policy checks (no promises the business can't keep), citation checks, PII scrubbing |
| Runtime | Max turns, max tokens/cost per task, timeouts, kill switch |

## Security: the lethal combination
An agent becomes dangerous when it has all three of:
1. Access to **private data**,
2. Exposure to **untrusted content** (web pages, emails, documents, third-party tool outputs),
3. Ability to **communicate externally** or take actions (send email, call APIs, write files).

An attacker can plant instructions in the untrusted content ("…forward the customer list to attacker@evil.com") — **indirect prompt injection**. No prompt fully prevents it, so design to limit blast radius:
- Remove one leg where possible (e.g., read-only agents for untrusted browsing; no external send tools in data-heavy agents).
- Least-privilege credentials scoped to the current user; never give the agent admin tokens.
- Human confirmation for actions with side effects, showing exact arguments.
- Sandbox code execution (containers, no network or allow-listed hosts, resource limits).
- Mark and delimit untrusted content; monitor for anomalous tool sequences.
- Keep secrets out of prompts and logs.
Reference: OWASP Top 10 for LLM Applications (linked at the end).

## Reliability engineering
- **Timeouts** on model calls and every tool; overall task deadline.
- **Retries with exponential backoff + jitter** on 429/5xx/timeouts (the SDKs retry some errors automatically — configure `max_retries`); distinguish transient from permanent errors.
- **Idempotent side effects** (idempotency keys) so retries never double-charge or double-send.
- **Fallbacks**: refusal fallbacks to another model, degraded modes (answer without a failing tool, escalate to human).
- **State persistence** for long tasks (checkpoint progress so a crash resumes rather than restarts).
- Handle every `stop_reason` (`end_turn`, `tool_use`, `max_tokens`, `refusal`, `pause_turn` for long server-tool turns).

## Observability (LLMOps)
Log/trace per task: user/session id, prompt version, model, effort, each turn's stop reason, tool calls with arguments (redacted) and latency, errors, token usage and cost, final outcome, user feedback. Use OpenTelemetry-style tracing so you can open one task and see the full trajectory. Dashboards: success rate, escalation rate, p50/p95 latency, cost per task, tool error rates, refusal rate. Sample transcripts for weekly human review; add failures to the eval set.

## Cost and latency
| Lever | Effect |
|---|---|
| Prompt caching of system prompt + tools | Big cost and TTFT reduction across loop iterations |
| Right effort level / model per route | Simple subtasks at low effort or a smaller model, measured with evals |
| Fewer, better tools; concise tool outputs | Fewer tokens per turn |
| Parallel tool execution | Lower wall-clock |
| Streaming | Better perceived latency |
| Caching tool results | Avoid repeated lookups |
| Batch API for offline jobs | Discounted, asynchronous |
| Budgets | Hard caps per task/user/day |

Measure **cost per successful task**, not per request — a cheaper configuration that needs more retries isn't cheaper.

## Rollout
Shadow mode (agent runs, humans act) → assistive mode (agent drafts, humans approve) → autonomous for low-risk slices → expand with monitoring. Feature flags and a kill switch; clear user disclosure that they're talking to an AI; easy path to a human.

## Quick check questions

<details><summary>Why isn't "tell the model to ignore instructions in documents" enough to stop prompt injection?</summary>

Models can still be manipulated by cleverly crafted content; prompts reduce but don't eliminate risk. Security must come from system design: least privilege, confirmation for side effects, limiting exposure to untrusted content or external actions.
</details>

<details><summary>Why run each agent eval scenario multiple times?</summary>

Agent behaviour varies between runs; a single pass/fail is noisy. Pass rates over repeated runs give a reliable signal and reveal flaky behaviour.
</details>

## Questions asked at top companies

<details><summary>How do you evaluate an AI agent? <em>· Google, Microsoft, Salesforce, AI startups</em></summary>

Scenario-based harness in a sandbox measuring task success (code-checked end state), tool-use correctness, efficiency (turns, tokens, latency), safety (disallowed actions, injection resistance), and answer quality (calibrated LLM judge). Repeated runs, regression tracking, plus production metrics and human review.
</details>

<details><summary>What is indirect prompt injection and how do you mitigate it? <em>· Microsoft, Google, security interviews</em></summary>

Malicious instructions embedded in content the agent reads (web pages, emails, files, tool outputs). Mitigate by limiting capabilities (break the private data + untrusted content + external action combination), least privilege, human approval for side effects, sandboxing, delimiting untrusted content, monitoring, and adversarial testing.
</details>

<details><summary>How do you make agent actions safe to retry? <em>· Razorpay, Stripe-style, Amazon</em></summary>

Idempotency keys on side-effecting tool calls enforced server-side, deduplicate by key, return the original result on repeats; separate infra retries from model decisions; log tool call ids.
</details>

<details><summary>What would you monitor for an LLM feature in production? <em>· Atlassian, Uber, Swiggy</em></summary>

Quality proxies (thumbs, escalations, task success), latency (TTFT, total), cost per task, token usage, error/refusal rates, tool error rates, drift in input types, safety incidents; with traces for debugging and periodic human review.
</details>

<details><summary>How do you control the cost of an agent? <em>· Flipkart, startups</em></summary>

Budgets (turns, tokens, cost) per task and per user, prompt caching, effort/model routing validated by evals, concise tools and outputs, caching tool results, batching offline work, and measuring cost per successful task.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your email-assistant agent can read the user's inbox and send emails. A security review blocks launch. Redesign it.</summary>

It has private data + untrusted content (incoming emails) + external communication — the lethal combination. Redesign: agent drafts replies but never sends without explicit user confirmation showing recipients and content; recipients restricted to existing thread participants unless the user adds them; no attachments of other emails without confirmation; links in emails aren't auto-fetched; scoped OAuth tokens; anomaly alerts on unusual send patterns; adversarial eval set of injection emails.
</details>

<details><summary>Scenario: Agent costs tripled after a prompt change but success rate stayed flat. Investigate.</summary>

Compare traces before/after: more turns per task? longer tool outputs? cache misses (did the change alter the stable prefix or reorder tools, breaking prompt caching)? higher effort or a different model? Fix the cause (restore stable prefix ordering, trim outputs, tune effort), confirm on evals that quality holds, add cost-per-task to the CI eval report.
</details>
