---
title: Embeddings, Vector Search & RAG — Retrieval-Augmented Generation End to End
level: 3
tags: embeddings, vector database, rag, chunking, reranking, pgvector
---
<!-- deepened -->

## Start here: the basics

### The problem RAG solves
An LLM knows only what was in its training data (with a cutoff date) and nothing about your company's private documents. You can't paste 10 000 documents into every prompt. **Retrieval-Augmented Generation (RAG)**:

```
1. Retrieve: find the few passages most relevant to the question
2. Augment:  put them into the prompt as context
3. Generate: the LLM answers using that context (and cites it)
```
**Try it**: AI Lab → *Mini RAG retrieval* runs this pipeline on a tiny document set.

### Embeddings — meaning as numbers
An **embedding model** converts text into a vector (e.g., 1 024 numbers). Texts with similar meaning get vectors pointing in similar directions:

```
"How do I reset my password?"     → [0.12, -0.80, 0.33, ...]
"I forgot my login credentials"    → [0.10, -0.77, 0.35, ...]   ← close (similar meaning)
"Best pizza in Pune"               → [-0.61, 0.20, -0.05, ...]  ← far
```
Similarity is usually **cosine similarity** (angle between vectors; 1 = same direction). Keyword search would miss the first pair (no shared words); embeddings catch it.

Embedding models are separate from chat models. For example, Anthropic doesn't offer its own embedding model — its docs point to providers such as Voyage AI; other options include open-source models (e.g., via sentence-transformers) and other cloud APIs.

### Vector search
Store each chunk's embedding. At query time, embed the question and find the nearest vectors. Small scale: a NumPy matrix product (see Python → NumPy). Large scale: an index built for **approximate nearest neighbour (ANN)** search — pgvector in PostgreSQL, OpenSearch/Elasticsearch, or dedicated vector databases.
<!-- -->

---

## Deep dive

### The full RAG pipeline
```
INDEXING (offline / on document change)
  documents ─► parse (PDF/HTML/Markdown, tables) ─► clean ─► chunk ─► embed ─► store (vector + text + metadata)

QUERY (online, per question)
  question ─► (rewrite/expand) ─► embed ─► retrieve top-k (vector + keyword hybrid)
          ─► rerank ─► select within token budget ─► prompt with citations ─► LLM ─► answer + sources
```

### Chunking — the most underrated decision
| Strategy | How | Notes |
|---|---|---|
| Fixed size | e.g., 500 tokens with 50–100 overlap | Simple baseline |
| Structure-aware | Split on headings, paragraphs, code blocks, table rows | Keeps meaning together — usually better |
| Semantic | Split where topic shifts (embedding distance) | More work |
| Parent–child | Retrieve small chunks, send their larger parent section | Precise retrieval + enough context |
| Contextual | Prepend a short summary of the document/section to each chunk before embedding | Helps chunks that are ambiguous alone ("It increased by 5%") |

Too small → chunks lose context; too large → diluted embeddings and wasted tokens. **Measure** with your eval set.

Always store **metadata** (source, title, section, date, access permissions, product version) for filtering and citations.

### Hybrid search and reranking
- **Keyword (BM25)** is great for exact terms: error codes, product names, IDs.
- **Vector** search is great for meaning/paraphrase.
- **Hybrid**: run both and merge (e.g., reciprocal rank fusion).
- **Reranker**: a cross-encoder model scores (query, chunk) pairs more accurately than embedding similarity; retrieve 50 candidates cheaply, rerank to the best 5.

### Indexes for approximate nearest neighbour
| Index | Idea | Trade-off |
|---|---|---|
| Flat (exact) | Compare with every vector | Exact, O(n) — fine up to ~100k–1M with NumPy/GPU |
| **HNSW** | Multi-layer graph of neighbours | Fast, high recall, more memory; the common default |
| IVF | Cluster vectors, search nearest clusters only | Less memory; tune clusters probed |
| PQ (quantisation) | Compress vectors | Big memory savings, some accuracy loss |

```sql
-- pgvector example
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE chunks (id bigserial PRIMARY KEY, doc_id text, content text, embedding vector(1024));
CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM chunks WHERE doc_id = ANY($2) ORDER BY embedding <=> $1 LIMIT 5;   -- <=> = cosine distance
```
For a Java/Spring team, **pgvector** is often the easiest start: one database, transactions, metadata filters in SQL.

### A minimal RAG implementation (Python)
```python
import numpy as np
import anthropic

client = anthropic.Anthropic()

def embed(texts: list[str]) -> np.ndarray:
    """Call your embedding provider here; return an (n, d) array of L2-normalised vectors."""
    raise NotImplementedError

chunks: list[dict] = load_chunks()                  # [{"id": "kb-12#3", "text": "...", "source": "..."}]
E = embed([c["text"] for c in chunks])              # computed once at indexing time

def answer(question: str, k: int = 5) -> str:
    q = embed([question])[0]
    top = np.argsort(-(E @ q))[:k]
    context = "\n".join(f'<doc id="{chunks[i]["id"]}">{chunks[i]["text"]}</doc>' for i in top)
    resp = client.messages.create(
        model="claude-opus-5-5",
        max_tokens=2048,
        system="Answer using only the documents provided. Cite document ids in [brackets]. "
               "If the documents don't contain the answer, say you don't know.",
        messages=[{"role": "user", "content": f"<documents>\n{context}\n</documents>\n\nQuestion: {question}"}],
    )
    return next(b.text for b in resp.content if b.type == "text")
```

### When to use long context instead of RAG
With 1M-token context windows and prompt caching, small knowledge bases (a few hundred pages) can be sent whole. RAG still wins when data is large, changes frequently, needs per-user permission filtering, or cost/latency per question matters. Many systems combine: retrieve generously, rely on the model to use the relevant parts.

### Agentic RAG
Instead of one fixed retrieval, give the model a `search` tool: it decides what to search, reads results, refines queries and searches again (multi-hop questions: "Which of our customers on the legacy plan had outages last quarter?"). More flexible, more expensive — see the Agents track.

### Evaluating RAG — separate retrieval from generation
| Layer | Metric | How |
|---|---|---|
| Retrieval | Recall@k, MRR, nDCG | Labelled question → relevant chunk ids |
| Generation | Faithfulness / groundedness | Is every claim supported by retrieved context? (LLM-as-judge with a rubric + spot checks) |
| Generation | Answer correctness / completeness | Compare with reference answers |
| System | Latency, cost per query, "I don't know" rate | Logs |

**Most bad answers are retrieval failures.** Log retrieved chunk ids for every answer so you can debug.

### Security and access control
- Filter retrieval by the **user's permissions** (metadata filters) — RAG must never leak a document the user can't open.
- Retrieved text is **untrusted input**: a document can contain prompt-injection instructions ("ignore previous instructions…"). Wrap documents in clear delimiters, instruct the model to treat them as data, and never let retrieved text trigger privileged tools without checks.
- PII handling and data residency for embeddings and logs.

### Keeping the index fresh
Re-embed on document change (CDC/events from your CMS or database — Microservices → Data patterns), version chunks, delete stale ones, and re-embed everything if you switch embedding models (vectors from different models aren't comparable).

## Quick check questions

<details><summary>Why can't you compare embeddings produced by two different embedding models?</summary>

Each model defines its own vector space (dimensions mean different things). Similarities across spaces are meaningless; switching models requires re-embedding the whole corpus.
</details>

<details><summary>A user searches for "ERR_4012" and RAG returns nothing relevant. Why, and what helps?</summary>

Embeddings capture meaning poorly for exact rare identifiers. Add keyword/BM25 search (hybrid retrieval) and metadata fields for codes.
</details>

## Questions asked at top companies

<details><summary>Explain how RAG works end to end. <em>· Microsoft, Amazon, Salesforce, every GenAI team</em></summary>

Indexing: parse, chunk, embed, store with metadata. Query: embed question, retrieve top-k (hybrid), rerank, assemble prompt with delimiters and citations, generate, return sources. Evaluate retrieval and faithfulness separately; secure with permission filters and injection defences.
</details>

<details><summary>How do you choose chunk size? <em>· Atlassian, Uber, AI startups</em></summary>

Start with structure-aware chunks of a few hundred tokens with overlap; tune using retrieval recall on an eval set; consider parent-child retrieval and contextual chunk headers; adjust for document type (code, tables, FAQs differ).
</details>

<details><summary>What is a vector database and do you always need one? <em>· Microsoft, Walmart, Flipkart</em></summary>

A store optimised for nearest-neighbour search over embeddings with ANN indexes, filtering and persistence. Not always: small corpora work with in-memory NumPy; many teams use pgvector/OpenSearch in existing infrastructure before adopting a dedicated vector DB.
</details>

<details><summary>Cosine similarity vs dot product vs Euclidean distance? <em>· Google, Amazon</em></summary>

Cosine measures angle (ignores length); dot product includes magnitude; Euclidean measures straight-line distance. For L2-normalised vectors, cosine = dot product and rankings by Euclidean distance are identical.
</details>

<details><summary>How do you evaluate a RAG system? <em>· Microsoft, Salesforce, AI startups</em></summary>

Labelled question set; retrieval metrics (recall@k, MRR); generation metrics (faithfulness, correctness, completeness) via rubric-based LLM judging calibrated with human labels; latency/cost; regression-test on every change to chunking, prompts, models.
</details>

<details><summary>What is HNSW? <em>· Google, Uber (infra-leaning roles)</em></summary>

Hierarchical Navigable Small World graph: vectors are nodes linked to near neighbours across layers of decreasing density; search greedily descends from sparse upper layers to dense lower ones, giving fast approximate nearest-neighbour queries with tunable recall/speed.
</details>

<details><summary>How do you prevent prompt injection through retrieved documents? <em>· Microsoft, Google (security-aware teams)</em></summary>

Treat retrieved text as untrusted data: delimit it, instruct the model accordingly, don't grant high-privilege tools based on document content, require confirmation for side effects, filter/scan ingested content, and test with adversarial documents in evals.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design an internal "Ask Engineering Docs" assistant over Confluence, GitHub READMEs and runbooks for 5 000 employees.</summary>

Connectors ingest docs with ACLs → parse → structure-aware chunking with contextual headers → embeddings + BM25 in OpenSearch or pgvector, metadata (space, team, updated_at, permissions). Query: permission-filtered hybrid retrieval → rerank → Claude answers with citations and "I don't know" allowed. Freshness via webhooks/CDC re-indexing. Eval set of 200 real questions from Slack history with reference answers; dashboards for retrieval recall, faithfulness, thumbs-down rate. Security: SSO, per-user filtering, injection-hardened prompts, audit logs.
</details>

<details><summary>Scenario: Users say the assistant "misses" answers that exist in the docs. Debug systematically.</summary>

For failing questions, inspect retrieved chunks: was the right chunk retrieved? If not → retrieval issue (chunk boundaries splitting the answer, poor embeddings for jargon, missing keyword search, wrong metadata filter, stale index). If retrieved but answer wrong → prompt/generation issue (too many distracting chunks, instructions unclear, context truncated). Fix the layer at fault, add those questions to the eval set, re-measure.
</details>
