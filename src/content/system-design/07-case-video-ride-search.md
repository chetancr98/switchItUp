---
title: Case Studies III — Video Streaming (YouTube), Ride Hailing (Uber), Typeahead & Payments
level: 5
tags: case study, youtube, uber, geohash, payments, typeahead
---
<!-- deepened -->

## Start here: the basics

### Video streaming — the core ideas
A 2-hour movie can't be sent as one file to every phone. It's converted (**transcoded**) into many resolutions (240p … 4K) and cut into small **segments** of a few seconds. The player downloads segments one by one and picks a quality based on the current internet speed — that's why YouTube quality changes automatically (**adaptive bitrate streaming**). Segments are served from **CDNs** close to users.

### Ride hailing — the core ideas
Drivers' phones send their location every few seconds. When a rider requests a ride, the system must **find nearby available drivers quickly**. Searching "all drivers within 2 km" among millions requires a **geospatial index** that divides the map into cells (geohash, quadtree, H3) so you only look at nearby cells.

### Typeahead — the core idea
As you type "jav", suggestions like "java tutorial" appear. A **trie** (prefix tree) stores popular queries so all completions of a prefix are found by walking down the tree, with the top suggestions precomputed at each node.

### Payments — the core idea
Money must never be lost or double-charged. Every request carries an **idempotency key**, every money movement is recorded in an **append-only ledger** with matching debit and credit entries, and a daily **reconciliation** checks your records against the bank's.

---

# Case 1 — Video streaming (YouTube / Netflix)

## Requirements
Upload videos; transcode to multiple resolutions; stream smoothly on varied networks; view counts; search/recommendations out of scope unless asked. 1B DAU, 500 hours uploaded per minute.

## Upload & processing pipeline
```
Client ─(pre-signed, multipart, resumable)─► Object storage "raw"
   ─► event ─► Workflow (DAG): validate → split into chunks (GOP-aligned) → parallel transcode
              (H.264/VP9/AV1 × 240p…4K) → thumbnails → content moderation → package HLS/DASH segments + manifests
   ─► Object storage "processed" ─► CDN
   ─► Metadata DB: video status UPLOADING → PROCESSING → READY
```
- **Chunked parallel transcoding** on a worker fleet (spot instances), orchestrated as a DAG (Temporal/Step Functions); idempotent tasks, retries.
- **Adaptive bitrate (ABR)**: video cut into 2–10 s segments at many bitrates; the player picks the next segment's bitrate based on measured bandwidth/buffer. Manifest (`.m3u8`/`.mpd`) lists variants.

## Serving
- Segments are static files → **CDN** serves ~all traffic. Netflix places its own appliances (Open Connect) inside ISPs; popular content pre-positioned during off-peak.
- Long tail content served from origin/regional caches.
- **View counts**: client events → Kafka → stream aggregation (Flink) → batched counter updates; approximate in real time, exact later.
- Metadata in sharded SQL/NoSQL + cache; search via Elasticsearch.
- Cost: storage of many renditions; encode popular videos with expensive codecs (AV1), long tail cheaply — **per-title encoding** decisions.

---

# Case 2 — Ride hailing (Uber / Ola)

## Requirements
Riders request rides; nearby drivers matched; drivers send location every ~4 s; ETA; trip lifecycle; pricing (surge); payments. 5M active drivers globally at peak → ~1.25M location updates/s.

## Geospatial indexing — the core deep dive
Need: "find available drivers within 2 km of (lat, lng)" fast, with constantly moving points.

| Index | Idea |
|---|---|
| **Geohash** | Interleave lat/lng bits → base32 string; shared prefix ≈ nearby. Query the cell + 8 neighbours (edge effects). Simple, works with KV stores/Redis `GEOSEARCH` |
| **Quadtree** | Recursively split a region into 4 until each leaf has ≤ K points; adapts to density (cities vs deserts). In-memory |
| **Google S2** | Sphere projected onto a cube, Hilbert curve cell ids; good coverage of arbitrary shapes |
| **Uber H3** | Hexagonal hierarchical grid — uniform neighbour distances, great for surge pricing zones and supply/demand aggregation |

Design:
```
Driver app ─ws/udp─► Location gateway ─► Kafka "driver-locations" (partition by city/region)
                         └► Location service: in-memory geo index per region shard (H3 cell → driver set),
                            latest location in Redis (TTL) — NOT a relational DB per update
Rider request ─► Dispatch/matching service:
     1. query nearby available drivers (k-ring of H3 cells around rider)
     2. rank by ETA (routing engine on road graph, not straight-line distance)
     3. offer to best driver (timeout 10–15 s) → next on decline; lock driver state (avoid double-dispatch)
     4. create Trip (state machine) in Trip DB (strong consistency)
```
- Location updates are **ephemeral** — keep only latest in memory/Redis; archive to cold storage async for analytics.
- Shard by geography (city/region) — matching is local. Hot cities need finer sharding.
- Driver state (`AVAILABLE`, `DISPATCHED`, `ON_TRIP`) transitions must be atomic → conditional writes / single owner per driver.
- **Surge pricing**: supply/demand per H3 cell aggregated in a stream processor every minute.
- **ETA**: graph routing (contraction hierarchies) + ML corrections with live traffic.
- Payments: authorise at request, capture at trip end; idempotent; ledger (below).

---

# Case 3 — Typeahead / search autocomplete

- **Data**: top queries by frequency (aggregated from query logs offline/hourly + trending in near real-time).
- **Structure**: **trie** where each node stores the **top-K completions** for its prefix (precomputed) → lookup O(prefix length). Serialised and sharded by prefix range; served from memory; rebuilt periodically and swapped atomically.
- Alternatives: Elasticsearch completion suggester / edge n-grams; Redis sorted sets per prefix.
- Client: debounce, cache, cancel stale requests; CDN-cache popular prefixes (`/suggest?q=ja`).
- Personalisation: blend global top-K with user history at query time. Filter offensive terms.
- Scale: 10B queries/day ≈ 100k QPS — in-memory tries on many replicas.

---

# Case 4 — Payment system (Stripe/Razorpay-like) & wallets

Correctness > latency. Key ideas:
- **Idempotency keys** on every external API (client retries must not double-charge).
- **Double-entry ledger**: every money movement = balanced debit and credit entries in an **append-only** ledger; balances derived (or cached + reconciled). Never `UPDATE balance` without a ledger entry.
- **State machine** per payment: `CREATED → AUTHORIZED → CAPTURED → SETTLED` / `FAILED` / `REFUNDED`; transitions via conditional updates.
- External PSPs are unreliable: timeouts → **unknown state** → don't retry blindly; query status / await webhook; reconcile.
- **Reconciliation** jobs compare internal ledger vs PSP/bank settlement files daily; discrepancies flagged.
- Strong consistency for balances (single-region primary SQL with serializable/locking, or Spanner-like); outbox for events; exactly-once *effect* through idempotency.
- Security & compliance: PCI-DSS (tokenise card data via vault/PSP, never store PAN), encryption, audit logs, fraud checks (async risk scoring, sync for high risk).

```
POST /payments  Idempotency-Key: 7f9c...
 → payments(id, idem_key UNIQUE, amount, currency, status) INSERT (dedupe)
 → call PSP with our payment id as their idempotency key
 → on success: tx { status=CAPTURED; ledger entries (debit customer_receivable, credit merchant_payable); outbox event }
 → on timeout: status=PENDING_CONFIRMATION; poll/webhook resolves it
```

## Quick check questions

<details><summary>1. Why HLS/DASH segments instead of streaming a single MP4?</summary>

Segments are small static files that CDNs cache efficiently, allow adaptive bitrate switching mid-playback, enable fast seeking and resumption, and work over plain HTTP through firewalls.
</details>

<details><summary>2. How do you find nearby drivers efficiently?</summary>

Spatial index on latest driver locations kept in memory: geohash/H3 cells → sets of driver ids. Query the rider's cell and its neighbour ring, filter by availability, then rank by road-network ETA. Shard by region; updates replace previous cell membership.
</details>

<details><summary>3. A PSP call timed out. Did the customer get charged? What do you do?</summary>

Unknown. Don't blindly retry with a new request. Mark PENDING, retry with the same idempotency key (safe), or query the PSP's status endpoint, and rely on webhooks; reconciliation later catches anything missed. Communicate "processing" to the user.
</details>

<details><summary>4. Why a double-entry ledger instead of a balance column?</summary>

Every movement is recorded immutably and must balance, giving auditability, easy reconciliation, detection of bugs (sum of all entries must be zero), and the ability to reconstruct balances at any point in time. A mutable balance column loses history and makes errors invisible.
</details>

## Questions asked at top companies

<details><summary>Design YouTube / Netflix. <em>· Google, Amazon, Hotstar, Microsoft</em></summary>

Upload via pre-signed resumable upload → transcoding DAG (chunked, parallel, multiple codecs/resolutions) → HLS/DASH segments in object storage → CDN delivery with ABR → metadata DB + search → view counts via event streaming → recommendations out of scope unless asked.
</details>

<details><summary>Design Uber / Ola. <em>· Uber, Ola, Amazon, Microsoft</em></summary>

Location ingestion at high rate into in-memory geo index (H3/geohash) sharded by region; matching service queries nearby available drivers, ranks by ETA, offers with timeouts; trip state machine in a consistent store; surge pricing via stream aggregation; payments with idempotency.
</details>

<details><summary>What is a geohash / quadtree and why use it? <em>· Uber, Swiggy, Zomato</em></summary>

Spatial indexing that maps 2D locations to cells (geohash string prefixes, quadtree recursive subdivision) enabling fast proximity queries by looking up a cell and its neighbours.
</details>

<details><summary>Design search autocomplete. <em>· Google, Amazon, Flipkart</em></summary>

Aggregate query logs → build trie with top-K per node (or Elasticsearch completion suggester) → in-memory serving replicas → CDN cache for popular prefixes → client debounce & cache → periodic rebuild + trending updates.
</details>

<details><summary>Design a payment system. <em>· Razorpay, PhonePe, Amazon Pay, Stripe-style</em></summary>

Idempotent APIs, payment state machine, PSP integration with timeouts → pending + webhooks/status polling, double-entry ledger, outbox events, reconciliation, PCI tokenization, fraud checks, strong consistency for balances.
</details>

<details><summary>How does adaptive bitrate streaming work? <em>· Hotstar, Netflix-style</em></summary>

Video encoded at multiple bitrates and segmented; manifest lists variants; the player measures bandwidth/buffer and chooses the bitrate of the next segment.
</details>

<details><summary>Design Google Docs collaborative editing (follow-up). <em>· Google, Microsoft, Atlassian</em></summary>

Real-time sync via WebSocket, conflict resolution with Operational Transformation or CRDTs, per-document session server, persistence of operations + snapshots, presence/cursors, offline edits merged later.
</details>

<details><summary>Design a ticket booking system (BookMyShow). <em>· BookMyShow, Amazon, Paytm</em></summary>

Seat inventory per show with holds (TTL) via atomic conditional updates or Redis, payment within hold window, confirm on success, release on timeout; queue/waiting room for hot shows; idempotent confirmations.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a food delivery system like Swiggy end to end in 45 minutes. What do you cover?</summary>

Requirements (browse restaurants, cart, order, pay, track, ratings); estimates (orders/day, rider location QPS); services (catalog+search, cart, order saga, payment, dispatch/matching, tracking via WebSocket, notifications); data stores (Postgres for orders/payments, Elasticsearch for search, Redis geo for riders, Kafka for events); deep dives: rider assignment (batching orders, ETA), order state machine with compensations, peak-hour scaling (dinner 5× peak), surge/delivery fee computation.
</details>

<details><summary>Scenario: Design an "Amazon-style" product search with filters and ranking.</summary>

Catalog service as source of truth → CDC/events → indexing pipeline → Elasticsearch/OpenSearch (inverted index, analyzers, synonyms, facets for filters) → query service (parse, spell-correct, filter, BM25 + business ranking features, personalization) → cache popular queries → typeahead separately. Index sharding/replication, near-real-time updates for price/stock, relevance metrics (CTR, conversion).
</details>
