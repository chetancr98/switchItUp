---
title: Transformers & LLMs — Tokens, Embeddings, Attention, Training and Inference
level: 2
tags: llm, transformer, attention, tokens, context window, rlhf
---
<!-- deepened -->

## Start here: the basics

### What an LLM does, in one sentence
A large language model repeatedly predicts **the next token** given all the tokens so far — and by doing that billions of times on huge amounts of text, it learns grammar, facts, reasoning patterns and how to follow instructions.

```
"The capital of France is"  ──► model ──► probabilities: Paris 92%, the 3%, a 1% ...
                                         pick "Paris" → append → predict again → " ." → ...
```
Text generation is just this loop (**autoregressive** decoding).

### Tokens, not words
Models read **tokens** — chunks of text from a fixed vocabulary (often 100k–200k entries). "unbelievable" might be `un` + `believ` + `able`. A rough rule for English: 1 token ≈ ¾ of a word. Tokens matter because:
- **Pricing** is per input and output token.
- **Context window** (how much the model can read at once) is measured in tokens — 200k to 1M tokens on current frontier models.
- **Latency** grows with output tokens.

**Try it**: AI Lab → *Train a tokenizer* shows byte-pair encoding building tokens merge by merge.

### The pipeline inside a transformer
```
text ─► tokenizer ─► token ids ─► embeddings (vectors) + position info
     ─► [ attention + feed-forward ] × N layers  (e.g. 32–100+ layers)
     ─► scores (logits) for every token in the vocabulary ─► softmax ─► next-token probabilities
```

### Attention in plain words
When processing "The animal didn't cross the street because **it** was too tired", the model must figure out that "it" refers to "animal". **Attention** lets each token look at every other token and decide how much each one matters for understanding it. That's the core idea of the 2017 paper *Attention Is All You Need*.

### From "predict text" to "helpful assistant"
1. **Pre-training**: predict the next token on trillions of tokens → a base model that continues text.
2. **Instruction tuning (SFT)**: train on example conversations → follows instructions.
3. **Preference tuning (RLHF, constitutional AI, RLAIF)**: optimise toward answers humans/rubrics prefer → helpful, honest, harmless behaviour.
<!-- -->

---

## Deep dive

### Self-attention mechanics
Each token's vector is projected into three vectors: **Query** (what am I looking for?), **Key** (what do I contain?), **Value** (what do I pass on?).

```
Attention(Q, K, V) = softmax( Q · Kᵀ / √d_k ) · V
```
- `Q · Kᵀ` scores how relevant each token is to each other token.
- Divide by `√d_k` to keep scores in a stable range.
- Softmax turns scores into weights; the output is a weighted mix of Values.
- **Causal masking**: in a decoder (GPT/Claude-style), a token may only attend to earlier tokens — it can't peek at the future it's predicting.
- **Multi-head attention**: several attention "heads" in parallel learn different relationships (syntax, coreference, positions).

```python
import numpy as np

def causal_self_attention(X, Wq, Wk, Wv):
    """X: (T, d) token vectors; W*: (d, d_k). Returns (T, d_k)."""
    Q, K, V = X @ Wq, X @ Wk, X @ Wv
    scores = Q @ K.T / np.sqrt(K.shape[1])            # (T, T)
    mask = np.triu(np.ones_like(scores), k=1) == 1   # positions in the future
    scores[mask] = -1e9                               # block them
    w = np.exp(scores - scores.max(axis=1, keepdims=True))
    w /= w.sum(axis=1, keepdims=True)                 # softmax per row
    return w @ V
```

### A transformer block
`x → LayerNorm → multi-head attention → + residual → LayerNorm → feed-forward MLP → + residual`. Stack dozens of these. **Residual connections** keep gradients flowing; the **feed-forward** layers hold much of the model's "knowledge".

**Positional information**: attention itself ignores order, so positions are injected (learned position embeddings, or rotary position embeddings — RoPE — in most modern LLMs).

### Why transformers won
- Fully parallel over the sequence during training (RNNs were sequential).
- Direct connections between any two positions → long-range dependencies.
- Scale smoothly with data and compute.

Cost: attention is O(n²) in sequence length — long contexts are expensive. Optimisations: FlashAttention (memory-efficient kernels), KV caching, sparse/linear attention variants, mixture-of-experts layers (only some parameters active per token).

### Encoder vs decoder models
| Type | Examples | Good at |
|---|---|---|
| Encoder-only | BERT family | Understanding/classification, **embedding models** |
| Decoder-only | GPT, Claude, Llama | Generation; today's chat/agent models |
| Encoder-decoder | T5, original translation transformers | Sequence-to-sequence |

### Inference: how generation actually runs
- **Prefill**: process the whole prompt in parallel (fast per token) → produces the first token. Determines **time to first token (TTFT)**.
- **Decode**: generate one token at a time, each needing a forward pass (bounded by memory bandwidth). Determines **tokens per second**.
- **KV cache**: keys/values of previous tokens are cached so each new token doesn't recompute attention over the whole prefix. **Prompt caching** in APIs reuses this for repeated prefixes (long system prompts, documents) → much cheaper and faster.
- Batching many users' requests on one GPU is why API outputs aren't perfectly deterministic.

### Decoding / sampling
Logits → softmax → choose a token: **greedy** (always most likely), **temperature** (sharpen/flatten), **top-k**, **top-p (nucleus)**. Play with these in AI Lab → *Next-token sampling*.
Note for the Claude API: current models no longer accept `temperature`, `top_p` or `top_k` (requests with them are rejected); you steer behaviour with prompts, structured outputs and the **effort** setting instead. Other providers and open-weight runtimes still expose sampling parameters — know both.

### Reasoning / "thinking" models
Modern models can produce internal reasoning before the final answer (extended or adaptive thinking). More thinking improves hard problems (maths, coding, planning) at the cost of tokens and latency; APIs expose controls like **effort** levels so you can trade quality for speed per request.

### Context window vs memory
The model has no memory between requests — every call sends the conversation history again (or uses server-side features like caching/threads). Long contexts degrade gracefully but not perfectly ("lost in the middle"): put critical instructions and the question clearly, and retrieve only relevant material.

### Hallucinations — why they happen
The model is trained to produce plausible continuations; when it lacks knowledge, the most plausible-sounding text can be wrong. Mitigations: ground answers in retrieved documents (RAG) with citations, let it say "I don't know", use tools for facts and calculations, verify with checks/evals, lower-variance settings, and human review for high-stakes output.

### Adapting a model to your task — the ladder
1. **Prompting** (instructions, examples, structure) — cheapest, try first.
2. **RAG** — give it your data at query time (knowledge that changes).
3. **Tools/agents** — let it act and fetch live data.
4. **Fine-tuning** — change behaviour/style/format on many examples; doesn't reliably add fresh knowledge; needs data and maintenance. Parameter-efficient methods (LoRA) make it cheaper on open-weight models.

### Model choice trade-offs
Capability vs latency vs cost vs context length vs modality (vision, audio) vs deployment (API vs self-hosted open weights, data residency). In production you often route: a fast, cheap model for simple tasks; the most capable model for hard ones; measured on your own eval set.

## Quick check questions

<details><summary>Why is generating 1 000 output tokens slower than reading 1 000 input tokens?</summary>

Input (prefill) is processed in parallel in one pass; output tokens are generated sequentially, one forward pass each, bounded by memory bandwidth.
</details>

<details><summary>Does a model "remember" yesterday's chat?</summary>

No. Models are stateless between requests; apps re-send history or store memories and retrieve them into the prompt.
</details>

## Questions asked at top companies

<details><summary>Explain the attention mechanism. <em>· Google, Microsoft, Meta, AI startups</em></summary>

Each token creates query, key and value vectors; similarity of a token's query with all keys (scaled dot products, softmax) gives weights used to average the values — letting each position gather information from relevant positions. Multi-head attention runs several in parallel; causal masks prevent attending to future tokens in decoders.
</details>

<details><summary>What is a token, and why do token counts matter? <em>· Amazon, Microsoft, Atlassian</em></summary>

The unit of text the model processes (subword pieces from a learned vocabulary). Cost, context limits and latency are all measured in tokens; tokenisation differs across models and languages.
</details>

<details><summary>What causes hallucinations and how do you reduce them in a product? <em>· every company building GenAI features</em></summary>

The model generates plausible text without grounded knowledge. Reduce with RAG and citations, tool use for facts/calculations, instructions permitting "I don't know", structured outputs with validation, evals that measure faithfulness, and human-in-the-loop for high-stakes actions.
</details>

<details><summary>Temperature, top-k, top-p — what do they do? <em>· Google, Amazon, Meta</em></summary>

Temperature rescales logits (lower = more deterministic); top-k restricts sampling to the k most likely tokens; top-p to the smallest set with cumulative probability p. Some APIs (including current Claude models) no longer expose them, relying on prompting and effort controls instead.
</details>

<details><summary>Fine-tuning vs RAG vs prompting — when each? <em>· Microsoft, Salesforce, startups</em></summary>

Prompting first; RAG when answers depend on private or changing knowledge; fine-tuning for consistent style/format/behaviour or narrow tasks at scale with a smaller model — not as a primary way to inject facts. Often combine RAG + good prompts; fine-tune only with evidence.
</details>

<details><summary>What is the KV cache and prompt caching? <em>· NVIDIA-style infra roles, Google</em></summary>

During decoding, keys/values of past tokens are stored so each new token only computes its own; prompt caching persists this for repeated prefixes across requests, reducing cost and time to first token for long, stable system prompts and documents.
</details>

<details><summary>Explain pre-training, SFT and RLHF. <em>· Meta, Google, Anthropic-style research questions</em></summary>

Pre-training: next-token prediction on massive text → base capabilities. Supervised fine-tuning: demonstrations of desired responses → instruction following. RLHF/RLAIF: optimise toward preferred outputs using a reward model or rubric → helpfulness and harmlessness.
</details>

<details><summary>Why is attention O(n²) and why does it matter? <em>· Google, Microsoft</em></summary>

Every token attends to every other, so compute and memory scale with the square of sequence length — long contexts are costly; mitigated with optimised kernels (FlashAttention), caching, and architectural variants.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your chatbot gives confident wrong answers about your company's refund policy. Diagnose and fix.</summary>

The model doesn't know your policy (not in training data, or outdated). Add RAG over the current policy docs with citations; instruct it to answer only from provided context and say when it doesn't know; add an eval set of policy questions with expected answers and measure faithfulness; log retrieved chunks to debug misses; for actions like issuing refunds, use a tool that enforces policy in code rather than trusting generated text.
</details>

<details><summary>Scenario: A feature sends a 60 000-token product manual with every user question; it's slow and expensive. Improve it.</summary>

Enable prompt caching for the stable manual prefix (large cost and TTFT reduction on repeated requests); or switch to RAG retrieving only relevant sections (few thousand tokens); keep instructions short; route simple questions to a faster model after measuring quality; stream responses; monitor tokens per request and cache hit rate.
</details>
