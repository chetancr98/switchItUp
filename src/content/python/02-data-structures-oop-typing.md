---
title: Python Data Structures, OOP, Dataclasses, Typing & Pydantic
level: 1
tags: python, oop, dataclasses, pydantic, typing, collections
---
<!-- deepened -->

## Start here: the basics

### The four built-in collections
```python
# list — ordered, mutable, allows duplicates (≈ ArrayList)
nums = [3, 1, 4]
nums.append(1); nums.extend([5, 9]); nums.insert(0, 7); nums.pop(); nums.remove(4)
nums.sort(); sorted(nums, reverse=True); 4 in nums; nums.index(3)

# dict — key → value, insertion-ordered (≈ LinkedHashMap)
user = {"name": "Riya", "age": 24}
user["city"] = "Pune"
user.get("email", "n/a")
for key, value in user.items(): ...
user.keys(), user.values()
del user["age"]

# set — unique items, fast membership (≈ HashSet)
tags = {"java", "python"}
tags.add("go"); "java" in tags
{1, 2, 3} & {2, 3, 4}    # intersection {2, 3}
{1, 2} | {2, 5}          # union

# tuple — immutable sequence
point = (10, 20)
x, y = point             # unpacking
```

### Comprehensions for every collection
```python
squares = [x * x for x in range(10)]
evens = {x for x in range(10) if x % 2 == 0}
lengths = {name: len(name) for name in ["riya", "kabir"]}
lazy = (x * x for x in range(10**9))     # generator: computed on demand, O(1) memory
```

### Classes — the Python way
```python
class BankAccount:
    interest_rate = 0.04                  # class attribute (shared, like static)

    def __init__(self, owner: str, balance: float = 0.0):   # constructor
        self.owner = owner                # instance attributes — no field declarations needed
        self._balance = balance           # leading underscore = "internal, please don't touch"

    def deposit(self, amount: float) -> None:     # methods take self explicitly
        if amount <= 0:
            raise ValueError("amount must be positive")
        self._balance += amount

    @property
    def balance(self) -> float:           # read-only property: acc.balance (no parentheses)
        return self._balance

    def __repr__(self) -> str:            # like toString()
        return f"BankAccount(owner={self.owner!r}, balance={self._balance})"

acc = BankAccount("Riya")
acc.deposit(500)
print(acc.balance, acc)
```
There is no `private` keyword — convention (`_name`) and properties instead.

### Dataclasses — Python's records
```python
from dataclasses import dataclass, field

@dataclass(frozen=True)           # frozen → immutable, hashable
class Point:
    x: int
    y: int

@dataclass
class Order:
    id: str
    items: list[str] = field(default_factory=list)   # never use a mutable default directly
    total: float = 0.0
```
Generated: `__init__`, `__repr__`, `__eq__` (and `__hash__` when frozen).
<!-- -->

---

## Deep dive

### Inheritance, abstract classes, protocols
```python
from abc import ABC, abstractmethod
from typing import Protocol

class PaymentGateway(ABC):                 # abstract base class ≈ abstract class
    @abstractmethod
    def charge(self, amount: int) -> str: ...

class Razorpay(PaymentGateway):
    def charge(self, amount: int) -> str:
        return f"rzp_{amount}"

class Notifier(Protocol):                  # structural typing ≈ interface, no inheritance needed
    def send(self, to: str, msg: str) -> None: ...

class EmailNotifier:                       # matches the Protocol just by having send()
    def send(self, to: str, msg: str) -> None:
        print(f"email {to}: {msg}")

def alert(n: Notifier) -> None:
    n.send("ops@acme.com", "disk full")
```
**Duck typing**: "if it has the method, it works". Protocols let type checkers verify that without inheritance.

Multiple inheritance exists; method resolution order (MRO) is C3 linearisation — `ClassName.__mro__`. Use it sparingly (mixins).

### Dunder (magic) methods — the data model
| Method | Enables |
|---|---|
| `__init__` | construction |
| `__repr__` / `__str__` | debug / user display |
| `__eq__`, `__hash__` | `==`, dict keys / sets |
| `__lt__` etc. | sorting (`functools.total_ordering`) |
| `__len__`, `__getitem__`, `__iter__`, `__contains__` | `len()`, `obj[i]`, `for x in obj`, `in` |
| `__enter__` / `__exit__` | `with` blocks |
| `__call__` | calling an object like a function |

The same rule as Java: if you define `__eq__`, define `__hash__` consistently (dataclasses handle it).

### The `collections` module (interview favourite)
```python
from collections import Counter, defaultdict, deque, OrderedDict, namedtuple

Counter("mississippi").most_common(2)     # [('i', 4), ('s', 4)]
graph = defaultdict(list); graph["a"].append("b")   # no KeyError for new keys
q = deque([1, 2]); q.appendleft(0); q.pop(); q.popleft()   # O(1) both ends — use for BFS
import heapq
h = []; heapq.heappush(h, (2, "b")); heapq.heappush(h, (1, "a")); heapq.heappop(h)   # min-heap
heapq.nlargest(3, nums)
from functools import lru_cache
@lru_cache(maxsize=None)                  # memoization in one line
def fib(n): return n if n < 2 else fib(n - 1) + fib(n - 2)
import bisect; bisect.bisect_left(sorted_list, x)   # binary search
```

### Type hints that matter in AI code
```python
from typing import Literal, TypedDict, Any, Callable
from collections.abc import Iterable, Iterator

Role = Literal["user", "assistant"]

class Message(TypedDict):          # typed shape of a dict (LLM APIs pass dicts around)
    role: Role
    content: str

def chunk(items: Iterable[str], size: int) -> Iterator[list[str]]: ...
Handler = Callable[[str], str]
```
Run `mypy` or `pyright` in CI to catch type errors before production.

### Pydantic — validated data models (used everywhere in AI apps)
Pydantic validates and converts data at runtime from type hints. FastAPI uses it for request/response bodies; LLM SDKs use it for **structured outputs** (the model's JSON is parsed into a validated object).

```python
from pydantic import BaseModel, Field, EmailStr, ValidationError

class Ticket(BaseModel):
    title: str = Field(min_length=5)
    priority: Literal["low", "medium", "high"]
    customer_email: EmailStr          # needs: pip install "pydantic[email]"
    tags: list[str] = []

try:
    t = Ticket.model_validate({"title": "Login broken", "priority": "high",
                               "customer_email": "a@b.com"})
    print(t.model_dump_json())
except ValidationError as e:
    print(e.errors())

Ticket.model_json_schema()            # JSON Schema — exactly what you give an LLM as a tool/output schema
```

### Iterators and generators
```python
def read_chunks(path: str, size: int = 1000):
    with open(path, encoding="utf-8") as f:
        buf = []
        for line in f:
            buf.append(line)
            if len(buf) == size:
                yield buf          # pauses here; resumes on next()
                buf = []
        if buf:
            yield buf

for batch in read_chunks("huge.txt"):
    process(batch)                 # constant memory regardless of file size
```
Generators are how you stream large datasets into embedding or LLM batch jobs.

### Decorators
A decorator wraps a function — Python's AOP.
```python
import functools, time

def timed(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        start = time.perf_counter()
        try:
            return fn(*args, **kwargs)
        finally:
            print(f"{fn.__name__} took {time.perf_counter() - start:.3f}s")
    return wrapper

@timed
def slow(): time.sleep(0.2)
```
You'll see decorators everywhere in AI code: `@app.get` (FastAPI), `@beta_tool` (Anthropic SDK tools), `@pytest.fixture`, `@lru_cache`.

## Quick check questions

<details><summary>Why does `@dataclass` need `field(default_factory=list)` for list defaults?</summary>

A plain `= []` default would be shared across all instances (mutable default). `default_factory` creates a new list per instance; dataclasses raise an error if you try the mutable default.
</details>

<details><summary>When would you use a Protocol instead of an ABC?</summary>

When you want structural typing — any class with the right methods qualifies without inheriting (great for adapting third-party classes and for test fakes). ABCs enforce implementation at instantiation time and allow shared code.
</details>

## Questions asked at top companies

<details><summary>How are Python dicts implemented, and what's the complexity of lookups? <em>· Google, Amazon, Microsoft</em></summary>

Open-addressing hash tables with a compact insertion-ordered entries array (since 3.6/3.7 insertion order is guaranteed). Average O(1) get/set/delete, O(n) worst case. Keys must be hashable (immutable).
</details>

<details><summary>What are decorators and write one that retries a function. <em>· Amazon, Uber, Atlassian</em></summary>

```python
def retry(times=3, delay=0.5, exceptions=(Exception,)):
    def deco(fn):
        @functools.wraps(fn)
        def wrapper(*a, **kw):
            for attempt in range(1, times + 1):
                try:
                    return fn(*a, **kw)
                except exceptions:
                    if attempt == times: raise
                    time.sleep(delay * 2 ** (attempt - 1))
        return wrapper
    return deco
```
</details>

<details><summary>What is a generator and why use it? <em>· Meta, Microsoft, Walmart</em></summary>

A function with `yield` that produces values lazily, maintaining its state between calls. Constant memory for large/infinite sequences and composable pipelines.
</details>

<details><summary>`@staticmethod` vs `@classmethod` vs instance methods. <em>· Infosys, Goldman Sachs</em></summary>

Instance methods get `self`; class methods get `cls` (alternative constructors, `from_dict`); static methods get neither (namespaced utility functions).
</details>

<details><summary>Explain the difference between `__str__` and `__repr__`. <em>· TCS, Wipro</em></summary>

`__repr__` is an unambiguous developer representation (ideally valid code to recreate the object); `__str__` is user-friendly display. `print` uses `__str__`, falling back to `__repr__`.
</details>

<details><summary>What is Pydantic and why is it popular in LLM applications? <em>· AI startups, Microsoft, Atlassian</em></summary>

Runtime data validation from type hints with JSON Schema generation. LLM outputs are untrusted text; Pydantic validates them into typed objects (and generates the schema you give the model for structured outputs/tools). FastAPI uses it for API contracts.
</details>

<details><summary>How does Python manage memory? <em>· Google, Uber</em></summary>

Reference counting frees most objects immediately when their count hits zero; a cyclic garbage collector handles reference cycles; small objects use pymalloc arenas. `del` removes a reference, not necessarily the object.
</details>

<details><summary>Implement an LRU cache in Python. <em>· Amazon, Microsoft</em></summary>

```python
from collections import OrderedDict
class LRU:
    def __init__(self, cap): self.cap, self.d = cap, OrderedDict()
    def get(self, k):
        if k not in self.d: return -1
        self.d.move_to_end(k); return self.d[k]
    def put(self, k, v):
        self.d[k] = v; self.d.move_to_end(k)
        if len(self.d) > self.cap: self.d.popitem(last=False)
```
Or `functools.lru_cache` for function memoization.
</details>

## End-to-end scenarios

<details><summary>Scenario: Model a support-ticket triage result that an LLM will produce, so bad outputs are rejected automatically.</summary>

```python
class Triage(BaseModel):
    category: Literal["billing", "bug", "feature_request", "account", "other"]
    priority: Literal["p0", "p1", "p2", "p3"]
    summary: str = Field(max_length=200)
    needs_human: bool
```
Generate `Triage.model_json_schema()` for the LLM's structured output / tool input; validate the response with `Triage.model_validate_json(text)`; on `ValidationError` retry with the error message or route to a human. Enums (`Literal`) keep downstream code safe from free-text categories.
</details>

<details><summary>Scenario: Design classes for a pluggable "LLM provider" layer so your app can swap providers and use a fake in tests.</summary>

A `Protocol` `ChatModel` with `complete(messages: list[Message], tools: list[ToolSpec] | None) -> ModelResponse`; concrete adapters per provider SDK; a `FakeChatModel` returning scripted responses for unit tests; dataclasses for `ModelResponse` (text, tool_calls, usage, stop_reason); a decorator or wrapper for retries, timeouts and logging. Keep provider-specific options inside adapters, not in business logic.
</details>
