---
title: Coding Q&A 8 — Python & AI Coding Problems (12 problems with solutions)
level: 3
minutes: 240
tags: coding, python, ai, numpy, rag, agents, practice
---
<!-- deepened -->

## How to use this module
These are the practical problems that show up in AI-engineer screens and take-homes. Solve each in a Colab notebook or local Python before expanding the solution. They need only the standard library and NumPy (problem 12 uses the Anthropic SDK).

---

### 1. Cosine similarity and top-k retrieval · AI startups, Microsoft, Uber
Given a query vector and an `(n, d)` matrix of document vectors, return the indices of the k most similar documents.
<details><summary>Solution</summary>

```python
import numpy as np

def top_k_cosine(query: np.ndarray, docs: np.ndarray, k: int) -> list[int]:
    docs_n = docs / np.linalg.norm(docs, axis=1, keepdims=True)
    q_n = query / np.linalg.norm(query)
    sims = docs_n @ q_n
    k = min(k, len(sims))
    idx = np.argpartition(-sims, k - 1)[:k]          # O(n) selection of the top k
    return idx[np.argsort(-sims[idx])].tolist()      # sort just those k
```
O(n·d). Discuss: pre-normalise at index time; ANN indexes for millions of vectors; zero-vector handling.
</details>

### 2. Softmax with temperature and sampling · Google, Meta
<details><summary>Solution</summary>

```python
import numpy as np

def softmax(logits: np.ndarray, temperature: float = 1.0) -> np.ndarray:
    if temperature <= 0:
        out = np.zeros_like(logits, dtype=float); out[np.argmax(logits)] = 1.0
        return out
    z = logits / temperature
    z = z - z.max()                       # numerical stability
    e = np.exp(z)
    return e / e.sum()

def sample(logits, temperature=1.0, top_p=1.0, rng=np.random.default_rng()):
    p = softmax(np.asarray(logits, dtype=float), temperature)
    order = np.argsort(-p)
    cum = np.cumsum(p[order])
    keep = order[: np.searchsorted(cum, top_p) + 1]   # nucleus
    q = p[keep] / p[keep].sum()
    return int(rng.choice(keep, p=q))
```
</details>

### 3. Text chunker with overlap that respects paragraphs · Atlassian, AI startups
Split text into chunks of at most `max_words`, with `overlap` words carried between chunks, never splitting a paragraph unless the paragraph alone is too long.
<details><summary>Solution</summary>

```python
def chunk_text(text: str, max_words: int = 200, overlap: int = 30) -> list[str]:
    paras = [p.split() for p in text.split("\n\n") if p.strip()]
    chunks, cur = [], []
    for words in paras:
        while len(words) > max_words:                 # oversized paragraph: hard split
            if cur:
                chunks.append(" ".join(cur)); cur = cur[-overlap:]
            take = max_words - len(cur)
            cur += words[:take]; words = words[take:]
            chunks.append(" ".join(cur)); cur = cur[-overlap:]
        if len(cur) + len(words) > max_words and cur:
            chunks.append(" ".join(cur)); cur = cur[-overlap:]
        cur += words
    if cur:
        chunks.append(" ".join(cur))
    return chunks
```
Discuss: tokens vs words (use the model's token counter in production), headings as chunk boundaries, metadata per chunk.
</details>

### 4. Train a tiny BPE tokenizer · Google, research-adjacent roles
<details><summary>Solution</summary>

```python
from collections import Counter

def train_bpe(corpus: list[str], num_merges: int):
    words = Counter(tuple(w) + ("</w>",) for line in corpus for w in line.split())
    merges = []
    for _ in range(num_merges):
        pairs = Counter()
        for w, freq in words.items():
            for a, b in zip(w, w[1:]):
                pairs[(a, b)] += freq
        if not pairs:
            break
        (a, b), count = pairs.most_common(1)[0]
        if count < 2:
            break
        merges.append((a, b))
        new_words = Counter()
        for w, freq in words.items():
            out, i = [], 0
            while i < len(w):
                if i < len(w) - 1 and (w[i], w[i + 1]) == (a, b):
                    out.append(a + b); i += 2
                else:
                    out.append(w[i]); i += 1
            new_words[tuple(out)] += freq
        words = new_words
    return merges
```
See it animated in AI Lab → *Train a tokenizer*.
</details>

### 5. Causal self-attention in NumPy · Google, Microsoft (ML-leaning)
<details><summary>Solution</summary>

See AI → Transformers module (`causal_self_attention`). Key points to say aloud: Q/K/V projections, scaled dot product by √d_k, causal mask with −inf above the diagonal, row-wise softmax, weighted sum of V; shapes `(T, d) → (T, T) → (T, d_v)`.
</details>

### 6. Precision, recall, F1 from predictions · Amazon, PhonePe
<details><summary>Solution</summary>

```python
def prf1(y_true: list[int], y_pred: list[int], positive: int = 1) -> tuple[float, float, float]:
    tp = sum(t == positive and p == positive for t, p in zip(y_true, y_pred))
    fp = sum(t != positive and p == positive for t, p in zip(y_true, y_pred))
    fn = sum(t == positive and p != positive for t, p in zip(y_true, y_pred))
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return precision, recall, f1
```
</details>

### 7. Rate-limited concurrent API calls with retries · Uber, Swiggy, AI startups
Call `fetch(item)` (async) for 1 000 items with at most 10 in flight, retrying transient failures with exponential backoff and jitter.
<details><summary>Solution</summary>

```python
import asyncio, random

class TransientError(Exception): ...

async def with_retries(fn, *args, attempts=5, base=0.5):
    for i in range(attempts):
        try:
            return await fn(*args)
        except TransientError:
            if i == attempts - 1:
                raise
            await asyncio.sleep(random.uniform(0, base * 2 ** i))   # full jitter

async def process_all(items, fetch, limit=10):
    sem = asyncio.Semaphore(limit)
    async def one(item):
        async with sem:
            return await with_retries(fetch, item)
    return await asyncio.gather(*(one(i) for i in items), return_exceptions=True)
```
`return_exceptions=True` keeps one failure from cancelling everything; report failures separately.
</details>

### 8. Validate LLM JSON output and retry with feedback · Razorpay, Atlassian
<details><summary>Solution</summary>

```python
from pydantic import BaseModel, ValidationError

class Extraction(BaseModel):
    name: str
    amount_inr: int
    due_date: str

def extract(text: str, call_llm, max_attempts: int = 3) -> Extraction:
    prompt = f"Extract name, amount_inr (integer), due_date (YYYY-MM-DD) as JSON.\n<text>{text}</text>"
    for _ in range(max_attempts):
        raw = call_llm(prompt)
        try:
            return Extraction.model_validate_json(raw)
        except ValidationError as e:
            prompt += f"\n\nYour previous output was invalid: {e.errors()}. Return only valid JSON."
    raise ValueError("Could not extract valid data")
```
Better in production: use the API's structured outputs (schema-constrained) so retries are rarely needed — but keep validation for business rules.
</details>

### 9. In-memory semantic cache for LLM responses · Swiggy, Flipkart
Return a cached answer when a new question is very similar (cosine ≥ threshold) to a previous one.
<details><summary>Solution</summary>

```python
import numpy as np

class SemanticCache:
    def __init__(self, embed, threshold: float = 0.95, max_items: int = 10_000):
        self.embed, self.threshold, self.max_items = embed, threshold, max_items
        self.vecs: list[np.ndarray] = []; self.answers: list[str] = []

    def get(self, question: str) -> str | None:
        if not self.vecs:
            return None
        q = self.embed(question); q = q / np.linalg.norm(q)
        sims = np.stack(self.vecs) @ q
        i = int(np.argmax(sims))
        return self.answers[i] if sims[i] >= self.threshold else None

    def put(self, question: str, answer: str) -> None:
        v = self.embed(question); self.vecs.append(v / np.linalg.norm(v)); self.answers.append(answer)
        if len(self.vecs) > self.max_items:
            self.vecs.pop(0); self.answers.pop(0)
```
Discuss risks: near-identical questions with different meaning ("cancel" vs "don't cancel"), per-user data leakage (scope caches by tenant/user), staleness (TTL).
</details>

### 10. Simple agent loop with a fake model (no API key needed) · interview whiteboard favourite
<details><summary>Solution</summary>

```python
def run_agent(model, tools: dict, user_msg: str, max_turns: int = 5) -> str:
    """model(messages) returns {'tool': name, 'args': {...}} or {'answer': text}."""
    messages = [{"role": "user", "content": user_msg}]
    for _ in range(max_turns):
        step = model(messages)
        if "answer" in step:
            return step["answer"]
        name, args = step["tool"], step["args"]
        try:
            result, is_error = tools[name](**args), False
        except Exception as e:
            result, is_error = f"Error: {e}", True
        messages.append({"role": "assistant", "content": step})
        messages.append({"role": "tool", "content": {"tool": name, "result": result, "is_error": is_error}})
    return "Stopped: turn limit reached"
```
Test it with a scripted fake model — then swap in the real Claude API loop from Agents module 2.
</details>

### 11. Deduplicate near-duplicate documents before indexing · Google, Walmart
<details><summary>Solution</summary>

Exact duplicates: hash normalised text (`hashlib.sha256(" ".join(t.lower().split()).encode())`). Near duplicates: shingles (word 5-grams) + Jaccard similarity; at scale MinHash + LSH buckets so only candidates in the same bucket are compared (O(n) instead of O(n²)). Or embeddings + cosine threshold within ANN neighbourhoods.
</details>

### 12. Minimal streaming chat endpoint with FastAPI + Claude · AI startups
<details><summary>Solution</summary>

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from anthropic import AsyncAnthropic

app, client = FastAPI(), AsyncAnthropic()

class Chat(BaseModel):
    message: str

@app.post("/chat")
async def chat(body: Chat):
    async def tokens():
        async with client.messages.stream(
            model="claude-opus-5-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": body.message}],
        ) as stream:
            async for text in stream.text_stream:
                yield text
    return StreamingResponse(tokens(), media_type="text/plain")
```
Extensions: Server-Sent Events format, conversation history from a store, auth + per-user quotas, cancellation when the client disconnects.
</details>

## End-to-end scenario

<details><summary>Scenario (3-hour take-home): "Build a mini RAG service over this repo's markdown files with an eval." Outline your solution.</summary>

1) Loader reads `src/content/**/*.md`, strips frontmatter. 2) Chunker (problem 3) on headings + paragraphs. 3) Embeddings via a provider (or TF-IDF fallback for offline tests) stored in a NumPy matrix + JSON metadata. 4) `retrieve(q, k)` (problem 1). 5) `answer(q)` calls Claude with retrieved chunks and citation instructions. 6) Eval: 20 questions written from the docs with the expected module id; report retrieval hit@5 and answer correctness (manual or rubric judge). 7) FastAPI endpoint + README with results table, cost per query, limitations. Tests for chunker and retriever.
</details>
