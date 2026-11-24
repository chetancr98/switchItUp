---
title: AI Interview Question Bank & Portfolio Projects
level: 5
tags: ai interview, genai interview questions, portfolio, resume
---
<!-- deepened -->

## Start here: the basics

### How AI shows up in software engineering interviews (2025–26)
You don't need to be an ML researcher to get value from AI knowledge in interviews. It appears in four ways:
1. **Concept questions** in any backend/full-stack loop: "What is RAG?", "How does tool calling work?", "How would you evaluate an LLM feature?"
2. **AI system design** rounds at companies building GenAI products (see the previous module).
3. **Practical/take-home** tasks: build a small RAG app or agent in a few hours.
4. **Behavioral**: "Tell me about a time you used or shipped AI" — and how you use AI coding tools responsibly.

### What a strong candidate sounds like
- Explains mechanisms simply (tokens, attention, embeddings, the agent loop) without buzzwords.
- Talks about **evals, cost, latency and failure modes** unprompted.
- Knows when **not** to use an LLM (deterministic logic, strict correctness, tiny budgets).
- Has **built something** and can discuss trade-offs from experience.

Use this module as a rapid-fire revision deck the week before interviews.
<!-- -->

---

## Rapid-fire concept questions

<details><summary>1. What is a large language model? <em>· everywhere</em></summary>

A transformer neural network trained on massive text to predict the next token; fine-tuned with instruction and preference data to follow instructions. It generates text token by token, conditioned on the prompt.
</details>

<details><summary>2. What is the context window? <em>· Microsoft, Amazon</em></summary>

The maximum number of tokens (input + output) the model can attend to in one request. Larger windows allow more documents/history but cost more and can dilute attention; content beyond it must be summarised or retrieved.
</details>

<details><summary>3. Embeddings vs LLM generation? <em>· Google, Uber</em></summary>

Embedding models map text to vectors for similarity search/classification; generative LLMs produce text. RAG uses both: embeddings to find context, an LLM to answer.
</details>

<details><summary>4. What is RAG and why use it instead of fine-tuning for knowledge? <em>· everywhere</em></summary>

Retrieve relevant documents at query time and include them in the prompt. Knowledge stays fresh and permission-filtered, answers can cite sources, and updates don't require retraining; fine-tuning is better for behaviour/format than facts.
</details>

<details><summary>5. What is an agent? <em>· everywhere in 2025–26</em></summary>

An LLM running in a loop that chooses tools to call, observes results and iterates toward a goal, with the application executing tools and enforcing limits.
</details>

<details><summary>6. What is MCP? <em>· Microsoft, Atlassian, startups</em></summary>

Model Context Protocol: an open standard for connecting AI applications to tools, resources and prompts exposed by servers over stdio or HTTP, so integrations are reusable across clients.
</details>

<details><summary>7. How do you reduce hallucinations? <em>· everywhere</em></summary>

Ground in retrieved data/tools, cite sources, allow "I don't know", constrain output formats, validate claims in code where possible, evaluate faithfulness, human review for high stakes.
</details>

<details><summary>8. What's prompt injection? <em>· Microsoft, Google</em></summary>

Untrusted input containing instructions that hijack the model. Defend with least privilege, separation of untrusted data, human approval for side effects, monitoring — design so injections can't cause serious harm.
</details>

<details><summary>9. How do you evaluate an LLM application? <em>· everywhere</em></summary>

Representative dataset + success criteria + graders (code checks, calibrated LLM-as-judge, humans) → compare versions; track quality, latency, cost; production monitoring and feedback loops.
</details>

<details><summary>10. Temperature/top-p — and why might an API not expose them? <em>· Amazon, Google</em></summary>

They control sampling randomness. Some current APIs (including Claude's latest models) remove them, steering behaviour through prompting, structured outputs and reasoning-effort controls instead.
</details>

<details><summary>11. What is tokenization and why does it matter for cost? <em>· Microsoft, Infosys GenAI</em></summary>

Splitting text into model vocabulary units (BPE-style). Billing, limits and latency are per token; languages and code tokenize differently; count tokens with the provider's tool.
</details>

<details><summary>12. What is prompt caching? <em>· AI platform teams</em></summary>

Reusing processed computation for a repeated prompt prefix (system prompt, tools, documents) across requests, cutting cost and time-to-first-token; requires keeping the prefix byte-identical and placing volatile content after it.
</details>

<details><summary>13. Fine-tuning vs LoRA vs prompting? <em>· Google, Meta</em></summary>

Prompting changes inputs only; full fine-tuning updates all weights; LoRA trains small low-rank adapter matrices — far cheaper, swappable per task. Fine-tune when prompting/RAG can't achieve consistent behaviour or when distilling to a smaller model.
</details>

<details><summary>14. What are structured outputs? <em>· Uber, Razorpay</em></summary>

API features constraining the response to a JSON schema (or strict tool inputs), so applications can parse results reliably; still validate business rules.
</details>

<details><summary>15. Workflow vs agent? <em>· Atlassian, Anthropic-style</em></summary>

Workflow: code defines the steps (predictable, cheaper). Agent: model decides steps dynamically (flexible, costlier). Start simple; add autonomy only when needed.
</details>

<details><summary>16. How would you handle PII with LLM APIs? <em>· banks, fintech, healthcare</em></summary>

Minimise and redact before sending where required, check provider data retention and residency terms, restrict and encrypt logs, access controls, user consent, and audits.
</details>

<details><summary>17. What is a vector index (HNSW) and recall vs latency? <em>· infra-heavy roles</em></summary>

Approximate nearest-neighbour graph index; tuning parameters trade search breadth (recall) against latency and memory.
</details>

<details><summary>18. How do you choose between models? <em>· everywhere</em></summary>

Run candidates on your eval set; compare quality, latency, cost per successful task, context/modality needs, data constraints; route requests by difficulty.
</details>

<details><summary>19. What is LLM-as-a-judge? <em>· Google, Meta</em></summary>

Using a model to grade outputs against a rubric; useful for open-ended quality at scale, but must be calibrated against human labels and controlled for position/verbosity biases.
</details>

<details><summary>20. What is RLHF? <em>· Meta, Google</em></summary>

Reinforcement learning from human feedback: train a reward model on human preference comparisons and optimise the LLM toward preferred responses (variants use AI feedback or constitutions).
</details>

## Coding / practical questions (often live or take-home)
1. Implement cosine similarity and top-k retrieval with NumPy. *(Coding Q&A 8)*
2. Write a text chunker with overlap that respects paragraph boundaries. *(Coding Q&A 8)*
3. Implement softmax with temperature; sample a token. *(Coding Q&A 8)*
4. Write an agent loop with two tools and error handling. *(Agents module 2)*
5. Call an LLM API concurrently for 1 000 items with a concurrency limit and retries. *(Python module 3)*
6. Parse and validate LLM JSON output with Pydantic, retrying on validation failure.
7. Build a FastAPI endpoint that streams an LLM response.
8. Design the eval for a classification prompt and compute precision/recall.

## Behavioral questions about AI
<details><summary>"Tell me about a time you used AI to solve a problem at work."</summary>

STAR with numbers: what problem, why an LLM was appropriate (and what you considered instead), how you designed prompts/tools, how you evaluated it, the measured outcome (hours saved, accuracy), and what you learned (e.g., evals caught a regression).
</details>

<details><summary>"How do you use AI coding assistants, and how do you ensure quality?"</summary>

Use them for scaffolding, tests, refactors, exploring unfamiliar code; review every change like a teammate's PR; rely on tests, linters and code review; never paste secrets; understand the code you ship. Interviewers want productivity with accountability.
</details>

<details><summary>"An LLM feature you built failed in production — what happened?"</summary>

Pick a real issue (hallucinated values, cost spike, injection attempt, latency). Show detection (monitoring/evals), mitigation, root cause, and the systemic fix (new eval cases, guardrail, design change).
</details>

## Portfolio projects that impress (pick 2, ship them, put them on GitHub)
| Project | What it proves | Stretch goals |
|---|---|---|
| **RAG over your own notes/this app's markdown** | Chunking, embeddings, retrieval, citations, evals | Hybrid search, reranking, eval dashboard |
| **Support agent with tools** (like Agents module 2) on a fake order DB | Tool design, loop, guardrails, human approval | Streaming UI in React, tracing, cost tracking |
| **MCP server for a real API you use** (GitHub issues, a Spring Boot service) | Protocol knowledge, integration skills | Auth, tests, publish it |
| **LLM-powered code reviewer GitHub Action** | CI/CD + LLM + structured outputs | Eval on historical bugs |
| **Spring Boot + Python AI microservice** | Bridges your Java expertise with AI: Java service calls a Python FastAPI LLM service via REST/Kafka | Observability, Docker Compose, deployment |

Each README should show: architecture diagram, how to run, eval results table, cost per request, known limitations. That README *is* your interview talking point.

### How to put AI on your resume (Java full-stack → AI-capable engineer)
- "Built a RAG assistant over 2 000 internal runbooks (pgvector + Claude), achieving 87% answer accuracy on a 150-question eval set and cutting on-call lookup time by ~40%."
- "Designed tool-using support agent with server-side policy enforcement and human approval; reduced manual refund handling by 35% in pilot."
Numbers + evals + guardrails = credibility.

## End-to-end scenarios

<details><summary>Scenario: Take-home — "Build a CLI that answers questions about a folder of PDFs in 4 hours." What do you prioritise?</summary>

Working end-to-end path first (PDF text extraction → chunking → embeddings → top-k → LLM answer with citations), a small eval (10–20 questions with expected sources) and a results table, clear README with setup and trade-offs, error handling for empty/scanned PDFs, config via env vars, tests for chunking and retrieval. Note what you'd add with more time (hybrid search, reranking, caching).
</details>

<details><summary>Scenario: The interviewer asks "Would you use an LLM for this?" — calculating GST on invoices.</summary>

No for the calculation: it's deterministic arithmetic with legal rules — code is exact, cheap and auditable. An LLM could help extract fields from messy invoice PDFs (with validation), then code computes tax. Showing when not to use AI is a strong signal.
</details>
