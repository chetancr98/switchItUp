---
title: Agent Architecture — MCP, Memory, Context Management & Multi-Agent Systems
level: 4
tags: mcp, model context protocol, memory, multi-agent, context engineering
---
<!-- deepened -->

## Start here: the basics

### Model Context Protocol (MCP) in one paragraph
Every company wants its agents to use the same tools: GitHub, Jira, Slack, databases, internal APIs. Writing a custom integration per agent and per tool doesn't scale. **MCP** is an open standard (introduced by Anthropic, now widely adopted) that defines how an AI application talks to tool providers — like **USB-C for AI tools**. Build an MCP server once; any MCP-capable client (Claude apps, IDEs, your own agent) can use it.

```
MCP host / client                         MCP servers
(your agent, IDE, Claude Desktop)  ◄──►   github-server   (tools: create_issue, search_code)
                                   ◄──►   postgres-server (tools: query; resources: schema)
                                   ◄──►   your-orders-server (tools: get_order, issue_refund)
```

### Memory in one paragraph
LLMs are stateless — every request starts fresh. "Memory" is something **your application** builds:
- **Short-term**: the conversation history sent with each request (bounded by the context window).
- **Long-term**: facts saved outside the model (database, files, vector store) and loaded back into the prompt when relevant ("user prefers vegetarian", "project uses Java 21").

### Multi-agent in one paragraph
Instead of one agent doing everything, a **lead agent** splits a big task and delegates parts to **sub-agents** with focused instructions and their own fresh context, then combines their results. Useful for broad research or parallel work; costs more tokens and adds coordination complexity.
<!-- -->

---

## MCP in depth

### Concepts
| Primitive | Controlled by | Purpose | Example |
|---|---|---|---|
| **Tools** | Model (it decides to call) | Actions/functions | `create_ticket`, `run_query` |
| **Resources** | Application | Read-only context the app can attach | File contents, DB schema, docs |
| **Prompts** | User | Reusable prompt templates | "/summarise-pr" |

Transports: **stdio** (server runs as a local subprocess — common for desktop/IDE tools) and **streamable HTTP** (remote servers, with authentication via OAuth). Messages are JSON-RPC.

### Build a small MCP server in Python
```python
# orders_server.py      (pip install mcp)
from mcp.server.fastmcp import FastMCP

mcp = FastMCP("orders")

@mcp.tool()
def get_order(order_id: int) -> dict:
    """Look up an order by numeric id. Returns status, delivery times and amount in INR."""
    return ORDERS_DB.get(order_id) or {"error": f"order {order_id} not found"}

@mcp.resource("policy://refunds")
def refund_policy() -> str:
    """Current refund policy."""
    return POLICY_TEXT

if __name__ == "__main__":
    mcp.run()          # stdio transport by default
```
Any MCP client can now discover `get_order` and call it. Your Java team could equally expose an MCP server from Spring (Spring AI has MCP support), letting Python agents use Java services.

### Using MCP tools from your agent
Two options with the Claude API:
1. **Client-side**: your code connects to MCP servers (official MCP Python SDK), lists their tools, converts them to Claude tool definitions, and executes calls (the Anthropic Python SDK has MCP helpers for the tool runner).
2. **MCP connector**: pass remote MCP server URLs in the API request and the API connects to them for you (see the MCP connector docs link at the end).

### MCP security — treat servers like dependencies
- Only install trusted servers; review what tools they expose.
- Least privilege: read-only DB users, scoped tokens.
- Tool descriptions and outputs can carry **prompt injection** ("tool poisoning") — don't auto-approve side-effecting tools from third-party servers.
- Remote servers need proper auth (OAuth) and TLS; log all calls.

## Memory and context engineering

### The context window is your agent's working memory
Everything the model "knows" during a turn is in the prompt: system prompt, tool definitions, history, tool results. **Context engineering** = deciding what goes in, so the model has what it needs and nothing that distracts.

| Technique | What it does |
|---|---|
| Concise tool results | Return summaries/IDs, not entire documents; let the agent fetch details on demand |
| **Context editing** | Clear old tool results the model no longer needs |
| **Compaction / summarisation** | Replace old turns with a summary when the context grows large (server-side compaction is available on the Claude API) |
| Sub-agents | Delegate reading-heavy work; only the sub-agent's concise result returns to the lead's context |
| Just-in-time retrieval | Keep references (file paths, ids); load content when needed |
| Prompt caching | Keeps stable prefix cheap; order content as stable → volatile |

### Long-term memory designs
| Type | Store | Example |
|---|---|---|
| Profile / preferences | Key-value / relational | "Language: Hindi; dietary: vegetarian" |
| Episodic | Log of past interactions + vector search | "Last month the user complained about late delivery" |
| Semantic knowledge | Vector store / knowledge graph | Facts extracted over time |
| Procedural | Instructions/skills files | "How to deploy service X" |
| File-based memory tool | A directory the agent reads/writes via a memory tool | Notes the agent keeps across sessions |

Design questions: what to remember (and what never to store — secrets, sensitive PII), when to write (end of session, explicit "remember this"), how to retrieve (recency + relevance), how to expire or correct stale memories, and user controls (view/delete).

## Multi-agent systems

### Patterns
| Pattern | Shape | Use |
|---|---|---|
| **Orchestrator–workers** | Lead plans, spawns sub-agents in parallel, synthesises | Broad research, analysing many files/documents |
| **Pipeline / handoff** | Agent A → agent B → agent C with defined interfaces | Triage → specialist → QA |
| **Evaluator–optimizer** | Generator + critic loop | Writing/code to a quality bar |
| **Router** | Classifier dispatches to specialised agents | Support desks with distinct domains |

### Trade-offs to state in interviews
✅ Parallelism (faster wall-clock on broad tasks), separation of concerns, smaller focused contexts.
❌ Many times the tokens of a single agent, harder debugging, error propagation between agents, coordination overhead. Use only when the task genuinely decomposes into independent parts; a single agent with good tools beats a badly coordinated swarm.

### Making sub-agents work
Give each sub-agent a clear objective, the output format you need back, tool access limited to its job, and boundaries (time/turn budget). Ask for concise results with sources. Have the lead verify or reconcile conflicting findings.

### Build vs buy: frameworks and platforms
- **Raw API + your loop** — maximum control, minimum magic.
- **Agent frameworks** (LangGraph, LlamaIndex, Spring AI for Java, others) — graphs/state machines, integrations.
- **Claude Agent SDK** — the Claude Code agent harness (built-in file, shell and search tools, sub-agents, hooks) as a library you host.
- **Managed agent platforms** (e.g., Claude Managed Agents) — the provider runs the loop and a sandboxed workspace; you configure agents and sessions.
Choose by how much infrastructure you want to own and how custom your control flow is.

## Quick check questions

<details><summary>Tools vs resources in MCP?</summary>

Tools are actions the model chooses to invoke (may have side effects); resources are read-only data the application can attach as context.
</details>

<details><summary>Why can sub-agents reduce context problems for the lead agent?</summary>

Each sub-agent reads lots of material in its own context and returns only a condensed result, so the lead's context stays small and focused.
</details>

## Questions asked at top companies

<details><summary>What is MCP and why does it matter? <em>· Microsoft, Atlassian, Salesforce, AI startups (very common in 2025–26)</em></summary>

An open protocol standardising how AI applications discover and call tools, read resources and use prompts from external servers over stdio or HTTP with JSON-RPC. It turns N×M custom integrations into N+M, letting any MCP client use any MCP server.
</details>

<details><summary>How would you give an agent long-term memory? <em>· Google, Meta, startups</em></summary>

Store structured preferences and extracted facts in a database/vector store with metadata; write at defined moments; retrieve relevant memories by recency and similarity into the prompt; allow correction/deletion; exclude secrets/sensitive data; evaluate whether memory improves outcomes.
</details>

<details><summary>How do you handle conversations longer than the context window? <em>· Microsoft, Uber</em></summary>

Summarise/compact older turns, clear stale tool results, keep references instead of full content, retrieve relevant past content on demand, use sub-agents for heavy reading, and keep the critical instructions in the stable system prompt.
</details>

<details><summary>When would you use multiple agents instead of one? <em>· Atlassian, Google</em></summary>

When the task decomposes into independent parallel parts, needs very different tool sets or expertise, or would overflow one context. Otherwise a single agent is cheaper, easier to debug and often better.
</details>

<details><summary>What are the security risks of MCP servers? <em>· Microsoft, security teams</em></summary>

Malicious or compromised servers, tool poisoning via descriptions/outputs, over-privileged credentials, data exfiltration through tool arguments, lack of auth on remote servers. Mitigate with vetting, least privilege, approval for side effects, sandboxing, auditing.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your company wants agents in Slack, the IDE and the support console to use the same internal "customer data" tools. Design it.</summary>

Build one MCP server (or a few by domain) in front of internal APIs with OAuth-based auth, per-user permission checks, read-only tools by default and approval-gated write tools; deploy as a remote streamable-HTTP service; each client connects to it; central audit logging and rate limiting; versioned tool schemas; evals verifying tool selection in each client.
</details>

<details><summary>Scenario: Build a "competitive research" feature that reads 40 competitor websites and produces a comparison table.</summary>

Orchestrator agent plans categories and spawns sub-agents (each with web fetch/search tools, a fixed output schema, a turn budget) per batch of sites in parallel; sub-agents return structured findings with source URLs; the lead merges, resolves conflicts, flags low-confidence cells; cache fetched pages; cost cap per run; human review before publishing.
</details>
