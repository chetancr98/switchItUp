---
title: JVM Internals — Class Loading, Memory Areas & Execution
level: 1
tags: jvm, classloader, jit, memory
---
<!-- deepened -->

## Start here: the basics

### What problem does the JVM solve?
A computer's CPU only understands **machine code** — instructions specific to that chip (Intel x86, Apple ARM…). Languages like C compile straight to machine code, so a program compiled for Windows/Intel won't run on a Mac/ARM.

Java takes a different route:

```
You write        javac compiles        The JVM on each machine runs it
Hello.java  ──►  Hello.class      ──►  Windows JVM / Mac JVM / Linux JVM
(source)         (bytecode — the same file everywhere)
```

**Bytecode** is a compact instruction set for an imaginary computer — the **Java Virtual Machine**. Every operating system has its own JVM implementation that understands bytecode. That's the meaning of *"write once, run anywhere."*

### JDK vs JRE vs JVM (asked in almost every fresher interview)
| Term | What it is | Contains |
|---|---|---|
| **JVM** | The engine that executes bytecode | Class loader, memory areas, interpreter, JIT compiler, garbage collector |
| **JRE** (Java Runtime Environment) | What you need to *run* Java apps | JVM + standard libraries (`java.lang`, `java.util`…) |
| **JDK** (Java Development Kit) | What you need to *build* Java apps | JRE + tools: `javac`, `jar`, `javadoc`, `jdb`, `jcmd` |

(Since Java 11, Oracle no longer ships a separate JRE download, but the concept is still asked.)

### Your first program, step by step
```java
public class Hello {
    public static void main(String[] args) {
        System.out.println("Hello, world");
    }
}
```
```bash
javac Hello.java     # creates Hello.class (bytecode)
java Hello           # starts a JVM, loads Hello.class, calls main()
```
- `public` — the JVM must be able to call it from outside.
- `static` — the JVM calls `main` without creating an object of `Hello`.
- `void` — returns nothing to the JVM (use `System.exit(code)` for exit codes).
- `String[] args` — command-line arguments.

### Memory in one picture — stack vs heap
Think of a restaurant: the **heap** is the big shared storeroom where all ingredients (objects) are kept; each cook (thread) has a small personal **stack** — a notepad of what they're currently doing (method calls and local variables).

```java
void order() {
    int qty = 2;                       // primitive local → lives in this method's stack frame
    Pizza p = new Pizza("Margherita"); // reference 'p' lives on the stack;
}                                      // the Pizza object lives on the heap
```
When `order()` returns, its stack frame disappears instantly. The Pizza object stays on the heap until the **garbage collector** sees nothing references it any more and frees it. You never call `free()` in Java.

### Interpreter + JIT in plain words
The JVM first **interprets** bytecode line by line (slow but starts instantly). It also counts which methods run often. Hot methods get **compiled to real machine code** by the **JIT (Just-In-Time) compiler**, so long-running Java programs become very fast. That's why Java servers "warm up".

### Key vocabulary before the deep dive
- **Class loading** — finding a `.class` file and turning it into a usable class in memory.
- **Metaspace** — where the JVM keeps information *about* classes (methods, field names).
- **Garbage collection (GC)** — automatic cleanup of unreachable heap objects.
- **Thread** — an independent path of execution with its own stack.

---

## Why interviewers ask this

"What happens when you run `java Main`?" is a calibration question. Senior candidates answer it in layers: **launcher → class loading → linking → initialization → interpretation → JIT → GC**. Juniors say "the JVM runs bytecode".

## The big picture

```
 Main.java ──javac──► Main.class (bytecode, platform independent)
                          │
            ┌─────────────▼──────────────────────────────────────┐
            │                 JVM process                        │
            │  ClassLoader subsystem: Load → Link → Initialize   │
            │                                                    │
            │  Runtime data areas                                │
            │   Shared:   Heap (Young: Eden,S0,S1 | Old)         │
            │             Metaspace (class metadata, native mem) │
            │             Code cache (JIT-compiled native code)  │
            │   Per-thread: PC register, JVM stack (frames),     │
            │               native method stack                  │
            │                                                    │
            │  Execution engine: Interpreter + JIT (C1, C2) + GC │
            └────────────────────────────────────────────────────┘
```

## Class loading

### The three phases

1. **Loading** — find the `.class` bytes (file, jar, network, generated) and create a `Class` object in the heap, metadata in Metaspace.
2. **Linking**
   - **Verification** — bytecode verifier checks type safety, stack-map frames, no illegal jumps. This is why you cannot hand-craft bytecode that corrupts memory.
   - **Preparation** — allocate static fields and set them to **default** values (`0`, `null`, `false`) — *not* your initial values yet.
   - **Resolution** — symbolic references in the constant pool (`java/lang/String`) become direct references. Usually lazy.
3. **Initialization** — run `<clinit>`: static initializers and static field assignments, in textual order. **Thread-safe** — the JVM takes a lock per class.

A class is initialized on **first active use**: `new`, static method call, non-constant static field access, reflection (`Class.forName`), subclass init, or being the main class. Referencing a `static final` compile-time constant does **not** trigger init (it's inlined by javac).

```java
class Holder {
    static { System.out.println("Holder init"); }
    static final int CONST = 42;          // compile-time constant — inlined
    static final Integer BOXED = 42;      // NOT a compile-time constant
}
// Holder.CONST  -> prints nothing
// Holder.BOXED  -> prints "Holder init"
```

This is exactly why the **Initialization-on-demand holder** singleton is lazy and thread-safe without `synchronized`:

```java
public final class Config {
    private Config() {}
    private static class Holder { static final Config INSTANCE = new Config(); }
    public static Config get() { return Holder.INSTANCE; } // Holder initialized on first call, JVM guarantees once
}
```

### ClassLoader hierarchy & parent delegation

| Loader | Loads | Notes |
|---|---|---|
| Bootstrap | `java.base` (`java.lang.*` …) | Native, represented as `null` |
| Platform (was Extension) | Other JDK modules (`java.sql` …) | Java 9+ |
| Application (System) | Your classpath / module path | `ClassLoader.getSystemClassLoader()` |
| Custom | Anything | Tomcat per-webapp loaders, OSGi, Spring Boot `LaunchedClassLoader` |

**Parent delegation:** `loadClass` asks the parent first; only if the parent can't find it does the child try. Why?
- **Security** — you can't ship your own `java.lang.String`.
- **Consistency** — one `Object` class for everyone.

**Class identity = (fully-qualified name, defining ClassLoader).** Same bytes loaded by two loaders are *two different classes* → the classic `ClassCastException: com.x.Foo cannot be cast to com.x.Foo` in app servers and hot-reload tools.

Tomcat deliberately **inverts** delegation for webapp classes (child-first) so each app can bring its own library versions.

### Metaspace leaks

Each custom loader pins every class it loaded. If something long-lived (a static field in a parent-loaded class, a `ThreadLocal` on a pooled thread, a JDBC driver registered in `DriverManager`) references one object from that loader, **the whole loader and all its classes can't be collected** → `OutOfMemoryError: Metaspace` after N redeploys.

## Runtime data areas in depth

### Heap
- Shared by all threads, home of all objects and arrays (subject to escape analysis — see JIT).
- Generational in most collectors: **Young (Eden + 2 Survivor)** and **Old**. Objects are born in Eden, survive minor GCs by copying between survivors, and are promoted after crossing the tenuring threshold (default up to 15).
- Sized by `-Xms` / `-Xmx`. In containers use `-XX:MaxRAMPercentage=75` instead of hard-coding.

### JVM stack & frames
Each thread gets its own stack of **frames**, one per method invocation. A frame holds:
- **Local variable array** (slot 0 = `this` for instance methods)
- **Operand stack** — the JVM is a *stack machine*: `iadd` pops two ints, pushes the sum
- Reference to the runtime constant pool of the class

Deep recursion → `StackOverflowError`. Tune with `-Xss` (default ~1 MB on 64-bit Linux). Each platform thread reserves its stack, which is why 10 000 platform threads hurt and virtual threads don't (their stacks live on the heap as chunks).

### Metaspace (Java 8+)
Replaced PermGen. Holds class metadata, method bytecode, constant pools — in **native memory**, grows automatically. Cap with `-XX:MaxMetaspaceSize`. String literals and static fields live in the **heap** (since Java 7/8), not Metaspace.

### Code cache
Native code produced by the JIT. If it fills up the JIT stops compiling ("CodeCache is full. Compiler has been disabled") and performance falls off a cliff. `-XX:ReservedCodeCacheSize`.

## Seeing bytecode

```java
public int add(int a, int b) { return a + b; }
```
```
$ javap -c -v Calc.class
  public int add(int, int);
    Code:
       0: iload_1        // push local 1 (a)
       1: iload_2        // push local 2 (b)
       2: iadd           // pop 2, push sum
       3: ireturn
```

Useful bytecode facts for interviews:
- `invokevirtual` (normal instance), `invokeinterface`, `invokestatic`, `invokespecial` (constructors, private, `super`), `invokedynamic` (lambdas, string concat since Java 9).
- Lambdas don't create a `.class` file per lambda; `invokedynamic` + `LambdaMetafactory` spins up a hidden class at first call.
- `s1 + s2` compiles to `invokedynamic makeConcatWithConstants` since Java 9 (was `StringBuilder` chain).
- `switch` on String compiles to `hashCode()` switch + `equals()` check.

## Execution engine: interpreter + JIT

HotSpot starts by **interpreting** bytecode and profiles as it runs. Hot methods are compiled:

| Tier | Compiler | Purpose |
|---|---|---|
| 0 | Interpreter | Collect profile |
| 1–3 | **C1** (client) | Fast compile, light optimisation, with profiling |
| 4 | **C2** (server) | Aggressive optimisation using profile data |

This is **tiered compilation** (default). Thresholds are ~ thousands of invocations / loop back-edges.

### Key JIT optimisations (name them in interviews)
- **Inlining** — the mother of all optimisations; small/hot methods get pasted into callers (`-XX:MaxInlineSize=35` bytes, `FreqInlineSize=325`). Enables everything else.
- **Escape analysis** → **scalar replacement**: if an object never escapes a method, its fields become locals — *no heap allocation at all*. Also **lock elision** for locks on non-escaping objects.
- **Monomorphic / bimorphic call-site inlining** — if a `List` call site only ever saw `ArrayList`, C2 inlines `ArrayList.get` with a cheap type guard. A third type makes it **megamorphic** → virtual call. (This is why "interfaces are slow" is mostly a myth.)
- **Loop unrolling, range-check elimination, dead code elimination, constant folding**.
- **Deoptimization** — if an assumption breaks (new subclass loaded, uncommon trap hit), the compiled code is thrown away and execution falls back to the interpreter. Visible as `made not entrant` in `-XX:+PrintCompilation`.

### Warm-up
Because of profiling + JIT, a fresh JVM is slow for the first seconds/minutes. Consequences:
- Microbenchmarks without warm-up lie → use **JMH**.
- Services see latency spikes after deploy → warm-up traffic, **CDS/AppCDS** (class data sharing), **CRaC** (checkpoint/restore), or **GraalVM native image** (AOT, instant start, lower peak throughput, no dynamic class loading without config).

## Object layout & memory cost

On 64-bit HotSpot with compressed oops (heap < 32 GB):

```
Object header: mark word (8 bytes) + klass pointer (4 bytes compressed) = 12 bytes
+ fields, aligned to 8 bytes

new Object()          -> 16 bytes
new Integer(5)        -> 16 bytes (12 header + 4 int)
new int[0]            -> 16 bytes (12 header + 4 length)
"hello" (String)      -> 24 (String) + 24 (byte[5] with header, padded) ≈ 48 bytes
```

- **Mark word** stores identity hash, GC age, lock state (thin/inflated lock pointers).
- **Compressed oops**: references are 32-bit offsets × 8 → addresses up to 32 GB. Crossing `-Xmx32g` silently makes every reference 8 bytes; a 31 GB heap often holds *more* than a 33 GB one.
- `Integer` cache: `Integer.valueOf` caches **−128..127**. `Integer a=127,b=127; a==b` → true; with 128 → false. Classic trick question.
- Measure with **JOL** (Java Object Layout).

## Strings — the most-asked JVM topic

- Immutable, `final` class. Since Java 9, **compact strings**: `byte[]` + coder (LATIN1 = 1 byte/char, UTF16 = 2).
- **String pool** lives in the heap. Literals are interned automatically; `new String("a")` creates a new object (and the literal "a" is in the pool). `intern()` returns the pooled instance.
- `hashCode` is cached in a field — one reason immutability matters (also security, thread safety, safe as HashMap keys).
- G1 can **deduplicate** backing arrays: `-XX:+UseStringDeduplication`.

```java
String a = "java";
String b = "ja" + "va";        // constant-folded at compile time -> same pooled instance
String c = "ja";
String d = c + "va";           // runtime concat -> new object
a == b  // true
a == d  // false
a == d.intern() // true
```

## Diagnosing a JVM in production (toolbox)

| Tool | Use |
|---|---|
| `jcmd <pid> help` | Swiss-army knife: `GC.heap_info`, `Thread.print`, `GC.heap_dump`, `VM.flags`, `JFR.start` |
| `jstack <pid>` | Thread dump — deadlocks, blocked threads |
| `jmap -dump:live,format=b,file=h.hprof <pid>` | Heap dump → analyse in Eclipse MAT / VisualVM |
| `jstat -gcutil <pid> 1s` | Live GC stats per generation |
| **JFR + JMC** | Low-overhead (<1–2%) continuous profiling in prod |
| async-profiler | CPU / allocation flame graphs, no safepoint bias |
| `-XX:+HeapDumpOnOutOfMemoryError` | Always on in prod |

## Quick check questions

<details><summary>1. Can two classes with the same fully-qualified name coexist in one JVM?</summary>

Yes — if loaded by different ClassLoaders. Runtime class identity is (name, defining loader). Objects of one are not assignable to the other, producing the "cannot cast Foo to Foo" `ClassCastException`. Used intentionally by app servers to isolate webapps and by plugin systems.
</details>

<details><summary>2. Where do static variables live?</summary>

Since Java 8, the static fields themselves live with the `Class` object **in the heap**; the class *metadata* (methods, bytecode, constant pool) lives in **Metaspace** (native memory). Before Java 8, both were in PermGen.
</details>

<details><summary>3. Why might a 33 GB heap hold less data than a 31 GB heap?</summary>

Above ~32 GB the JVM can no longer use compressed oops (32-bit scaled references), so every reference grows from 4 to 8 bytes. Reference-heavy data structures (HashMaps, object graphs) can grow 30–50%, eating more than the extra 2 GB.
</details>

<details><summary>4. What is escape analysis and what can it eliminate?</summary>

C2 analyses whether an object reference escapes the method/thread. If not, it can (a) **scalar-replace** the object — no heap allocation, fields become registers/locals; (b) **elide locks** on it (e.g., a local `StringBuffer`). It's why short-lived builder/iterator objects in hot loops are often free.
</details>

<details><summary>5. Explain StackOverflowError vs OutOfMemoryError.</summary>

`StackOverflowError`: a single thread's stack exceeded `-Xss` (deep/infinite recursion). `OutOfMemoryError` has many flavours: `Java heap space` (live data > Xmx or leak), `GC overhead limit exceeded` (>98% time in GC recovering <2%), `Metaspace` (class loader leak / too many generated classes), `unable to create native thread` (OS thread/ulimit/memory), `Direct buffer memory` (NIO `-XX:MaxDirectMemorySize`). Each has a different fix — naming the variant is what impresses.
</details>

<details><summary>6. Why is the first request after a deploy slow?</summary>

Class loading + interpretation + JIT warm-up, plus cold caches/connection pools. Mitigate with readiness probes that only pass after warm-up, synthetic warm-up traffic, AppCDS to cut class-load time, CRaC, or AOT (GraalVM native image / Leyden in newer JDKs).
</details>

<details><summary>7. When does a class get initialized? Does referencing it always trigger init?</summary>

On first active use: instantiation, static method call, assignment/read of a non-constant static field, reflection, init of a subclass, or being the main class. Not triggered by: referencing a compile-time constant (`static final` primitive/String with constant initializer), declaring a variable of that type, creating an array of that type (`new Foo[10]`), or `Foo.class` literal.
</details>

## Practice
1. Run `javap -c` on code with a lambda, a string switch and a string concat — identify `invokedynamic`.
2. Use JOL to print the layout of a class with `boolean, long, int, Object` fields and explain the padding.
3. Write a custom ClassLoader that loads the same class twice and reproduce the cast exception.

## Questions asked at top companies

<details><summary>Explain the difference between JDK, JRE and JVM. <em>· TCS, Infosys, Amazon (SDE-1 screen)</em></summary>

JVM executes bytecode (class loading, memory management, interpretation/JIT, GC). JRE = JVM + core class libraries needed to run programs. JDK = JRE + development tools (`javac`, `jar`, debugger, profilers). You develop with the JDK and run with a JRE/JVM. Bonus: the JVM is a *specification*; HotSpot (OpenJDK), OpenJ9 and GraalVM are implementations.
</details>

<details><summary>Why is Java platform independent but the JVM platform dependent? <em>· Wipro, Accenture, Paytm</em></summary>

The compiled output (bytecode) is the same on every OS. The JVM translates that bytecode into the native instructions of the machine it runs on, so each OS/CPU needs its own JVM build. Platform independence is pushed down into the JVM.
</details>

<details><summary>Explain the memory areas of the JVM. Which are shared between threads? <em>· Amazon, Flipkart, Oracle</em></summary>

Shared: **heap** (objects, arrays, static field values, string pool) and **metaspace** (class metadata), plus the code cache. Per thread: **JVM stack** (frames with locals & operand stack), **program counter**, **native method stack**. Hence locals are thread-safe by default; heap objects are not.
</details>

<details><summary>What is a ClassLoader? Explain parent delegation and why it exists. <em>· Oracle, SAP Labs, Goldman Sachs</em></summary>

A ClassLoader loads `.class` bytes and defines classes. Hierarchy: Bootstrap → Platform → Application (→ custom). On `loadClass`, a loader first delegates to its parent and only loads itself if the parent fails. Reasons: security (no one can replace `java.lang.String`) and consistency (one copy of core classes). Containers like Tomcat use child-first for webapp isolation.
</details>

<details><summary>What is the difference between ClassNotFoundException and NoClassDefFoundError? <em>· Morgan Stanley, Infosys, Walmart</em></summary>

`ClassNotFoundException` (checked) — you asked to load a class by name at runtime (`Class.forName`, `loadClass`) and it isn't on the classpath. `NoClassDefFoundError` (error) — the class was present at **compile time** but is missing at **runtime**, or its static initializer failed earlier (`ExceptionInInitializerError` the first time, then NoClassDefFoundError afterwards). The second case surprises people.
</details>

<details><summary>What is JIT compilation and how does it differ from AOT? <em>· Microsoft, Uber</em></summary>

JIT compiles hot bytecode to native code at runtime using live profiling data (which branches are taken, which types appear), enabling optimisations like speculative inlining with deoptimisation fallback. AOT (GraalVM native image) compiles everything before running: instant startup and low memory, but lower peak performance and restrictions on reflection/dynamic class loading.
</details>

<details><summary>Can you override a static method or a private method? <em>· Capgemini, Cognizant, Amazon</em></summary>

No. Static methods are resolved at compile time by the reference type — a same-signature static method in a subclass **hides** the parent's. Private methods aren't visible to subclasses, so a same-named method in the subclass is a new, unrelated method. Only instance, non-private, non-final methods are overridable (virtual dispatch).
</details>

<details><summary>Why is `main` static? What happens if you remove `static`? <em>· TCS, HCL, Zoho</em></summary>

The JVM must call `main` before any object exists. Without `static` the code compiles, but launching fails ("main method is not static" / "Error: Main method not found"). Since Java 21 (preview) and 25, instance main methods in compact source files are allowed for teaching — mention it as a bonus.
</details>

<details><summary>What is the String pool and why does `new String("a") == "a"` return false? <em>· Amazon, Goldman Sachs, Adobe</em></summary>

Literal strings are interned in a pool in the heap so identical literals share one object. `new String("a")` explicitly creates a new object on the heap, so `==` (reference comparison) is false while `equals` is true. `intern()` returns the pooled instance.
</details>

<details><summary>What causes OutOfMemoryError: Metaspace and how would you fix it? <em>· Flipkart, Atlassian</em></summary>

Too many classes loaded and never unloaded — typically a ClassLoader leak on redeploys, or frameworks generating proxy classes endlessly (e.g., creating a new CGLIB proxy per request). Diagnose with `jcmd VM.classloader_stats` / heap dump to find what keeps the loader alive; fix the leak; cap with `-XX:MaxMetaspaceSize` so it fails fast.
</details>

<details><summary>How does the JVM decide when to compile a method with C2? <em>· Microsoft, Oracle</em></summary>

Tiered compilation counts invocations and loop back-edges. After thresholds (~thousands) a method moves from interpreter → C1 with profiling → C2 using the gathered profile. Very hot loops can be compiled mid-execution via On-Stack Replacement (OSR).
</details>

<details><summary>What is the difference between stack memory and heap memory? <em>· almost every service & product company</em></summary>

Stack: per thread, stores frames (locals, references, partial results), LIFO, automatically freed on return, small (≈1 MB), fast, overflow → `StackOverflowError`. Heap: shared, stores objects, managed by GC, large, overflow → `OutOfMemoryError: Java heap space`.
</details>

## End-to-end scenarios

<details><summary>Scenario: After every deploy, your Spring Boot service's p99 latency is 3× worse for ~5 minutes, then normal. Explain why and what you'd do.</summary>

Cold JVM: classes load lazily, code runs interpreted, JIT hasn't compiled hot paths yet, connection pools and caches are empty. Actions: (1) readiness probe passes only after a warm-up routine (hit key endpoints internally / prime caches); (2) gradual traffic shift (canary, slow-start on the load balancer); (3) reduce class-loading cost with AppCDS/CDS archives; (4) consider CRaC or GraalVM native image if startup really matters; (5) verify with JFR that the spike is JIT/classloading and not GC or DB pool creation.
</details>

<details><summary>Scenario: A batch job fails after running for 6 hours with `java.lang.OutOfMemoryError: Java heap space`. Walk through your investigation.</summary>

1. Confirm the OOM flavour (heap, not metaspace/native). 2. Ensure `-XX:+HeapDumpOnOutOfMemoryError` is on; rerun or take `jcmd GC.heap_dump` when memory is high. 3. Open the dump in Eclipse MAT → Leak Suspects / Dominator tree → which objects retain the most memory and their path to GC roots. 4. Typical findings: an ever-growing `List` accumulating all records, a static cache without bounds, reading a whole file into memory. 5. Fix: stream/chunk processing, bounded caches, clear per-batch state. 6. Compare `GC.class_histogram` snapshots over time to confirm the fix.
</details>
