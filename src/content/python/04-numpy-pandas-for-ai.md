---
title: NumPy & pandas for AI — Vectors, Matrices and Data Wrangling
level: 2
tags: python, numpy, pandas, data, vectors
---
<!-- deepened -->

## Start here: the basics

### Why NumPy?
AI is linear algebra: embeddings are vectors, model weights are matrices, a batch of images is a 4-D array. Python lists are slow for math (each number is a boxed object). **NumPy arrays** store numbers in contiguous memory and run operations in optimised C — often 50–100× faster, with cleaner code.

```python
import numpy as np

a = np.array([1.0, 2.0, 3.0])
b = np.array([4.0, 5.0, 6.0])

a + b          # array([5., 7., 9.])   element-wise, no loop
a * 2          # array([2., 4., 6.])
a @ b          # 32.0  dot product: 1*4 + 2*5 + 3*6
np.linalg.norm(a)    # vector length ≈ 3.742
```

### Shapes — the #1 thing to keep track of
```python
x = np.zeros((3, 4))     # 3 rows, 4 columns
x.shape                  # (3, 4)
x.ndim                   # 2
x.dtype                  # float64
x.reshape(4, 3)          # same data, new shape
x.T                      # transpose → (4, 3)
```
Read shapes like sentences: an embedding matrix of shape `(1000, 1024)` is "1 000 documents, each a 1 024-dimensional vector".

### Why pandas?
Real data comes as tables (CSV, SQL, logs). **pandas DataFrame** = an in-memory table with named columns — like a SQL table you can manipulate in Python.

```python
import pandas as pd

df = pd.DataFrame({
    "ticket": [1, 2, 3, 4],
    "category": ["billing", "bug", "bug", "account"],
    "minutes_to_resolve": [30, 240, 90, 15],
})
df.head()
df[df["category"] == "bug"]                       # filter rows (WHERE)
df.groupby("category")["minutes_to_resolve"].mean()   # GROUP BY + AVG
df.sort_values("minutes_to_resolve", ascending=False)
```
<!-- -->

---

## NumPy in depth

### Creating arrays
```python
np.arange(0, 10, 2)          # [0 2 4 6 8]
np.linspace(0, 1, 5)         # [0. .25 .5 .75 1.]
np.ones((2, 3)); np.eye(3)   # identity matrix
rng = np.random.default_rng(42)
rng.normal(size=(2, 3))      # random normal values (seeded → reproducible)
```

### Indexing, slicing, boolean masks
```python
m = np.arange(12).reshape(3, 4)
m[0]          # first row
m[:, 1]       # second column
m[1:, 2:]     # sub-matrix
m[m > 5]      # all elements greater than 5 (boolean mask)
m[m % 2 == 0] = 0     # set evens to 0
```

### Broadcasting — operations on different shapes
NumPy stretches dimensions of size 1 to match:
```python
scores = np.array([[1, 2, 3],
                   [4, 5, 6]])        # shape (2, 3)
scores - scores.mean(axis=0)          # subtract each column's mean: (2,3) - (3,) → works
scores / scores.sum(axis=1, keepdims=True)   # normalise each row: (2,3) / (2,1)
```
Rule: compare shapes from the right; dims must be equal or 1.

### Aggregations along axes
`axis=0` collapses rows (per column); `axis=1` collapses columns (per row).
```python
m.sum(), m.sum(axis=0), m.max(axis=1), m.argmax(axis=1), m.mean(), m.std()
```

### The math behind embeddings and attention, in NumPy
```python
def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    return float(a @ b / (np.linalg.norm(a) * np.linalg.norm(b)))

def top_k(query: np.ndarray, docs: np.ndarray, k: int = 3) -> np.ndarray:
    """docs: (n, d) matrix of embeddings; query: (d,) vector. Returns indices of the k most similar."""
    docs_n = docs / np.linalg.norm(docs, axis=1, keepdims=True)
    q_n = query / np.linalg.norm(query)
    sims = docs_n @ q_n                  # (n,) — one matrix-vector product scores every document
    return np.argsort(-sims)[:k]

def softmax(x: np.ndarray, axis: int = -1) -> np.ndarray:
    x = x - x.max(axis=axis, keepdims=True)   # numerical stability
    e = np.exp(x)
    return e / e.sum(axis=axis, keepdims=True)
```
That single `docs_n @ q_n` is "vector search" for small corpora — no database needed for a few hundred thousand vectors.

### Vectorise, don't loop
```python
# slow: Python loop over 1M elements
total = 0
for x in values: total += x * x
# fast: one C-level call
total = np.dot(values, values)
```

## pandas in depth

### Reading and inspecting
```python
df = pd.read_csv("tickets.csv", parse_dates=["created_at"])
df.shape; df.dtypes; df.info(); df.describe()
df["category"].value_counts()
df.isna().sum()                 # missing values per column
```

### SQL → pandas translation
| SQL | pandas |
|---|---|
| `SELECT a, b` | `df[["a", "b"]]` |
| `WHERE x > 5 AND y = 'k'` | `df[(df.x > 5) & (df.y == "k")]` or `df.query("x > 5 and y == 'k'")` |
| `ORDER BY x DESC` | `df.sort_values("x", ascending=False)` |
| `GROUP BY c` + aggregates | `df.groupby("c").agg(n=("id", "count"), avg=("x", "mean"))` |
| `JOIN` | `df.merge(other, on="key", how="left")` |
| `LIMIT 10` | `df.head(10)` |
| window `ROW_NUMBER` | `df.groupby("c").cumcount()` / `rank()` |
| `CASE WHEN` | `np.where(cond, a, b)` |

### Cleaning text data for an LLM/RAG pipeline
```python
df = df.dropna(subset=["body"])
df["body"] = df["body"].str.strip().str.replace(r"\s+", " ", regex=True)
df = df[df["body"].str.len() > 20]                 # drop near-empty rows
df = df.drop_duplicates(subset=["body"])
df["n_words"] = df["body"].str.split().str.len()
df.to_parquet("clean.parquet")                     # columnar, compressed, typed
```

### Performance tips
Avoid `df.apply` with Python lambdas on large data when a vectorised `.str` / NumPy operation exists; use categorical dtypes for repeated strings; read big files in `chunksize` batches; consider **polars** (Rust-based, multi-threaded, lazy) for large datasets.

### Visualising quickly
```python
import matplotlib.pyplot as plt
df["minutes_to_resolve"].hist(bins=30); plt.show()
```

## Quick check questions

<details><summary>What shape results from `(32, 128) @ (128, 10)`?</summary>

`(32, 10)` — inner dimensions (128) must match and disappear.
</details>

<details><summary>Why subtract the max inside softmax?</summary>

`exp` of large numbers overflows to infinity. Subtracting the max leaves the result mathematically unchanged (it cancels in the ratio) but keeps values ≤ 0, so `exp` stays in [0, 1].
</details>

## Questions asked at top companies

<details><summary>Why is NumPy faster than Python lists? <em>· Google, Amazon (ML/AI roles)</em></summary>

Contiguous typed memory (no per-element object boxing), vectorised operations executed in compiled C loops, SIMD and BLAS for linear algebra, and fewer interpreter round-trips.
</details>

<details><summary>Explain broadcasting with an example. <em>· Microsoft, Meta</em></summary>

Arrays with compatible shapes (equal or 1, compared from the right) are virtually expanded without copying, e.g. `(n, d) - (d,)` subtracts a row vector from every row — used for normalisation and adding biases.
</details>

<details><summary>Compute cosine similarity between a query and 10 000 document vectors efficiently. <em>· AI startups, Uber, Flipkart</em></summary>

Normalise rows once (`docs / norm(axis=1)`), normalise the query, then one matrix-vector multiply gives all similarities; `argpartition` for top-k in O(n). Precompute normalised vectors at index time.
</details>

<details><summary>How do you handle missing values in pandas? <em>· Walmart, Amazon</em></summary>

Inspect with `isna().sum()`, then drop (`dropna`), fill (`fillna` with constant/median/forward-fill), or flag with an indicator column — choice depends on meaning; never silently fill target labels.
</details>

<details><summary>`loc` vs `iloc`? <em>· Infosys, Accenture</em></summary>

`loc` selects by labels (index values, column names, boolean masks); `iloc` selects by integer position.
</details>

<details><summary>How would you process a CSV that doesn't fit in memory? <em>· Google, Walmart</em></summary>

`pd.read_csv(chunksize=...)` aggregating per chunk, select only needed columns with `usecols` and efficient dtypes, convert to Parquet, or use polars lazy/streaming, DuckDB SQL over files, or Spark for distributed data.
</details>

## End-to-end scenarios

<details><summary>Scenario: You have 200 000 FAQ answers and their embeddings (1024-d floats). Build semantic search without a vector database.</summary>

Store embeddings as a float32 NumPy array (200k × 1024 × 4 B ≈ 800 MB; use float16 or fewer dimensions to halve it), L2-normalise rows at load; query = normalise, `sims = E @ q`, `np.argpartition(-sims, k)[:k]` then sort those k. ~10–50 ms per query on CPU. When you need filtering, updates, persistence or millions more vectors, move to pgvector or a vector DB with an ANN index (HNSW).
</details>

<details><summary>Scenario: Prepare a dataset of past support tickets to evaluate a new LLM triage prompt.</summary>

Load with pandas, keep tickets with a resolved human category, de-duplicate, strip signatures/PII (emails, phone numbers via regex) before sending anything to an API, stratified sample (e.g., 50 per category) with `groupby().sample(n=50, random_state=42)`, split into dev/test, save as JSONL with id, input, expected label. That becomes your eval set (AI → Prompting & evals).
</details>
