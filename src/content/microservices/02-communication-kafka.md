---
title: Inter-Service Communication — REST, gRPC, Messaging & Kafka Internals
level: 3
tags: kafka, grpc, messaging, rest
---
<!-- deepened -->

## Start here: the basics

### Two ways services talk
**Synchronous** — call and wait for an answer (like a phone call): REST over HTTP, gRPC.
**Asynchronous** — send a message and move on; the receiver processes it later (like sending a WhatsApp message): message brokers like **Kafka** or **RabbitMQ**.

```
Sync:   Order ──HTTP POST /payments──► Payment     (Order waits ~200 ms for the answer)
Async:  Order ──"OrderPlaced" event──► [Kafka] ──► Payment, Email, Analytics (each reads when ready)
```

### Why messaging helps
- The sender doesn't need the receiver to be up right now (the broker stores messages).
- One event can be consumed by many services (email, analytics, loyalty points) without the sender knowing them.
- Traffic spikes are buffered.

### Kafka vocabulary for beginners
| Term | Meaning |
|---|---|
| **Producer** | Writes messages |
| **Consumer** | Reads messages |
| **Topic** | A named stream of messages (`orders`) |
| **Partition** | A topic is split into partitions for parallelism; order is kept *within* a partition |
| **Offset** | Position of a message in a partition (0, 1, 2…) |
| **Consumer group** | A set of consumers sharing the work; each partition read by one member |
| **Broker** | A Kafka server; a cluster has several |

### Tiny Spring Kafka example
```java
@Service
class OrderEvents {
    private final KafkaTemplate<String, OrderPlaced> kafka;
    OrderEvents(KafkaTemplate<String, OrderPlaced> kafka) { this.kafka = kafka; }
    void publish(OrderPlaced e) { kafka.send("orders", e.orderId(), e); }   // key = orderId → same partition
}

@Component
class EmailListener {
    @KafkaListener(topics = "orders", groupId = "email-service")
    void on(OrderPlaced e) { /* send confirmation email */ }
}
```

---

## Synchronous vs asynchronous

| | Sync (REST/gRPC) | Async (events/messages) |
|---|---|---|
| Coupling | Temporal — both must be up | Decoupled in time |
| Latency | Adds up along the chain | Caller returns immediately |
| Consistency | Easier to reason about | Eventual |
| Failure | Cascades unless guarded | Buffered in the broker |
| Use | Queries, commands needing an immediate answer | Notifications, propagation of state changes, long workflows |

**Availability math**: a request touching 5 services each with 99.9% availability → 0.999⁵ = **99.5%**. Sync chains multiply failure probability. Prefer async for anything not needing an immediate answer.

## REST vs gRPC vs GraphQL

| | REST/JSON | gRPC | GraphQL |
|---|---|---|---|
| Transport | HTTP/1.1 or 2 | HTTP/2 | HTTP |
| Payload | JSON (text) | Protobuf (binary, ~5–10× smaller/faster) | JSON |
| Contract | OpenAPI (optional) | `.proto` (mandatory, codegen) | Schema |
| Streaming | SSE/WebSocket aside | Uni & bidirectional streams | Subscriptions |
| Browser | Native | Needs gRPC-Web proxy | Native |
| Best for | Public APIs, simplicity | Internal service-to-service, low latency, polyglot | Aggregating data for varied clients (BFF) |

Protobuf evolution rules: never reuse/renumber field tags; add new optional fields; mark removed ones `reserved`. That's how gRPC stays backward compatible.

## Messaging semantics

- **Queue (point-to-point)**: each message consumed by one consumer (RabbitMQ queue, SQS). Work distribution.
- **Pub/sub (topic)**: each subscriber group gets every message (Kafka consumer groups, SNS).
- **Command vs event**: command = "do X" (one handler, may be rejected), event = "X happened" (any number of subscribers, a fact).
- **Delivery guarantees**: at-most-once (may lose), **at-least-once** (may duplicate — the practical default), exactly-once (only within a closed system like Kafka transactions; end-to-end requires **idempotent consumers**).

### Event types
- **Event notification**: thin (`OrderPlaced{orderId}`) → consumers call back for details (coupling + load).
- **Event-carried state transfer**: fat event with the data consumers need → consumers keep local replicas, no callbacks.
- Version your event schemas (Avro/Protobuf + **Schema Registry** with compatibility rules: BACKWARD/FORWARD/FULL).

## Kafka internals (very frequently asked)

```
Topic "orders" (3 partitions, replication factor 3)

 Partition 0:  [0][1][2][3][4][5][6] ...  ← append-only log, offsets
 Partition 1:  [0][1][2][3] ...
 Partition 2:  [0][1][2][3][4] ...

 Broker A: P0 leader, P1 follower, P2 follower
 Broker B: P1 leader, P0 follower, P2 follower
 Broker C: P2 leader, P0 follower, P1 follower
```

- **Partition** = unit of parallelism and ordering. **Ordering is guaranteed only within a partition.** Messages with the same **key** go to the same partition (`hash(key) % partitions`) → per-entity ordering (all events of order 42 in order).
- **Log segments** on disk, sequential writes, OS page cache, **zero-copy** (`sendfile`) to consumers → why Kafka is fast.
- **Retention** by time/size — consumers can **replay**. **Log compaction** keeps the latest value per key (changelog/state topics).
- **Replication**: leader handles reads/writes; followers fetch. **ISR** (in-sync replicas) = followers caught up. `acks=all` + `min.insync.replicas=2` with RF=3 → a write survives one broker loss without data loss.
- **Controller / metadata**: ZooKeeper removed — **KRaft** (Raft-based metadata quorum) since Kafka 3.3+, ZooKeeper gone in 4.0.

### Producers
- `acks=0/1/all`; **idempotent producer** (`enable.idempotence=true`, default since 3.0) uses producer id + sequence numbers so retries don't duplicate within a partition.
- Batching (`linger.ms`, `batch.size`) and compression (lz4/zstd) → throughput.
- **Transactions** (`transactional.id`): atomically write to multiple partitions + commit consumer offsets → **exactly-once read-process-write** within Kafka (Kafka Streams `processing.guarantee=exactly_once_v2`).

### Consumers & consumer groups
- Partitions of a topic are divided among consumers in a **group**; each partition → exactly one consumer in the group. **Max parallelism = number of partitions** (extra consumers idle).
- Consumer tracks **offsets**, committed to `__consumer_offsets`.
  - Commit **after** processing → at-least-once (duplicates on crash) ✅ typical.
  - Commit **before** processing → at-most-once (loss on crash).
- **Rebalancing** when consumers join/leave/crash or `max.poll.interval.ms` exceeded (slow processing!) → partitions reassigned; with eager rebalancing all consumption stops. Use **cooperative sticky** assignor & static membership (`group.instance.id`) to reduce churn.
- **Consumer lag** = latest offset − committed offset → the key metric to alert on & autoscale (KEDA).

### Poison messages & retries
A message that always fails blocks the partition (ordering!). Patterns:
- Retry a few times in-process with backoff → then send to a **DLT (dead-letter topic)** with error headers; alert; reprocess after fix.
- Non-blocking retry topics (`orders-retry-1m`, `orders-retry-10m`) — Spring Kafka `@RetryableTopic`. Trade-off: breaks ordering for that key.

```java
@KafkaListener(topics = "orders", groupId = "billing")
@RetryableTopic(attempts = "4", backoff = @Backoff(delay = 1000, multiplier = 3), dltTopicSuffix = "-dlt")
public void onOrder(OrderPlaced e, @Header(KafkaHeaders.RECEIVED_KEY) String key) {
    if (processed.exists(e.eventId())) return;          // idempotency guard
    billing.charge(e);
    processed.record(e.eventId());                       // ideally same DB tx as the side effect
}
```

### Choosing partition count
Throughput target ÷ per-partition throughput (consumer-side usually limiting) with headroom; you can add partitions later but that **changes key→partition mapping** (breaks ordering for existing keys). Too many partitions → more open files, longer leader elections, more memory.

## Kafka vs RabbitMQ vs SQS

| | Kafka | RabbitMQ | SQS |
|---|---|---|---|
| Model | Distributed log, pull | Broker with exchanges/queues, push | Managed queue, pull |
| Retention | Days/forever, replay | Until acked | Up to 14 days |
| Ordering | Per partition | Per queue (single consumer) | FIFO queues (per group id) |
| Throughput | Millions/s | Tens of thousands/s per queue | High, managed |
| Routing | Topics/keys | Rich (direct/topic/fanout/headers) | Basic |
| Use | Event streaming, CDC, analytics, event sourcing | Task queues, complex routing, RPC-ish | Simple decoupling on AWS |

## Idempotent consumer (must-know pattern)
1. Every message has a unique `eventId`.
2. Consumer stores processed IDs (`processed_messages(event_id PK)`) **in the same DB transaction** as its state change.
3. Duplicate → unique-key violation / exists check → skip.
Or design operations to be naturally idempotent (`SET status = 'PAID'` vs `balance += 10`).

## Quick check questions

<details><summary>1. How does Kafka guarantee ordering, and how would you keep all events for a user in order?</summary>

Only within a partition. Use the user id as the message key so all that user's events land in the same partition, and ensure a single consumer thread processes a partition sequentially. With retries, idempotent producer (default) keeps order; avoid non-blocking retry topics for strictly ordered flows.
</details>

<details><summary>2. You have 6 partitions and scale consumers to 10. What happens?</summary>

Only 6 consumers get partitions; 4 sit idle. Parallelism is bounded by partitions. Increase partitions (mind key remapping) or parallelise within a consumer (keyed thread pool / Confluent parallel consumer).
</details>

<details><summary>3. How do you achieve exactly-once processing when consuming from Kafka and writing to Postgres?</summary>

Kafka's EOS covers Kafka→Kafka only. For Kafka→DB: at-least-once delivery + idempotent consumer — store processed event IDs or the consumed offset in the same DB transaction as the business write; on restart, dedupe or seek to the stored offset.
</details>

<details><summary>4. What causes frequent consumer group rebalances and how do you fix it?</summary>

Processing a poll batch takes longer than `max.poll.interval.ms`, heartbeats missed (`session.timeout.ms`), pods restarting/autoscaling. Fix: smaller `max.poll.records`, faster/async processing, increase intervals, static membership, cooperative-sticky assignor.
</details>

<details><summary>5. gRPC or REST between internal services?</summary>

gRPC for high-volume, latency-sensitive, polyglot internal calls with strong contracts and streaming. REST when simplicity, debuggability (curl), browser access, or HTTP caching matter. Many orgs: REST at the edge, gRPC inside.
</details>

## Questions asked at top companies

<details><summary>Explain Kafka architecture: topics, partitions, brokers, consumer groups. <em>· Walmart, Paytm, Flipkart, Swiggy, Amazon</em></summary>

Topics are split into partitions (append-only logs) replicated across brokers with one leader per partition. Producers write by key → partition. Consumer groups divide partitions among members; each partition is consumed by one member, offsets committed per group.
</details>

<details><summary>How does Kafka guarantee ordering? <em>· Uber, PhonePe, Goldman Sachs</em></summary>

Only within a partition. Use a key (e.g., orderId) so related events go to the same partition, and process each partition sequentially.
</details>

<details><summary>At-most-once, at-least-once, exactly-once — how do you achieve each in Kafka? <em>· Walmart, Razorpay, LinkedIn</em></summary>

At-most-once: commit offset before processing. At-least-once: commit after processing (duplicates possible → idempotent consumers). Exactly-once: idempotent producer + transactions for Kafka-to-Kafka; for external systems, at-least-once + dedupe.
</details>

<details><summary>Kafka vs RabbitMQ. <em>· Paytm, Infosys, Accenture</em></summary>

Kafka: distributed log, replay, high throughput, consumer-tracked offsets, partition ordering — event streaming. RabbitMQ: broker-managed queues with rich routing, per-message acks, lower throughput — task queues/RPC-style messaging.
</details>

<details><summary>What happens when a consumer is slower than the producer? <em>· Swiggy, Zomato</em></summary>

Consumer lag grows (messages retained per retention policy). Scale consumers up to the partition count, increase partitions, optimize processing, batch, or apply back-pressure upstream; alert on lag.
</details>

<details><summary>What is a consumer rebalance and why is it problematic? <em>· Walmart, Uber</em></summary>

Reassignment of partitions when members join/leave/fail/time out; with eager protocol, consumption pauses for all. Mitigate with cooperative-sticky assignor, static membership, tuning poll intervals.
</details>

<details><summary>How do you handle a poison message? <em>· PhonePe, Razorpay</em></summary>

Limited retries with backoff, then route to a dead-letter topic with error metadata; alert; fix and replay. Non-blocking retry topics if ordering isn't strict.
</details>

<details><summary>REST vs gRPC. <em>· Google, Uber, Microsoft</em></summary>

gRPC: HTTP/2, protobuf binary, strict contracts, streaming, faster — internal calls. REST: JSON, ubiquitous, browser friendly, easy debugging — public APIs.
</details>

<details><summary>How does Kafka achieve high throughput? <em>· LinkedIn, Walmart</em></summary>

Sequential disk appends, OS page cache, zero-copy sendfile, batching and compression, partitioned parallelism, consumers pulling at their own pace.
</details>

<details><summary>What is an idempotent consumer? <em>· Amazon, Flipkart</em></summary>

A consumer whose processing of the same message twice has the same effect as once — via processed-message IDs stored in the same transaction, upserts, or naturally idempotent operations.
</details>

<details><summary>What are acks=0/1/all and min.insync.replicas? <em>· LinkedIn, Uber</em></summary>

acks=0 no wait; 1 leader written; all = all in-sync replicas written. With RF=3 and min.insync.replicas=2, acks=all writes survive one broker failure and fail if fewer than 2 replicas are in sync.
</details>

## End-to-end scenarios

<details><summary>Scenario: When an order is placed, send email, update loyalty points, and notify the warehouse. Each must happen exactly once in effect, even if services restart.</summary>

Order service writes order + outbox row in one DB transaction; Debezium/poller publishes `OrderPlaced` (key=orderId) to Kafka. Each downstream service has its own consumer group; processes with an idempotency table keyed by eventId in the same transaction as its own state change; commits offsets after processing; retries with backoff and DLT. Email service dedupes by eventId before sending. Monitor consumer lag per group.
</details>

<details><summary>Scenario: Your Kafka consumer for payments keeps reprocessing the same batch and lag is growing. Debug it.</summary>

Likely processing takes longer than `max.poll.interval.ms` → consumer kicked out → rebalance → offsets not committed → batch reprocessed. Check logs for rebalance messages; reduce `max.poll.records`, speed up processing (batch DB writes), increase interval, move slow calls async with careful offset management, ensure idempotency so reprocessing is harmless, and check for a poison message throwing repeatedly.
</details>
