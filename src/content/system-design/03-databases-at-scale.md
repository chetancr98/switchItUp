---
title: Databases at Scale — Indexing, Replication, Partitioning, Sharding, Consistent Hashing
level: 3
tags: database, sharding, replication, indexing, consistent hashing
---
<!-- deepened -->

## Start here: the basics

### When one database isn't enough
A single PostgreSQL server can handle a lot — thousands of queries per second and terabytes of data. But at some point:
- **Too many reads** → add copies (replicas) that serve reads.
- **Too many writes / too much data** → split the data across several databases (sharding).
- **Server dies** → you need copies ready to take over (replication + failover).

### Replication in plain words
The **primary** (leader) accepts writes and streams every change to **replicas** (followers). Reads can go to replicas. If the primary dies, a replica is promoted.
Catch: replicas may be slightly **behind** (replication lag) — a user might not see their own just-saved change if their read hits a lagging replica.

### Sharding in plain words
Split one big table into pieces by a **shard key**. Users with id 1–1M on DB-1, 1M–2M on DB-2… or `hash(user_id) % 4`. Each shard holds part of the data, so writes spread out. Catch: queries across shards (joins, global sorting) become hard, and moving data when adding shards is painful — hence **consistent hashing**.

### SQL vs NoSQL in plain words
- **SQL** (Postgres, MySQL): tables, relations, joins, transactions. Default choice.
- **NoSQL**: key-value (Redis, DynamoDB), document (MongoDB), wide-column (Cassandra), graph (Neo4j). Chosen when you need massive scale with simple access patterns, flexible schemas, or special query types.

---

## Storage engines: B-tree vs LSM-tree

| | B+ tree (Postgres, MySQL InnoDB) | LSM tree (Cassandra, RocksDB, ScyllaDB, HBase) |
|---|---|---|
| Write | Update page in place (random I/O) + WAL | Append to WAL + in-memory **memtable**; flush to immutable sorted **SSTables**; background **compaction** |
| Read | O(log n) page reads, predictable | Check memtable + several SSTables (Bloom filters skip most) |
| Best for | Read-heavy, range queries, transactions | Write-heavy, time-series, huge ingest |
| Amplification | Write amp from page rewrites | Write amp from compaction; read amp from multiple files |

## Indexing (asked in every backend loop)

- **B+ tree index**: sorted keys in leaf pages linked for range scans; height ~3–4 for millions of rows.
- **Clustered index** (InnoDB primary key): table rows *stored in* PK order → secondary indexes store the PK, so a secondary lookup = 2 tree traversals. Random UUIDv4 PKs scatter inserts across pages (page splits, poor cache) → prefer sequential IDs or **UUIDv7 / ULID** (time-ordered).
- **Composite index `(a, b, c)`**: usable for `a`, `a,b`, `a,b,c` and ranges on the **last** used column — **leftmost prefix rule**. `WHERE b = ?` alone can't use it (mostly).
- **Covering index**: contains all columns the query needs → index-only scan (`INCLUDE` columns in Postgres).
- **Selectivity**: index low-cardinality columns (`status` with 3 values) rarely helps unless combined/partial.
- **Partial index**: `CREATE INDEX ON orders (created_at) WHERE status = 'PENDING'`.
- Other types: Hash, GIN (JSONB, arrays, full text), GiST (geo), BRIN (huge append-only tables), Bitmap (warehouses).
- **Cost of indexes**: every write updates every index; more storage; choose deliberately.

Index killers: functions on the column (`WHERE lower(email) = ?` → use an expression index), leading wildcard `LIKE '%abc'`, implicit type casts, `OR` across different columns, low selectivity. Always check **`EXPLAIN ANALYZE`** — look for Seq Scan on big tables, row estimate vs actual mismatches, sorts spilling to disk.

## Replication

### Leader–follower (primary–replica)
Writes go to the leader; it streams its log (WAL/binlog) to followers; reads can go to followers.
- **Synchronous**: commit waits for ≥1 follower ack → no data loss on failover, higher latency.
- **Asynchronous**: faster, but failover can **lose** recently committed writes; followers lag → **replication lag** anomalies:
  - **Read-your-writes**: user updates profile, reads from a lagging replica, sees old data → read own data from leader for a time window / track LSN.
  - **Monotonic reads**: successive reads hit different replicas and go "back in time" → pin a user to one replica.
  - **Consistent prefix reads**: see an answer before the question → keep causally related writes on one partition.
- Failover: detect leader death, elect the most up-to-date follower, reconfigure clients. Danger: **split brain** (two leaders) → fencing.

### Multi-leader
Each datacentre has a leader; writes accepted in multiple places → **write conflicts** (last-write-wins with timestamps loses data; CRDTs or app-level merge). Used for multi-region writes, offline-first clients (each device is a leader!), collaborative editing.

### Leaderless (Dynamo-style: Cassandra, DynamoDB, Riak)
Client writes to N replicas, waits for W acks; reads from R replicas. **If W + R > N, reads overlap writes** (quorum) → you see the latest write (modulo edge cases). Typical N=3, W=2, R=2. Repair stale replicas via **read repair** and **anti-entropy** (Merkle trees). **Hinted handoff** when a node is down; **sloppy quorums**. Cassandra tunable consistency: `ONE`, `QUORUM`, `LOCAL_QUORUM`, `ALL`.

## Partitioning (sharding)

Split data across nodes so each holds a subset — scales writes and storage.

| Strategy | How | Pros | Cons |
|---|---|---|---|
| **Range** | Keys in sorted ranges (A–F, G–M…) | Efficient range scans | **Hot spots** (sequential keys, timestamps all hit the last shard) |
| **Hash** | `hash(key) mod N` / hash ranges | Even distribution | Range queries scatter to all shards |
| **Directory / lookup** | Lookup service maps key → shard | Flexible, movable tenants | Extra hop, lookup is critical infra |
| **Geo / tenant** | By region or customer | Data locality, compliance | Uneven tenant sizes |

### Choosing a shard key — the most important decision
- High cardinality, even distribution, **matches the dominant access pattern** so most queries hit one shard (e.g., `user_id` for a social app — a user's data together).
- Avoid monotonically increasing keys for range sharding.
- **Celebrity / hot key** problem: one key gets extreme traffic → split it (`key#salt` across N sub-keys and aggregate), cache it, or special-case it.

### Pain of sharding
- Cross-shard queries & joins → scatter-gather or denormalise.
- Cross-shard transactions → avoid by design (sagas), or 2PC (Spanner-like systems do this with Paxos groups).
- Global secondary indexes: **local** (per shard, query scatters) vs **global** (partitioned by the indexed term, writes become distributed).
- **Resharding** — moving data while online. That's why naive `hash mod N` is bad: changing N moves almost every key. → **consistent hashing** or fixed many-partitions (create 1 024 logical partitions, map them to physical nodes; move whole partitions — Kafka, Elasticsearch, Cassandra vnodes, Redis Cluster's 16 384 slots).

## Consistent hashing

```
            0
       N3 ●   ● k1 → goes clockwise to N1
     ●          ● N1
   k3            
     ●          ● k2
       N2 ●   ●
          2^32
```
- Hash nodes and keys onto a ring (0 … 2³²−1). A key belongs to the first node clockwise.
- Adding/removing a node moves only ~**1/N** of keys (its neighbours'), not almost all.
- **Virtual nodes**: each physical node placed at 100–200 points on the ring → smoother distribution, heterogeneous capacity (more vnodes for bigger machines), load from a failed node spreads across many nodes.
- Replication: store the key on the next R distinct nodes clockwise.
- Used by: DynamoDB/Cassandra, Riak, Memcached clients (ketama), Envoy/NGINX ring hash, Discord, Akamai.

```java
class ConsistentHash<T> {
    private final TreeMap<Long, T> ring = new TreeMap<>();
    private final int vnodes;
    ConsistentHash(int vnodes) { this.vnodes = vnodes; }

    void add(T node) { for (int i = 0; i < vnodes; i++) ring.put(hash(node + "#" + i), node); }
    void remove(T node) { for (int i = 0; i < vnodes; i++) ring.remove(hash(node + "#" + i)); }

    T get(String key) {
        if (ring.isEmpty()) return null;
        Map.Entry<Long, T> e = ring.ceilingEntry(hash(key));
        return (e != null ? e : ring.firstEntry()).getValue();   // wrap around
    }
    private long hash(String s) { /* murmur3 / xxhash 64-bit */ return Hashing.murmur3_128().hashString(s, UTF_8).asLong(); }
}
```
Alternatives: **rendezvous (HRW) hashing** (pick node with highest hash(key, node) — simple, no ring), **jump consistent hash** (Google, O(1) memory, buckets numbered sequentially).

## SQL scaling ladder (say this in order)
1. Optimise queries + indexes; connection pooling.
2. Vertical scaling (bigger box) — underrated; modern machines are huge.
3. **Caching** in front.
4. **Read replicas** for read-heavy load.
5. **Partition tables** (Postgres declarative partitioning by time) — easier maintenance, pruning.
6. **Functional partitioning** — split by domain into separate DBs (microservices).
7. **Sharding** (application-level, Vitess for MySQL, Citus for Postgres) or move to a distributed SQL DB (CockroachDB, Spanner, YugabyteDB, Aurora Limitless/DSQL).

## NoSQL data modelling (DynamoDB / Cassandra)
- **Design for queries, not entities.** List access patterns first; denormalise; duplicate data per query.
- Cassandra: `PRIMARY KEY ((partition_key), clustering_col1, clustering_col2)` — partition key → node; clustering columns → sort order within partition. Keep partitions bounded (< ~100 MB): bucket time-series by day (`(sensor_id, day)`).
- DynamoDB: partition key + sort key; **single-table design**; GSIs for alternate access patterns; avoid hot partitions.

## Quick check questions

<details><summary>1. Why does `hash(key) % N` sharding hurt when you add a server?</summary>

Changing N remaps almost every key (~(N)/(N+1) of them), causing a massive cache miss storm / data migration. Consistent hashing or a fixed large number of logical partitions moves only ~1/N of keys.
</details>

<details><summary>2. How do you choose a shard key for an orders table at Amazon scale?</summary>

Look at access patterns: most queries are "orders of customer X" and "order by id". Shard by `customer_id` (orders of a customer co-located; order id can embed the shard id, e.g., Snowflake-ish id with shard bits, so lookups by id route directly). Seller-side queries go to a separate read model (CQRS) sharded by `seller_id`. Watch for mega-customers (B2B) → sub-partitioning.
</details>

<details><summary>3. Quorum: N=3, W=1, R=1. What consistency do you get?</summary>

W+R = 2 ≤ N → no overlap guarantee; reads may return stale data (eventual consistency), but low latency and high availability. N=3, W=2, R=2 gives read-your-latest-write in normal operation.
</details>

<details><summary>4. A query is slow despite an index on (status, created_at). Why might Postgres not use it?</summary>

Query filters only on `created_at` (leftmost prefix not satisfied); function/cast on the column; low selectivity so a seq scan is cheaper; outdated statistics (ANALYZE); parameter types mismatch; ORDER BY direction/columns incompatible; or OR conditions. Check EXPLAIN ANALYZE.
</details>

<details><summary>5. B-tree vs LSM — which for a metrics ingestion system?</summary>

LSM: high sustained write throughput via sequential writes, compaction handles merges, time-bucketed partitions make TTL deletion cheap (drop SSTables). B-trees suit read-heavy, transactional, range-and-point mixed workloads.
</details>

## Questions asked at top companies

<details><summary>SQL vs NoSQL — how do you choose? <em>· Amazon, Uber, Walmart, Infosys</em></summary>

Choose by access patterns, consistency needs, relationships and scale: SQL for transactions/joins/strong consistency; NoSQL for simple key-based access at huge scale, flexible schemas, high write throughput, or specialised models. Many systems use both.
</details>

<details><summary>What is sharding and how do you choose a shard key? <em>· Google, Amazon, Flipkart</em></summary>

Horizontal partitioning across servers. Good shard key: high cardinality, even distribution, matches main query pattern so most queries hit one shard; avoid monotonically increasing keys for range sharding; plan for hot keys.
</details>

<details><summary>Explain consistent hashing. <em>· Amazon, Microsoft, Uber, LinkedIn</em></summary>

Nodes and keys hashed onto a ring; a key goes to the next node clockwise; adding/removing a node moves only ~1/N keys; virtual nodes improve balance.
</details>

<details><summary>Master-slave vs master-master replication. <em>· Paytm, Walmart</em></summary>

Single leader: simple, consistent writes, failover needed. Multi-leader: writes in multiple places (multi-region), but write conflicts must be resolved.
</details>

<details><summary>What is replication lag and how do you handle read-your-writes? <em>· Meta, Swiggy</em></summary>

Followers apply changes after the leader; reads may be stale. Route a user's reads to the leader for a short time after writes, track LSN/versions, or update client state optimistically.
</details>

<details><summary>How do database indexes work? Downsides? <em>· Amazon, Microsoft</em></summary>

B+ trees (or LSM structures) map keys to rows for O(log n) lookup and range scans; cost write overhead, storage, and maintenance.
</details>

<details><summary>What is a quorum (N, W, R)? <em>· Amazon (Dynamo), Uber</em></summary>

Write to W of N replicas and read from R; if W+R > N, read and write sets overlap so reads see the latest write.
</details>

<details><summary>How would you migrate a 2 TB table to a sharded setup with zero downtime? <em>· Flipkart, Atlassian</em></summary>

Dual writes (or CDC) to new shards, backfill historical data in batches, verify with checksums/shadow reads, switch reads gradually behind a flag, then stop old writes; keep rollback path.
</details>

<details><summary>B-tree vs LSM tree. <em>· Google, LinkedIn</em></summary>

B-tree: in-place updates, great reads/range queries. LSM: append + compaction, great write throughput, reads check multiple files with Bloom filters.
</details>

<details><summary>What are hot partitions and how do you mitigate them? <em>· Amazon (DynamoDB), Twitter-style questions</em></summary>

A shard receiving disproportionate traffic (celebrity, viral item). Mitigate with key salting/splitting, caching, write sharding with aggregation, adaptive capacity, rate limiting.
</details>

## End-to-end scenarios

<details><summary>Scenario: An orders table on one Postgres server hits 95% CPU at peak. Plan the next 12 months of scaling.</summary>

Immediate: identify top queries (pg_stat_statements), add indexes, fix N+1, connection pooling (PgBouncer), cache hot reads. Short term: read replicas for reporting/history reads, partition orders by month, archive old data. Medium term: split by domain (orders vs catalog DB). Long term: shard by customer_id (Citus/application-level) or move to distributed SQL; plan migration with CDC.
</details>

<details><summary>Scenario: Design storage for a chat app with 50 billion messages/day.</summary>

Write-heavy, access by conversation in time order → wide-column store (Cassandra/ScyllaDB): partition key `(conversation_id, bucket)` (time-bucketed to bound partition size), clustering by message_id (time-sortable). Replication factor 3 per DC, LOCAL_QUORUM writes. Recent messages cached; old data compacted/tiered. Message ids via Snowflake.
</details>
