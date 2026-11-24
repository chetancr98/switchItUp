---
title: Distributed Data — Sagas, Transactional Outbox, CQRS, Event Sourcing, CDC
level: 4
tags: saga, outbox, cqrs, event sourcing, 2pc
---
<!-- deepened -->

## Start here: the basics

### The problem: no shared transaction across services
In a monolith, placing an order is one database transaction: insert order, decrement stock, record payment — all or nothing. With microservices, Orders, Inventory and Payments each have their **own database**. There's no single `BEGIN … COMMIT` covering all three.

### What can go wrong
```
1. Order service saves order ✅
2. Inventory reserves stock ✅
3. Payment fails ❌   → now stock is reserved for an order that will never be paid
```

### Sagas — undo with compensating actions
A **saga** is a sequence of local transactions. If a later step fails, earlier steps are undone by **compensating** actions:
```
Create order (PENDING) → Reserve stock → Charge payment ✅ → Confirm order
                                        Charge payment ❌ → Release stock → Cancel order
```
"Undo" isn't a rollback; it's a new business action (refund, release, cancel).

### Two ways to coordinate a saga
- **Choreography** — each service listens for events and reacts ("PaymentFailed" → inventory releases stock). No central controller.
- **Orchestration** — a central coordinator tells each service what to do next and handles failures.

### Outbox — publishing events reliably
Saving to the DB and sending a Kafka message are two separate systems — one can succeed while the other fails. The **outbox pattern** saves the event into an `outbox` table **in the same DB transaction** as the business data; a separate process then publishes it to Kafka.

### CQRS in one sentence
Use one model for **writes** (normalized, enforces rules) and separate, denormalized models for **reads** (fast queries), kept in sync by events.

---

## Why not distributed transactions (2PC)?

**Two-phase commit**: a coordinator asks all participants to *prepare* (lock & vote), then *commit*. Problems:
- **Blocking**: if the coordinator dies after prepare, participants hold locks indefinitely.
- Latency of the slowest participant, reduced availability (all must be up), not supported by most NoSQL stores/brokers, poor fit for HTTP services.
So microservices use **sagas** + **eventual consistency**.

## The dual-write problem

```java
@Transactional
public void placeOrder(Order o) {
    orderRepo.save(o);                       // DB
    kafkaTemplate.send("orders", event(o));  // broker  ← not in the same transaction!
}
```
- Kafka send succeeds, DB commit fails → consumers act on an order that doesn't exist.
- DB commits, app crashes before send → event lost forever.
You **cannot** atomically write to two systems without a shared transaction. Solution ↓

## Transactional Outbox

Write the event into an **outbox table in the same DB transaction** as the state change. A separate relay publishes it.

```sql
CREATE TABLE outbox (
  id UUID PRIMARY KEY, aggregate_type TEXT, aggregate_id TEXT,
  event_type TEXT, payload JSONB, created_at TIMESTAMPTZ DEFAULT now(), published_at TIMESTAMPTZ
);
```
```java
@Transactional
public void placeOrder(Order o) {
    orderRepo.save(o);
    outboxRepo.save(OutboxEvent.of("Order", o.id(), "OrderPlaced", toJson(o)));  // same tx → atomic
}
```
Relay options:
1. **Polling publisher**: `SELECT ... WHERE published_at IS NULL ORDER BY created_at LIMIT 100 FOR UPDATE SKIP LOCKED` → publish → mark published. Simple; adds DB load/latency.
2. **CDC (log tailing)**: **Debezium** reads the DB's WAL/binlog and streams outbox rows to Kafka (Outbox Event Router). Low latency, no polling, preserves commit order.

Guarantee: **at-least-once** publishing (crash after publish, before marking) → consumers must be **idempotent** (dedupe by event id). The mirror image on the consumer side is the **inbox** pattern (processed-message table).

## Sagas

A sequence of **local transactions**, each publishing an event/triggering the next. On failure, run **compensating transactions** to semantically undo previous steps.

Example: Place order → Reserve inventory → Charge payment → Arrange shipping.

### Choreography (events, no central brain)
```
OrderService:    OrderCreated(PENDING) ─────────────►
InventoryService:            on OrderCreated → reserve → InventoryReserved ─────►
PaymentService:                                   on InventoryReserved → charge → PaymentFailed
InventoryService:            on PaymentFailed → release (compensate)
OrderService:    on PaymentFailed → mark REJECTED
```
✅ Loose coupling, simple for 2–4 steps. ❌ Flow is implicit (hard to see/debug), cyclic dependencies, hard to change.

### Orchestration (central coordinator)
```java
// Orchestrator state machine (could be Temporal, Camunda, AWS Step Functions, or hand-rolled + persisted)
PENDING → reserveInventory()
  ok   → charge()
           ok   → ship() → COMPLETED
           fail → releaseInventory() → REJECTED
  fail → REJECTED
```
✅ Explicit flow, easier to monitor, timeouts and retries in one place. ❌ Orchestrator is extra infrastructure; risk of putting too much logic in it.
**Temporal** (durable execution) is increasingly the go-to — workflows written as normal code that survive crashes.

### Saga design details interviewers probe
- **Compensations are semantic**, not rollbacks: "refund", "release reservation", "send apology email". Some actions can't be undone (email sent) → order steps so irreversible ones come **last** (pivot transaction).
- **Lack of isolation** → anomalies (another saga sees the reserved-but-not-paid state). Countermeasures: **semantic locks** (status `PENDING_*` that other flows respect), commutative updates, re-reading values, versioning.
- Every step and compensation must be **idempotent and retryable**.
- Persist saga state; handle timeouts (payment never responds → compensate after deadline).

## CQRS — Command Query Responsibility Segregation

Separate the **write model** (commands, aggregates, invariants, normalized) from **read models** (denormalized views optimised per query).

```
Commands → Order Service (Postgres, aggregates) ──events──► Kafka ──► Projector ──► Elasticsearch "order search"
                                                                         └────────► Redis "order summary per user"
Queries  ──────────────────────────────────────────────────────────────► read stores
```
Use when: read and write loads/shapes differ greatly, complex queries across services (replaces cross-service joins), search. Cost: **eventual consistency** of reads (read-your-own-writes needs care: return the result from the command, or wait for projection version), more moving parts.

## Event Sourcing

Store the **sequence of events** as the source of truth instead of current state. Current state = fold over events.

```
AccountOpened(100) → MoneyDeposited(50) → MoneyWithdrawn(30)  ⇒ balance 120
```
✅ Complete audit log, temporal queries ("state on March 1"), rebuild read models anytime, natural fit with CQRS & events.
❌ Schema evolution of events (upcasting), snapshots needed for long streams, querying requires projections, steep learning curve, GDPR "right to be forgotten" (crypto-shredding).
Use for: ledgers, banking, audit-heavy domains, collaborative editing. Don't use as a default.

## Change Data Capture (CDC)

Read the database's replication log (Postgres WAL via logical decoding, MySQL binlog) and emit row changes as events — **Debezium + Kafka Connect**. Uses: outbox relay, cache invalidation, search index sync, replicating to data warehouses, strangler-fig migrations. No dual writes, no app changes. Careful: it exposes your internal schema unless you use the outbox pattern.

## Reading data across services

| Approach | How | Trade-off |
|---|---|---|
| API composition | Aggregator/BFF calls services and joins in memory | Simple; latency & availability of all; N+1 over network |
| Replicated read model (CQRS) | Subscribe to events, keep local copy | Fast, resilient; eventual consistency, storage |
| Data lake/warehouse | Stream all events to analytics store | For reporting, not online |

## Quick check questions

<details><summary>1. How do you reliably publish an event when you update the database?</summary>

Transactional outbox: insert the event into an outbox table in the same local transaction; a poller or CDC (Debezium) publishes to the broker and marks it sent. At-least-once delivery, so consumers deduplicate by event id.
</details>

<details><summary>2. Design the order → payment → inventory flow with failure handling.</summary>

Orchestrated saga: Order service creates order PENDING (+ outbox event). Orchestrator reserves inventory (TTL'd reservation), then charges payment with an idempotency key. If payment fails → release inventory, mark order REJECTED. If inventory fails → reject. Timeouts trigger compensation. All steps idempotent; state persisted; observability per saga id. Irreversible steps (shipping, emails) last.
</details>

<details><summary>3. Choreography vs orchestration — which do you pick?</summary>

Choreography for simple flows with few participants and stable logic. Orchestration when there are many steps, complex branching/timeouts, or you need visibility and easy change — typically with a workflow engine (Temporal/Step Functions).
</details>

<details><summary>4. When is event sourcing a bad idea?</summary>

CRUD-ish domains without audit/temporal needs, teams new to it, when queries dominate and projections add latency/complexity, or when strong immediate consistency for many reads is required. The event schema becomes a permanent contract that's hard to evolve.
</details>

<details><summary>5. A user updates their profile and immediately sees old data on the profile page. Why and how to fix?</summary>

The read model (cache/projection/replica) is eventually consistent. Fixes: read-your-writes — return the updated entity from the write and render it; route the user's reads to the primary for a short window; include a version and have the read side wait/poll until it has caught up; or update the client cache optimistically.
</details>

## Questions asked at top companies

<details><summary>How do you handle distributed transactions in microservices? <em>· Walmart, Amazon, Paytm, Goldman Sachs</em></summary>

Avoid 2PC; use sagas (choreography or orchestration) with compensating transactions, transactional outbox for reliable events, idempotent consumers, and eventual consistency with clear user-facing states (PENDING).
</details>

<details><summary>Choreography vs orchestration sagas. <em>· Uber, Atlassian, Flipkart</em></summary>

Choreography: event-driven, decoupled, simple for few steps but hard to follow. Orchestration: central workflow (Temporal/Camunda/Step Functions), explicit flow, easier timeouts/monitoring, extra component.
</details>

<details><summary>What is the transactional outbox pattern? <em>· Razorpay, PhonePe, Walmart</em></summary>

Write business data + event row in one local transaction; relay (poller or CDC) publishes events to the broker and marks them sent; at-least-once delivery with consumer dedupe.
</details>

<details><summary>Why is 2PC rarely used in microservices? <em>· Goldman Sachs, Oracle</em></summary>

Blocking protocol (coordinator failure leaves locks held), reduced availability, latency, poor support across heterogeneous stores and brokers.
</details>

<details><summary>What is CQRS and when should you use it? <em>· Thoughtworks, Atlassian</em></summary>

Separate write and read models; use when read/write patterns differ greatly or cross-service queries are needed; costs eventual consistency and complexity.
</details>

<details><summary>What is event sourcing? Pros and cons. <em>· Goldman Sachs, banking/fintech</em></summary>

Store all state changes as an immutable event log; current state is derived. Pros: audit, temporal queries, rebuildable projections. Cons: event versioning, snapshots, query complexity, learning curve.
</details>

<details><summary>What is CDC (Change Data Capture)? <em>· Walmart, Flipkart</em></summary>

Streaming row-level changes from the DB's transaction log (WAL/binlog) via tools like Debezium into Kafka — for outbox relay, cache invalidation, search indexing, replication.
</details>

<details><summary>What is eventual consistency and how do you explain it to users? <em>· Amazon, Swiggy</em></summary>

Replicas/services converge to the same state after a delay. Surface intermediate states ("Order received, confirming payment"), read-your-writes for the actor, notifications on completion.
</details>

<details><summary>What is the dual-write problem? <em>· Razorpay, Uber</em></summary>

Writing to two systems (DB and broker) without a shared transaction leads to inconsistency if one fails. Solved by outbox/CDC or listen-to-yourself patterns.
</details>

<details><summary>How do you design compensating transactions? <em>· Flipkart, MakeMyTrip</em></summary>

Semantic reversal (refund, release, cancel), idempotent and retryable, ordered so irreversible steps are last, with timeouts triggering compensation and human escalation when compensation fails.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design the booking flow for a travel site — flight + hotel + payment — with partial failure handling.</summary>

Orchestrated saga (Temporal): hold flight seat (TTL) → hold hotel room (TTL) → charge payment (idempotency key) → confirm flight → confirm hotel → send itinerary. Failures: hotel hold fails → release flight hold; payment fails → release both; confirmation fails after payment → retry with backoff, then refund + release + notify. Persist saga state; outbox for events; user sees "Booking in progress"; reconciliation job for stuck sagas.
</details>

<details><summary>Scenario: The search service shows products that were deleted an hour ago. Investigate and fix.</summary>

Search index is a CQRS read model fed by events/CDC. Check whether `ProductDeleted` events were published (outbox stuck? relay down?), consumer lag/DLT for the indexer, mapping errors. Fix the pipeline, replay missed events from Kafka (retention) or reindex from source of truth; add monitoring on projection lag and periodic reconciliation (compare counts/checksums).
</details>
