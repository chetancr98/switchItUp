---
title: Resilience Patterns — Timeouts, Retries, Circuit Breakers, Bulkheads, Rate Limits
level: 3
tags: resilience4j, circuit breaker, retry, bulkhead
---
<!-- deepened -->

## Start here: the basics

### Failures are normal in distributed systems
When Service A calls Service B over the network, B might be down, slow, overloaded, or the network might drop packets. In a system with 50 services, *something* is always partially broken. Resilience patterns keep the whole system working when parts fail.

### The worst failure is "slow", not "down"
If B is down, A gets an error quickly. If B is **slow**, every A thread waits… and waits… until A runs out of threads and also stops responding — the failure **cascades** upward to the user.

### The core toolkit in one table
| Pattern | Everyday analogy | What it does |
|---|---|---|
| **Timeout** | Hang up if nobody answers in 10 seconds | Never wait forever |
| **Retry** | Call again after a short break | Recover from brief glitches |
| **Circuit breaker** | Electrical fuse trips after repeated faults | Stop calling a failing service for a while; fail fast |
| **Fallback** | "Chef's special unavailable — here's the regular menu" | Return something useful when the call fails |
| **Bulkhead** | Ship compartments stop one leak sinking the ship | Separate resources per dependency |
| **Rate limiter** | Club bouncer letting in N people per minute | Protect a service from too many requests |

### A first example with Resilience4j
```java
@CircuitBreaker(name = "recommendations", fallbackMethod = "popularItems")
@TimeLimiter(name = "recommendations")
public CompletableFuture<List<Item>> recommendations(String userId) {
    return CompletableFuture.supplyAsync(() -> recoClient.forUser(userId));
}
private CompletableFuture<List<Item>> popularItems(String userId, Throwable t) {
    return CompletableFuture.completedFuture(cache.popularItems());   // degrade gracefully
}
```

---

## The failure model

In a distributed system **partial failure is normal**: slow responses, timeouts, partial outages, GC pauses, network partitions, bad deploys. The dangerous failure is not "down" — it's **slow**. A slow dependency holds your threads/connections until you run out → **cascading failure**.

```
User → API (200 threads) → Payments (slow: 30 s)
  every request waits 30 s → 200 threads blocked in ~seconds → API stops serving EVERYTHING,
  including endpoints that never touch Payments.
```

## 1. Timeouts — the first line of defence

- **Every** network call needs a connect timeout and a read/response timeout. Many client defaults are infinite.
- Set from the dependency's latency distribution: slightly above its p99.9, not "30 seconds".
- **Deadline propagation**: pass the remaining budget downstream (gRPC deadlines do this) — no point continuing work the caller has already abandoned.
- Timeout budgets must shrink down the chain: Gateway 3 s > Service A 2 s > Service B 1 s.

## 2. Retries — powerful and dangerous

Only retry:
- **Transient** errors (timeouts, 503, connection reset, 429 after `Retry-After`) — not 400/401/404/422.
- **Idempotent** operations (or ones made idempotent with keys).

Always:
- **Exponential backoff + jitter**: `sleep = random(0, min(cap, base × 2^attempt))` ("full jitter") — prevents synchronised retry waves.
- **Limit attempts** (2–3) and use **retry budgets** (e.g., retries ≤ 10% of requests) — otherwise retries **amplify** an outage: 3 layers × 3 retries = 27× load on the failing service (**retry storm**).
- Retry at **one layer** only, ideally closest to the failure.

## 3. Circuit breaker

Stop calling a dependency that is failing; fail fast and give it time to recover.

```
          failure rate ≥ threshold (e.g. 50% of last 100 calls,
          or slow-call rate ≥ threshold)
  CLOSED ─────────────────────────────────────────► OPEN
    ▲                                                 │ wait duration (e.g. 30 s)
    │ trial calls succeed                             ▼
    └────────────────────────────────────────── HALF_OPEN  (allow N trial calls)
                     trial calls fail ──► back to OPEN
```

```java
@Service
class PaymentClient {
    @CircuitBreaker(name = "payments", fallbackMethod = "fallback")
    @Retry(name = "payments")
    @TimeLimiter(name = "payments")      // with CompletableFuture return types
    public PaymentResult charge(ChargeRequest r) { return restClient.post()...; }

    private PaymentResult fallback(ChargeRequest r, CallNotPermittedException e) {
        return PaymentResult.pending("payments unavailable, queued");   // degrade gracefully
    }
}
```
```yaml
resilience4j:
  circuitbreaker.instances.payments:
    sliding-window-type: COUNT_BASED
    sliding-window-size: 50
    minimum-number-of-calls: 20
    failure-rate-threshold: 50
    slow-call-duration-threshold: 2s
    slow-call-rate-threshold: 60
    wait-duration-in-open-state: 30s
    permitted-number-of-calls-in-half-open-state: 5
  retry.instances.payments:
    max-attempts: 3
    wait-duration: 200ms
    enable-exponential-backoff: true
    enable-randomized-wait: true
    retry-exceptions: [java.io.IOException, java.util.concurrent.TimeoutException]
```

Decorator order in Resilience4j (outer → inner): `Retry ( CircuitBreaker ( RateLimiter ( TimeLimiter ( Bulkhead ( call ) ) ) ) )` — retry wraps the breaker so an OPEN breaker short-circuits retries quickly.

**Fallback strategies**: cached/stale data, default values, degraded feature (hide recommendations), queue for later, fail fast with a clear error. The fallback must be **cheap and reliable** — a fallback that calls another fragile service just moves the problem.

## 4. Bulkhead — isolate resources

Partition resources so one bad dependency can't sink the ship:
- **Thread-pool bulkhead**: separate pool per dependency (Payments gets 20 threads, Recommendations 10).
- **Semaphore bulkhead**: limit concurrent calls (`maxConcurrentCalls`) — the natural fit with **virtual threads**.
- Separate connection pools, separate K8s deployments for critical vs batch traffic, cell-based architecture at large scale.

## 5. Rate limiting & load shedding

- **Rate limit** at the edge (per client/API key) to protect from abuse: token bucket / sliding window (see System Design → Rate limiter). Return `429` + `Retry-After`.
- **Load shedding**: when overloaded, reject early (cheap 503) rather than accept work you'll time out on. Prioritise critical traffic (checkout > browse). Shed based on queue time/concurrency (adaptive concurrency limits — Netflix `concurrency-limits`).
- **Back-pressure**: bounded queues; reactive streams' demand signalling; Kafka naturally buffers.

## 6. Other patterns

| Pattern | Idea |
|---|---|
| **Hedged requests** | If no response by p95, send a duplicate to another replica, use whichever returns first (tail-latency killer, used at Google). Only for idempotent reads |
| **Health checks & outlier detection** | LB/mesh ejects bad instances (Envoy outlier detection) |
| **Graceful degradation** | Core flow works without non-critical deps |
| **Idempotency** | Makes retries safe |
| **Timeouts + cancellation** | Stop work nobody waits for |
| **Chaos engineering** | Inject failures deliberately (Chaos Monkey, Litmus, Gremlin, AWS FIS) to verify resilience |
| **Cell-based architecture** | Independent full-stack copies ("cells") each serving a shard of users → blast radius limited |

## Service mesh — resilience as infrastructure

Istio/Linkerd inject a **sidecar proxy** (Envoy) (or use ambient/node proxies) that handles: mTLS, retries, timeouts, circuit breaking (outlier detection), traffic splitting (canary), telemetry — **without code changes**, uniform across languages. Cost: latency hop, operational complexity, resource overhead. Don't double-configure retries in both the app and the mesh.

## Quick check questions

<details><summary>1. A downstream service is slow and your service is going down too. Walk through the fixes.</summary>

Immediate: reduce timeouts to a sane value, open/force the circuit breaker, enable fallback, shed load. Structural: bulkhead the dependency (own pool/semaphore), add circuit breaker with slow-call threshold, make the call async where possible, cache results, set retry budgets, add alerting on dependency latency, and capacity-plan for the slow case.
</details>

<details><summary>2. Why add jitter to retries?</summary>

Without jitter, all clients that failed at the same moment retry at the same moments (synchronised waves), re-overloading the recovering service. Random jitter spreads the retries out over time.
</details>

<details><summary>3. Where do you put retries in a 4-hop call chain?</summary>

Ideally at a single layer — usually the one closest to the failing dependency, or at the edge for user-facing idempotent requests — with retry budgets. Retrying at every hop multiplies load exponentially (3^4 = 81× attempts).
</details>

<details><summary>4. Circuit breaker states and what triggers each transition?</summary>

CLOSED → OPEN when failure or slow-call rate in the sliding window exceeds the threshold (after a minimum number of calls). OPEN → HALF_OPEN after the wait duration. HALF_OPEN → CLOSED if trial calls succeed, → OPEN if they fail.
</details>

## Questions asked at top companies

<details><summary>Explain the circuit breaker pattern and its states. <em>· Walmart, Paytm, Amazon, Infosys</em></summary>

CLOSED (calls pass, failures counted) → OPEN when failure/slow-call rate exceeds threshold (calls fail fast) → HALF_OPEN after a wait (limited trial calls) → CLOSED on success or OPEN on failure.
</details>

<details><summary>How do retries cause outages and how do you prevent it? <em>· Google, Uber, Amazon</em></summary>

Retries multiply load on an already struggling service (retry storms, especially across layers). Use limited attempts, exponential backoff with jitter, retry budgets, retry only idempotent operations and transient errors, and at one layer.
</details>

<details><summary>What is the bulkhead pattern? <em>· Walmart, Flipkart</em></summary>

Isolating resources (thread pools, semaphores, connection pools, deployments) per dependency or traffic type so one failing dependency can't exhaust shared resources.
</details>

<details><summary>How do you choose timeout values? <em>· Microsoft, Swiggy</em></summary>

Based on the dependency's latency distribution (slightly above p99.9) and the caller's overall deadline budget; shrinking budgets down the call chain; propagate deadlines.
</details>

<details><summary>Hystrix vs Resilience4j. <em>· Infosys, Paytm</em></summary>

Hystrix (Netflix) is in maintenance mode; Resilience4j is lightweight, functional, modular (circuit breaker, retry, rate limiter, bulkhead, time limiter), integrates with Spring Boot and Micrometer.
</details>

<details><summary>What is graceful degradation? Give examples. <em>· Amazon, Netflix-style questions at Hotstar</em></summary>

Keep core functionality working with reduced features when dependencies fail: show cached prices, hide recommendations, queue orders for later processing, read-only mode.
</details>

<details><summary>What is load shedding? <em>· Google, Uber</em></summary>

Rejecting excess requests early (fast 503/429) when overloaded, prioritising critical traffic, so the service keeps serving what it can within SLO instead of collapsing.
</details>

<details><summary>What is idempotency and why is it essential for retries? <em>· Razorpay, Amazon</em></summary>

Executing an operation multiple times has the same effect as once. Without it, retrying a timed-out "charge" could double-charge. Use idempotency keys and conditional updates.
</details>

<details><summary>Rate limiting algorithms? <em>· Amazon, Flipkart, Microsoft</em></summary>

Token bucket, leaky bucket, fixed window, sliding window log, sliding window counter — see System Design → Rate limiter.
</details>

<details><summary>What is chaos engineering? <em>· Netflix-style, Amazon, Walmart</em></summary>

Deliberately injecting failures (kill instances, add latency, drop network) in controlled experiments to verify resilience and find weaknesses before real incidents.
</details>

## End-to-end scenarios

<details><summary>Scenario: The product page calls Pricing, Inventory, Reviews and Recommendations. Reviews goes down and the whole page fails. Redesign.</summary>

Classify dependencies: Pricing/Inventory critical, Reviews/Recommendations optional. Call in parallel with per-call timeouts; circuit breakers on each; fallbacks: cached reviews or hide section, popular items for recommendations; bulkheads (separate pools/semaphores); return partial page with flags; monitor per-dependency error rates; for critical deps add caching with short TTL and serve stale on failure.
</details>

<details><summary>Scenario: During a sale, payment provider latency jumps from 300 ms to 8 s. What should your system do automatically?</summary>

Timeouts at ~2 s; circuit breaker opens on slow-call rate; checkout switches to fallback: secondary payment provider, or accept order as PENDING_PAYMENT and complete asynchronously with user notification; bulkhead isolates payment calls so browsing continues; load shedding for non-critical traffic; alert on SLO burn; status page update.
</details>
