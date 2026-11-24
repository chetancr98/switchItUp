---
title: Garbage Collection & JVM Performance Tuning
level: 4
tags: gc, g1, zgc, performance, memory leak
---
<!-- deepened -->

## Start here: the basics

### What is garbage?
Every `new` puts an object on the heap. When **no variable or reachable object refers to it any more**, it's garbage — the program can never use it again.

```java
void handle() {
    List<String> temp = new ArrayList<>();   // created
    temp.add("x");
}                                            // method ends → 'temp' gone → the list is garbage
```

### Why automatic GC?
In C you must `free()` memory manually — forget and you leak, free twice and you crash. Java's **garbage collector** finds unreachable objects and reclaims their memory for you. The cost: CPU time and occasional **pauses** where your application threads stop.

### How does the GC find garbage? (mark & sweep in plain words)
1. Start from **GC roots** — local variables of running methods, static fields, active threads.
2. **Mark** everything reachable by following references.
3. Everything **not marked** is garbage → **sweep** (free) it, optionally **compact** survivors to avoid fragmentation.

### Generations — the smart trick
Most objects die young (temporary strings, DTOs for one request). So the heap is split:
- **Young generation** — new objects; cleaned very frequently and very quickly (minor GC).
- **Old generation** — objects that survived several cleanups (caches, singletons); cleaned rarely.

### Words you'll see in tuning
| Term | Meaning |
|---|---|
| `-Xms` / `-Xmx` | Initial / maximum heap size |
| Pause / stop-the-world | Time when application threads are frozen for GC |
| Throughput | % of time spent doing your work (not GC) |
| Latency | How long requests take — GC pauses hurt tail latency (p99) |
| Memory leak (Java) | Objects still *reachable* though you no longer need them, so GC can't free them |

### Reading a simple GC log line
```
[5.123s] GC(12) Pause Young (Normal) (G1 Evacuation Pause) 512M->128M(1024M) 9.8ms
```
Heap went from 512 MB used to 128 MB after collection, total heap 1024 MB, pause took 9.8 ms. Healthy.

---

## Reachability, not reference counting

The JVM uses **tracing**: start from **GC roots** and mark everything reachable; the rest is garbage. Cycles are collected naturally.

GC roots: local variables & operand stacks of live threads, static fields of loaded classes, JNI references, active monitors, the system class loader's classes.

## The generational hypothesis

> Most objects die young.

So the heap is split:
- **Young gen** = Eden + Survivor S0 + S1. Collected often (**minor GC**) by **copying** live objects — cost ∝ *live* objects, not heap size. Dead objects cost nothing.
- **Old gen** — objects that survived N minor GCs (tenuring threshold, adaptive, max 15) or are too large (humongous in G1).
- **Card table / remembered sets** track old→young references so minor GC needn't scan the whole old gen. Write barriers maintain them on every reference store.

## Core algorithms

| Algorithm | How | Pros / cons |
|---|---|---|
| Mark-Sweep | Mark live, free the rest into free lists | Fragmentation |
| Mark-Compact | Mark, then slide live objects together | No fragmentation, expensive |
| Copying | Copy live objects to another space | Fast, compacting, needs 2× space for that region |

**Stop-the-world (STW)**: all application threads paused at a **safepoint**. **Concurrent**: GC work runs alongside the app (needs barriers to cope with mutation).

## Collectors (HotSpot, JDK 21+)

| Collector | Flag | Design | Pause | Use |
|---|---|---|---|---|
| Serial | `-XX:+UseSerialGC` | Single-threaded STW | Long | Tiny heaps, containers with 1 CPU |
| Parallel | `-XX:+UseParallelGC` | Multi-threaded STW, throughput-oriented | 100s ms – s | Batch jobs: max throughput |
| **G1** (default) | `-XX:+UseG1GC` | Region-based, mostly concurrent marking, incremental compaction | Target `MaxGCPauseMillis=200` | General purpose, 4–32 GB heaps |
| **ZGC** | `-XX:+UseZGC` (generational by default from JDK 23) | Concurrent everything incl. relocation; coloured pointers + load barriers | **< 1 ms**, independent of heap size | Low-latency services, huge heaps (TBs) |
| Shenandoah | `-XX:+UseShenandoahGC` | Concurrent compaction (Brooks/forwarding) | ms | Low latency (Red Hat builds) |
| Epsilon | `-XX:+UseEpsilonGC` | No-op | none | Benchmarks, ultra-short jobs |

CMS was removed in JDK 14 — if someone asks about CMS, mention that and pivot to G1/ZGC.

### G1 in depth
- Heap divided into ~2048 equal **regions** (1–32 MB), each dynamically Eden, Survivor, Old or **Humongous** (object ≥ ½ region → contiguous regions; allocation is expensive — watch for huge arrays/strings).
- **Young GC**: STW, evacuate live objects from Eden/Survivor regions.
- **Concurrent marking cycle** triggered when old occupancy crosses IHOP (adaptive, ~45%). Uses SATB (snapshot-at-the-beginning) barriers.
- **Mixed GC**: young regions + the old regions with **most garbage** first ("Garbage First") — chosen to fit the pause target.
- **Full GC** (fallback, STW, single region set compaction, now parallel) — if this appears in logs, something is wrong (allocation faster than marking, humongous fragmentation, heap too small).

### ZGC in depth
- **Coloured pointers**: metadata bits stored in the 64-bit reference (marked0/1, remapped).
- **Load barriers**: every reference load checks the colour; if the object was relocated, the barrier fixes the reference ("self-healing").
- Relocation happens concurrently → pauses only for root scanning, sub-millisecond regardless of heap size.
- Cost: some throughput (~5–15%) and more CPU. Generational ZGC (JDK 21+) closed much of that gap.

## Reading GC logs

```
-Xlog:gc*:file=gc.log:time,uptime,level,tags:filecount=5,filesize=20m
```

```
[12.345s][info][gc] GC(41) Pause Young (Normal) (G1 Evacuation Pause) 1536M->412M(4096M) 18.234ms
[45.678s][info][gc] GC(97) Pause Full (G1 Compaction Pause) 3980M->3901M(4096M) 2741.5ms   ← red flag
```

Second line: Full GC reclaimed almost nothing — **live set ≈ heap** → leak or undersized heap. Tools: GCeasy, GCViewer, JFR GC events.

## Tuning methodology (what to say)

1. **Define the goal**: p99 latency? throughput? footprint? You can't max all three.
2. **Measure first**: GC logs + JFR under realistic load.
3. **Right-size the heap**: live data set after full GC × 3–4 is a decent starting heap. Set `-Xms = -Xmx` in servers to avoid resize pauses.
4. **Pick the collector**: G1 default; ZGC if p99 pause matters more than ~10% throughput.
5. **Reduce allocation rate** — the most effective tuning is in code: avoid boxing, reuse buffers, avoid `String.format` in hot paths, stream → loop in hot code, smaller DTOs.
6. Only then touch knobs: `MaxGCPauseMillis`, `G1HeapRegionSize`, `InitiatingHeapOccupancyPercent`, `-XX:MaxTenuringThreshold`.

### Containers
- JVM is container-aware (JDK 10+): reads cgroup CPU/memory limits.
- Use `-XX:MaxRAMPercentage=75.0` (not `-Xmx`). Leave room for **non-heap**: Metaspace, thread stacks, code cache, direct buffers, GC structures. A pod with `limit=2Gi` and `-Xmx2g` gets **OOMKilled** by the kernel (exit code 137), not a Java OOM.
- With < 2 CPUs and < 1792 MB the JVM silently picks **SerialGC**. Surprise pauses → set G1 explicitly or give 2 CPUs.

## Memory leaks in Java — the usual suspects

1. **Unbounded caches / static collections** (`static Map<String, Object> cache`). Fix: bounded Caffeine cache with TTL.
2. **Listeners/callbacks not deregistered**.
3. **ThreadLocals on pooled threads** not removed.
4. **ClassLoader leaks** on redeploy → Metaspace OOM.
5. **Non-static inner classes / lambdas** capturing the outer instance and outliving it.
6. **Unclosed resources** (streams, connections) → native memory, file handles.
7. `HashMap` keys with broken `equals/hashCode` — entries can never be found or removed.
8. **Interned strings** / `String.substring` (pre-Java 7u6 kept the parent `char[]`).

### Leak investigation playbook
```bash
jcmd <pid> GC.class_histogram | head -30     # what's growing? compare two snapshots
jcmd <pid> GC.heap_dump /tmp/heap.hprof       # dump (STW! do it on one instance out of rotation)
# Eclipse MAT → "Leak Suspects" → Dominator tree → "Path to GC roots (exclude weak refs)"
```
Retained heap vs shallow heap: **shallow** = the object itself; **retained** = everything freed if this object were collected. The dominator tree sorts by retained size → the leak is usually at the top.

## Reference types

| Type | Collected when | Use |
|---|---|---|
| Strong | Never while reachable | Normal |
| `SoftReference` | Under memory pressure | Memory-sensitive caches (but unpredictable — prefer explicit bounds) |
| `WeakReference` | Next GC once only weakly reachable | `WeakHashMap`, canonicalising maps, listener lists |
| `PhantomReference` | After finalization; `get()` always null | Post-mortem cleanup → `java.lang.ref.Cleaner` (replacement for `finalize`) |

## Performance engineering beyond GC

- **Profile, don't guess**: async-profiler (CPU, alloc, lock, wall-clock flame graphs), JFR.
- **JMH** for microbenchmarks — handles warm-up, dead-code elimination (`Blackhole`), constant folding.
- **Latency**: use percentiles (p50/p99/p999), never averages. Coordinated omission makes naive load tests lie (use wrk2 / Gatling with constant arrival rate).
- **Common wins** in Spring services: connection pool sizing (HikariCP: `connections ≈ cores × 2 + spindles`, not 200), N+1 queries, JSON serialization of huge graphs, logging at DEBUG in hot paths, synchronous calls in loops → batch/parallel.

## Quick check questions

<details><summary>1. Why is a minor GC cheap even with a large young generation?</summary>

Copying collectors only touch **live** objects. If 98% of Eden is dead, only the 2% is copied; dead objects are reclaimed implicitly by resetting the region. Cost ∝ survivors, not Eden size.
</details>

<details><summary>2. Service has p99 latency spikes every few minutes. How do you investigate?</summary>

Correlate spike timestamps with GC logs (pause durations, Full GCs, humongous allocations), JFR (safepoint pauses, lock contention, allocation pressure), and system metrics (CPU throttling in containers — CFS quota exhaustion looks like pauses!). Also check: log rotation, cron jobs, cache expiry stampedes, connection pool exhaustion. If GC: reduce allocation rate, increase heap, switch to ZGC, fix humongous objects.
</details>

<details><summary>3. Pod gets OOMKilled but there's no Java OutOfMemoryError. Why?</summary>

The kernel killed the process for exceeding the cgroup memory limit. Total RSS = heap + Metaspace + thread stacks + code cache + direct/NIO buffers + GC native structures + malloc arenas. Fix: set `MaxRAMPercentage` ~70–75%, cap Metaspace/direct memory, use Native Memory Tracking (`-XX:NativeMemoryTracking=summary`, `jcmd VM.native_memory`) to find the culprit.
</details>

<details><summary>4. G1 vs ZGC — how do you choose?</summary>

G1: best general default, good throughput, pause target ~10–200 ms. ZGC: sub-millisecond pauses independent of heap size, at some throughput/CPU cost — choose for latency-critical APIs, large heaps, or strict SLOs. Measure both under production-like load.
</details>

<details><summary>5. What are humongous objects and why do they hurt in G1?</summary>

Objects ≥ half a region size are allocated directly in contiguous old regions. They're expensive to allocate, can fragment the heap, and (historically) were only reclaimed at marking/full GC. Large byte arrays (file uploads, big JSON) cause them. Fix: increase `G1HeapRegionSize`, stream data instead of buffering, chunk arrays.
</details>

## Questions asked at top companies

<details><summary>How does garbage collection work in Java? <em>· Amazon, Infosys, Oracle, Walmart</em></summary>

Tracing from GC roots marks reachable objects; unreachable ones are reclaimed. Generational heaps: frequent copying minor GCs in young gen, rarer marking/compaction of old gen. Modern collectors (G1, ZGC) do most marking concurrently and collect regions incrementally to limit pauses.
</details>

<details><summary>Can you force garbage collection? <em>· TCS, Cognizant, HCL</em></summary>

`System.gc()` only *requests* it; the JVM may ignore it (`-XX:+DisableExplicitGC`). You can't force it deterministically, and calling it in production code is an anti-pattern.
</details>

<details><summary>What is a memory leak in Java if there's a GC? Give examples. <em>· Goldman Sachs, Flipkart, Adobe</em></summary>

Objects that remain reachable but are no longer needed: static/unbounded caches, listeners never removed, ThreadLocals on pooled threads, unclosed resources, inner classes capturing outer instances, mutated HashMap keys.
</details>

<details><summary>Compare Serial, Parallel, G1 and ZGC. <em>· Microsoft, Uber, LinkedIn</em></summary>

Serial: single thread, STW — tiny heaps. Parallel: multi-threaded STW, best throughput for batch. G1 (default): region-based, pause-target driven, mostly concurrent marking — general purpose. ZGC: concurrent compaction with load barriers, sub-millisecond pauses regardless of heap size — latency-sensitive services.
</details>

<details><summary>Strong, soft, weak and phantom references? <em>· Oracle, Morgan Stanley</em></summary>

Strong: normal, never collected while reachable. Soft: collected under memory pressure (caches). Weak: collected at next GC once only weakly reachable (`WeakHashMap`). Phantom: enqueued after finalization for cleanup actions (`Cleaner`), `get()` returns null.
</details>

<details><summary>What is "stop-the-world" and why does it matter for APIs? <em>· Amazon, PhonePe</em></summary>

All application threads pause at a safepoint during certain GC phases. Requests in flight wait, inflating tail latency (p99/p999) and potentially triggering client timeouts or health-check failures.
</details>

<details><summary>How would you size the heap for a service? <em>· Swiggy, Razorpay</em></summary>

Measure the live set after full GC under realistic load; start with 3–4× live set; `Xms = Xmx` for servers; in containers use `MaxRAMPercentage≈75` leaving room for metaspace, threads, direct buffers; validate with GC logs and latency SLOs.
</details>

<details><summary>What is the difference between `OutOfMemoryError: Java heap space` and `GC overhead limit exceeded`? <em>· Walmart, Infosys</em></summary>

Heap space: an allocation couldn't be satisfied even after GC. GC overhead limit: the JVM spent >98% of time in GC recovering <2% heap — effectively thrashing just before running out.
</details>

<details><summary>What tools do you use to analyse a heap dump? <em>· Atlassian, Goldman Sachs</em></summary>

`jcmd GC.heap_dump` / `jmap` to capture; Eclipse MAT (dominator tree, leak suspects, paths to GC roots), VisualVM, IntelliJ profiler; `jcmd GC.class_histogram` for quick comparisons; JFR for allocation profiling.
</details>

<details><summary>Why does a 31 GB heap sometimes beat 33 GB? <em>· Uber, Flipkart</em></summary>

Compressed oops (4-byte references) only work below ~32 GB. Above it every reference becomes 8 bytes, so object graphs grow and you may store less data in more memory.
</details>

## End-to-end scenarios

<details><summary>Scenario: A payments API has p99 = 2 s spikes every ~10 minutes while p50 is 40 ms. GC logs show "Pause Full (G1 Compaction)" lasting 1.8 s at those times. Fix it.</summary>

Full GCs in G1 mean the collector couldn't keep up: old gen filled (live set too large, leak, humongous allocations, or concurrent marking started too late). Steps: check live set after full GC — if growing over hours → leak (heap dump, MAT). If stable but large → increase heap or lower IHOP so marking starts earlier. Look for humongous allocations (big byte arrays/JSON) → stream them or raise region size. Reduce allocation rate in hot paths. If latency SLO is strict, test ZGC. Verify with load test and GC logs.
</details>

<details><summary>Scenario: Your Kubernetes pod keeps restarting with exit code 137 but logs show no Java errors.</summary>

Kernel OOM killer (container exceeded memory limit). JVM total memory = heap + metaspace + thread stacks + code cache + direct buffers + GC overhead. Fix: set `-XX:MaxRAMPercentage=70–75` instead of a large `-Xmx`, enable Native Memory Tracking to find native growth (e.g., Netty direct buffers), cap `MaxDirectMemorySize`, reduce thread count, or raise the limit.
</details>
