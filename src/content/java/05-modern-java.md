---
title: Modern Java 8 → 21 — Lambdas, Streams, Records, Sealed Types, Pattern Matching
level: 2
tags: streams, lambdas, java17, java21
---
<!-- deepened -->

## Start here: the basics

### From loops to streams
Old style tells the computer **how** step by step; streams describe **what** you want.

```java
List<String> names = List.of("riya", "arjun", "kabir", "anita");

// Imperative
List<String> result = new ArrayList<>();
for (String n : names) {
    if (n.startsWith("a")) result.add(n.toUpperCase());
}

// Declarative with a stream
List<String> result2 = names.stream()
        .filter(n -> n.startsWith("a"))   // keep matching items
        .map(String::toUpperCase)         // transform each item
        .toList();                        // collect the result → [ARJUN, ANITA]
```

### What is a lambda?
A lambda is a **short anonymous function** you can pass around: `(parameters) -> expression`.

```java
Comparator<String> byLength = (a, b) -> Integer.compare(a.length(), b.length());
Runnable hello = () -> System.out.println("hello");
Function<Integer, Integer> square = x -> x * x;   // square.apply(5) == 25
```
A **method reference** is an even shorter lambda that just calls an existing method: `String::toUpperCase`, `System.out::println`.

### The stream pipeline: source → intermediate ops → terminal op
| Kind | Examples | Notes |
|---|---|---|
| Source | `list.stream()`, `Arrays.stream(arr)`, `Stream.of(…)`, `IntStream.range(0, n)` | |
| Intermediate (lazy) | `filter`, `map`, `flatMap`, `distinct`, `sorted`, `limit`, `skip` | Return a new stream; nothing runs yet |
| Terminal (runs it) | `toList`, `collect`, `forEach`, `count`, `sum`, `reduce`, `anyMatch`, `findFirst` | Produces a result |

### Optional — a box that may be empty
Instead of returning `null` (and risking `NullPointerException`), return `Optional<User>`:
```java
Optional<User> u = repo.findByEmail(email);
String name = u.map(User::name).orElse("guest");
```

### Records — data classes in one line
```java
public record Point(int x, int y) {}    // constructor, getters x()/y(), equals, hashCode, toString — all generated
```

### `var` — let the compiler infer local types
```java
var map = new HashMap<String, List<Integer>>();   // type is still static; just less typing
```

### Java version timeline you should know
Java 8 (2014: lambdas, streams, Optional, java.time) → 11 (LTS) → 17 (LTS: records, sealed classes, text blocks) → 21 (LTS: virtual threads, pattern matching for switch) → 25 (LTS, 2025). Most companies run 17 or 21 today.

---

## Functional interfaces & lambdas

A lambda targets a **functional interface** (exactly one abstract method). Core ones in `java.util.function`:

| Interface | Signature | Example |
|---|---|---|
| `Supplier<T>` | `() -> T` | `() -> new ArrayList<>()` |
| `Consumer<T>` | `T -> void` | `System.out::println` |
| `Function<T,R>` | `T -> R` | `String::length` |
| `Predicate<T>` | `T -> boolean` | `s -> s.isEmpty()` |
| `BiFunction<T,U,R>`, `UnaryOperator<T>`, `BinaryOperator<T>` | | `Integer::sum` |
| Primitive specialisations | `IntFunction`, `ToIntFunction`, `IntPredicate`… | avoid boxing |

**Effectively final capture**: lambdas capture *values* of local variables, so locals must not change after capture. Fields/`this` can be captured and mutated (with all the thread-safety consequences).

**Lambda vs anonymous class**: lambda has no own `this` (it's the enclosing instance), no new scope for variable names, compiled via `invokedynamic` (no extra `.class`), and non-capturing lambdas are a **singleton** instance.

Method references: static (`Integer::parseInt`), bound instance (`str::equals`), unbound instance (`String::toUpperCase`), constructor (`ArrayList::new`).

## Streams — how they actually execute

```java
List<String> top = orders.stream()             // source
    .filter(o -> o.amount() > 1000)            // intermediate (lazy, stateless)
    .map(Order::customer)                      // intermediate (lazy, stateless)
    .distinct()                                // intermediate (stateful)
    .sorted(comparing(Customer::name))         // intermediate (stateful, barrier)
    .limit(10)                                 // short-circuiting
    .map(Customer::name)
    .toList();                                 // terminal — triggers everything
```

Key facts:
1. **Lazy**: nothing runs until a terminal op.
2. **Vertical (loop fusion) execution**: each element flows through the whole pipeline before the next element — not stage by stage. `filter` then `map` is one pass.
3. **Short-circuiting** (`findFirst`, `anyMatch`, `limit`) can stop early — even on infinite streams (`Stream.iterate`).
4. **Stateful ops** (`sorted`, `distinct`) must buffer — `sorted` is a full barrier.
5. A stream can be consumed **once**.
6. Streams of primitives: `mapToInt(...).sum()` avoids boxing — measurable in hot paths.

### Collectors you must be fluent with

```java
// group & count
Map<String, Long> byCity = users.stream().collect(groupingBy(User::city, counting()));

// group to sorted map with downstream mapping
TreeMap<Dept, List<String>> names = emps.stream()
    .collect(groupingBy(Emp::dept, TreeMap::new, mapping(Emp::name, toList())));

// partition
Map<Boolean, List<Emp>> seniors = emps.stream().collect(partitioningBy(e -> e.age() > 40));

// toMap with merge (else IllegalStateException on duplicate keys!)
Map<String, Integer> maxSalary = emps.stream()
    .collect(toMap(Emp::dept, Emp::salary, Integer::max));

// top salary per dept
Map<Dept, Optional<Emp>> top = emps.stream()
    .collect(groupingBy(Emp::dept, maxBy(comparingInt(Emp::salary))));

// statistics
IntSummaryStatistics stats = emps.stream().mapToInt(Emp::salary).summaryStatistics();

// joining
String csv = names.stream().collect(joining(", ", "[", "]"));

// frequency of chars, keeping first-seen order
Map<Character, Long> freq = s.chars().mapToObj(c -> (char) c)
    .collect(groupingBy(Function.identity(), LinkedHashMap::new, counting()));

// first non-repeating character (a very common "streams" interview question)
Optional<Character> firstUnique = freq.entrySet().stream()
    .filter(e -> e.getValue() == 1).map(Map.Entry::getKey).findFirst();

// second highest salary
Optional<Integer> second = emps.stream().map(Emp::salary).distinct()
    .sorted(Comparator.reverseOrder()).skip(1).findFirst();

// flatMap: all distinct skills across employees
Set<String> skills = emps.stream().flatMap(e -> e.skills().stream()).collect(toSet());

// Java 12 teeing: min and max in one pass
var range = nums.stream().collect(teeing(minBy(naturalOrder()), maxBy(naturalOrder()),
                                         (min, max) -> List.of(min.get(), max.get())));
```

`Stream.toList()` (Java 16) returns an **unmodifiable** list; `collect(Collectors.toList())` returns a mutable `ArrayList` (not guaranteed by spec).

### `reduce` vs `collect`
`reduce` is for **immutable** combination (`sum`, `max`). Using `reduce` to accumulate into a mutable `ArrayList` is a bug in parallel streams. `collect` is **mutable reduction** with supplier/accumulator/combiner.

### Parallel streams — when *not* to use them
- Run on the **common ForkJoinPool** — shared across the whole JVM.
- Good: large, easily splittable sources (`ArrayList`, arrays, `IntStream.range`), CPU-bound, stateless, associative ops, N × Q > ~10 000.
- Bad: `LinkedList`/`Stream.iterate` (poor splitting), I/O or blocking calls (starve the pool), small data, ordered ops like `findFirst`/`limit` on ordered streams, shared mutable state.
- Ordering: `forEach` on parallel is unordered; `forEachOrdered` restores order (and loses parallelism benefits).

## Optional — the senior's rules
- Return type only. **Not** for fields, parameters, or collections (`Optional<List>` → return empty list).
- Never `opt.get()` without check → use `orElse`, `orElseGet` (lazy!), `orElseThrow`, `map`, `flatMap`, `ifPresentOrElse`.
- `orElse(expensive())` **always evaluates** `expensive()`; `orElseGet(() -> expensive())` only if empty. Common bug: `orElse(repo.save(new User()))` saves every time.

## Records (16), sealed classes (17), pattern matching (16–21)

These combine into **algebraic data types** — the modern way to model domains:

```java
public sealed interface PaymentResult permits Success, Declined, Pending {}
public record Success(String txnId, long amountMinor) implements PaymentResult {}
public record Declined(String reason, boolean retryable) implements PaymentResult {}
public record Pending(Duration retryAfter) implements PaymentResult {}

// Java 21: pattern matching for switch + record deconstruction; compiler checks exhaustiveness
String describe(PaymentResult r) {
    return switch (r) {
        case Success(var id, var amt) when amt > 1_000_00 -> "Big payment " + id;
        case Success s                                    -> "Paid " + s.txnId();
        case Declined(var reason, var retry) when retry   -> "Retry: " + reason;
        case Declined d                                   -> "Failed: " + d.reason();
        case Pending p                                    -> "Wait " + p.retryAfter();
    };   // no default needed: sealed hierarchy is exhaustive; adding a subtype = compile error here
}
```

- **Sealed**: `permits` restricts subclasses; subclasses must be `final`, `sealed` or `non-sealed`.
- `instanceof` pattern: `if (obj instanceof String s && s.length() > 3)`.
- **Switch expressions** (14): `->` arms, no fall-through, `yield` for blocks, must be exhaustive.
- **Text blocks** (15): `"""` multi-line strings for JSON/SQL.
- `var` (10): local type inference — use when the type is obvious from the RHS.

## Other features worth naming

| Version | Feature | Interview angle |
|---|---|---|
| 8 | Default & static interface methods | Diamond problem resolution: class wins, then most specific interface, else must override and call `X.super.m()` |
| 8 | `java.time` | Immutable, thread-safe. `Instant` (machine time, UTC), `LocalDateTime` (no zone — don't store events in it!), `ZonedDateTime`, `Duration` vs `Period` |
| 9 | Modules (JPMS), `List.of`/`Map.of` (immutable, null-hostile) | Strong encapsulation; `--add-opens` errors in reflection-heavy libs |
| 11 | `HttpClient`, `String.strip/isBlank/lines/repeat` | LTS |
| 17 | Sealed, records final, strong encapsulation of JDK internals | LTS — common baseline (Spring Boot 3 requires 17) |
| 21 | Virtual threads, pattern matching for switch, record patterns, **sequenced collections** (`getFirst`, `getLast`, `reversed()`) | LTS — current target |
| 22–25 | Unnamed variables `_`, FFM API (Panama), stream gatherers, scoped values, structured concurrency, compact source files | 25 is the newest LTS |

## Quick check questions

<details><summary>1. Why must local variables captured by lambdas be effectively final?</summary>

The lambda captures a *copy* of the value (locals live on the stack and may be gone when the lambda runs, possibly on another thread). Allowing mutation would make the copy and the original diverge silently and invite data races. Mutable state must be explicit (field, array, AtomicX).
</details>

<details><summary>2. How many times does `filter` run in `Stream.of(1..1_000_000).filter(...).findFirst()`?</summary>

Only until the first match — streams are lazy and execute element-by-element through the pipeline, and `findFirst` short-circuits.
</details>

<details><summary>3. `Collectors.toMap` throws IllegalStateException in production — why?</summary>

Duplicate keys. The 2-arg `toMap` has no merge function. Supply one (`(a,b) -> a`) or use `groupingBy`. Also: `toMap` throws NPE on null **values** (uses `HashMap.merge`).
</details>

<details><summary>4. When is a parallel stream slower than a sequential one?</summary>

Small datasets (split/merge overhead dominates), poorly splittable sources (LinkedList, iterate, I/O-backed), ordered short-circuit ops, boxing-heavy pipelines, contention on shared state, or when the common pool is busy/blocked by other work.
</details>

<details><summary>5. What problem do sealed interfaces + records solve compared to a class hierarchy with instanceof chains?</summary>

They make the set of variants closed and known to the compiler, so `switch` can be checked for exhaustiveness — adding a new variant breaks compilation at every unhandled switch instead of silently falling into a default branch at runtime. It's data-oriented programming / ADTs.
</details>

<details><summary>6. Default methods: class `C implements A, B`, both define `default void hi()`. What happens?</summary>

Compile error unless C overrides `hi()`. Inside it can delegate with `A.super.hi()`. Rules: (1) class/superclass methods win over interface defaults, (2) more specific (sub)interface wins, (3) otherwise must override.
</details>

## Practice (classic "Java 8 coding" round questions)
1. Group employees by department and find the average salary, sorted by average desc.
2. Find duplicate elements in a list using streams.
3. Count word frequency in a paragraph, top 3 words.
4. Given `List<List<Integer>>`, flatten, dedupe and sort descending.
5. Convert a list of strings into a map of string → length, keeping insertion order.
6. Find the longest string per first letter.

## Questions asked at top companies

<details><summary>What is a functional interface? Can you write your own? <em>· Infosys, Amazon, Deloitte</em></summary>

An interface with exactly one abstract method (default/static methods allowed), usable as a lambda target. Annotate with `@FunctionalInterface` so the compiler enforces it: `@FunctionalInterface interface Validator<T> { boolean validate(T t); }`.
</details>

<details><summary>Difference between `map` and `flatMap`. <em>· Walmart, Paytm, Accenture</em></summary>

`map` transforms each element into exactly one element (`Stream<List<X>>` stays nested). `flatMap` transforms each element into a stream and flattens them into one stream (`Stream<List<X>>` → `Stream<X>`). Same idea for Optional.
</details>

<details><summary>Intermediate vs terminal operations; what does lazy evaluation mean? <em>· Goldman Sachs, Infosys</em></summary>

Intermediate ops build a pipeline description and return a stream; nothing executes until a terminal op runs. Then elements flow one by one through the fused pipeline, enabling short-circuiting (`findFirst` stops early).
</details>

<details><summary>Find the second highest salary of employees using streams. <em>· Very common Java 8 coding question at Indian product & service companies</em></summary>

```java
Optional<Integer> second = employees.stream().map(Employee::salary).distinct()
        .sorted(Comparator.reverseOrder()).skip(1).findFirst();
```
</details>

<details><summary>Group employees by department and count them / average their salary. <em>· Amazon, Capgemini, EPAM</em></summary>

```java
Map<String, Long> count = emps.stream().collect(groupingBy(Employee::dept, counting()));
Map<String, Double> avg = emps.stream().collect(groupingBy(Employee::dept, averagingDouble(Employee::salary)));
```
</details>

<details><summary>Find the first non-repeated character in a string using streams. <em>· Walmart, Infosys, TCS Digital</em></summary>

```java
Character c = s.chars().mapToObj(ch -> (char) ch)
        .collect(groupingBy(Function.identity(), LinkedHashMap::new, counting()))
        .entrySet().stream().filter(e -> e.getValue() == 1)
        .map(Map.Entry::getKey).findFirst().orElse(null);
```
</details>

<details><summary>`Optional.orElse` vs `orElseGet`? <em>· Goldman Sachs, Morgan Stanley</em></summary>

`orElse(x)` always evaluates `x` (even when a value is present); `orElseGet(supplier)` only calls the supplier when empty. Matters when the fallback is expensive or has side effects.
</details>

<details><summary>Are parallel streams always faster? <em>· Microsoft, Uber</em></summary>

No. They use the shared common ForkJoinPool; overhead dominates for small data; poor for LinkedList/I-O/blocking work; ordering constraints hurt. Use for large, CPU-bound, splittable, stateless workloads, and measure.
</details>

<details><summary>What are records and what are their limitations? <em>· Atlassian, Oracle</em></summary>

Immutable data carriers with auto-generated constructor, accessors, equals/hashCode/toString. Final, can't extend other classes (can implement interfaces), fields are final (shallowly immutable), no instance fields beyond components. Not suitable as JPA entities (need no-arg constructor & mutability).
</details>

<details><summary>What are sealed classes and why pair them with pattern matching? <em>· Oracle, Google</em></summary>

They restrict which classes may extend/implement a type (`permits`). The compiler then knows all subtypes, so a `switch` over them can be checked for exhaustiveness without `default` — adding a new subtype breaks compilation where it isn't handled.
</details>

<details><summary>What's the difference between `Collectors.toList()` and `Stream.toList()`? <em>· EPAM, Thoughtworks</em></summary>

`Stream.toList()` (16+) returns an unmodifiable list and allows nulls; `Collectors.toList()` returns a (currently) mutable ArrayList with no mutability guarantee in the spec.
</details>

<details><summary>Explain default methods and the diamond problem. <em>· Infosys, Wipro, Amazon</em></summary>

Default methods add implementations to interfaces without breaking implementers. If a class inherits the same default from two interfaces, it must override and can delegate via `A.super.m()`. Class methods always win over interface defaults.
</details>

## End-to-end scenarios

<details><summary>Scenario: Given a list of orders (customerId, city, amount, date), produce a report: for each city, the top 3 customers by total spend this month. Write it with streams.</summary>

```java
Map<String, List<String>> top3 = orders.stream()
    .filter(o -> YearMonth.from(o.date()).equals(YearMonth.now()))
    .collect(groupingBy(Order::city,
             groupingBy(Order::customerId, summingDouble(Order::amount))))
    .entrySet().stream()
    .collect(toMap(Map.Entry::getKey, e -> e.getValue().entrySet().stream()
            .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
            .limit(3).map(Map.Entry::getKey).toList()));
```
Discuss using `BigDecimal`/long paise for money, and moving this aggregation to SQL (`GROUP BY` + window `ROW_NUMBER()`) for large data.
</details>

<details><summary>Scenario: Model the result of a payment call (success / declined / pending) so callers can't forget a case.</summary>

Sealed interface `PaymentResult permits Success, Declined, Pending` with records for each; callers use a `switch` with record patterns — the compiler enforces exhaustiveness. Compared with an enum + nullable fields or exceptions for control flow, this keeps data per case and fails at compile time when a new case appears.
</details>
