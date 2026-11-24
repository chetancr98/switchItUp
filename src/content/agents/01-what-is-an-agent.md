---
title: What Is an AI Agent? Workflows vs Agents, Tools and the Agent Loop
level: 3
tags: agents, tool use, workflows, react pattern
---
<!-- deepened -->

## Start here: the basics

### From chatbot to agent
- A **chatbot** answers from what it already knows: question in, text out.
- An **LLM with tools** can call functions you provide — look up an order, search the web, run code — and use the results.
- An **agent** is an LLM that **decides for itself**, in a loop, which tools to call and when it's done, to accomplish a goal.

```
Goal: "Refund order 8842 if it was delivered late, and tell the customer."

  ┌──────────────────────────────── the agent loop ────────────────────────────────┐
  │ model: "I need the order details"        → calls get_order(8842)               │
  │ code runs the tool, returns {delivered_at, promised_at, amount}                 │
  │ model: "It was 40 min late; policy allows refund" → calls issue_refund(8842)    │
  │ code runs it (after checks), returns {refund_id}                                │
  │ model: "Done — drafting the message"     → final answer, loop ends             │
  └─────────────────────────────────────────────────────────────────────────────────┘
```
**The model never executes anything itself.** It asks; *your code* runs the tool and sends back the result. That's why you control safety.

**Try it**: AI Lab → *Agent loop simulator* — step through the exact messages exchanged.

### The four ingredients
1. **Model** — the reasoning engine (an LLM with tool-use ability).
2. **Tools** — functions with a name, description and input schema (JSON Schema).
3. **Loop** — call model → run requested tools → feed results back → repeat until done.
4. **Context** — instructions (system prompt), conversation so far, tool results, memory.

### Workflows vs agents (a distinction interviewers love)
| | Workflow | Agent |
|---|---|---|
| Who decides the steps? | **Your code** (predefined path) | **The model** (dynamic) |
| Predictability | High | Lower |
| Cost/latency | Lower, bounded | Higher, variable |
| Best for | Well-defined tasks | Open-ended tasks where steps can't be known in advance |

Anthropic's guidance (*Building effective agents*, linked at the end): **start with the simplest thing that works** — often a single well-prompted call or a fixed workflow — and only add agentic autonomy when the task needs it.
<!-- -->

---

## Deep dive

### Workflow patterns (code-orchestrated)
| Pattern | How | Example |
|---|---|---|
| **Prompt chaining** | Output of step 1 feeds step 2; gates between steps | Generate outline → check it → write the article |
| **Routing** | Classify input, send to a specialised prompt/model | Billing vs technical vs refund queries; easy → fast model, hard → strongest model |
| **Parallelisation** | Run independent calls concurrently (sectioning) or the same task several times and vote | Review code for security, performance and style in parallel |
| **Orchestrator–workers** | A model breaks a task into subtasks dynamically and delegates them, then combines | Multi-file code change; research across sources |
| **Evaluator–optimizer** | One call generates, another critiques against criteria, loop until good | Translation polishing, writing to a rubric |

### Agents: the autonomous loop
```
while not done and turns < limit:
    response = model(messages, tools)
    if response wants tools:
        results = [run(tool_call) for tool_call in response.tool_calls]   # validated, permissioned
        messages += [response, results]
    else:
        done = True
```
Patterns you'll hear: **ReAct** (reason → act → observe, interleaved), **plan-and-execute** (make a plan, then execute steps, re-plan on failure), **reflection** (critique own output before finishing).

### Tool design is agent design
The model only knows your tools through their **name, description and schema**. Treat tool definitions like an API for a new colleague:
- Clear names (`search_orders`, not `tool1`), detailed descriptions: what it does, when to use it, what it returns, limitations.
- Simple, explicit parameters with types, enums and examples; return concise, relevant data (not 5 000-line dumps).
- Return **helpful errors** ("order 88X2 not found — order ids are numeric") so the model can recover.
- Prefer a few powerful, well-scoped tools over dozens of overlapping ones.
- Make side-effecting tools **idempotent** and **permission-checked**.

```json
{
  "name": "get_order",
  "description": "Look up a customer order by its numeric id. Returns status, promised and actual delivery times (ISO 8601), amount in INR, and payment status. Use this before making any decision about refunds.",
  "input_schema": {
    "type": "object",
    "properties": { "order_id": { "type": "integer", "description": "Numeric order id, e.g. 8842" } },
    "required": ["order_id"]
  }
}
```

### Kinds of tools
- **Client tools**: your functions, run by your code (DB lookups, internal APIs, sending email).
- **Server tools**: run by the model provider (e.g., web search, web fetch, code execution on Anthropic's infrastructure) — no handler code needed.
- **MCP tools**: exposed by MCP servers, a standard way to plug tools into many agents (next modules).

### Where agents shine — and where they don't
Good fits: research and synthesis across sources, coding tasks with tests to verify, data analysis, operations runbooks with clear tools, customer support with bounded actions.
Poor fits: tasks with a fixed known procedure (use a workflow), high-stakes irreversible actions without human review, problems where errors can't be detected.

Ask four questions before building an agent: Is the task complex and hard to specify step by step? Is the value worth higher cost/latency? Can the model actually do it? Can errors be caught and recovered (tests, review, rollback)? If any answer is no, use a simpler design.

### Common failure modes
Looping or giving up early, calling wrong tools due to vague descriptions, hallucinating tool arguments, losing track in long contexts, over-confident final answers, cost blow-ups, and prompt injection from tool outputs (a web page telling the agent to email data elsewhere). Production safeguards are in *Production agents*.

## Quick check questions

<details><summary>Who executes a tool call: the model or your application?</summary>

Your application (for client tools). The model returns a structured request; your code validates, executes and returns the result. Server tools are executed by the provider.
</details>

<details><summary>A task always follows the same 3 steps. Agent or workflow?</summary>

Workflow — the path is known, so code should control it: cheaper, faster, more predictable and easier to test.
</details>

## Questions asked at top companies

<details><summary>What is an AI agent and how is it different from a chatbot or a RAG app? <em>· Microsoft, Salesforce, Atlassian, AI startups</em></summary>

An agent uses an LLM in a loop to decide which actions (tool calls) to take toward a goal, observing results until done. A chatbot only generates replies; a RAG app retrieves context then generates in a fixed pipeline. Agents have autonomy over the sequence of steps.
</details>

<details><summary>Explain how function/tool calling works. <em>· Amazon, Google, Microsoft</em></summary>

You send tool definitions (name, description, JSON schema). The model responds with a structured tool-use request (name + arguments) and a stop reason indicating it wants a tool. Your code runs it and returns a tool result referencing the call id; the model continues with that information.
</details>

<details><summary>When would you choose a workflow over an autonomous agent? <em>· Atlassian, Uber, AI startups</em></summary>

When steps are predictable, latency/cost must be bounded, auditability matters, or errors are costly — code-controlled chains/routing are simpler and more reliable. Use agents for open-ended tasks needing dynamic decisions.
</details>

<details><summary>What is the ReAct pattern? <em>· Google, Meta</em></summary>

Interleaving reasoning and acting: the model reasons about what to do, takes an action (tool), observes the result, and repeats — grounding reasoning in real observations rather than one-shot planning.
</details>

<details><summary>How do you write good tool descriptions? <em>· Anthropic-style, Microsoft</em></summary>

Explain purpose, when to use (and not use), parameter meanings with formats and examples, what's returned, side effects and limits; keep schemas tight (enums, required fields); return actionable errors; test with evals of tool selection.
</details>

<details><summary>What are the risks of giving an agent tools? <em>· Google, Microsoft security teams</em></summary>

Unintended actions, prompt injection via tool outputs or documents, data exfiltration, runaway loops and cost, privilege escalation. Mitigate with least privilege, allow-lists, sandboxing, approvals for side effects, budgets, monitoring and audit logs.
</details>

## End-to-end scenarios

<details><summary>Scenario: Product wants an agent that "handles all customer refunds automatically". How do you push back and design it?</summary>

Clarify scope and risk: auto-handle only refunds under a threshold with clear policy matches; tools: get_order, get_policy, issue_refund (server-side policy enforcement, idempotency key, amount cap), escalate_to_human. Workflow-first: deterministic eligibility check in code; LLM drafts customer message and handles ambiguous cases by escalating. Human approval above threshold. Evals on historical refund cases, audit logs, gradual rollout, kill switch.
</details>

<details><summary>Scenario: Design an internal "on-call assistant" agent that helps engineers investigate alerts.</summary>

Read-only tools first: query metrics (Prometheus), search logs, get recent deploys, read runbooks (RAG), get service ownership. Loop: the agent gathers evidence and proposes hypotheses with links; any write action (rollback, scale) requires explicit human confirmation through the chat UI. Guardrails: time/turn budget, tool timeouts, redact secrets from logs before sending to the model, trace every step for review. Evaluate on past incidents with known root causes.
</details>
