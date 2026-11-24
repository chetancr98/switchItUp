---
title: Concurrency — Java Memory Model, Locks, Executors, CompletableFuture
level: 2
tags: concurrency, jmm, threads, locks, executors
---
<!-- deepened -->

## Start here: the basics

### Process vs thread
- A **process** is a running program with its own memory (your IDE, your browser).
- A **thread** is a path of execution *inside* a process. Threads of one process **share the heap** but each has its own stack.

Why threads? To do several things at once: serve 200 web requests, download while the UI stays responsive, use all CPU cores.

### Creating threads
```java
// 1. Runnable (preferred: separates the task from the thread)
Runnable task = () -> System.out.println("Hi from " + Thread.currentThread().getName());
Thread t = new Thread(task, "worker-1");
t.start();        // start() creates a new thread; calling run() directly would run on the CURRENT thread
t.join();         // wait for it to finish

// 2. In real code, use an executor (a managed pool of threads)
ExecutorService pool = Executors.newFixedThreadPool(4);
Future<Integer> f = pool.submit(() -> 6 * 7);    // Callable returns a value
System.out.println(f.get());                      // 42 (blocks until ready)
pool.shutdown();
```

### Thread lifecycle
`NEW` → `start()` → `RUNNABLE` ⇄ (`BLOCKED` waiting for a lock / `WAITING` / `TIMED_WAITING` on sleep, wait, join) → `TERMINATED`.

### The core problem: race conditions
```java
class Counter { int count = 0; void inc() { count++; } }
// two threads each call inc() 10_000 times → result is often LESS than 20_000
```
`count++` is really three steps — read, add 1, write. Two threads can both read 5 and both write 6: one increment is lost. Fixes:

```java
synchronized void inc() { count++; }                 // only one thread at a time inside
// or
AtomicInteger count = new AtomicInteger(); count.incrementAndGet();  // lock-free atomic
```

### Visibility: the second, sneakier problem
Each CPU core caches values. Without synchronization, a thread may **never see** another thread's write. `volatile` forces reads/writes to go through main memory (and prevents reordering) — use it for simple flags:
```java
private volatile boolean running = true;
```

### Deadlock in plain words
Two people each hold one chopstick and wait forever for the other's. Thread A holds lock 1 and wants lock 2; thread B holds lock 2 and wants lock 1. Prevent it by always taking locks **in the same order**.

### Mental checklist for any shared data
1. Is it shared between threads? If not, no problem.
2. Can it be **immutable**? Then it's automatically safe.
3. Otherwise: use a thread-safe class (`ConcurrentHashMap`, `AtomicLong`, `BlockingQueue`) or protect *every* access with the *same* lock.

---

## Why this decides senior-level Java interviews

Every senior Java loop has at least one of: "make this thread-safe", "what's wrong with this double-checked locking", "design a rate limiter / bounded queue", "how does `ConcurrentHashMap` work", "why is my thread pool hanging". You need the **memory model**, not just APIs.

## The three problems of concurrency

1. **Atomicity** — `count++` is read-modify-write (3 bytecodes). Two threads can both read 5 and both write 6.
2. **Visibility** — a write by thread A may *never* become visible to thread B without synchronization (values cached in registers / CPU store buffers; JIT may hoist reads out of loops).
3. **Ordering** — compiler and CPU reorder instructions as long as single-thread semantics are preserved. Another thread can observe the reordering.

```java
// Visibility bug: may loop forever — JIT hoists `running` read out of the loop
static boolean running = true;
new Thread(() -> { while (running) { } }).start();
Thread.sleep(100);
running = false;     // fix: make it volatile
```

## Java Memory Model (JSR-133) — happens-before

The JMM defines when a write is **guaranteed** visible to a read: when the write **happens-before** the read. Rules:

| Rule | Meaning |
|---|---|
| Program order | Each action in a thread HB every later action in that thread |
| Monitor lock | Unlock of monitor M HB every subsequent lock of M |
| Volatile | A write to volatile v HB every subsequent read of v |
| Thread start | `t.start()` HB every action in t |
| Thread join | Every action in t HB another thread's successful return from `t.join()` |
| Transitivity | A HB B and B HB C ⇒ A HB C |
| Final fields | Constructor's writes to final fields are visible to anyone who sees the reference (if `this` didn't escape) |
| Concurrent utils | `executor.submit(task)` HB task runs; `future.get()` sees task results; `BlockingQueue.put` HB `take` etc. |

**Piggybacking on volatile**: writes *before* a volatile write become visible to a thread that reads the volatile and sees the new value:

```java
int data;              // not volatile
volatile boolean ready;

// Thread A                // Thread B
data = 42;                 if (ready) {
ready = true;                 System.out.println(data); // guaranteed 42
                           }
```

### volatile — what it does and doesn't do
- ✅ Visibility & ordering (acts as a memory fence: no reordering across it in the dangerous directions).
- ✅ Atomic reads/writes of `long`/`double` (otherwise may tear into two 32-bit writes).
- ❌ **Not atomic** for compound ops: `volatile int c; c++` is still a race. Use `AtomicInteger` / `LongAdder`.

### Double-checked locking — the classic

```java
class Singleton {
    private static volatile Singleton instance;      // volatile is REQUIRED
    static Singleton get() {
        Singleton local = instance;                  // one volatile read on fast path
        if (local == null) {
            synchronized (Singleton.class) {
                local = instance;
                if (local == null) instance = local = new Singleton();
            }
        }
        return local;
    }
}
```
Without `volatile`, `instance = new Singleton()` can be reordered as *allocate → publish reference → run constructor*. Another thread sees non-null `instance` and uses a **partially constructed object**. Prefer the holder idiom or an `enum` singleton.

## synchronized internals

- Every object has a **monitor**. `synchronized` methods use `ACC_SYNCHRONIZED`; blocks use `monitorenter`/`monitorexit` (two exits — one on exception path).
- **Reentrant**: the owning thread can re-acquire (counter in the monitor).
- Lock states in the mark word: **thin lock** (CAS of a stack-lock record; uncontended) → **inflated** (OS mutex/`ObjectMonitor`, contended). **Biased locking was removed** (deprecated JDK 15, removed 18) — know this, many blogs are outdated.
- Java 24 (JEP 491): virtual threads no longer **pin** the carrier while inside `synchronized`. On Java 21 they do — prefer `ReentrantLock` around blocking I/O on Java 21 virtual threads.

### wait / notify
Must hold the monitor. Always wait **in a loop** (spurious wakeups + condition may change before you reacquire):

```java
synchronized (lock) {
    while (!condition) lock.wait();
    // act
}
```
Prefer `notifyAll` unless you can prove a single waiter type.

## java.util.concurrent.locks

| | `synchronized` | `ReentrantLock` |
|---|---|---|
| Release | Automatic (block scope) | Manual — **always in `finally`** |
| tryLock / timeout | ❌ | ✅ `tryLock(1, SECONDS)` |
| Interruptible acquire | ❌ | ✅ `lockInterruptibly()` |
| Fairness | ❌ | Optional (`new ReentrantLock(true)`) — lower throughput |
| Multiple conditions | One wait-set | Many `Condition`s |

Built on **AQS (AbstractQueuedSynchronizer)**: a `volatile int state` + CAS + a CLH-style FIFO queue of parked threads (`LockSupport.park/unpark`). `ReentrantLock`, `Semaphore`, `CountDownLatch`, `ReentrantReadWriteLock` are all AQS subclasses — saying this signals depth.

**`ReadWriteLock`**: many readers or one writer. Writer starvation is possible; no upgrade from read to write (deadlock). **`StampedLock`**: optimistic reads (no locking — validate a stamp afterwards); not reentrant.

### Bounded blocking queue (very common "implement this")

```java
public class BoundedBuffer<T> {
    private final Object[] items;
    private int head, tail, count;
    private final ReentrantLock lock = new ReentrantLock();
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public BoundedBuffer(int capacity) { items = new Object[capacity]; }

    public void put(T x) throws InterruptedException {
        lock.lock();
        try {
            while (count == items.length) notFull.await();
            items[tail] = x;
            tail = (tail + 1) % items.length;
            count++;
            notEmpty.signal();
        } finally { lock.unlock(); }
    }

    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lock();
        try {
            while (count == 0) notEmpty.await();
            T x = (T) items[head];
            items[head] = null;               // help GC
            head = (head + 1) % items.length;
            count--;
            notFull.signal();
            return x;
        } finally { lock.unlock(); }
    }
}
```

## Atomics & CAS

`AtomicInteger.incrementAndGet()` = loop of `compareAndSet(expected, new)` → maps to a single CPU instruction (`LOCK CMPXCHG` on x86).

- **ABA problem**: value changes A→B→A; CAS succeeds but the world changed. Fix: `AtomicStampedReference` (version stamp).
- Under heavy contention CAS loops spin and burn CPU → **`LongAdder`** keeps per-cell counters (striped, padded against **false sharing** with `@Contended`) and sums on read. Use it for metrics/counters; use `AtomicLong` when you need exact compare-and-set semantics.
- `VarHandle` (Java 9) — the modern low-level API behind atomics (plain/opaque/acquire/release/volatile access modes).

## Deadlock, livelock, starvation

**Coffman conditions** (all four needed): mutual exclusion, hold-and-wait, no preemption, **circular wait**. Break any one. In practice: **global lock ordering** (e.g., always lock the account with smaller id first) or `tryLock` with timeout + back-off.

```java
void transfer(Account a, Account b, long amt) {
    Account first = a.id() < b.id() ? a : b;
    Account second = first == a ? b : a;
    synchronized (first) { synchronized (second) { a.debit(amt); b.credit(amt); } }
}
```
Detect: `jstack` prints "Found one Java-level deadlock"; `ThreadMXBean.findDeadlockedThreads()`.

## Executors & thread pools

### ThreadPoolExecutor — know every parameter

```java
new ThreadPoolExecutor(
    corePoolSize,      // threads kept alive
    maximumPoolSize,   // upper bound
    keepAliveTime, unit,
    workQueue,         // where tasks wait
    threadFactory,     // name your threads! ("order-worker-%d")
    rejectionHandler); // Abort (default), CallerRuns, Discard, DiscardOldest
```

**Task submission algorithm** (counter-intuitive, frequently asked):
1. Running threads < core → **start a new thread**.
2. Else → **enqueue**.
3. Queue full → start thread up to **max**.
4. Max reached and queue full → **reject**.

So with an **unbounded** queue, `maximumPoolSize` is meaningless — the pool never grows beyond core. `Executors.newFixedThreadPool` uses an unbounded `LinkedBlockingQueue` → under overload, tasks pile up until **OOM**. `newCachedThreadPool` uses `SynchronousQueue` and max = `Integer.MAX_VALUE` → unbounded **threads**. Production: construct `ThreadPoolExecutor` explicitly with a bounded queue and `CallerRunsPolicy` for natural back-pressure.

### Sizing
- CPU-bound: `N_cpu` (or +1).
- I/O-bound: `N_cpu × (1 + wait_time / compute_time)` (Little's law-ish). E.g. 8 cores, 90 ms waiting / 10 ms compute → 80 threads.
- Or stop sizing and use **virtual threads** for I/O-bound work.

### Shutdown
```java
pool.shutdown();                                   // no new tasks, finish queued
if (!pool.awaitTermination(30, SECONDS)) pool.shutdownNow(); // interrupts workers
```

### Exceptions vanish
`execute(r)` — exception goes to the thread's `UncaughtExceptionHandler` (thread dies & is replaced). `submit(r)` — exception is **captured in the Future** and silently lost if nobody calls `get()`. Classic production bug.

### ForkJoinPool & work stealing
Each worker has its own deque; it pushes/pops its own tasks LIFO and **steals** from the head of others' deques FIFO. Backs parallel streams and `CompletableFuture` default async methods (`ForkJoinPool.commonPool()`, size = cores − 1). **Never block in the common pool** (JDBC calls in a parallel stream starve every other user of the pool).

## CompletableFuture

```java
CompletableFuture<User>  userF  = supplyAsync(() -> userClient.get(id), ioPool);
CompletableFuture<List<Order>> ordersF = supplyAsync(() -> orderClient.forUser(id), ioPool);

CompletableFuture<Profile> profile = userF
    .thenCombine(ordersF, Profile::new)                  // both in parallel, then merge
    .orTimeout(800, MILLISECONDS)                        // Java 9
    .exceptionally(ex -> Profile.fallback(id));          // recover

// Sequential dependency: flatMap = thenCompose
CompletableFuture<Invoice> inv = userF.thenCompose(u -> supplyAsync(() -> billing.invoice(u), ioPool));

// Fan-out / fan-in
List<CompletableFuture<Price>> fs = skus.stream().map(s -> supplyAsync(() -> pricing.get(s), ioPool)).toList();
CompletableFuture.allOf(fs.toArray(CompletableFuture[]::new))
    .thenApply(v -> fs.stream().map(CompletableFuture::join).toList());
```

| Method | Analogy |
|---|---|
| `thenApply` | `map` |
| `thenCompose` | `flatMap` |
| `thenCombine` | zip two futures |
| `thenAccept` / `thenRun` | consume / side effect |
| `exceptionally` / `handle` / `whenComplete` | catch / catch+finally / finally |
| `*Async` variants | run the callback on a pool rather than the completing thread |

**Always pass your own executor** for I/O. `join()` throws unchecked `CompletionException`; `get()` throws checked `ExecutionException`.

## Virtual threads (Java 21) — Project Loom

- Lightweight threads scheduled by the JVM onto a small pool of **carrier** platform threads (a ForkJoinPool). When a virtual thread blocks on I/O, it **unmounts** (its stack frames are copied to the heap) and the carrier runs another one.
- Millions are cheap. **Thread-per-request with blocking code** becomes scalable again — no reactive callback hell.
- `Executors.newVirtualThreadPerTaskExecutor()`, `Thread.ofVirtual().start(r)`, Spring Boot 3.2+: `spring.threads.virtual.enabled=true`.
- **Don't pool them.** Limit concurrency to a downstream with a `Semaphore`, not a pool size.
- **Pinning**: on Java 21–23, blocking inside `synchronized` or a native frame pins the carrier (fixed for synchronized in Java 24). Detect: `-Djdk.tracePinnedThreads=full` / JFR `VirtualThreadPinned`.
- Not faster for **CPU-bound** work. They improve **throughput** for I/O-bound concurrency, not latency.
- Beware `ThreadLocal`-heavy code (millions of copies) → **Scoped Values** (preview → final in recent JDKs) and **Structured Concurrency** (`StructuredTaskScope`).

## ThreadLocal

Per-thread variable (map stored in the `Thread` object, keyed by weak reference to the ThreadLocal). Uses: `SimpleDateFormat` per thread, transaction/security context (Spring's `TransactionSynchronizationManager`, `SecurityContextHolder`), MDC logging.
**Leak**: in thread pools, threads never die → values live forever and leak across requests (user A's context seen by user B!). Always `remove()` in `finally`.

## Quick check questions

<details><summary>1. Is `volatile int count; count++` thread-safe? Why not?</summary>

No. volatile guarantees visibility and ordering, not atomicity. `count++` is read, add, write; two threads can interleave and lose an update. Use `AtomicInteger.incrementAndGet()`, `LongAdder`, or a lock.
</details>

<details><summary>2. Why does double-checked locking need volatile?</summary>

Object construction and publishing the reference can be reordered. Without volatile, another thread may see a non-null reference to an object whose constructor hasn't finished. volatile's happens-before forbids that reordering and guarantees the reader sees the fully constructed object.
</details>

<details><summary>3. A fixed thread pool of 10 with tasks that each submit a subtask and wait on its Future hangs. Why?</summary>

**Thread starvation deadlock**: all 10 threads are blocked waiting on subtasks that sit in the queue with no free thread to run them. Fixes: separate pools for parent and child tasks, use ForkJoinPool (work stealing + `join` helps), use `thenCompose` non-blocking composition, or virtual threads.
</details>

<details><summary>4. Explain how ThreadPoolExecutor decides between creating a thread, queueing and rejecting.</summary>

< core threads → new thread; else offer to queue; if queue rejects (full) and < max threads → new thread; else rejection handler. Hence unbounded queue ⇒ never exceeds core; SynchronousQueue ⇒ always grows to max.
</details>

<details><summary>5. synchronized vs ReentrantLock vs StampedLock — when each?</summary>

synchronized: simple critical sections, automatic release (and on Java 24+ fine with virtual threads). ReentrantLock: need tryLock/timeouts, interruptibility, fairness, multiple conditions, or Java 21 virtual threads doing I/O under the lock. StampedLock: read-dominated data with short reads where optimistic reading avoids writer contention; not reentrant, no conditions — expert use only.
</details>

<details><summary>6. Will virtual threads make my CPU-heavy batch job faster?</summary>

No. They reduce the cost of *blocking*, letting you have huge numbers of concurrent I/O-bound tasks. CPU-bound work is limited by cores; use a ForkJoinPool / parallel streams sized to cores.
</details>

<details><summary>7. How would you implement a rate limiter for 100 req/s in a single JVM?</summary>

Token bucket: `AtomicLong` tokens + last refill timestamp updated with CAS, or a `Semaphore` refilled by a scheduler, or Guava/Resilience4j `RateLimiter`. Discuss burst capacity, fairness, and that a distributed limit needs Redis (see System Design → Rate limiter).
</details>

<details><summary>8. What is false sharing?</summary>

Two threads write to different variables that happen to sit on the same 64-byte CPU cache line; the line ping-pongs between cores, killing performance even though there's no logical sharing. Fix with padding / `@jdk.internal.vm.annotation.Contended` (used in LongAdder's cells, ConcurrentHashMap counter cells).
</details>

## Practice
1. Print numbers 1..N alternately with two threads (odd/even) — with `wait/notify`, then with `Semaphore`s.
2. Implement `CountDownLatch` using `ReentrantLock` + `Condition`.
3. Build a fan-out price aggregator with CompletableFuture and a 500 ms global timeout that returns partial results.
4. Write a deadlock, find it with `jstack`, then fix it with lock ordering.

## Questions asked at top companies

<details><summary>Difference between `start()` and `run()`? <em>· TCS, Infosys, Amazon</em></summary>

`start()` asks the JVM to create a new thread which then calls `run()`. Calling `run()` directly executes it on the current thread like a normal method — no concurrency. Calling `start()` twice throws `IllegalThreadStateException`.
</details>

<details><summary>Runnable vs Callable? Future vs CompletableFuture? <em>· Flipkart, Paytm, Walmart</em></summary>

Runnable: no result, can't throw checked exceptions. Callable: returns a value, can throw. Future: handle to get the result (blocking `get`), cancel. CompletableFuture: composable non-blocking pipeline (`thenApply`, `thenCompose`, `allOf`, `exceptionally`), can be completed manually, supports timeouts.
</details>

<details><summary>What is the difference between `synchronized` method and block, and what lock is used for static synchronized methods? <em>· Goldman Sachs, Oracle</em></summary>

Instance synchronized method locks `this`; a block locks any chosen object (narrower scope, better). Static synchronized methods lock the `Class` object — a different lock from instance methods, so a static and an instance synchronized method can run concurrently.
</details>

<details><summary>Explain `volatile`. Can it replace `synchronized`? <em>· Amazon, Morgan Stanley, Uber</em></summary>

Guarantees visibility and ordering (happens-before between a write and subsequent reads) and atomic 64-bit reads/writes. It does not make compound actions atomic, so it can't replace synchronized for check-then-act or increments. Fine for single-writer flags and safe publication.
</details>

<details><summary>`wait()` vs `sleep()`. <em>· Infosys, Wipro, Capgemini, Amazon</em></summary>

`wait()` is an Object method, must be called holding that object's monitor, **releases** the lock and waits for notify/timeout. `sleep()` is a Thread method, doesn't need/release any lock, just pauses.
</details>

<details><summary>How does ConcurrentHashMap differ from Collections.synchronizedMap in performance? <em>· Walmart, PhonePe</em></summary>

synchronizedMap serialises every operation behind one mutex. CHM reads without locks and writes lock only one bucket, so throughput scales with cores; it also offers atomic compound operations (`computeIfAbsent`, `merge`).
</details>

<details><summary>Write a program to print odd and even numbers alternately using two threads. <em>· Amazon, Microsoft, Zoho, Oracle</em></summary>

```java
class OddEven {
    private int n = 1; private final int max = 20;
    synchronized void print(boolean odd) throws InterruptedException {
        while (n <= max) {
            while (n <= max && (n % 2 == 1) != odd) wait();
            if (n <= max) { System.out.println(Thread.currentThread().getName() + " " + n++); notifyAll(); }
        }
    }
}
OddEven p = new OddEven();
new Thread(() -> { try { p.print(true); } catch (InterruptedException ignored) {} }, "odd").start();
new Thread(() -> { try { p.print(false); } catch (InterruptedException ignored) {} }, "even").start();
```
</details>

<details><summary>Implement the producer–consumer problem. <em>· Amazon, Goldman Sachs, Adobe</em></summary>

Simplest correct answer: a `BlockingQueue` (`ArrayBlockingQueue` with capacity) — producers `put`, consumers `take`; blocking handles back-pressure. Then show the manual version with `ReentrantLock` + two `Condition`s (see the bounded buffer above) or `wait/notifyAll` in while loops.
</details>

<details><summary>What is a deadlock? How do you detect and prevent it? <em>· Microsoft, Oracle, Barclays</em></summary>

Circular wait on locks. Detect with thread dumps (`jstack` reports Java-level deadlocks) or `ThreadMXBean`. Prevent with global lock ordering, `tryLock` with timeout, reducing lock scope, or lock-free designs.
</details>

<details><summary>Explain the ExecutorService types and their risks. <em>· Uber, Flipkart, Atlassian</em></summary>

`newFixedThreadPool` — fixed threads, **unbounded queue** (OOM risk). `newCachedThreadPool` — unbounded threads (thread explosion). `newSingleThreadExecutor` — serial. `newScheduledThreadPool` — delays/periodic. `newVirtualThreadPerTaskExecutor` — Java 21 virtual threads. Production: custom `ThreadPoolExecutor` with bounded queue, named threads, rejection policy.
</details>

<details><summary>What are virtual threads and when should you use them? <em>· Google, Microsoft, Atlassian (2024+)</em></summary>

JVM-managed lightweight threads mounted on a few carrier threads; blocking I/O unmounts them, so millions are possible. Use for I/O-bound thread-per-request code; not useful for CPU-bound work; don't pool them; watch for pinning (`synchronized` + blocking on Java 21–23) and heavy ThreadLocals.
</details>

<details><summary>What is a race condition vs data race? <em>· Google</em></summary>

Data race: two threads access the same memory concurrently, at least one writes, no happens-before ordering (a JMM concept). Race condition: correctness depends on timing/interleaving (e.g., check-then-act), which can occur even without data races (using thread-safe calls that aren't atomic together).
</details>

<details><summary>What is ThreadLocal and what's the danger in thread pools? <em>· Walmart, Goldman Sachs</em></summary>

Per-thread variable copy. In pools threads are reused, so values leak between tasks (security context of user A visible to user B) and memory leaks. Always `remove()` in `finally`.
</details>

## End-to-end scenarios

<details><summary>Scenario: A checkout API calls 4 downstream services sequentially (user, cart, pricing, inventory), each ~150 ms. Make it faster safely.</summary>

Identify independent calls: user, cart and inventory can run in parallel; pricing depends on cart. Use `CompletableFuture.supplyAsync` on a dedicated bounded I/O executor (or virtual threads), combine with `thenCombine`/`thenCompose`, apply per-call timeouts (`orTimeout`) and fallbacks (`exceptionally`), propagate MDC/trace context to worker threads, and cap concurrency per downstream with a semaphore/bulkhead. Latency drops from ~600 ms to ~300 ms. Measure p99, not average.
</details>

<details><summary>Scenario: Production threads are stuck and the service stopped responding. You get a thread dump. What do you look for?</summary>

Count threads by state; look for many threads `BLOCKED` on the same monitor (lock contention — who holds it and why), "Found one Java-level deadlock", threads `WAITING` on `HikariPool.getConnection` (pool exhaustion — slow queries or connection leak), threads stuck in socket reads without timeouts (missing HTTP client timeouts), `ForkJoinPool.commonPool` threads doing blocking I/O. Take 3 dumps 10 s apart to see what's static. Fix the root cause: timeouts, pool sizing, lock scope, async offload.
</details>
