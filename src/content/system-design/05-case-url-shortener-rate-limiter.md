---
title: Case Studies I — URL Shortener & Distributed Rate Limiter
level: 5
tags: case study, url shortener, rate limiter
---
<!-- deepened -->

## Start here: the basics

### URL shortener — what it is
Turn `https://www.example.com/products/shoes?color=red&size=9&campaign=diwali` into `https://sho.rt/aZ3k9Lp`. Clicking the short link redirects to the long URL. Core pieces: **generate a unique short code**, **store the mapping**, **redirect fast**.

### Rate limiter — what it is
Limits how many requests a user can make in a time window (e.g., 100 requests per minute) to protect servers from abuse and overload. Extra requests get HTTP **429 Too Many Requests**.

### The simplest possible versions
```java
// URL shortener: a counter + base62
long id = counter.incrementAndGet();          // 125
String code = base62(id);                     // "21"
map.put(code, longUrl);

// Rate limiter: fixed window counter
String key = userId + ":" + (System.currentTimeMillis() / 60000);   // user + current minute
if (counts.merge(key, 1, Integer::sum) > 100) reject();
```
The rest of the module shows how these become production systems with many servers.

---

# Case 1 — URL shortener (bit.ly / TinyURL)

## Requirements
**Functional**: create short URL for a long URL (optional custom alias, optional expiry); redirect short → long; (optional) click analytics.
**Non-functional**: very low redirect latency (< 50 ms p99), highly available reads, short links must never collide, links unpredictable-ish (not enumerable) if required.

## Estimates
- 100M new URLs/month ≈ 40 writes/s (peak ~100/s).
- Read:write 100:1 → ~4 000 redirects/s avg, ~10–20k peak.
- 5 years × 1.2B/yr = 6B URLs × ~500 B = **3 TB**. Fits a sharded KV store comfortably.
- Code length: base62, 62⁷ ≈ 3.5 trillion → **7 chars** is plenty.

## API
```
POST /api/v1/urls        { longUrl, customAlias?, expiresAt? }  → 201 { shortUrl }
GET  /{code}             → 301/302 Location: longUrl
```
**301 vs 302**: 301 (permanent) lets browsers cache → fewer hits on you but **you lose analytics** and can't change targets. 302/307 keeps every click flowing through you. Most shorteners use 302 when analytics matter.

## Generating the code — the core deep dive

| Approach | How | Trade-offs |
|---|---|---|
| Hash (MD5/SHA) of long URL, take 7 chars | Deterministic | Collisions → check DB & re-hash with salt; same URL → same code (dedupe, but leaks) |
| **Counter + base62** | Unique integer id → base62 encode | No collisions; sequential → predictable/enumerable; needs a distributed counter |
| **Pre-generated key service (KGS)** | Offline generate random unique 7-char keys into a DB; app servers fetch batches into memory | No collision checks at write time, fast; KGS is critical (replicate); keys in a crashed server's batch are lost (fine) |
| Snowflake id → base62 | 64-bit id ≈ 11 chars | Longer codes |

Counter approach at scale: **range allocation** — each app server leases a block of 1 000 000 ids from ZooKeeper/DB (`UPDATE counters SET next = next + 1e6`) and hands them out locally. To avoid enumeration, permute ids with a bijective scramble (e.g., multiply by a large odd number mod 62⁷, or Feistel cipher) before encoding.

```java
static final String ALPHABET = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
static String base62(long n) {
    StringBuilder sb = new StringBuilder();
    do { sb.append(ALPHABET.charAt((int) (n % 62))); n /= 62; } while (n > 0);
    return sb.reverse().toString();
}
```

## Data model
`urls(code PK, long_url, user_id, created_at, expires_at)` — a pure key-value access pattern → DynamoDB/Cassandra (shard by `code`) or sharded Postgres. Custom aliases: insert with conditional write (`attribute_not_exists(code)`) → uniqueness guaranteed by the store.

## High-level design
```
Client ─► CDN/edge (optional cache of hot redirects)
       ─► LB ─► Redirect service ─► Redis (code → url, LRU, ~20% hot set)
                                 └► KV store (miss)
                                 └► Kafka "clicks" ─► analytics consumers ─► ClickHouse/OLAP
       ─► LB ─► Write service ─► KGS / id ranges ─► KV store
```
- Redirect path: cache hit ~1 ms. Negative-cache unknown codes (or Bloom filter) to stop scans hammering the DB.
- Analytics asynchronously — never slow down the redirect for logging.
- Expiry: lazy check on read + background cleanup; TTL feature of DynamoDB/Cassandra.
- Abuse: rate-limit creation, scan target URLs against malware lists (Safe Browsing).

---

# Case 2 — Distributed rate limiter

## Requirements
Limit requests per client (API key / user / IP) per rule, e.g. 100 req/min; return 429 with headers (`X-RateLimit-Limit`, `-Remaining`, `Retry-After`). Low added latency (< few ms), accurate enough across many gateway instances, fail-open or fail-closed decided per use case.

## Algorithms

| Algorithm | Idea | Pros | Cons |
|---|---|---|---|
| **Token bucket** | Bucket of capacity B refilled at rate r; each request takes a token | Allows bursts up to B, smooth average; 2 numbers per key | Tuning two params |
| Leaky bucket | Queue drained at fixed rate | Smooth output rate | Bursts queued/dropped; latency |
| Fixed window counter | Count per calendar window (`key:12:05`) | Trivial (`INCR` + `EXPIRE`) | **2× burst at window boundary** (100 at 12:05:59 + 100 at 12:06:00) |
| Sliding window log | Store timestamp of each request (sorted set), count within last window | Exact | Memory O(requests) |
| **Sliding window counter** | Weighted: `curr + prev × (1 − elapsed/window)` | ~Accurate, O(1) memory | Approximation |

## Token bucket — single node (interview coding round favourite)
```java
final class TokenBucket {
    private final long capacity;
    private final double refillPerNano;
    private double tokens;
    private long lastRefill;

    TokenBucket(long capacity, long refillPerSecond) {
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1e9;
        this.tokens = capacity;
        this.lastRefill = System.nanoTime();
    }

    synchronized boolean tryAcquire() {
        long now = System.nanoTime();
        tokens = Math.min(capacity, tokens + (now - lastRefill) * refillPerNano);
        lastRefill = now;
        if (tokens >= 1) { tokens -= 1; return true; }
        return false;
    }
}
// per-client: ConcurrentHashMap<String, TokenBucket> (evict idle buckets with Caffeine expireAfterAccess)
```

## Distributed — Redis + Lua (atomic)
```lua
-- KEYS[1] = bucket key; ARGV = capacity, refill_per_ms, now_ms, cost
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate, now, cost = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3]), tonumber(ARGV[4])
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) * rate)
local allowed = tokens >= cost
if allowed then tokens = tokens - cost end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate) * 2)
return { allowed and 1 or 0, tokens }
```
Lua runs atomically in Redis → no race between read and write across gateway instances. Use Redis server time (`TIME`) or accept small client clock skew.

## Architecture & deep dives
```
Client → API Gateway / sidecar (rate-limit filter) → Redis Cluster (sharded by key)
                       ▲ rules from config service (cached locally, hot reload)
```
- **Where**: at the edge gateway (per API key/IP), plus per-service limits to protect specific dependencies.
- **Latency**: one Redis round trip (~0.5 ms). For extreme scale: local token buckets with periodic sync (approximate: each of N nodes gets limit/N, or async counter aggregation) — trade accuracy for latency.
- **Hot keys**: a huge customer's key on one shard → local pre-aggregation.
- **Failure**: Redis down → **fail-open** (allow, protect availability) for normal APIs; **fail-closed** for login/OTP endpoints (security).
- **Multi-region**: per-region limits, or async global sync — strict global limits require cross-region coordination (slow).
- **Rules**: per user tier, per endpoint, per method; dynamic configuration.
- **Client experience**: `Retry-After`, documented limits, exponential backoff in SDKs.

## Quick check questions

<details><summary>1. Why is fixed window rate limiting problematic?</summary>

Bursts straddling the window boundary can let through up to 2× the limit within a short interval. Sliding window counter or token bucket smooth this out.
</details>

<details><summary>2. How do you make a Redis-based limiter race-free across 50 gateway instances?</summary>

Perform read-compute-write atomically in Redis: a Lua script (or `INCR` + `EXPIRE` for fixed windows, which is atomic per command). Avoid GET-then-SET from the application.
</details>

<details><summary>3. How do you guarantee short codes never collide?</summary>

Derive them from unique integers (range-allocated counters or a pre-generated key pool) instead of hashes; enforce uniqueness at the storage layer with a conditional insert as a final guard (especially for custom aliases).
</details>

## Questions asked at top companies

<details><summary>Design a URL shortener (TinyURL/bit.ly). <em>· Amazon, Microsoft, Google, Flipkart — one of the most asked</em></summary>

Requirements & estimates → API (create, redirect) → code generation (counter + base62 with range allocation or key-generation service) → KV store sharded by code → Redis cache for hot codes → async analytics via Kafka → 301 vs 302 trade-off → expiry, custom aliases, abuse prevention.
</details>

<details><summary>Design a rate limiter. <em>· Amazon, Microsoft, Uber, Stripe-style at Razorpay</em></summary>

Algorithms (token bucket, sliding window), where to enforce (gateway/sidecar), shared state in Redis with atomic Lua scripts, rules config, 429 + headers, fail-open vs fail-closed, local approximations for latency, multi-region considerations.
</details>

<details><summary>How do you generate unique short codes without collisions? <em>· Google, Uber</em></summary>

Unique integers (DB sequence ranges / Snowflake) encoded in base62, or a pre-generated key pool; conditional insert as a final guard; avoid hash truncation without collision checks.
</details>

<details><summary>Token bucket vs leaky bucket vs sliding window. <em>· Amazon, Microsoft</em></summary>

Token bucket allows bursts up to capacity with average rate; leaky bucket smooths output rate; fixed window has boundary bursts; sliding window log is exact but memory-heavy; sliding window counter approximates cheaply.
</details>

<details><summary>301 vs 302 redirect for a URL shortener. <em>· Microsoft, Meta</em></summary>

301 is cached by browsers (less load, lose analytics, can't change destination); 302/307 hits the server every time (analytics, flexibility).
</details>

<details><summary>How would you rate limit per user across 50 servers? <em>· Uber, Swiggy</em></summary>

Central Redis counters keyed by user with atomic operations (Lua), or sticky routing to a limiter shard; local token buckets with periodic sync for lower latency at the cost of accuracy.
</details>

<details><summary>How would you handle analytics (click counts) for billions of redirects? <em>· Meta, Amazon</em></summary>

Emit click events asynchronously to Kafka; stream-aggregate (Flink) into an OLAP store (ClickHouse/Druid); never block the redirect path.
</details>

<details><summary>How do you prevent abuse of a URL shortener? <em>· Google, Microsoft</em></summary>

Rate-limit creation per user/IP, scan destinations against malware/phishing lists, block known bad domains, CAPTCHA for anonymous bulk creation, allow reporting and takedown.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your URL shortener's redirect p99 jumped from 20 ms to 400 ms after a viral campaign. Diagnose.</summary>

Hot key: one code receiving huge traffic → a single Redis shard or DB partition overloaded. Check per-key/per-shard metrics. Fix: local in-process cache (L1) for hot codes, CDN/edge caching of redirects (with 302 + short TTL), replicate hot keys, ensure analytics is async (Kafka backpressure not blocking).
</details>

<details><summary>Scenario: Design a rate limiter for an OTP endpoint (strict) and a product search endpoint (lenient) in the same gateway.</summary>

Rule config per route: OTP — token bucket 3/10 min per phone + 10/hour per IP + device fingerprint, fail-closed if Redis is down, exponential cooldown; search — 50 rps per user with burst 100, fail-open. Implement as gateway filter with Redis Lua scripts, return 429 with `Retry-After`, metrics for rejections per rule, alerts on spikes (SMS pumping attacks).
</details>
