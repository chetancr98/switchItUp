---
title: Python for Java Developers — Syntax, Idioms & Mental Model
level: 1
tags: python, basics, java comparison
---
<!-- deepened -->

## Start here: the basics

### Why Python for AI?
Almost every AI library — PyTorch, Hugging Face, scikit-learn, NumPy, pandas, the Anthropic and other LLM SDKs, LangGraph, LlamaIndex — is Python-first. You can build LLM apps in Java or TypeScript too, but AI job descriptions, notebooks, tutorials and interview take-homes assume Python. The good news: if you know Java, you already know 80% of the concepts; you're mostly learning a lighter syntax and a few idioms.

### Running Python
```bash
python --version        # 3.12 or 3.13 recommended
python                  # interactive REPL: type expressions, see results immediately
python hello.py         # run a file
```
No compile step, no `main` class required. Or skip installation entirely: open **Google Colab** (link at the end of this module) and run code in the browser.

### Hello world, side by side
```java
// Java
public class Hello {
    public static void main(String[] args) {
        String name = "Riya";
        System.out.println("Hello, " + name);
    }
}
```
```python
# Python
name = "Riya"
print(f"Hello, {name}")      # f-string: expressions inside {} are evaluated
```

### The big differences in one table
| Concept | Java | Python |
|---|---|---|
| Blocks | `{ }` | **Indentation** (4 spaces) — it's syntax, not style |
| Statements end | `;` | Newline |
| Types | Static, declared | Dynamic (types checked at runtime); optional **type hints** |
| Variables | `int x = 5;` | `x = 5` |
| null | `null` | `None` |
| true/false | `true`/`false` | `True`/`False` |
| Logical ops | `&& \|\| !` | `and or not` |
| Comments | `//` `/* */` | `#` and `"""docstrings"""` |
| String formatting | `String.format`, `+` | f-strings `f"{x:.2f}"` |
| Arrays/lists | `int[]`, `ArrayList` | `list` `[1, 2, 3]` |
| Maps | `HashMap` | `dict` `{"a": 1}` |
| Sets | `HashSet` | `set` `{1, 2}` |
| Immutable tuple | records / arrays | `tuple` `(1, "a")` |
| Functions | methods in classes | top-level functions are normal |
| Exceptions | checked + unchecked | all unchecked |
| Entry point | `main` method | `if __name__ == "__main__":` |

### Control flow
```python
score = 82
if score >= 90:
    grade = "A"
elif score >= 75:          # elif, not else if
    grade = "B"
else:
    grade = "C"

for i in range(5):         # 0,1,2,3,4  (like for (int i=0;i<5;i++))
    print(i)

for name in ["riya", "arjun"]:
    print(name.title())

for i, name in enumerate(["riya", "arjun"]):   # index + value
    print(i, name)

while score > 0:
    score -= 30

result = "pass" if score >= 40 else "fail"    # ternary
```

### Functions
```python
def area(width: float, height: float = 1.0) -> float:   # type hints + default value
    """Return the area of a rectangle."""                 # docstring
    return width * height

area(3, 4)              # 12
area(width=3)           # 3.0 — keyword arguments
area(height=2, width=5) # order doesn't matter with keywords

def total(*nums, **options):     # *args = extra positional (tuple), **kwargs = extra keyword (dict)
    s = sum(nums)
    return round(s, options.get("digits", 2))

total(1.234, 2.345, digits=1)    # 3.6
```

### Everything is an object, and variables are references
Like Java references: `a = [1]; b = a; b.append(2)` → `a` is `[1, 2]`. Integers and strings are immutable, so "changing" them creates new objects.
<!-- -->

---

## The Python mental model in depth

### Dynamic typing + type hints
Python checks types at runtime. Type hints (`def f(x: int) -> str`) are **not enforced** by the interpreter — they're for readers, IDEs and static checkers (**mypy**, **pyright**). In professional and AI codebases, hints are standard: Pydantic and FastAPI even use them to validate data at runtime.

```python
from typing import Optional

def find_user(user_id: int) -> Optional[dict]:   # or: dict | None (3.10+)
    ...
```

### Truthiness
Empty things are falsy: `None, 0, 0.0, "", [], {}, set()`. So `if items:` means "if the list is not empty" — idiomatic Python, unlike Java's `!items.isEmpty()`.

### `==` vs `is`
`==` compares values (like Java `equals`); `is` compares identity (like Java `==`). Use `is` only for `None`: `if x is None:`.

### Strings
```python
s = "Hello, World"
s.lower(), s.upper(), s.split(", "), s.replace("World", "Python"), s.strip()
s[0], s[-1], s[0:5], s[::-1]          # indexing, negative index, slicing, reverse
"-".join(["a", "b", "c"])             # "a-b-c"  (join is called on the separator)
len(s)
"ell" in s                            # substring check
f"{3.14159:.2f}", f"{1234567:,}"      # '3.14', '1,234,567'
"""multi
line"""
```

### Slicing — works on lists, strings, tuples
`seq[start:stop:step]` — stop is exclusive; negative indexes count from the end.
```python
nums = [0, 1, 2, 3, 4, 5]
nums[1:4]    # [1, 2, 3]
nums[:3]     # [0, 1, 2]
nums[-2:]    # [4, 5]
nums[::2]    # [0, 2, 4]
nums[::-1]   # reversed copy
```

### Modules and imports
Every `.py` file is a module. A folder with Python files is a package.
```python
import math                      # math.sqrt(16)
from collections import Counter  # Counter("banana")
import numpy as np               # alias convention
```
```python
# app.py
def main():
    ...

if __name__ == "__main__":   # runs only when executed directly, not when imported
    main()
```

### Exceptions
```python
try:
    value = int(user_input)
except ValueError as e:
    print(f"Not a number: {e}")
else:
    print("parsed fine")        # runs if no exception
finally:
    print("always runs")

raise ValueError("amount must be positive")

class InsufficientFunds(Exception):     # custom exception
    pass
```
No checked exceptions — document what you raise.

### Context managers — Python's try-with-resources
```python
with open("data.txt", encoding="utf-8") as f:   # file closed automatically
    for line in f:
        print(line.rstrip())
```

### The Zen: idiomatic ("Pythonic") code
```python
# Java-style (works, but un-Pythonic)
result = []
for i in range(len(names)):
    if len(names[i]) > 3:
        result.append(names[i].upper())

# Pythonic: list comprehension
result = [n.upper() for n in names if len(n) > 3]
```
Rules of thumb: iterate directly over items (not indexes), use comprehensions for simple transforms, `enumerate`/`zip` instead of index juggling, `with` for resources, and the standard library before writing your own.

### Java → Python translation cheatsheet
| Java | Python |
|---|---|
| `list.size()` | `len(lst)` |
| `list.add(x)` | `lst.append(x)` |
| `map.getOrDefault(k, 0)` | `d.get(k, 0)` |
| `map.containsKey(k)` | `k in d` |
| `for (Map.Entry e : map.entrySet())` | `for k, v in d.items():` |
| `Collections.sort(list)` | `lst.sort()` or `sorted(lst)` |
| `list.stream().map(f).collect(...)` | `[f(x) for x in lst]` |
| `Math.max(a, b)` | `max(a, b)` |
| `Integer.parseInt(s)` | `int(s)` |
| `String.valueOf(x)` | `str(x)` |
| `x == null` | `x is None` |
| `throw new X()` | `raise X()` |
| `System.out.println` | `print` |
| `interface` | `typing.Protocol` / abstract base class |
| `record Point(int x, int y)` | `@dataclass class Point: x: int; y: int` |

### Performance note
CPython is slower than the JVM for pure loops (often 10–50×). AI code is still fast because heavy work happens inside C/C++/CUDA libraries (NumPy, PyTorch) or remote APIs. Rule: **vectorise with NumPy instead of looping in Python**, and for I/O-heavy LLM apps, the bottleneck is network latency, not Python.

The **GIL** (Global Interpreter Lock) means only one thread runs Python bytecode at a time in standard CPython — threads help for I/O, not CPU-bound work (use multiprocessing or native libraries). Python 3.13 added an experimental free-threaded build; mention it as a bonus.

## Quick check questions

<details><summary>What does `if items:` check?</summary>

That `items` is truthy — for a list, that it's not empty (and not None).
</details>

<details><summary>Why is `x = 5; def f(): x += 1` an error?</summary>

Assignment inside a function makes `x` local to the function; `x += 1` reads it before assignment → `UnboundLocalError`. Use `global x` (rarely good) or pass/return values.
</details>

<details><summary>What's the output of `[1, 2, 3][::-1]` and `"abc"[1:]`?</summary>

`[3, 2, 1]` and `"bc"`.
</details>

## Questions asked at top companies

<details><summary>What is the difference between a list and a tuple? <em>· Amazon, Infosys, TCS (Python roles)</em></summary>

Lists are mutable (append, remove, assign); tuples are immutable, slightly faster, hashable when their items are hashable (usable as dict keys / set members), and used for fixed records and multiple return values (`return x, y`).
</details>

<details><summary>Explain `*args` and `**kwargs`. <em>· Microsoft, Accenture, Goldman Sachs</em></summary>

`*args` collects extra positional arguments into a tuple; `**kwargs` collects extra keyword arguments into a dict. Used for flexible APIs, decorators and forwarding arguments (`f(*args, **kwargs)`).
</details>

<details><summary>What is the GIL and how does it affect concurrency? <em>· Google, Uber, Walmart</em></summary>

The Global Interpreter Lock lets only one thread execute Python bytecode at a time in CPython. Threads still help for I/O-bound work (the GIL is released while waiting); CPU-bound work needs multiprocessing, native extensions (NumPy releases the GIL), or the experimental free-threaded build in 3.13+. asyncio gives high I/O concurrency on one thread.
</details>

<details><summary>Mutable default argument bug: `def add(x, items=[])`. What's wrong? <em>· Amazon, Microsoft, Uber (classic)</em></summary>

The default list is created once at function definition and shared across calls, so items accumulate between calls. Use `items=None` then `if items is None: items = []`.
</details>

<details><summary>`==` vs `is`? <em>· Infosys, Wipro, Amazon</em></summary>

`==` compares values (`__eq__`); `is` compares object identity. Use `is` for `None`, `True`, `False` singletons; small integers and interned strings may make `is` look like it works for values — never rely on it.
</details>

<details><summary>How is Python different from Java at runtime? <em>· Product companies hiring Java devs into AI teams</em></summary>

Python is dynamically typed and interpreted to bytecode run by a VM (CPython) without a JIT in the default build (CPython 3.13 adds an experimental JIT), uses reference counting + cycle GC, and has the GIL. Java is statically typed with JIT-compiled bytecode and tracing GCs. Python trades raw speed for developer speed and a vast scientific ecosystem.
</details>

<details><summary>What are list comprehensions and when shouldn't you use them? <em>· Meta, Amazon</em></summary>

Concise syntax to build lists from iterables with optional filtering. Avoid when logic is complex (nested conditions, side effects) — a regular loop is clearer; for huge data use a generator expression `( ... )` to avoid building the whole list in memory.
</details>

<details><summary>What does `if __name__ == "__main__":` do? <em>· TCS, Capgemini</em></summary>

`__name__` is `"__main__"` only when the file is run directly; the block runs the program's entry point but not when the module is imported by another module.
</details>

<details><summary>Shallow vs deep copy in Python. <em>· Goldman Sachs, Walmart</em></summary>

`list(x)`, `x[:]`, `x.copy()`, `copy.copy` copy only the outer container; nested objects are shared. `copy.deepcopy` recursively copies everything.
</details>

<details><summary>How do you handle exceptions properly in Python? <em>· Microsoft, Atlassian</em></summary>

Catch specific exception types, use `else`/`finally` appropriately, re-raise with context (`raise NewError(...) from e`), never bare `except:` (catches KeyboardInterrupt/SystemExit), and use context managers for cleanup.
</details>

## End-to-end scenarios

<details><summary>Scenario: Translate this Java method to idiomatic Python — count word frequencies in a text and return the top 3.</summary>

```python
from collections import Counter
import re

def top_words(text: str, k: int = 3) -> list[tuple[str, int]]:
    words = re.findall(r"[a-z']+", text.lower())
    return Counter(words).most_common(k)

top_words("the cat and the hat and the bat")   # [('the', 3), ('and', 2), ('cat', 1)]
```
Points: standard library (`Counter`) over a hand-written HashMap loop, regex tokenisation, type hints, default argument.
</details>

<details><summary>Scenario: Your teammate's Python script reads a 3 GB log file with `f.read().splitlines()` and crashes. Fix it.</summary>

Reading the whole file builds a 3 GB string plus a list of lines. Iterate lazily: `with open(path, encoding="utf-8") as f: for line in f: ...` (one line in memory at a time), aggregate counts incrementally, and use generators for processing pipelines. For structured logs, consider pandas with `chunksize` or polars streaming.
</details>
