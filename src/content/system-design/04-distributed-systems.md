---
title: Distributed Systems Theory — CAP/PACELC, Consensus, Clocks, Locks, IDs
level: 4
tags: cap, raft, consensus, distributed locks, clocks
---
<!-- deepened -->

## Start here: the basics

### What makes distributed systems hard
When work is spread across many machines connected by a network:
1. **Messages can be lost, delayed, duplicated or reordered.**
2. **Machines crash** — and you can't tell a crashed machine from a slow one.
3. **Clocks disagree** — each machine's time drifts.
Everything in this module is a technique to build reliable systems on top of these unreliable parts.

### CAP theorem in plain words
If the network between two data centres breaks (a **partition**), each side must choose:
- **Consistency** — refuse requests that could return wrong/old data, or
- **Availability** — keep answering, even if answers may be stale/conflicting.
You can't have both *during the partition*. A bank balance picks consistency; a shopping cart or social feed picks availability.

### Consensus in plain words
Several machines must **agree** on something (who's the leader, the order of updates) even if some fail. Algorithms like **Raft** do this by majority vote: with 5 machines, any 3 agreeing is enough, so 2 can fail.

### Idempotency — the most practical idea here
Because messages can be retried/duplicated, design operations so doing them twice is the same as once: "set status to PAID" is idempotent; "add ₹100" is not (unless deduplicated with a unique request id).

---

## The eight fallacies of distributed computing
The network is reliable · latency is zero · bandwidth is infinite · the network is secure · topology doesn't change · there is one administrator · transport cost is zero · the network is homogeneous. Every design decision is a response to one of these being false.

## CAP — stated correctly

During a **network Partition**, a distributed data store must choose between **Consistency** (linearizability: every read sees the latest write) and **Availability** (every request to a non-failing node gets a non-error response).

- Partitions *will* happen, so the real choice is **CP vs AP during a partition**.
- CP examples: ZooKeeper, etcd, Spanner, HBase, MongoDB (majority writes) — minority side refuses requests.
- AP examples: Cassandra, DynamoDB (default), Riak, CouchDB — all sides accept; reconcile later.
- "CA" isn't a real option for distributed systems.

### PACELC — the more useful framing
If **P**artition → choose **A** or **C**; **E**lse (normal operation) → choose **L**atency or **C**onsistency.
- DynamoDB/Cassandra: PA/EL. Spanner: PC/EC (pays latency for consistency, uses TrueTime). MongoDB: PC/EC-ish by config. 

### Consistency models (strongest → weakest)
| Model | Guarantee |
|---|---|
| **Linearizable** | Behaves like a single copy; operations appear instantaneous at some point between call and return |
| Sequential | All see the same order, not necessarily real-time |
| **Causal** | Causally related ops seen in order by everyone; concurrent ops may differ |
| Read-your-writes, monotonic reads | Session guarantees |
| **Eventual** | If writes stop, replicas converge |

Note: CAP's C (linearizability) ≠ ACID's C (invariants preserved).

## Consensus — Raft (know it well enough to explain)

Problem: a group of nodes must agree on a sequence of values (a replicated log) despite crashes. Used for leader election, configuration, metadata, locks (etcd, Consul, ZooKeeper's ZAB, Kafka KRaft, CockroachDB, TiKV).

```
States: Follower ─(election timeout, no heartbeat)─► Candidate ─(majority votes)─► Leader
```
1. **Leader election**: followers wait a randomised timeout (150–300 ms). A timed-out follower increments **term**, votes for itself, requests votes. A node grants at most one vote per term and only to candidates whose log is at least as up-to-date. Majority → leader. Randomised timeouts avoid split votes.
2. **Log replication**: client → leader appends entry → `AppendEntries` to followers → once a **majority** stored it, it's **committed** → applied to state machines → reply to client.
3. **Safety**: a leader for term T contains all entries committed in earlier terms (election restriction). Old leaders discover higher terms and step down.

**Majority quorum**: 2f+1 nodes tolerate f failures. 3 nodes → 1 failure, 5 nodes → 2. Even numbers add no tolerance. Consensus groups are small (3–7) — writes need a majority round trip, so they don't scale writes; you **shard** into many groups (Multi-Raft).

Paxos: the original (Lamport), harder to understand; Multi-Paxos ≈ Raft in practice.

## Time & ordering

- **Physical clocks drift** (NTP sync is ~ms, can jump backwards). Never use wall-clock timestamps to order events across machines or for "last-write-wins" without accepting data loss.
- **Lamport clocks**: counter incremented per event, max(own, received)+1 on receive → if A → B then L(A) < L(B) (not the converse). Gives a total order consistent with causality.
- **Vector clocks**: one counter per node → detect **concurrent** updates (neither happened-before) → conflict detection (Dynamo, Riak).
- **Hybrid logical clocks (HLC)**: physical time + logical counter (CockroachDB, MongoDB).
- **TrueTime** (Spanner): GPS + atomic clocks give a bounded uncertainty interval; commit-wait out the uncertainty → external consistency globally.

## Distributed locks and leases

Use cases: only one instance runs a job, exclusive access to a resource.

- **Redis `SET key token NX PX 30000`** + Lua compare-and-delete release. Simple, fast, **not safe** under all failures: a client paused by GC beyond the TTL thinks it still holds the lock while another client acquires it.
- **Redlock** (multiple independent Redis nodes) — controversial (Kleppmann's critique: relies on timing assumptions).
- **ZooKeeper / etcd**: ephemeral sequential nodes / leases with consensus — correct leader election, session-based expiry.
- **Fencing tokens** (the correct fix): the lock service hands out a monotonically increasing token with each grant; the protected resource rejects writes with a token lower than the highest seen. Even a paused stale holder can't corrupt data.
- Often better: avoid locks — use DB constraints, conditional writes (`UPDATE ... WHERE version = ?`), idempotency, or single-writer partitioning (Kafka partition ownership).

## Failure detection & membership
- Heartbeats + timeouts (phi-accrual detector adapts to network jitter — Cassandra, Akka).
- **Gossip protocols**: each node periodically exchanges state with random peers → information spreads in O(log N) rounds; scalable membership (Cassandra, Consul Serf).
- Split brain prevention: quorum, fencing, STONITH.

## Unique ID generation at scale

| Approach | Pros | Cons |
|---|---|---|
| DB auto-increment | Simple, ordered | Single point, doesn't scale across shards (use step/offset per shard) |
| UUIDv4 | No coordination | 128-bit, random → bad index locality |
| **UUIDv7 / ULID** | Time-ordered + random, no coordination | 128-bit |
| **Snowflake** (Twitter) | 64-bit, time-sortable, ~4M IDs/s per node | Needs worker-id assignment; clock skew handling |
| Ticket server / segment allocation (Flickr, Meituan Leaf) | Batches of IDs from DB | Extra service |

Snowflake layout: `1 bit sign | 41 bits ms timestamp (~69 years) | 10 bits machine id (1024 nodes) | 12 bits sequence (4096/ms)`.

```java
public final class Snowflake {
    private static final long EPOCH = 1704067200000L;           // 2024-01-01
    private final long workerId;
    private long lastTs = -1L, seq = 0L;
    public Snowflake(long workerId) { if (workerId < 0 || workerId > 1023) throw new IllegalArgumentException(); this.workerId = workerId; }

    public synchronized long next() {
        long ts = System.currentTimeMillis();
        if (ts < lastTs) throw new IllegalStateException("clock moved backwards");   // or wait it out
        if (ts == lastTs) {
            seq = (seq + 1) & 4095;
            if (seq == 0) while ((ts = System.currentTimeMillis()) <= lastTs) { }       // sequence exhausted: spin to next ms
        } else seq = 0;
        lastTs = ts;
        return ((ts - EPOCH) << 22) | (workerId << 12) | seq;
    }
}
```

## Exactly-once is a lie (mostly) — idempotency is the truth
Networks give at-most-once or at-least-once. "Exactly-once *processing*" = at-least-once delivery + **idempotent** handling (dedupe keys, conditional writes, upserts). Say this sentence in interviews.

## Bloom filters, HyperLogLog, Count-Min Sketch — probabilistic structures
- **Bloom filter**: "definitely not present" or "maybe present" with k hash functions over an m-bit array. No false negatives. Uses: avoid DB/disk lookups for missing keys (LSM SSTables, cache penetration), "has the user seen this?" (feeds), crawler URL dedupe. FPR ≈ (1 − e^(−kn/m))^k.
- **HyperLogLog**: count distinct elements (unique visitors) with ~0.8% error in 12 KB (Redis `PFADD/PFCOUNT`).
- **Count-Min Sketch**: approximate frequencies → heavy hitters / trending topics with bounded memory.

## Quick check questions

<details><summary>1. Explain CAP with a concrete example.</summary>

Two data centers replicate a user's balance; the link between them breaks. If a withdrawal arrives in DC1, either DC1 accepts it (available, but DC2 may also accept a withdrawal → inconsistency) or DC1 refuses until it can coordinate (consistent, unavailable). Banks choose C for balances; a shopping cart may choose A and merge later.
</details>

<details><summary>2. How does Raft elect a leader and why is the timeout randomised?</summary>

Followers that miss heartbeats become candidates, increment the term and request votes; a majority makes a leader. Randomised timeouts make it unlikely that multiple candidates start simultaneously and split the vote, so elections converge quickly.
</details>

<details><summary>3. Why is a Redis lock with TTL unsafe and how do fencing tokens fix it?</summary>

The holder can pause (GC, VM stall, network delay) longer than the TTL; the lock expires, another client acquires it, and the first resumes believing it still holds the lock → two writers. With fencing, each acquisition yields an increasing token; the storage rejects requests with stale tokens, so the resumed old holder's writes fail.
</details>

<details><summary>4. Design a unique ID generator for 1M IDs/sec across 50 servers, roughly time-sortable.</summary>

Snowflake-style 64-bit: timestamp ms + worker id (assigned via ZooKeeper/etcd lease or K8s StatefulSet ordinal) + per-ms sequence. 50 workers × 4096/ms is far above 1M/s. Handle clock rollback (wait or refuse), monitor NTP, and reserve bits for datacenter id if multi-region.
</details>

<details><summary>5. Why do consensus clusters use an odd number of nodes?</summary>

Fault tolerance is floor((n−1)/2). 4 nodes tolerate 1 failure, same as 3, but need a larger majority (3) and more communication. Odd sizes maximise tolerance per node.
</details>

## Questions asked at top companies

<details><summary>Explain the CAP theorem with examples. <em>· Amazon, Microsoft, Walmart, Paytm</em></summary>

During a network partition you choose consistency (CP: ZooKeeper, etcd, HBase, Spanner) or availability (AP: Cassandra, DynamoDB default). Without partitions, PACELC adds the latency vs consistency trade-off.
</details>

<details><summary>Strong vs eventual consistency. <em>· Google, Uber</em></summary>

Strong (linearizable): every read sees the latest write. Eventual: replicas converge if writes stop; reads may be stale. Middle grounds: causal, read-your-writes, monotonic reads.
</details>

<details><summary>How does leader election work? <em>· Uber, LinkedIn, Atlassian</em></summary>

Consensus (Raft: randomized timeouts, majority votes per term) or coordination services (ZooKeeper ephemeral sequential nodes, etcd leases). Leaders hold leases and step down on losing them.
</details>

<details><summary>How do you implement a distributed lock? <em>· Amazon, Razorpay, Flipkart</em></summary>

Redis SET NX PX with token and safe release (fast, best-effort), or etcd/ZooKeeper leases (consensus-backed). Use fencing tokens for correctness; prefer avoiding locks via DB constraints/conditional writes.
</details>

<details><summary>What is idempotency and how do you implement it in APIs and consumers? <em>· Stripe-style, Razorpay, PhonePe, Amazon</em></summary>

Same request repeated → same effect. Idempotency keys stored with unique constraint and cached response; consumer dedupe tables; conditional updates/upserts.
</details>

<details><summary>Explain vector clocks / Lamport timestamps. <em>· Google, Amazon</em></summary>

Lamport: logical counter giving an order consistent with causality. Vector clocks: per-node counters that detect concurrent (conflicting) updates.
</details>

<details><summary>How do you generate unique IDs in a distributed system? <em>· Twitter-style at many companies: Flipkart, Uber, Amazon</em></summary>

Snowflake (timestamp + machine id + sequence), UUIDv7/ULID, DB sequences with ranges, ticket servers; consider sortability, size, coordination, clock skew.
</details>

<details><summary>What is a Bloom filter? <em>· Google, Amazon, LinkedIn</em></summary>

Probabilistic set membership with no false negatives and tunable false positives; used to skip expensive lookups (LSM reads, cache penetration, "already seen" checks).
</details>

<details><summary>Why is exactly-once delivery impossible over networks? <em>· Uber, Confluent-style</em></summary>

A sender can't distinguish a lost message from a lost acknowledgement, so it must either retry (possible duplicates) or not (possible loss). Exactly-once effects come from at-least-once delivery + idempotent processing.
</details>

<details><summary>What is split brain and how is it prevented? <em>· Goldman Sachs, Oracle</em></summary>

Two nodes both believe they're leader after a partition, accepting conflicting writes. Prevent with majority quorums, leases, fencing tokens, STONITH.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a job scheduler that runs millions of scheduled tasks reliably across many workers — each task exactly once in effect.</summary>

Tasks stored in a durable DB partitioned by execution time bucket; a leader (via etcd/ZooKeeper) or partition ownership assigns time-bucket partitions to scheduler nodes; due tasks pushed to Kafka keyed by task id; workers process idempotently (task_run table with unique (task_id, scheduled_time)); retries with backoff; lease/heartbeat to detect dead workers; fencing tokens on leases; monitoring of lag between scheduled and actual run time.
</details>

<details><summary>Scenario: Two data centres replicate user wallets asynchronously; a link outage lets a user spend the same balance in both. How would you redesign?</summary>

Money requires consistency: route all wallet writes for a user to a single home region (leader per user/partition), synchronous quorum replication across zones (or Spanner-like DB), and fail requests (or queue them) during partitions rather than allowing dual writes; append-only ledger with idempotency keys; reconciliation to detect anomalies.
</details>
