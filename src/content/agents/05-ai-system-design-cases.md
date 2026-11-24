---
title: AI System Design Interviews — Framework and Four Full Case Studies
level: 5
tags: ai system design, llm system design, rag, agents, case study
---
<!-- deepened -->

## Start here: the basics

### What's different about AI system design
Classic system design (System Design track) still applies — load balancers, caches, queues, databases. AI system design adds new questions:
- **Which model(s)**, and how do you choose (quality vs latency vs cost)?
- **What context** does the model need, and how do you get it (RAG, tools, memory)?
- **How do you know it works** (evals) and keep it working (monitoring)?
- **What can go wrong** (hallucination, prompt injection, unsafe actions, cost blow-ups) and how do you contain it?
- **Latency** is dominated by model inference (seconds, not milliseconds) — streaming and async design matter.

### The framework (45 minutes)
| Min | Step |
|---|---|
| 0–5 | Requirements: users, use cases, what "good" means, risk level (internal tool vs customer money) |
| 5–8 | Scale & constraints: requests/day, latency targets (TTFT, total), budget per request, data sensitivity/residency |
| 8–15 | High-level design: client → API → orchestration (workflow or agent) → model API; context sources; data stores |
| 15–30 | Deep dives: retrieval/context, tool design & permissions, prompt & output contracts, model routing |
| 30–40 | Evals, guardrails, observability, rollout |
| 40–45 | Cost estimate, failure modes, trade-offs, what you'd build next |

### Quick cost estimation
`cost/request ≈ input_tokens × input_price + output_tokens × output_price` (prices are per million tokens; caching makes cached input much cheaper). Multiply by requests/day. Always do this — interviewers want to see you reason about it, and it often decides architecture (e.g., route easy requests to a cheaper model).
<!-- -->

---

## Case 1 — Customer-support AI agent for a food-delivery app

**Requirements**: answer "where's my order", handle refunds within policy, escalate others; 2M conversations/month; first response < 3 s (streamed); refunds must never exceed policy; Hindi + English.

**Design**
```
App chat ─► Chat API (auth, rate limit) ─► Conversation service (history in Postgres/Redis)
                                         └► Agent orchestrator ─► Claude API (tools + streaming)
Tools (internal APIs, user-scoped tokens): get_order, track_rider, get_policy (RAG over policy docs),
   issue_voucher/refund (server-side policy enforcement, idempotency, caps), escalate_to_human (ticketing)
Async: transcripts → analytics; feedback → eval set
```
Deep dives:
- **Workflow first**: deterministic intent routing ("where is my order" handled by a fixed tool chain + templated LLM reply); agentic loop only for complex cases.
- **Safety**: refund rules enforced in the refund service, not the prompt; human approval above a threshold; all actions logged with conversation id.
- **Latency**: stream tokens; cache the system prompt + tool definitions (prompt caching); parallel tool calls.
- **Cost**: ~2M conversations × ~6 model calls × (~4k input, 300 output tokens) — compute it, then reduce with caching, routing simple intents to a lower effort level, short tool outputs.
- **Evals**: 500 real anonymised conversations with labelled correct actions; metrics: correct resolution, policy violations (must be 0), escalation rate, CSAT proxy.
- **Rollout**: shadow → assist agents → autonomous for low-risk intents.

## Case 2 — Enterprise knowledge assistant (RAG) for 50 000 employees

**Requirements**: answer questions over Confluence, Google Drive, Jira, PDFs; respect document permissions; cite sources; data stays in region.

**Design**
- **Ingestion**: connectors with incremental sync (webhooks/CDC) → parse (PDF/tables) → structure-aware chunking with contextual headers → embeddings + BM25 index (OpenSearch or pgvector), metadata incl. ACL groups.
- **Query**: rewrite question with conversation context → permission-filtered hybrid retrieval → rerank → assemble ≤ N tokens with doc ids → model answers with citations or "not found" → UI shows sources.
- **Freshness**: re-index changed docs within minutes; delete on permission revocation immediately.
- **Security**: SSO identity propagated to retrieval filters; prompt-injection-hardened prompt; no write tools; audit logs.
- **Evals**: 300 real questions with reference answers and relevant doc ids → retrieval recall@10, faithfulness, correctness; dashboards for "no answer" rate and thumbs-down.
- **Scale**: index size (docs × chunks × embedding size), query QPS, embedding refresh throughput; caching of frequent questions.

## Case 3 — AI coding assistant for code review on pull requests

**Requirements**: comment on PRs within 5 minutes; find bugs and security issues; low false positives; repos up to millions of lines.

**Design**
- Trigger: GitHub webhook → queue (Kafka/SQS) → review workers.
- Context: diff + relevant surrounding code (symbols referenced, tests, recently changed files via code search), repo conventions file.
- Agentic step: the model can call tools — `read_file`, `search_code`, `run_tests` in a sandbox (no network, resource limits) — to verify suspicions before commenting.
- Output: structured findings (file, line, severity, explanation, suggested fix) validated then posted as review comments; only high-confidence findings auto-posted.
- Evals: historical PRs with known bugs (from later fix commits) → precision/recall of findings; track developer reactions (resolved vs dismissed).
- Cost control: skip trivial PRs, cap files/tokens, cache repo context, batch low-priority reviews.

## Case 4 — "ChatGPT-like" chat service (platform design)

**Requirements**: millions of users, streaming responses, conversation history, file uploads, usage quotas.

**Design highlights**
- **Streaming** over SSE/WebSockets from an async API gateway (FastAPI/Netty) to the model provider's streaming API; backpressure; resumable streams for flaky mobile networks.
- **Conversation store**: messages table partitioned by user, recent conversations cached; titles/summaries generated asynchronously.
- **Context management**: send history within a token budget; summarise/compact old turns; prompt caching for system prompt.
- **Files**: upload to object storage → extract text/images → attach to context or index for retrieval.
- **Quotas & rate limits**: per-user token budgets tracked in Redis; tiered plans; graceful 429s.
- **Model routing**: per request by plan/complexity; fallbacks on provider errors or refusals.
- **Safety**: input/output moderation, abuse detection, reporting flows.
- **Observability**: TTFT, tokens/sec, error rates by model, cost per user.

## Common deep-dive questions & strong answers
| Question | Strong answer points |
|---|---|
| "How do you pick the model?" | Eval-driven: test 2–3 candidates on your eval set; compare quality, latency, cost per successful task; route by difficulty |
| "How do you reduce hallucinations?" | Grounding (RAG/tools), citations, permission to say "don't know", output validation, evals for faithfulness |
| "What if the model provider is down?" | Timeouts, retries, fallback model/provider, degraded mode, queue non-urgent work, status messaging |
| "How do you handle PII?" | Data minimisation, redaction before sending where required, regional processing, retention policies, access controls on logs |
| "How do you prevent abuse/cost attacks?" | Auth, per-user quotas, rate limits, max tokens, anomaly detection |
| "How do you improve over time?" | Feedback capture → triage → add to eval set → prompt/tool changes → regression-tested release |

## Quick check questions

<details><summary>Why estimate tokens and cost early in an AI design interview?</summary>

Cost and latency scale with tokens and often determine architecture (caching, routing, RAG vs long context, batch vs real-time). It shows production judgement.
</details>

<details><summary>Where should refund limits be enforced — prompt or backend?</summary>

Backend. Prompts guide behaviour; only code can guarantee invariants against bugs, ambiguity and prompt injection.
</details>

## Questions asked at top companies

<details><summary>Design a RAG-based Q&A system over company documents. <em>· Microsoft, Amazon, Salesforce, Atlassian</em></summary>

Cover ingestion & chunking, embeddings + hybrid search, permission filtering, reranking, prompt with citations, freshness, evals (retrieval + faithfulness), security (injection, ACLs), latency/cost, monitoring.
</details>

<details><summary>Design an AI customer-support agent. <em>· Amazon, Swiggy, Zomato, Flipkart</em></summary>

Intent routing, workflow vs agent paths, tools with server-side policy enforcement, human escalation, conversation memory, streaming, evals on historical tickets, rollout phases, cost estimate.
</details>

<details><summary>How do you design for LLM latency? <em>· Google, Uber</em></summary>

Stream output, minimise input tokens, prompt caching, parallelise tool/retrieval calls, choose effort/model per route, precompute (summaries, embeddings), async/background for long tasks, measure TTFT and total separately.
</details>

<details><summary>How would you A/B test a new prompt or model in production? <em>· Meta, Microsoft</em></summary>

Offline eval gate first; then randomised traffic split with guardrail metrics (errors, safety, cost) and outcome metrics (task success, CSAT, conversion); sufficient sample size; monitor for regressions by segment; ramp gradually.
</details>

<details><summary>Build vs buy: self-host open-weight models or use an API? <em>· Google, Walmart, startups</em></summary>

APIs: best capability, no infra, fast iteration, pay per token. Self-hosting: data control, predictable cost at very high steady volume, customisation; but GPU ops, scaling, lower capability for frontier tasks. Decide on capability needs, data constraints, volume and team skills — often hybrid.
</details>

## End-to-end scenarios

<details><summary>Scenario (full mock): "Design an AI assistant that helps restaurant owners on your platform answer 'why did my sales drop this week?'"</summary>

Requirements: read-only analytics, Hindi/English, answers within ~20 s, accurate numbers. Design: agent with tools over the analytics warehouse (pre-defined parameterised queries rather than free-form SQL — or SQL generation against a restricted read-only view with row-level security per restaurant), a metrics catalogue (definitions via RAG), and a charting tool. The model plans: compare this week vs last, break down by item/time/channel, check ratings and delivery delays, then explains with numbers and charts, citing the queries used. Evals: 100 historical drops with analyst-written explanations; numeric accuracy checked in code. Guardrails: tenant isolation in every query, query cost limits, caching common breakdowns. Cost: ~5–8 tool calls per question; cache schema and catalogue in the prompt prefix.
</details>

<details><summary>Scenario: Your RAG assistant's answers got worse after the documentation team reorganised Confluence. What happened and how would your design have caught it?</summary>

Likely chunk/URL changes broke references, permissions shifted, duplicate/stale pages flooded retrieval, or structure-aware chunking no longer matched new page layouts. A nightly eval run (retrieval recall@k on the fixed question set) would show a drop; monitoring "no answer" and thumbs-down rates would alert; incremental re-indexing with deletion of moved pages and dedup would fix it.
</details>
