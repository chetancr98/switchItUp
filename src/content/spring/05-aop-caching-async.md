---
title: AOP, Proxies, Caching, @Async & Scheduling
level: 3
tags: aop, proxy, cache, async, redis
---
<!-- deepened -->

## Start here: the basics

### Cross-cutting concerns
Some code is needed in *many* places but isn't the main job of any one class: logging, timing, security checks, transactions, caching, retries. Copy-pasting it everywhere is messy:

```java
public Order place(Cart c) {
    long start = System.nanoTime();                 // timing   (cross-cutting)
    log.info("placing order");                      // logging  (cross-cutting)
    try { /* the actual business logic */ }
    finally { metrics.record(System.nanoTime() - start); }
}
```

### AOP — Aspect-Oriented Programming
AOP lets you write such code **once** (an *aspect*) and declare **where** it applies (a *pointcut*). Spring applies it by wrapping your bean in a **proxy** — a stand-in object that runs the extra code, then calls your real method.

```
Controller ──calls──► [Proxy: start timer → call real method → stop timer] ──► OrderService
```

You already use AOP every day: `@Transactional`, `@Cacheable`, `@Async`, `@PreAuthorize` all work through proxies.

### Caching in plain words
A cache keeps a copy of expensive results so the next request is fast. Like keeping a frequently used book on your desk instead of walking to the library.

```java
@Cacheable("products")               // first call: runs the method and stores the result
public ProductDto get(long id) {     // next calls with same id: returned from cache, method not run
    return repo.findById(id).map(this::toDto).orElseThrow();
}

@CacheEvict(value = "products", key = "#id")   // remove stale copy when data changes
public void update(long id, UpdateProduct cmd) { ... }
```
Two kinds: **local** (inside your JVM, e.g., Caffeine — fastest, per instance) and **distributed** (Redis — shared by all instances).

### @Async in plain words
Run a method on another thread so the caller doesn't wait — e.g., send a welcome email after signup without slowing the signup response.
```java
@Async
public CompletableFuture<Void> sendWelcomeEmail(User u) { ... }
```
Requires `@EnableAsync` and (ideally) your own configured thread pool.

---

## Proxies: JDK dynamic vs CGLIB

| | JDK dynamic proxy | CGLIB (ByteBuddy-based in modern Spring) |
|---|---|---|
| Mechanism | Implements the bean's **interfaces** at runtime | **Subclasses** the bean class |
| Requires | An interface | Non-final class, non-final methods |
| Spring Boot default | — | **CGLIB** (`spring.aop.proxy-target-class=true`) |
| Can't intercept | Methods not on the interface | `final`, `private`, `static` methods |

Consequence of CGLIB: a `final` class (e.g. Kotlin classes without `open`, or `final` methods) can't be advised — `@Transactional` silently does nothing on a final method.

```
caller ──► Proxy (TransactionInterceptor, CacheInterceptor, ...) ──► target bean
                                                                       │
                              this.otherMethod() ◄─────────────────────┘  ← bypasses proxy!
```

## AOP vocabulary

- **Aspect** — module of cross-cutting concern (`@Aspect` class)
- **Join point** — a point in execution (in Spring AOP: always a method execution on a bean)
- **Pointcut** — expression selecting join points
- **Advice** — code run at the join point: `@Before`, `@AfterReturning`, `@AfterThrowing`, `@After` (finally), `@Around`
- **Weaving** — linking aspects to targets. Spring AOP = **runtime proxy weaving**. AspectJ = compile-/load-time weaving (works on self-invocation, fields, constructors, private methods).

```java
@Aspect @Component
class TimingAspect {
    private final MeterRegistry registry;
    TimingAspect(MeterRegistry r) { this.registry = r; }

    @Around("@annotation(timed)")                     // binds the annotation instance
    Object time(ProceedingJoinPoint pjp, Timed timed) throws Throwable {
        Timer.Sample s = Timer.start(registry);
        try {
            return pjp.proceed();
        } finally {
            s.stop(registry.timer(timed.value(), "method", pjp.getSignature().toShortString()));
        }
    }
}
```

Pointcut designators: `execution(* com.acme..service.*.*(..))`, `within(com.acme..*)`, `@annotation(...)`, `@within(...)`, `bean(*Service)`, `args(...)`.

**Advice ordering**: `@Order` on aspects — lower value = higher precedence = **outermost**. Matters when combining `@Transactional` + `@Retryable` — retry must be **outside** the transaction (each attempt needs a fresh tx), so give the retry aspect higher precedence.

## Caching abstraction

```java
@EnableCaching
@Configuration class CacheConfig { }

@Service
class ProductService {
    @Cacheable(cacheNames = "product", key = "#id", unless = "#result == null")
    public ProductDto get(long id) { ... }

    @CachePut(cacheNames = "product", key = "#result.id")
    public ProductDto update(UpdateProduct cmd) { ... }

    @CacheEvict(cacheNames = "product", key = "#id")
    public void delete(long id) { ... }
}
```
Same proxy rules: self-invocation isn't cached. Providers: Caffeine (local), Redis (distributed), plus JCache.

### Caching strategies (system-design vocabulary)
| Strategy | Read path | Write path | Notes |
|---|---|---|---|
| **Cache-aside** (lazy) | App reads cache; on miss reads DB and populates | App writes DB then **evicts** cache | Most common; what `@Cacheable` does |
| Read-through | Cache library loads from DB on miss | — | Caffeine `LoadingCache` |
| Write-through | — | Write cache & DB synchronously | Consistent, slower writes |
| Write-behind | — | Write cache, flush to DB async | Fast, risk of loss |
| Refresh-ahead | Refresh hot keys before expiry | — | Avoids latency spikes |

**Evict, don't update, on writes** — updating the cache after the DB invites race conditions where an older value overwrites a newer one. Even evict has a race (reader loads old value from DB after the evict, before the commit) → evict **after commit**, use short TTLs, or "delayed double delete".

### Cache problems interviewers ask about
- **Stampede / thundering herd**: hot key expires, 10 000 requests hit the DB. Fixes: request coalescing (`@Cacheable(sync = true)`, Caffeine `get(key, loader)` — one loader per key), probabilistic early expiration, stale-while-revalidate, locks.
- **Penetration**: requests for keys that don't exist bypass the cache every time. Cache negative results (short TTL) or a **Bloom filter**.
- **Avalanche**: many keys expire at once (all set at startup with same TTL). Add **TTL jitter**.
- **Hot key**: one key overloads one Redis shard. Local L1 cache (Caffeine) in front of Redis, replicate the key with suffixes.
- **Consistency**: caches are eventually consistent; decide what staleness the business tolerates.

### Redis essentials for Java devs
- Single-threaded command execution (I/O threads in 6+) → each command is atomic; use Lua scripts / `MULTI` for multi-step atomicity.
- Data types: string, hash, list, set, sorted set (leaderboards, rate limiting windows), stream, HyperLogLog (cardinality), bitmap, geo.
- Persistence: RDB snapshots, AOF; replication + Sentinel for HA; **Redis Cluster** = 16 384 hash slots sharded across masters; multi-key ops need keys in the same slot (`{user42}:cart` hash tags).
- Eviction: `allkeys-lru`, `allkeys-lfu`, `volatile-ttl`… set `maxmemory`.
- Distributed lock: `SET lock:k <uuid> NX PX 30000`, release with a Lua compare-and-delete. Not safe under GC pauses/clock jumps without **fencing tokens** (see System Design → Distributed systems). Redisson provides locks with watchdog renewal.

## @Async

```java
@EnableAsync
@Configuration
class AsyncConfig {
    @Bean(name = "mailExecutor")
    ThreadPoolTaskExecutor mailExecutor() {
        var ex = new ThreadPoolTaskExecutor();
        ex.setCorePoolSize(4); ex.setMaxPoolSize(8); ex.setQueueCapacity(500);
        ex.setThreadNamePrefix("mail-");
        ex.setRejectedExecutionHandler(new ThreadPoolExecutor.CallerRunsPolicy());
        ex.setTaskDecorator(mdcPropagatingDecorator());   // copy MDC/SecurityContext to worker threads
        return ex;
    }
}

@Async("mailExecutor")
public CompletableFuture<Void> sendWelcome(User u) { ... }
```
Pitfalls: self-invocation; `void` methods swallow exceptions (configure `AsyncUncaughtExceptionHandler`); **ThreadLocal context** (security, MDC, transaction) is **not propagated** — the async method runs outside the caller's transaction; default executor in Boot is a `ThreadPoolTaskExecutor` (or virtual threads if enabled), not unbounded — but configure it explicitly anyway.

## Scheduling

`@Scheduled(fixedRate = 5000)`, `fixedDelay`, `cron = "0 0 2 * * *"`, with `@EnableScheduling`. Default scheduler has **one thread** — a slow job delays all others (`spring.task.scheduling.pool.size`).

**In a cluster of N instances, every instance runs the job** → use **ShedLock** (lock row in DB/Redis), Quartz with a JDBC job store, or move to a K8s CronJob / a single scheduler service.

## Retry (Spring Retry / Resilience4j)

```java
@Retryable(retryFor = TransientDataAccessException.class, maxAttempts = 3,
           backoff = @Backoff(delay = 200, multiplier = 2, random = true))
public void process(...) { ... }

@Recover public void recover(TransientDataAccessException e, ...) { ... }
```
Only retry **idempotent** operations and **transient** errors. Always exponential backoff + **jitter**. Put retry outside the transaction.

## Quick check questions

<details><summary>1. Why does @Cacheable not work when I call the method from the same class?</summary>

Caching is implemented by a proxy around the bean. Internal calls via `this` don't go through the proxy. Move the cached method to another bean, inject self, or use AspectJ weaving.
</details>

<details><summary>2. How would you keep a Redis cache consistent with the database?</summary>

Cache-aside: read through cache; on write, update DB then delete the key — after commit (`@TransactionalEventListener(AFTER_COMMIT)`). Use TTLs as a safety net. For stronger needs: CDC (Debezium reading the DB log) publishes changes that invalidate caches, removing dual-write races. Accept bounded staleness explicitly.
</details>

<details><summary>3. A scheduled report job runs 3 times in production. Why?</summary>

Three replicas each run `@Scheduled`. Fix with ShedLock/distributed lock, leader election, a Quartz clustered job store, or a dedicated K8s CronJob.
</details>

<details><summary>4. JDK proxy vs CGLIB — what breaks with each?</summary>

JDK proxy: you can only inject by interface type — injecting the concrete class fails (`BeanNotOfRequiredTypeException`), and methods not on the interface aren't advised. CGLIB: final classes/methods can't be advised; constructor runs twice historically (Objenesis avoids it now).
</details>

## Questions asked at top companies

<details><summary>What is AOP? Explain aspect, advice, pointcut, join point. <em>· Infosys, Paytm, Accenture</em></summary>

Aspect: module of cross-cutting logic. Join point: a point of execution (method call in Spring AOP). Pointcut: expression selecting join points. Advice: code run at those points (before, after, around, after-returning, after-throwing). Weaving: applying aspects (runtime proxies in Spring).
</details>

<details><summary>JDK dynamic proxy vs CGLIB proxy. <em>· Goldman Sachs, Oracle, Walmart</em></summary>

JDK proxies implement interfaces; CGLIB subclasses the class. Boot defaults to CGLIB. Final classes/methods and private methods can't be proxied; self-invocation bypasses both.
</details>

<details><summary>Why might @Cacheable / @Async / @Transactional silently not work? <em>· Amazon, Paytm, Swiggy</em></summary>

Self-invocation, non-public or final methods, the bean not being Spring-managed (created with `new`), missing `@EnableCaching`/`@EnableAsync`, or calling during `@PostConstruct` before proxying completes.
</details>

<details><summary>Cache-aside vs write-through vs write-behind. <em>· Amazon, Flipkart, Uber</em></summary>

Cache-aside: app reads cache, on miss loads DB and fills; on write updates DB then evicts. Write-through: write cache and DB synchronously. Write-behind: write cache, flush DB asynchronously (fast, risk of loss).
</details>

<details><summary>How do you handle cache stampede / thundering herd? <em>· Swiggy, Zomato, Hotstar</em></summary>

Single-flight loading per key (`@Cacheable(sync=true)`, Caffeine loader, distributed lock), early probabilistic refresh, stale-while-revalidate, TTL jitter, warm hot keys.
</details>

<details><summary>How do you keep cache and DB consistent? <em>· Walmart, PhonePe</em></summary>

Evict after the DB commit (not before), short TTLs as safety net, CDC-driven invalidation (Debezium), versioned keys. Accept bounded staleness explicitly per use case.
</details>

<details><summary>What thread pool does @Async use and what are the pitfalls? <em>· Morgan Stanley, Infosys</em></summary>

Boot auto-configures a `ThreadPoolTaskExecutor` (or virtual threads if enabled). Pitfalls: exceptions in void methods lost (configure handler), no SecurityContext/MDC/transaction propagation, unbounded queues hide overload — define named bounded executors.
</details>

<details><summary>How does @Scheduled behave in a cluster? <em>· Paytm, Atlassian</em></summary>

Every instance runs it. Use ShedLock/Quartz cluster mode/leader election or a K8s CronJob for single execution.
</details>

<details><summary>Redis data structures and use cases? <em>· Flipkart, Swiggy, Dream11</em></summary>

Strings (cache, counters), hashes (objects), lists (queues), sets (unique items), sorted sets (leaderboards, sliding-window rate limits), streams (event logs), HyperLogLog (unique counts), geo (nearby search), bitmaps (daily active flags).
</details>

<details><summary>How would you implement a distributed lock with Redis and what are its limits? <em>· Uber, Razorpay</em></summary>

`SET key uuid NX PX ttl`, release via Lua compare-and-delete, renew for long tasks (Redisson watchdog). Limits: GC pauses/clock issues can let two holders exist → use fencing tokens or consensus stores (etcd/ZooKeeper) for correctness-critical locks.
</details>

## End-to-end scenarios

<details><summary>Scenario: The product details page gets 50k RPS, the DB can take 3k. Design the caching.</summary>

Two-level cache: Caffeine L1 (few seconds TTL, size-bounded) per instance + Redis L2 (minutes TTL with jitter). Cache-aside with single-flight loading per key. Evict/refresh on product update via events after commit (pub/sub to clear L1s). Negative caching for missing products. CDN for the static parts. Monitor hit rate (target > 98%), Redis latency, and ensure the DB survives a Redis outage via load shedding/rate limiting.
</details>

<details><summary>Scenario: Add audit logging (who changed what, when) to 30 service methods without touching each method's body.</summary>

Custom `@Audited(action="ORDER_CANCEL")` annotation + `@Around` aspect that captures principal (SecurityContext), arguments (sanitized), result/exception, timestamp, trace id; writes asynchronously to an audit store (or outbox → Kafka) so it doesn't slow requests; if audits must be guaranteed, write in the same transaction via `REQUIRES_NEW` or outbox. Order the aspect relative to `@Transactional` deliberately.
</details>
