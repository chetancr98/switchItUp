---
title: Building Blocks — DNS, CDN, Load Balancers, Caching, Proxies, Blob Storage
level: 3
tags: load balancer, cdn, cache, dns
---
<!-- deepened -->

## Start here: the basics

### The building blocks, each in one sentence
| Block | What it does | Analogy |
|---|---|---|
| **DNS** | Turns `shop.com` into an IP address | Phone book |
| **Load balancer** | Spreads requests across servers | Restaurant host seating guests at free tables |
| **CDN** | Serves static files from servers near the user | Local warehouses instead of one central factory |
| **Cache** | Keeps hot data in fast memory | Keeping snacks on your desk instead of the kitchen |
| **Database** | Durable storage of records | Filing cabinet |
| **Object storage** | Stores files (images, videos) cheaply | Self-storage units |
| **Message queue** | Holds work to be done later | Order tickets at a kitchen counter |
| **API gateway** | Front door for all APIs | Building reception |

### Why caching is the first tool you reach for
Reading from memory (Redis) takes ~1 ms; a database query may take 10–100 ms and the DB can only handle so many. If 90% of requests ask for the same popular items, a cache absorbs them and the database relaxes.

### Synchronous vs asynchronous work
Uploading a video: the user shouldn't wait 10 minutes for transcoding. The API stores the file, puts a "transcode" job on a **queue**, and responds immediately. Workers process jobs in the background.

---

## Request path of a typical web system

```
Client → DNS (GeoDNS/Anycast) → CDN edge (static + cacheable API) → L4/L7 load balancer
       → API gateway → stateless app servers → cache → database (+ replicas)
                                            └→ message queue → workers
                                            └→ object storage
```

## DNS
- Resolution: browser cache → OS → recursive resolver → root → TLD (`.com`) → authoritative → A/AAAA/CNAME record. TTLs control caching (low TTL = fast failover, more queries).
- **GeoDNS / latency-based routing** sends users to the nearest region; health-checked records for failover (Route 53).
- **Anycast**: same IP announced from many locations; BGP routes to the nearest (Cloudflare, Google DNS).

## CDN
- Edge servers cache content near users. **Pull CDN** (fetch from origin on miss — default) vs **push CDN** (you upload).
- Cache static assets with long TTL + **content-hashed filenames** (`app.3f9a.js`, `Cache-Control: public, max-age=31536000, immutable`); HTML short TTL.
- Can cache **API responses** (`Cache-Control: s-maxage`, `stale-while-revalidate`) and run edge compute (Workers/Lambda@Edge) for auth, A/B, personalisation.
- **Origin shield** (a mid-tier cache) collapses misses from many edges into one origin request.
- Video: segmented (HLS/DASH) files are perfect CDN content.

## Load balancers

### L4 vs L7
| | L4 (transport) | L7 (application) |
|---|---|---|
| Sees | IP/port, TCP/UDP | HTTP: path, headers, cookies |
| Can | Forward connections (very fast) | Route by path/host, TLS termination, retries, header rewrite, auth, compression |
| Examples | AWS NLB, LVS, Maglev | ALB, NGINX, Envoy, HAProxy (both) |

### Algorithms
- **Round robin** / weighted round robin — equal work assumption.
- **Least connections** / least outstanding requests — better for variable request cost.
- **Power of two random choices** — pick 2 random backends, choose the less loaded; near-optimal, cheap, used widely (Envoy, Nginx).
- **IP hash / consistent hashing** — affinity (cache locality, sticky sessions).
- **Latency-aware / EWMA** (Finagle, Linkerd).

### Health & HA
Active health checks (probe `/health`) + passive (outlier detection on errors). The LB itself must be redundant: active-passive pair with a floating IP (keepalived/VRRP), or cloud-managed LBs, or Anycast + ECMP for large scale.

**Sticky sessions** fix stateful apps but hurt balancing and failover → make app servers **stateless** (sessions in Redis or JWT).

## Reverse proxy vs forward proxy vs API gateway
- **Forward proxy**: acts for *clients* (corporate egress, anonymity).
- **Reverse proxy**: acts for *servers* (LB, TLS termination, caching, compression, hide topology).
- **API gateway**: a reverse proxy with API-management features (auth, rate limits, routing to services, aggregation).

## Caching — layers & strategy

```
Browser cache → CDN → reverse-proxy cache → application local cache (Caffeine)
              → distributed cache (Redis/Memcached) → DB buffer pool → disk
```

### What & where
- Cache **hot, read-mostly, expensive-to-compute** data: user profiles, product pages, sessions, computed feeds, rate-limit counters.
- **Local (in-process)**: ns access, no network, but per-instance duplication and invalidation fan-out.
- **Distributed (Redis)**: shared, survives instance restarts, ~0.5 ms network hop.
- **Two-level (L1 local + L2 Redis)** for hot keys; invalidate L1 via pub/sub.

### Sizing
Working set × replication overhead. Eviction policies: **LRU** (recency), **LFU** (frequency, better for skewed popularity), **W-TinyLFU** (Caffeine — admission filter + LRU windows, best general hit rates), TTL-based.

### Invalidation strategies (repeat from Spring module, system-level framing)
- TTL-only (simplest, bounded staleness)
- Explicit evict on write (cache-aside)
- Write-through / write-behind
- Event-driven invalidation via CDC
- Versioned keys (`product:42:v7`) — no invalidation needed; old versions age out

> "There are only two hard things in Computer Science: cache invalidation and naming things." — say the trade-off explicitly: what staleness is acceptable for this data?

### Failure modes
Stampede (request coalescing, early refresh), penetration (negative caching, Bloom filter), avalanche (TTL jitter, multi-AZ cache cluster), hot keys (local cache, key replication), cold start after cache restart (warm-up, gradual traffic), and the DB must survive a full cache outage — or you need **load shedding**.

## Object / blob storage
- S3/GCS/Azure Blob: flat namespace of keys, virtually infinite, 11 nines durability (erasure coding across AZs), strong read-after-write consistency (S3 since 2020).
- Upload pattern: client asks your API for a **pre-signed URL** → uploads directly to S3 (your servers don't proxy bytes) → S3 event triggers processing (thumbnails, virus scan, transcoding) → metadata stored in DB.
- Multipart upload for large files (parallel, resumable).
- Lifecycle policies to move cold data to cheaper tiers (Glacier).

## Communication protocols for real-time

| Technique | How | Use |
|---|---|---|
| Short polling | Client asks every N s | Simple, wasteful |
| Long polling | Server holds request until data/timeout | Fallback real-time |
| **SSE** | One-way server→client stream over HTTP | Notifications, live scores, LLM token streaming |
| **WebSocket** | Full-duplex over a single TCP connection | Chat, collaborative editing, games |
| WebRTC | Peer-to-peer media/data | Video calls |

WebSocket servers are **stateful** (connections) → need a connection registry (user → gateway server) and a pub/sub backbone (Redis/Kafka) to route messages to the right server; LB must support upgrades and long-lived connections; plan for reconnect storms.

## Quick check questions

<details><summary>1. L4 vs L7 load balancing — when do you need L7?</summary>

When routing depends on HTTP content (path/host/header-based routing, canaries by header), when you need TLS termination with HTTP-aware features (retries, rate limiting, auth, compression), or per-request balancing over long-lived HTTP/2/gRPC connections. L4 is faster/cheaper for raw TCP and pass-through.
</details>

<details><summary>2. How would you serve user-uploaded images to millions of users?</summary>

Pre-signed direct upload to object storage; async processing into multiple sizes/formats; store keys in DB; serve through a CDN with long TTL and immutable versioned URLs; signed URLs/cookies for private images; lifecycle policies for cold storage.
</details>

<details><summary>3. Your Redis cluster goes down. What happens to your system?</summary>

If the DB can't absorb the full read load, it overloads and cascades. Mitigations: replicas + automatic failover, multi-AZ, local L1 cache to absorb hot reads, circuit breaker around Redis with fallback to DB with **rate limiting/load shedding**, gradual warm-up, and capacity planning that the DB can survive a cache-miss storm for critical paths.
</details>

<details><summary>4. Why make app servers stateless?</summary>

Any instance can serve any request → simple horizontal scaling, LB freedom, painless deploys/autoscaling/failure recovery. State goes to shared stores (DB, Redis, object storage) or to the client (tokens).
</details>

## Questions asked at top companies

<details><summary>What happens when you type a URL into the browser? <em>· Google, Amazon, Microsoft, Infosys — classic</em></summary>

DNS resolution (caches → resolver → root → TLD → authoritative) → TCP handshake → TLS handshake → HTTP request (possibly via CDN/LB) → server processing → response → browser parses HTML, fetches CSS/JS/images (more requests, caching), builds DOM/CSSOM, layout, paint, executes JS.
</details>

<details><summary>How does a load balancer work and what algorithms exist? <em>· Amazon, Walmart, Flipkart</em></summary>

Distributes traffic to healthy backends using health checks. Algorithms: round robin, weighted, least connections, least response time, IP hash/consistent hashing, power-of-two choices. L4 vs L7 operation.
</details>

<details><summary>What is a CDN and how does it work? <em>· Hotstar, Netflix-style, Amazon</em></summary>

Geographically distributed edge caches; DNS/anycast routes users to nearby edges; cache hit served locally, miss fetched from origin and cached per TTL; reduces latency and origin load.
</details>

<details><summary>Where can you add caching in a system? <em>· Swiggy, Zomato, Flipkart</em></summary>

Browser, CDN, reverse proxy, application (local), distributed cache, database buffer cache. Choose by what's cacheable, staleness tolerance and invalidation complexity.
</details>

<details><summary>Cache eviction policies. <em>· Amazon, Microsoft</em></summary>

LRU, LFU, FIFO, TTL-based, random, W-TinyLFU (Caffeine); choose by access pattern (recency vs frequency).
</details>

<details><summary>WebSockets vs long polling vs SSE. <em>· Uber, Swiggy, Microsoft</em></summary>

Long polling: client holds request until data; simple but overhead. SSE: server→client stream over HTTP. WebSocket: full-duplex persistent connection — chat, collaboration, live tracking.
</details>

<details><summary>Forward proxy vs reverse proxy. <em>· Infosys, Walmart</em></summary>

Forward proxy acts for clients (egress filtering, anonymity). Reverse proxy acts for servers (load balancing, TLS termination, caching, hiding backends).
</details>

<details><summary>How do you store and serve user-uploaded images? <em>· Instagram-style at Meta, Myntra</em></summary>

Pre-signed URL direct upload to object storage, async processing (resize, compress, scan), metadata in DB, serve via CDN with versioned URLs and long cache TTLs.
</details>

<details><summary>Why make servers stateless? <em>· Amazon, Atlassian</em></summary>

Any instance can serve any request → easy horizontal scaling, autoscaling and failover. State moves to DB/cache/tokens.
</details>

<details><summary>What is a message queue and why use it? <em>· Paytm, PhonePe</em></summary>

Buffer between producers and consumers enabling async processing, decoupling, load leveling, retries; examples SQS, RabbitMQ, Kafka.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your website gets featured on national TV and traffic jumps 50× in 10 minutes. Which building blocks save you?</summary>

CDN serves static pages/assets (most traffic never reaches origin); cache-heavy pages with short TTLs; autoscaling stateless app tier (pre-warmed if anticipated); rate limiting and load shedding protect the DB; queue for non-urgent writes (signups → async welcome emails); degrade non-essential features; DB read replicas.
</details>

<details><summary>Scenario: Design the backend for profile photo upload with thumbnails in 3 sizes.</summary>

`POST /uploads` returns pre-signed S3 URL → client uploads directly → S3 event → queue → worker generates 3 sizes (idempotent by object key), stores to `processed/` → updates user record with versioned URLs → CDN serves them. Validate type/size, virus/NSFW scan, handle failures with retries/DLQ, lifecycle rules for old versions.
</details>
