---
title: The System Design Interview Framework & Back-of-the-Envelope Estimation
level: 3
tags: system design, estimation, framework
---
<!-- deepened -->

## Start here: the basics

### What is "system design"?
Coding interviews ask you to write a function. System design asks: **how would you build a whole product** — like Instagram or Uber — that serves millions of users? You draw boxes (servers, databases, caches, queues), arrows (how data flows), and explain **why** you chose each piece.

### Why there is no single right answer
Every design is a set of **trade-offs**: faster vs cheaper, consistent vs always available, simple vs scalable. Interviewers want to see you **reason** about these trade-offs, not recite a memorised diagram.

### The simplest web system, then growing it
```
Stage 1:  User ──► one server (app + database)            fine for 100 users
Stage 2:  User ──► app server ──► separate database       scale them separately
Stage 3:  User ──► load balancer ──► 3 app servers ──► database (+ replicas for reads)
Stage 4:  + cache (Redis) for hot data, + CDN for images/JS
Stage 5:  + message queue for slow background work (emails, video processing)
Stage 6:  + database sharding when one primary can't handle writes
```
Most interview designs are variations of stage 3–6.

### Key vocabulary
| Term | Meaning |
|---|---|
| **Latency** | Time for one request (ms) |
| **Throughput** | Requests handled per second (QPS/RPS) |
| **Availability** | % of time the system works (99.9% ≈ 43 min downtime/month) |
| **Scalability** | Handling more load by adding resources |
| **Horizontal / vertical scaling** | More machines / bigger machine |
| **Stateless server** | Keeps no user data in memory between requests → any server can handle any request |
| **Single point of failure** | One component whose failure takes everything down |

### Back-of-the-envelope math — just two tricks
1. **1 day ≈ 100 000 seconds.** So 10 million requests/day ≈ 100 requests/second.
2. **Size = count × size of one.** 100 million photos × 2 MB = 200 TB.

---

## How you're evaluated

Interviewers score signals, not a "correct" diagram:
1. **Requirements & scoping** — do you ask before designing?
2. **High-level design** — sensible components and data flow.
3. **Deep dives** — can you go deep where it matters (data model, scaling the hot path, consistency)?
4. **Trade-offs** — "I chose X over Y because Z; it costs us W."
5. **Communication** — drive the session, check in, manage time.

The level you're offered (SDE-2 vs Senior) is decided largely here.

## The 45-minute framework

| Minutes | Step | Output |
|---|---|---|
| 0–5 | **Functional requirements** | 3–5 core use cases, explicitly out-of-scope list |
| 5–8 | **Non-functional requirements** | Scale (DAU, QPS), latency targets, availability, consistency needs, durability, read/write ratio |
| 8–12 | **Estimation** | QPS (avg & peak), storage/yr, bandwidth, cache size — only what drives decisions |
| 12–15 | **API design** | Key endpoints with params & responses |
| 15–18 | **Data model** | Entities, keys, access patterns → DB choice |
| 18–28 | **High-level design** | Boxes & arrows covering every functional requirement |
| 28–42 | **Deep dives** | 2–3 hardest parts: scaling, hot spots, consistency, failure modes |
| 42–45 | **Wrap-up** | Bottlenecks, monitoring, future improvements |

Phrases that signal seniority:
- "Before designing, let me confirm the scope…"
- "This is read-heavy, ~100:1, so I'll optimise the read path with caching and replicas."
- "We can tolerate eventual consistency for the feed but **not** for payments."
- "The bottleneck here will be X; let me deep-dive on that."
- "What happens when this component fails?"

## Numbers every engineer should know

### Latency (order of magnitude)
| Operation | Time |
|---|---|
| L1 cache reference | ~1 ns |
| Branch mispredict | ~3 ns |
| L2 cache | ~4 ns |
| Mutex lock/unlock | ~17 ns |
| Main memory reference | ~100 ns |
| Compress 1 KB (fast codec) | ~2 µs |
| Read 1 MB sequentially from memory | ~3 µs |
| SSD random read | ~16–100 µs |
| Round trip within same datacenter | ~0.5 ms |
| Read 1 MB sequentially from SSD | ~50 µs–1 ms |
| Disk (HDD) seek | ~2–10 ms |
| Round trip CA ↔ Netherlands | ~150 ms |
| Mumbai ↔ US East | ~200 ms |

Takeaways: memory ≫ SSD ≫ network ≫ disk seek; cross-region calls are expensive; **sequential** I/O beats random by orders of magnitude (why Kafka and LSM trees are fast).

### Throughput rules of thumb (single node, ballpark)
| Component | Capacity |
|---|---|
| Spring Boot API instance (simple CRUD) | 1k–5k RPS |
| Postgres/MySQL (well-indexed, good hardware) | ~10k simple QPS reads, a few k writes/s |
| Redis | ~100k+ ops/s per core/shard |
| Kafka broker | ~100s MB/s, 100k–1M msgs/s |
| Nginx | 10k–50k+ RPS |
| Cassandra node | ~10k+ writes/s |

### Handy conversions
- 1 day = 86 400 s ≈ **10⁵ s** (use 100k for mental math).
- 1 million requests/day ≈ **12 RPS**. 100M/day ≈ 1 200 RPS. 1B/day ≈ 12k RPS.
- Peak ≈ 2–3× average (more for spiky events).
- 1 year ≈ 3 × 10⁷ s; 1M × 1 KB = 1 GB; 1B × 1 KB = 1 TB.
- Powers of two: 2¹⁰ ≈ 10³ (KB), 2²⁰ ≈ 10⁶ (MB), 2³⁰ ≈ 10⁹ (GB), 2⁴⁰ ≈ 10¹² (TB).
- Availability: 99.9% = 8.76 h/yr (43 min/month) downtime; 99.99% = 52.6 min/yr; 99.999% = 5.26 min/yr.

## Worked estimation: a photo-sharing app

Assumptions: 500M DAU; each user views 50 photos/day, uploads 0.2 photos/day; avg photo 2 MB (plus thumbnails ~ 200 KB total); metadata 1 KB.

- **Writes**: 500M × 0.2 = 100M uploads/day ≈ 100M / 10⁵ = **~1 200 uploads/s**, peak ~3 600/s.
- **Reads**: 500M × 50 = 25B views/day ≈ **250k views/s**, peak ~750k/s → read:write ≈ 200:1 → **CDN + cache** dominate the design.
- **Storage/day**: 100M × 2.2 MB = 220 TB/day → **~80 PB/yr** (before replication ×3) → object storage (S3), tiering to cold storage.
- **Metadata**: 100M × 1 KB = 100 GB/day → 36 TB/yr → sharded DB.
- **Egress**: 250k/s × 200 KB (mostly thumbnails) = 50 GB/s → must be served from CDN edges.
- **Cache**: 20% of daily-hot metadata… 80/20 rule: cache top 20% of 1 day's reads.

Stop estimating as soon as the numbers have told you the architecture.

## Choosing a database (decision heuristics)

| Need | Choose |
|---|---|
| Transactions, joins, constraints, moderate scale | **PostgreSQL/MySQL** (scale with replicas, partitioning, then sharding — Vitess/Citus) |
| Massive write throughput, simple key access, multi-DC | **Cassandra / ScyllaDB / DynamoDB** (wide-column, LSM) |
| Flexible documents, per-entity reads | MongoDB / DynamoDB |
| Low-latency cache, counters, leaderboards, rate limits | **Redis** |
| Full-text search, faceting | **Elasticsearch / OpenSearch** |
| Relationships/traversals | Neo4j (graph) |
| Time series metrics | Prometheus, TimescaleDB, InfluxDB |
| Analytics over huge data | Columnar: BigQuery, Snowflake, ClickHouse, Redshift |
| Blobs (images/videos) | **Object storage** (S3/GCS) + CDN; DB stores only the URL |
| Global strong consistency + SQL | Spanner, CockroachDB, YugabyteDB |

Polyglot persistence is normal: one system of record, specialised read stores fed by events/CDC.

## API design in interviews
Show 3–5 endpoints with methods, key parameters, pagination (cursor), and idempotency for writes. Mention auth (API gateway, tokens) and rate limiting briefly. For real-time: WebSocket/SSE/long-polling.

## Quick check questions

<details><summary>1. How many servers do you need for 50k peak RPS?</summary>

If one instance handles ~2k RPS at target latency with headroom (~60% CPU), 50k/2k = 25, plus N+2 redundancy across AZs → ~30 instances (round up to a multiple of AZ count). Then state the real bottleneck is likely the DB/cache, not app servers.
</details>

<details><summary>2. What do you clarify first in a system design question?</summary>

Core features in/out of scope, users & scale (DAU, QPS, data size), read/write ratio, latency and availability targets, consistency requirements, geographic distribution, and any constraints (mobile clients, cost, existing infra).
</details>

<details><summary>3. Why use averages × 2–3 for peak?</summary>

Traffic is diurnal and bursty (events, sales, push notifications). Capacity must handle peaks without breaching SLOs; autoscaling has lag, so you provision headroom and plan for spikes (pre-scaling for known events).
</details>

## Questions asked at top companies

<details><summary>How do you approach a system design question? <em>· Every FAANG / product company</em></summary>

Clarify functional & non-functional requirements → estimate scale → define APIs → data model → high-level design → deep dive into bottlenecks → discuss trade-offs, failures and monitoring. Drive the conversation and check in.
</details>

<details><summary>Estimate the storage needed for Twitter-like posts for 5 years. <em>· Google, Meta, Amazon</em></summary>

E.g., 200M DAU × 2 posts/day = 400M posts/day × ~300 B text+metadata = 120 GB/day → ~44 TB/yr → ~220 TB for 5 years (×3 replication ≈ 660 TB). Media separately: 10% with 500 KB images → 20 TB/day → object storage + CDN.
</details>

<details><summary>What is the difference between latency and throughput? <em>· Microsoft, Infosys</em></summary>

Latency: time per request. Throughput: requests per unit time. You can increase throughput with parallelism without reducing latency; queueing at high utilisation increases latency.
</details>

<details><summary>Horizontal vs vertical scaling — trade-offs. <em>· Amazon, Walmart</em></summary>

Vertical: simple, no code changes, hardware ceiling, single point of failure. Horizontal: near-unlimited, fault tolerant, requires stateless services, load balancing, data partitioning.
</details>

<details><summary>What does 99.99% availability mean in downtime? How do you achieve it? <em>· Google, Microsoft</em></summary>

~52 minutes/year (~4.3 min/month). Redundancy across zones, no single points of failure, automated failover, health checks, safe deploys (canary), graceful degradation, fast rollback.
</details>

<details><summary>How do you identify bottlenecks in a design? <em>· Uber, Flipkart</em></summary>

Follow the request path with numbers: which component receives the most QPS relative to its capacity (usually the DB or a hot key), which data grows fastest, what has strict latency, what's a single point of failure.
</details>

<details><summary>Read-heavy vs write-heavy systems — how does design differ? <em>· Amazon, Swiggy</em></summary>

Read-heavy: caching, CDN, read replicas, denormalized read models. Write-heavy: queues for buffering, LSM-based stores, sharding, batching, async processing.
</details>

<details><summary>What are functional vs non-functional requirements? <em>· Infosys, Atlassian</em></summary>

Functional: what the system does (post a photo, follow users). Non-functional: qualities (latency, availability, consistency, durability, security, cost, scale).
</details>

## End-to-end scenarios

<details><summary>Scenario: Estimate QPS, storage and bandwidth for a food-delivery app with 10M daily orders.</summary>

Orders: 10M/day ≈ 115/s avg, peak ~5× at dinner ≈ 600/s writes. Browsing: ~50 menu views per order → 500M/day ≈ 6k/s avg, 30k/s peak → cache/CDN critical. Location updates from 500k riders every 5 s = 100k writes/s → in-memory geo store, not SQL. Order storage: 10M × 2 KB = 20 GB/day → ~7 TB/yr. Conclusion: design around rider location ingestion and menu reads, not order writes.
</details>

<details><summary>Scenario: Your interviewer says "Design a parking garage booking app" and stays silent. Run the first 10 minutes.</summary>

Ask: who are users (drivers, garage owners)? Core features (search nearby garages, book slot for time window, pay, cancel)? Scale (cities, garages, bookings/day)? Must double bookings be impossible (yes → strong consistency on booking)? Latency expectations? Then state assumptions, estimate (e.g., 1M bookings/day ≈ 12/s, read-heavy search), sketch APIs (`GET /garages?lat&lng&from&to`, `POST /bookings`), and name the deep dives: availability search and preventing double booking.
</details>
