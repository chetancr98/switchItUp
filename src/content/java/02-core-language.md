---
title: Core Language Deep Dive — equals/hashCode, Immutability, Generics, Exceptions
level: 1
tags: oop, generics, immutability, exceptions
---
<!-- deepened -->

## Start here: the basics

### Classes and objects
A **class** is a blueprint; an **object** is a thing built from it.

```java
public class BankAccount {
    private final String owner;   // field (state)
    private long balancePaise;    // money in paise to avoid decimal errors

    public BankAccount(String owner) {   // constructor: runs when you do "new"
        this.owner = owner;
    }

    public void deposit(long paise) {    // method (behaviour)
        if (paise <= 0) throw new IllegalArgumentException("amount must be positive");
        balancePaise += paise;
    }

    public long balance() { return balancePaise; }
}

BankAccount acc = new BankAccount("Riya");   // object created on the heap
acc.deposit(50_000);
```

### The four pillars of OOP — in one line each
| Pillar | Meaning | In the example |
|---|---|---|
| **Encapsulation** | Hide data, expose behaviour | `balancePaise` is private; only `deposit` can change it, with validation |
| **Abstraction** | Show *what*, hide *how* | Callers call `deposit()` without knowing how it's stored |
| **Inheritance** | A class reuses/extends another (`extends`) | `SavingsAccount extends BankAccount` |
| **Polymorphism** | One interface, many implementations; the right method chosen at runtime | `Account a = new SavingsAccount(); a.monthlyFee()` calls the savings version |

### Primitives vs references
Java has 8 **primitive** types holding raw values: `byte, short, int, long, float, double, char, boolean`. Everything else is a **reference** — a variable holding the *address* of an object.

```java
int a = 5;  int b = a;  b = 10;      // a is still 5 (value copied)
int[] x = {1}; int[] y = x; y[0] = 9; // x[0] is now 9 (both point to the same array)
```

**Wrapper classes** (`Integer`, `Long`, …) wrap primitives so they can go into collections. Java converts automatically (**autoboxing/unboxing**) — convenient, but `null` unboxing throws `NullPointerException`.

### `==` vs `.equals()`
- `==` on references asks "**same object**?"
- `.equals()` asks "**same meaning**?" (if the class overrides it, like `String`).

```java
String s1 = new String("hi"), s2 = new String("hi");
s1 == s2       // false: two different objects
s1.equals(s2)  // true: same characters
```

### Access modifiers
| Modifier | Class | Package | Subclass | Everywhere |
|---|---|---|---|---|
| `private` | ✅ | ❌ | ❌ | ❌ |
| (default/package-private) | ✅ | ✅ | ❌ (unless same package) | ❌ |
| `protected` | ✅ | ✅ | ✅ | ❌ |
| `public` | ✅ | ✅ | ✅ | ✅ |

### Abstract class vs interface (the eternal question)
- **Interface**: a *capability contract* ("can be compared", "can be sent"). A class can implement **many**. Since Java 8, interfaces can have `default` and `static` methods; since 9, `private` methods. No instance state.
- **Abstract class**: a *partial implementation* with shared state and constructors. A class can extend **only one**.
Rule of thumb: start with an interface; use an abstract class when several implementations share real state/code.

### `final`, `static`, `this`, `super`
- `final` variable → can't be reassigned; `final` method → can't be overridden; `final` class → can't be extended (`String`).
- `static` → belongs to the class, not each object (`Math.max`, counters, constants).
- `this` → the current object; `super` → the parent's version (`super.toString()`, `super(args)` in constructors).

### Exceptions in 30 seconds
Errors your code can't recover from are `Error`s. Problems a caller should handle are **checked exceptions** (must be declared/caught — `IOException`). Programming bugs are **unchecked** (`RuntimeException` — `NullPointerException`, `IllegalArgumentException`).

```java
try (BufferedReader r = Files.newBufferedReader(path)) {   // auto-closed
    return r.readLine();
} catch (IOException e) {
    throw new UncheckedIOException("could not read " + path, e);  // keep the cause!
}
```

---

## OOP — what interviewers actually probe

Not "define polymorphism". They probe **mechanics**:

| Concept | The mechanic behind it |
|---|---|
| Overloading | Resolved at **compile time** by static types of arguments (most specific applicable method). |
| Overriding | Resolved at **runtime** via the vtable (`invokevirtual`). Fields and static methods are **not** overridden — they're hidden. |
| Covariant return | Overriding method can return a subtype. javac emits a **bridge method**. |
| `private` / `static` / `final` methods | Not virtually dispatched → can be inlined trivially. |

```java
class A { String name = "A"; static String s() { return "A"; } String v() { return "A"; } }
class B extends A { String name = "B"; static String s() { return "B"; } @Override String v() { return "B"; } }

A x = new B();
x.name   // "A"  — fields use the static type
x.s()    // "A"  — static methods hidden, not overridden (compiler warns)
x.v()    // "B"  — virtual dispatch
```

**Overload resolution trap:**
```java
void f(Object o) { System.out.println("Object"); }
void f(String s) { System.out.println("String"); }
f(null);          // "String" — most specific
// add f(Integer i) and f(null) no longer compiles: ambiguous
```

Resolution phases: (1) no boxing/varargs, (2) with boxing, (3) with varargs. So `f(long)` beats `f(Integer)` for `f(5)` — widening wins over boxing.

## equals & hashCode contract

1. Equal objects **must** have equal hash codes.
2. Unequal objects *may* share a hash code (collisions are legal, just slow).
3. `equals` must be reflexive, symmetric, transitive, consistent, and `x.equals(null) == false`.

Breaking (1) → `HashSet` contains duplicates, `map.get` returns null for a key you just put.

```java
public final class Money {
    private final long amountMinor;
    private final String currency;

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Money m)) return false;     // pattern matching (Java 16)
        return amountMinor == m.amountMinor && currency.equals(m.currency);
    }
    @Override public int hashCode() { return Objects.hash(amountMinor, currency); }
}
```

**`instanceof` vs `getClass()`** in equals: `instanceof` allows subclass equality but breaks symmetry if a subclass adds state. Effective Java's answer: prefer composition over subclassing value types, or make the class `final`. Records generate correct equals/hashCode for you.

**Mutable keys are poison:** put an object in a HashSet, mutate a field used in `hashCode`, and it's now in the wrong bucket — `contains` returns false and you can't remove it.

## Immutability

Rules for an immutable class:
1. `final` class (or private constructor + static factories) — no subclass can add mutability.
2. All fields `private final`.
3. No setters.
4. **Defensive copies** of mutable inputs *and* outputs.
5. Don't leak `this` during construction.

```java
public final class Order {
    private final List<Item> items;
    private final Instant createdAt;               // Instant is already immutable

    public Order(List<Item> items, Instant createdAt) {
        this.items = List.copyOf(items);           // defensive copy, unmodifiable, null-hostile
        this.createdAt = createdAt;
    }
    public List<Item> items() { return items; }   // safe: already unmodifiable
}
```

`Collections.unmodifiableList(list)` is a **view** — changes to the backing list show through. `List.copyOf` is a true copy.

Why immutability matters at senior level:
- **Thread safety for free** — `final` fields get special JMM guarantees: correctly constructed objects are visible fully initialised to all threads without synchronization (*final field semantics*).
- Safe keys for hash structures, cacheable hash codes.
- Easy reasoning, safe sharing, failure atomicity.

### Records (Java 16)
```java
public record Point(int x, int y) {
    public Point {                       // compact canonical constructor — validation
        if (x < 0 || y < 0) throw new IllegalArgumentException();
    }
}
```
Records are `final`, fields `private final`, generate constructor/accessors/equals/hashCode/toString. **Shallowly** immutable — a `record R(List<String> l)` still exposes a mutable list unless you copy it in the compact constructor.

## Pass-by-value — always

Java passes **copies of references**. You can mutate the object a parameter points to; you can't make the caller's variable point elsewhere.

```java
void reassign(StringBuilder sb) { sb = new StringBuilder("new"); }  // caller unaffected
void mutate(StringBuilder sb)   { sb.append("!"); }                 // caller sees "!"
```

## Generics in depth

### Type erasure
Generics are compile-time only. `List<String>` and `List<Integer>` are both `List` at runtime. Consequences:
- No `new T()`, no `new T[]`, no `instanceof List<String>`, no overloading `f(List<String>)` vs `f(List<Integer>)` (same erasure).
- Casts inserted by the compiler at use sites.
- **Heap pollution** possible with raw types and generic varargs (`@SafeVarargs`).
- Workaround to keep type info: pass `Class<T>` tokens or use "super type tokens" (`new TypeReference<List<Foo>>(){}` in Jackson — anonymous subclass retains generic signature).

### Variance & PECS
Generics are **invariant**: `List<Integer>` is *not* a `List<Number>`. (Arrays are covariant — `Object[] o = new String[1]; o[0] = 1;` compiles and throws `ArrayStoreException`.)

**PECS — Producer `extends`, Consumer `super`:**

```java
// Reads Numbers from src (producer), writes them into dst (consumer)
static <T> void copy(List<? super T> dst, List<? extends T> src) {
    for (T t : src) dst.add(t);
}

double sum(Collection<? extends Number> nums) { ... }   // can read as Number, can't add (except null)
void fill(List<? super Integer> out) { out.add(1); }   // can add Integer, reads come back as Object
```

`Collections.max` signature — a famous one:
```java
public static <T extends Object & Comparable<? super T>> T max(Collection<? extends T> coll)
```
- `Comparable<? super T>` lets `java.sql.Timestamp`-like subtypes that inherit `compareTo` from a parent work.
- `extends Object &` keeps the **erasure** as `Object` for binary compatibility with pre-generics code.

### Bounded types & recursive generics
```java
abstract class Builder<T extends Builder<T>> {     // "curiously recurring" pattern
    abstract T self();
    T name(String n) { ...; return self(); }       // fluent API keeps subtype
}
enum-like: class Enum<E extends Enum<E>> implements Comparable<E>
```

## Exceptions

```
Throwable
├── Error                 (OOM, StackOverflow — don't catch)
└── Exception
    ├── RuntimeException  (unchecked: NPE, IllegalArgument, IllegalState, ConcurrentModification)
    └── IOException, SQLException… (checked)
```

**Senior-level points:**
- Checked exceptions don't compose with lambdas/streams → most modern frameworks (Spring) wrap into unchecked (`DataAccessException`).
- **Never swallow**; if you wrap, preserve the cause: `throw new OrderException("…", e)`.
- `finally` runs even on `return` — and a `return` in `finally` **overrides** the try's return and **swallows** exceptions. Never return from finally.
- **try-with-resources** closes in reverse order; exceptions from `close()` are attached as **suppressed** (`e.getSuppressed()`) rather than masking the primary one.
- Exceptions are expensive mostly because of `fillInStackTrace`. For control-flow-like exceptions in hot paths, override it or use the 4-arg constructor with `writableStackTrace=false`. (Better: don't use exceptions for control flow.)
- Spring's `@Transactional` rolls back on **unchecked** exceptions by default, **not** checked ones — a top interview trap (see Spring module).

```java
static int f() {
    try { throw new RuntimeException("boom"); }
    finally { return 1; }          // returns 1, exception silently lost
}
```

## `static`, `final`, `this` escape, initialization order

Order when you do `new Child()`:
1. Parent static init → Child static init (once, at class init)
2. Parent instance initializers & field initializers → Parent constructor body
3. Child instance initializers & field initializers → Child constructor body

**Overridable method call in constructor** — the parent constructor calls an overridden method that reads a child field that's not initialised yet:

```java
class Parent { Parent() { init(); } void init() {} }
class Child extends Parent {
    private final List<String> list = new ArrayList<>();
    @Override void init() { list.add("x"); }    // NPE: list is still null here
}
```

## `Object` methods you must know
`equals, hashCode, toString, getClass, clone, finalize (deprecated for removal), wait/notify/notifyAll`. `clone` is broken by design (shallow, bypasses constructors, `Cloneable` is a marker with no method) → prefer copy constructors / static factories.

## Quick check questions

<details><summary>1. Why must you override hashCode when you override equals? Give a concrete failure.</summary>

HashMap first finds the bucket by `hashCode`, then compares with `equals`. If two equal objects have different hash codes (default identity hash), they land in different buckets: `set.add(new Money(1,"INR")); set.contains(new Money(1,"INR"))` → `false`, and duplicates accumulate.
</details>

<details><summary>2. Is String immutability only about security?</summary>

No: (1) safe sharing via the string pool, (2) cached hash → fast HashMap keys, (3) thread safety without synchronization, (4) security — class names, file paths, URLs can't be altered after validation (TOCTOU). Since Java 9 strings are also compact (Latin-1 bytes).
</details>

<details><summary>3. Why can't you create a generic array `new T[n]`?</summary>

Arrays are reified and covariant — they check element types at runtime (`ArrayStoreException`). Generics are erased, so the runtime couldn't know what `T` is to enforce it, which would break array type safety. Workarounds: `(T[]) new Object[n]` (unchecked, internal only — like `ArrayList` does), `Array.newInstance(clazz, n)`, or use a `List<T>`.
</details>

<details><summary>4. What does `List<? extends Number>` allow you to do?</summary>

Read elements as `Number`. You cannot add anything except `null`, because the actual list might be `List<Integer>` or `List<Double>` — the compiler can't prove type safety. It's a producer. For a consumer use `? super Integer`.
</details>

<details><summary>5. What happens when an exception is thrown in try and another in close() of a try-with-resources?</summary>

The try-block exception is the one propagated; the close exception is added via `addSuppressed`. In a hand-written try/finally the finally exception would *replace* the original one, which is why try-with-resources is strictly better.
</details>

<details><summary>6. Composition vs inheritance — give a real example where inheritance broke.</summary>

`InstrumentedHashSet extends HashSet` overriding `add` and `addAll` to count insertions double-counts, because `HashSet.addAll` internally calls `add` — the subclass depends on an undocumented implementation detail (fragile base class). Composition (wrap a `Set` and forward) avoids it. Also `Stack extends Vector` and `Properties extends Hashtable` are JDK examples of inheritance mistakes.
</details>

<details><summary>7. Is Java pass-by-reference for objects?</summary>

No — always pass-by-value. For objects, the value passed is a copy of the reference. Mutating through it is visible to the caller; reassigning the parameter is not.
</details>

## Questions asked at top companies

<details><summary>Difference between an abstract class and an interface? When would you pick each? <em>· Amazon, Infosys, Accenture, Deloitte</em></summary>

Interfaces: multiple inheritance of type, no instance fields (only constants), default/static/private methods allowed, express capabilities. Abstract classes: single inheritance, can hold state, constructors, protected members, partial implementation. Pick interfaces for contracts and APIs (enables mocking, multiple roles); abstract classes for a template with shared state (e.g., `AbstractList`). Modern Java also offers sealed interfaces for closed hierarchies.
</details>

<details><summary>What is the contract between equals() and hashCode()? What breaks if you violate it? <em>· Amazon, Goldman Sachs, Flipkart, Walmart</em></summary>

Equal objects must have equal hash codes. If you override `equals` but not `hashCode`, two equal objects hash to different buckets, so `HashSet` stores duplicates and `HashMap.get` with an equal key returns `null`.
</details>

<details><summary>How do you make a class immutable? Why is String immutable? <em>· Goldman Sachs, Morgan Stanley, JP Morgan, Paytm</em></summary>

Final class, private final fields, no setters, initialise in the constructor, defensive copies of mutable inputs/outputs, don't leak `this`. String: pooling safety, cached hashCode, thread safety, security of values used for class loading/file paths/URLs.
</details>

<details><summary>Is Java pass-by-value or pass-by-reference? Prove it with code. <em>· Microsoft, Adobe, TCS Digital</em></summary>

Always pass-by-value; for objects the value is the reference. `void swap(Integer a, Integer b)` can't swap the caller's variables; `void reset(List<Integer> l) { l = new ArrayList<>(); }` doesn't affect the caller, while `l.clear()` does.
</details>

<details><summary>Explain method overloading vs overriding with rules. <em>· Infosys, Wipro, Amazon</em></summary>

Overloading: same name, different parameter lists, same class (or inherited), resolved at compile time; return type alone can't differ. Overriding: same signature in a subclass, resolved at runtime; can't reduce visibility, can't throw broader checked exceptions, can return a covariant (sub)type; `static`/`private`/`final` methods can't be overridden. Use `@Override`.
</details>

<details><summary>What's the output: `try { return 1; } finally { return 2; }`? And what if finally throws? <em>· Oracle, Barclays, Zoho</em></summary>

Returns 2 — the finally return overrides. If finally throws, that exception replaces the original return/exception. Avoid returning or throwing from finally.
</details>

<details><summary>Checked vs unchecked exceptions — and which should a library throw? <em>· Microsoft, SAP Labs</em></summary>

Checked must be declared or caught (recoverable conditions like I/O); unchecked are runtime bugs or unrecoverable conditions. Modern libraries (Spring, JPA) favour unchecked exceptions because checked ones clutter APIs and don't compose with lambdas; use checked only when the caller can realistically recover.
</details>

<details><summary>What is type erasure? Why can't you do `new T()`? <em>· Uber, Atlassian, Amazon</em></summary>

Generic type information exists only at compile time; bytecode uses the raw type plus casts. At runtime `T` is unknown, so you can't instantiate it, create `T[]`, or use `instanceof List<String>`. Pass a `Class<T>` or `Supplier<T>` instead.
</details>

<details><summary>Explain PECS with an example from the JDK. <em>· Google, Goldman Sachs</em></summary>

Producer-Extends, Consumer-Super. `Collections.copy(List<? super T> dest, List<? extends T> src)`: src produces T values (read-only via extends), dest consumes them (write via super). This maximises the types of lists callers can pass.
</details>

<details><summary>What is the difference between `final`, `finally` and `finalize()`? <em>· TCS, Cognizant, HCL</em></summary>

`final`: keyword — constant variable, non-overridable method, non-extendable class. `finally`: block that always runs after try/catch (cleanup). `finalize()`: deprecated `Object` method called by GC before collection — unreliable; use try-with-resources or `Cleaner`.
</details>

<details><summary>Why is composition preferred over inheritance? <em>· Atlassian, Thoughtworks, Uber</em></summary>

Inheritance couples you to the parent's implementation details (fragile base class), exposes the whole parent API, and is fixed at compile time. Composition wraps and delegates, exposes only what you choose, and lets behaviour be swapped at runtime. Use inheritance only for genuine "is-a" with a stable base designed for extension.
</details>

<details><summary>What happens when you put a mutable object as a HashMap key and then modify it? <em>· Amazon, Flipkart</em></summary>

If the modified field participates in `hashCode`, the entry sits in a bucket for the old hash; lookups compute the new hash and miss. The entry is effectively lost (memory leak) and `containsKey` returns false.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a `Money` value class for a payments service. What fields, methods and rules?</summary>

Immutable `final class` / record: `long amountMinor` (paise) + `Currency currency` (never `double`). Factory methods `Money.of(BigDecimal, Currency)` validating scale. Operations return new instances: `plus`, `minus`, `times(long)`, `allocate(int parts)` distributing remainders. Throw on currency mismatch. Correct `equals/hashCode`, `compareTo` within same currency, `toString` for logs. Serialization via Jackson with explicit format. Tests for rounding and remainder distribution.
</details>

<details><summary>Scenario: A colleague's code catches `Exception`, logs "error occurred" and returns null everywhere. Production bugs are impossible to trace. How would you refactor exception handling?</summary>

Define a small hierarchy of domain exceptions (`OrderNotFoundException`, `PaymentDeclinedException`) extending `RuntimeException`; wrap low-level checked exceptions with context and the original cause; never swallow — let them bubble to one global handler (`@RestControllerAdvice`) that maps to HTTP status and logs once with a correlation id and stack trace; replace `null` returns with `Optional` or exceptions; add tests asserting the right exception types.
</details>
