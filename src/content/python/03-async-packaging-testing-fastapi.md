---
title: Production Python — Environments, asyncio, Testing & FastAPI
level: 2
tags: python, asyncio, fastapi, pytest, uv, packaging
---
<!-- deepened -->

## Start here: the basics

### Virtual environments — Python's version of "each project has its own pom.xml"
Python installs packages globally by default, so two projects needing different library versions would clash. A **virtual environment** is an isolated folder of packages per project.

Modern way with **uv** (a very fast package/project manager):
```bash
uv init my-agent            # creates pyproject.toml, .python-version
cd my-agent
uv add anthropic fastapi "uvicorn[standard]" pydantic   # add dependencies (updates pyproject.toml + uv.lock)
uv add --dev pytest ruff mypy
uv run python main.py       # runs inside the project's environment
uv run pytest
```
Classic way:
```bash
python -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

| Java | Python |
|---|---|
| `pom.xml` / `build.gradle` | `pyproject.toml` |
| Maven Central | PyPI |
| `mvn install` | `uv sync` / `pip install` |
| lockfile | `uv.lock` / `poetry.lock` |
| JUnit | pytest |
| Checkstyle/SpotBugs | ruff (lint+format), mypy/pyright (types) |
| Spring Boot | FastAPI / Django / Flask |

### Why async matters for AI apps
An LLM call takes seconds. If a web server handles requests one at a time per thread, it waits idle. **asyncio** lets one thread juggle thousands of waiting I/O operations — like Java virtual threads, but with explicit `async`/`await`.

```python
import asyncio

async def fetch(name: str, seconds: float) -> str:
    await asyncio.sleep(seconds)          # pretend I/O (an API call)
    return f"{name} done"

async def main():
    # run three "calls" concurrently: total ≈ 2 s, not 4.5 s
    results = await asyncio.gather(fetch("a", 1), fetch("b", 2), fetch("c", 1.5))
    print(results)

asyncio.run(main())
```
<!-- -->

---

## Deep dive

### asyncio essentials
- `async def` defines a **coroutine**; calling it returns a coroutine object — nothing runs until awaited or scheduled.
- `await` suspends the coroutine until the awaited thing completes; the **event loop** runs others meanwhile.
- `asyncio.gather(*coros)` — run concurrently, collect results; `asyncio.TaskGroup` (3.11+) — structured concurrency, cancels siblings on failure.
- `asyncio.wait_for(coro, timeout)` / `asyncio.timeout()` — timeouts.
- `asyncio.Semaphore(n)` — cap concurrency (e.g., max 5 parallel LLM calls to respect rate limits).
- **Never block the loop**: `time.sleep`, `requests.get`, heavy CPU work inside `async def` freeze every other task. Use async libraries (`httpx.AsyncClient`, `AsyncAnthropic`) or `await asyncio.to_thread(blocking_fn)`.

```python
import asyncio
from anthropic import AsyncAnthropic

client = AsyncAnthropic()
limit = asyncio.Semaphore(5)

async def summarize(doc: str) -> str:
    async with limit:                                   # at most 5 in flight
        resp = await client.messages.create(
            model="claude-opus-5-5",
            max_tokens=1024,
            messages=[{"role": "user", "content": f"Summarize in 2 sentences:\n\n{doc}"}],
        )
        return next(b.text for b in resp.content if b.type == "text")

async def main(docs: list[str]) -> list[str]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(summarize(d)) for d in docs]
    return [t.result() for t in tasks]
```
(For thousands of non-urgent documents, the **Message Batches API** is cheaper — 50% off, results within hours.)

### threading vs multiprocessing vs asyncio
| Tool | Best for | Notes |
|---|---|---|
| `asyncio` | Many concurrent network calls | Single thread, cooperative |
| `threading` / `ThreadPoolExecutor` | Blocking I/O libraries | GIL limits CPU parallelism |
| `multiprocessing` / `ProcessPoolExecutor` | CPU-bound Python | Separate processes, data is pickled between them |

### FastAPI — the Spring Boot of AI backends
```python
# main.py
from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel, Field
from anthropic import AsyncAnthropic

app = FastAPI(title="Ask API")
client = AsyncAnthropic()

class AskRequest(BaseModel):
    question: str = Field(min_length=3, max_length=2000)

class AskResponse(BaseModel):
    answer: str

@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}

@app.post("/ask", response_model=AskResponse)
async def ask(req: AskRequest) -> AskResponse:
    resp = await client.messages.create(
        model="claude-opus-5-5",
        max_tokens=2048,
        system="You answer questions about our product concisely.",
        messages=[{"role": "user", "content": req.question}],
    )
    if resp.stop_reason == "refusal":
        raise HTTPException(status_code=422, detail="Request declined")
    return AskResponse(answer=next(b.text for b in resp.content if b.type == "text"))
```
```bash
uv run uvicorn main:app --reload      # dev server on :8000, interactive docs at /docs
```
- Request bodies validated by Pydantic automatically (422 on bad input).
- OpenAPI docs generated at `/docs`.
- **Dependency injection** via `Depends()` (DB sessions, auth, config).
- Streaming responses (`StreamingResponse` / Server-Sent Events) for token-by-token LLM output.

### Testing with pytest
```python
# test_pricing.py
import pytest
from pricing import with_gst

def test_adds_gst():
    assert with_gst(100) == 118

@pytest.mark.parametrize("amount", [-1, 0])
def test_rejects_non_positive(amount):
    with pytest.raises(ValueError):
        with_gst(amount)

@pytest.fixture
def fake_llm():
    class Fake:
        async def complete(self, prompt): return "stub answer"
    return Fake()
```
- Plain `assert`, fixtures for setup, `parametrize` for tables of cases, `monkeypatch` for env/config, `pytest-asyncio` for async tests.
- **Don't call real LLM APIs in unit tests** — inject a fake client; keep a separate, small, cost-controlled **eval** suite for model quality (see AI → Prompting & evals).

### Configuration and secrets
```python
from pydantic_settings import BaseSettings   # pip install pydantic-settings

class Settings(BaseSettings):
    anthropic_api_key: str          # read from ANTHROPIC_API_KEY env var
    max_parallel_calls: int = 5

settings = Settings()
```
Never commit keys; `.env` in `.gitignore`; secrets from your cloud's secret manager in production. The Anthropic SDK reads `ANTHROPIC_API_KEY` automatically.

### Logging
`import logging; logger = logging.getLogger(__name__)` — structured JSON logs in production (structlog), include request ids; **never log full prompts containing user PII** without a policy.

### Docker for a Python service
```dockerfile
FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY . .
USER nobody
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Quick check questions

<details><summary>What happens if you call `requests.get()` inside an `async def` FastAPI endpoint?</summary>

It blocks the event loop thread; all other requests on that worker stall until it returns. Use `httpx.AsyncClient`, or define the endpoint with plain `def` (FastAPI then runs it in a threadpool).
</details>

<details><summary>Why use a Semaphore when calling an LLM API concurrently?</summary>

To cap concurrency below provider rate limits and your own budget; unbounded `gather` over 10 000 items sends 10 000 requests at once → 429 errors and wasted retries.
</details>

## Questions asked at top companies

<details><summary>Explain async/await in Python and how it differs from threads. <em>· Uber, Microsoft, AI startups</em></summary>

Coroutines cooperatively yield at `await` points to an event loop on a single thread; switching happens only at awaits, so no data races between awaits but blocking calls freeze everything. Threads are preemptively scheduled by the OS (limited by the GIL for CPU work). Async scales better for many concurrent I/O waits.
</details>

<details><summary>How would you structure a production FastAPI project? <em>· Atlassian, Swiggy, Razorpay</em></summary>

Routers per domain, Pydantic schemas separate from DB models, services layer, dependency injection for DB/auth/config, settings via pydantic-settings, async DB driver, middleware for request ids/logging, exception handlers, tests with TestClient/httpx, Dockerfile, CI with ruff/mypy/pytest.
</details>

<details><summary>How do you manage dependencies reproducibly in Python? <em>· Google, Amazon</em></summary>

pyproject.toml + a lockfile (uv.lock/poetry.lock) committed, pinned Python version, isolated virtual environments, `uv sync --frozen` in CI/Docker, Dependabot/renovate for updates, vulnerability scanning (pip-audit).
</details>

<details><summary>How do you test code that calls an LLM? <em>· AI startups, Microsoft</em></summary>

Unit tests with an injected fake/mocked client returning canned responses (including tool calls, refusals, errors, timeouts); contract tests on prompt construction and output parsing; a separate eval suite measuring quality on a labelled dataset with real model calls, run on demand or nightly with cost limits.
</details>

<details><summary>WSGI vs ASGI? <em>· Microsoft, Atlassian</em></summary>

WSGI is the synchronous Python web server interface (Flask, classic Django); ASGI supports async, WebSockets and long-lived connections (FastAPI, Starlette, Django async) — needed for streaming LLM responses efficiently.
</details>

<details><summary>How do you run CPU-heavy work from an async app? <em>· Uber, Google</em></summary>

Offload with `asyncio.to_thread` (if it releases the GIL, like NumPy) or a `ProcessPoolExecutor` via `loop.run_in_executor`, or a separate worker service/queue (Celery, RQ, Arq) for long jobs.
</details>

## End-to-end scenarios

<details><summary>Scenario: Build a "summarize 5 000 support tickets overnight" job. What's your design?</summary>

Non-urgent bulk work → Message Batches API (async, discounted) or an asyncio pipeline with a Semaphore (e.g., 10 concurrent) and retries with exponential backoff on 429/5xx; read tickets with a generator in chunks; validate each output with Pydantic; persist results idempotently keyed by ticket id so reruns skip finished items; log usage tokens for cost; a dry run on 50 tickets reviewed by a human before the full run.
</details>

<details><summary>Scenario: Your FastAPI LLM endpoint p99 is 25 s and users abandon. Improve perceived and actual latency.</summary>

Stream tokens to the client (SSE) so first text appears in ~1 s; trim prompts and cache the static system prompt (prompt caching); lower effort / smaller model for simple routes after measuring quality; parallelise independent tool/retrieval calls; set timeouts and fall back gracefully; move long tasks to background jobs with status polling; measure time-to-first-token and total latency separately.
</details>
