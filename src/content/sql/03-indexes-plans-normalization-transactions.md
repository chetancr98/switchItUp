---
title: Indexes, Query Plans, Normalization & Transactions
level: 3
tags: sql, index, explain, normalization, acid, locking
---
<!-- deepened -->

## Start here: the basics

### Why is a query slow without an index?
Finding "orders of customer 42" in a table of 50 million rows without help means reading **every row** — a **full table scan**. An **index** is like the index at the back of a textbook: a sorted structure that points to where the rows are, so the database jumps straight there.

```sql
CREATE INDEX idx_orders_customer ON orders (customer_id);
-- now: WHERE customer_id = 42 → walks a B-tree (~3–4 page reads) instead of 50M rows
```

Indexes aren't free: each INSERT/UPDATE/DELETE must also update every index, and they take disk space. Index what you **search, join and sort** by.

### Normalization in plain words
Normalization means **store each fact once**. Bad design:

```
orders(id, customer_name, customer_phone, customer_city, product_name, product_price, qty)
```
If a customer changes phone, you must update hundreds of rows — and if you miss one, data disagrees (**update anomaly**). You can't store a customer who hasn't ordered (**insert anomaly**). Deleting their last order loses the customer (**delete anomaly**). Fix: split into `customers`, `products`, `orders`, `order_items`, linked by keys.

### Transactions in plain words
A transaction is an "all-or-nothing" envelope:
```sql
BEGIN;
UPDATE accounts SET balance = balance - 500 WHERE id = 1;
UPDATE accounts SET balance = balance + 500 WHERE id = 2;
COMMIT;      -- both happen; if anything fails before this → ROLLBACK and neither happens
```

---

## Indexes in depth

### B+ tree — the default index
- Balanced tree; leaves hold keys in **sorted order** linked to each other → supports `=`, `<`, `>`, `BETWEEN`, `ORDER BY`, prefix `LIKE 'abc%'`.
- Height 3–4 for millions of rows → a lookup touches only a few pages.

### Clustered vs non-clustered
| | Clustered | Non-clustered (secondary) |
|---|---|---|
| What | The table rows themselves stored in index order | A separate structure pointing to rows |
| How many | One per table | Many |
| MySQL InnoDB | The primary key | Stores PK value → second lookup into clustered index |
| PostgreSQL | No true clustered index (heap table; `CLUSTER` is one-off) | All indexes point to heap tuples |

### Composite indexes and the leftmost-prefix rule
```sql
CREATE INDEX idx_orders_cust_status_date ON orders (customer_id, status, created_at);
```
| Query filter | Uses index? |
|---|---|
| `customer_id = 42` | ✅ |
| `customer_id = 42 AND status = 'PAID'` | ✅ |
| `customer_id = 42 AND status = 'PAID' ORDER BY created_at DESC` | ✅ including the sort |
| `status = 'PAID'` | ❌ (leading column missing) |
| `customer_id = 42 AND created_at > '2026-01-01'` | Partially (customer_id, then filter) |

**Column order rule of thumb**: equality columns first, then range/sort columns; more selective first among equalities.

### Covering indexes
If the index contains every column the query needs, the database never touches the table (**index-only scan**):
```sql
CREATE INDEX idx_cover ON orders (customer_id, created_at) INCLUDE (amount, status);   -- Postgres 11+
```

### When an index is NOT used
- Function on the column: `WHERE LOWER(email) = ?` → create an expression index `ON customers (LOWER(email))`.
- Leading wildcard: `LIKE '%gmail.com'` → trigram/full-text index.
- Type mismatch / implicit cast (`varchar_col = 123`).
- Low selectivity: `WHERE status = 'PAID'` when 90% of rows are PAID — a scan is cheaper.
- `OR` across different columns (sometimes solved by bitmap OR / UNION).
- Outdated statistics → run `ANALYZE`.

### Other index types
Hash (equality only), **GIN** (JSONB, arrays, full-text), GiST (geo/ranges), BRIN (huge append-only time-ordered tables), **partial** (`WHERE deleted_at IS NULL`), **unique** (also enforces constraint).

## Reading query plans (EXPLAIN)

```sql
EXPLAIN ANALYZE
SELECT * FROM orders WHERE customer_id = 42 ORDER BY created_at DESC LIMIT 10;
```
```
Limit  (cost=0.56..12.3 rows=10) (actual time=0.05..0.09 rows=10 loops=1)
  -> Index Scan using idx_orders_cust_status_date on orders (actual rows=10)
       Index Cond: (customer_id = 42)
Planning Time: 0.2 ms   Execution Time: 0.12 ms
```
What to look for:
| Signal | Meaning |
|---|---|
| `Seq Scan` on a large table with a selective filter | Missing/unused index |
| Estimated rows ≫ or ≪ actual rows | Stale statistics or correlated columns → bad plan |
| `Sort` with `external merge Disk` | Not enough `work_mem`; or add an index matching ORDER BY |
| `Nested Loop` with huge outer rows | Missing index on inner join column |
| `Rows Removed by Filter` very large | Index doesn't cover the filter |

MySQL: `EXPLAIN` columns `type` (ALL = full scan, ref/range/const good), `key`, `rows`, `Extra` (`Using filesort`, `Using temporary`, `Using index` = covering).

## Normalization in depth

| Normal form | Rule | Violation example |
|---|---|---|
| **1NF** | Atomic values, no repeating groups | `phones = '98..., 97...'` in one column |
| **2NF** | 1NF + no partial dependency on part of a composite key | In `order_items(order_id, product_id, product_name)`, `product_name` depends only on product_id |
| **3NF** | 2NF + no transitive dependency (non-key → non-key) | `employees(id, dept_id, dept_name)` — dept_name depends on dept_id |
| **BCNF** | Every determinant is a candidate key | Rare edge cases with overlapping candidate keys |

**Denormalization** — deliberately duplicating data for read performance (storing `customer_name` on orders for fast listing, materialized views, counters). Accept it when reads dominate, and keep the duplicate in sync (triggers, events, or treat it as a snapshot — e.g., the price at time of purchase *should* be copied).

OLTP (transactions, normalized) vs OLAP (analytics, denormalized star schemas: fact tables + dimension tables, columnar warehouses).

## Transactions in depth

### ACID recap
Atomicity (undo log), Consistency (constraints), Isolation (locks/MVCC), Durability (write-ahead log fsync'd on commit).

### Isolation levels and anomalies
| Level | Dirty read | Non-repeatable read | Phantom |
|---|---|---|---|
| Read Uncommitted | possible | possible | possible |
| **Read Committed** (Postgres/Oracle/SQL Server default) | ❌ | possible | possible |
| **Repeatable Read** (MySQL default) | ❌ | ❌ | possible (std; mostly prevented in InnoDB & Postgres) |
| Serializable | ❌ | ❌ | ❌ |

Plus **lost update** and **write skew** (see Spring → JPA & Transactions).

### MVCC — how readers don't block writers
Each row version records which transaction created/deleted it. A reader sees a **snapshot** consistent as of its start (or statement start in Read Committed). Writers create new versions instead of overwriting in place. Old versions are cleaned later (Postgres `VACUUM`, InnoDB purge of undo logs). Long-running transactions prevent cleanup → table bloat.

### Locks
- Row locks: `SELECT … FOR UPDATE` (exclusive), `FOR SHARE`.
- `FOR UPDATE SKIP LOCKED` — job queues: each worker grabs different rows.
- `NOWAIT` — fail instead of waiting.
- **Deadlock**: two transactions wait on each other's row locks; the DB detects it and aborts one → application retries. Prevent by locking rows in a consistent order and keeping transactions short.
- Gap/next-key locks (InnoDB, Repeatable Read) lock ranges to prevent phantoms — surprising contention on inserts.

### Practical transaction rules
1. Keep transactions **short** — no network calls/user think-time inside.
2. Use atomic statements where possible: `UPDATE stock SET qty = qty - 1 WHERE id = ? AND qty > 0`.
3. Handle serialization failures/deadlocks with **retry**.
4. Use `@Version` optimistic locking for user edits.

## Scaling a relational database (summary)
Indexes & query tuning → connection pooling → caching → read replicas (watch replication lag) → partitioning large tables (by date) → archiving cold data → sharding / distributed SQL. Details in System Design → Databases at scale.

## Quick check questions

<details><summary>Will `CREATE INDEX ON orders(created_at)` help `WHERE DATE(created_at) = '2026-01-05'`?</summary>

No — the function hides the column. Rewrite as a range: `created_at >= '2026-01-05' AND created_at < '2026-01-06'`, or create an expression index.
</details>

<details><summary>Why can adding an index make writes slower?</summary>

Each insert/update/delete must also modify every affected index (extra I/O, page splits, locks), and more indexes means more WAL/redo.
</details>

## Questions asked at top companies

<details><summary>What is an index and how does it work internally? <em>· Amazon, Microsoft, Flipkart, Walmart</em></summary>

A separate sorted data structure (usually a B+ tree) mapping key values to row locations, allowing O(log n) lookups and ordered range scans instead of full scans; costs storage and write overhead.
</details>

<details><summary>Clustered vs non-clustered index. <em>· TCS, Infosys, Goldman Sachs, Oracle</em></summary>

Clustered determines physical row order (one per table; InnoDB PK). Non-clustered is separate and points to rows (in InnoDB via the PK, so lookups go through both).
</details>

<details><summary>Explain 1NF, 2NF, 3NF with examples. <em>· Infosys, Wipro, Accenture, Amazon (SDE-1)</em></summary>

1NF atomic columns; 2NF no partial dependency on part of a composite key; 3NF no transitive dependency between non-key columns. Use the employee/department and order_items examples above.
</details>

<details><summary>When would you denormalize? <em>· Flipkart, Swiggy, Uber</em></summary>

Read-heavy paths where joins are too costly (feeds, listing pages, reporting), historical snapshots (price at purchase), counters. Keep sync via events/triggers and accept the write complexity.
</details>

<details><summary>How do you optimise a slow query? <em>· Walmart, Paytm, PhonePe, Goldman Sachs</em></summary>

EXPLAIN ANALYZE → find scans/sorts/bad estimates → add or fix indexes (composite/covering/expression), rewrite (avoid functions on columns, SELECT only needed columns, replace correlated subqueries, keyset pagination), update statistics, reduce rows early, consider caching/materialized views, check locks and N+1 from the application.
</details>

<details><summary>What are ACID properties? How does a DB guarantee durability? <em>· Amazon, Oracle, Goldman Sachs</em></summary>

Atomicity, Consistency, Isolation, Durability. Durability via write-ahead logging: changes are appended to the WAL/redo log and fsync'd before commit returns; data pages are written later; recovery replays the log.
</details>

<details><summary>What is a deadlock in a database and how do you handle it? <em>· Morgan Stanley, Microsoft</em></summary>

Cyclic waiting between transactions holding locks. DB detects and aborts a victim. Handle with retries, consistent lock ordering, shorter transactions, appropriate indexes (so updates lock fewer rows).
</details>

<details><summary>What is the leftmost prefix rule? <em>· Flipkart, Myntra, Paytm</em></summary>

A composite index on (a, b, c) can be used for predicates on a, (a,b), (a,b,c) — not for b or c alone (except special skip-scan support).
</details>

<details><summary>Optimistic vs pessimistic locking in databases. <em>· BookMyShow, Razorpay, Amazon</em></summary>

Optimistic: version column, check on update, retry on conflict — low contention. Pessimistic: SELECT FOR UPDATE, block others — high contention, short critical sections.
</details>

<details><summary>What is a view vs a materialized view? <em>· Oracle, SAP Labs, Deloitte</em></summary>

View: stored query, computed at read time. Materialized view: stored results, must be refreshed (on schedule/concurrently) — fast reads of expensive aggregations at the cost of staleness.
</details>

<details><summary>Stored procedures and triggers — pros and cons? <em>· TCS, Oracle, Infosys</em></summary>

Pros: logic near data, fewer round trips, enforcement regardless of client. Cons: harder to test, version, debug and scale; hidden side effects (triggers); vendor lock-in. Modern services keep business logic in application code, using DB constraints for integrity.
</details>

<details><summary>SQL vs NoSQL — how do you choose? <em>· Amazon, Uber, Microsoft</em></summary>

SQL: relationships, transactions, complex queries, strong consistency. NoSQL: massive scale with simple access patterns (key-value, wide-column), flexible schemas, high write throughput, horizontal scaling by design. Choose by access patterns, consistency needs and scale.
</details>

<details><summary>What is a partition and how is it different from a shard? <em>· Walmart, Flipkart</em></summary>

Partitioning splits a table into pieces within one database server (e.g., by month) for pruning and maintenance. Sharding distributes data across multiple servers to scale writes/storage.
</details>

## End-to-end scenarios

<details><summary>Scenario: `GET /orders?customerId=42&status=PAID` sorted by newest takes 4 s on a 80M-row table. Walk through your fix.</summary>

EXPLAIN ANALYZE shows a seq scan + sort. Create `CREATE INDEX CONCURRENTLY idx_orders_c_s_d ON orders (customer_id, status, created_at DESC)` (concurrently to avoid blocking writes); make the query select only required columns (optionally INCLUDE them for index-only scans); use keyset pagination; verify estimates (ANALYZE); measure again (should be a few ms). Monitor index size and write latency impact.
</details>

<details><summary>Scenario: Build a job queue on Postgres where 10 workers process "pending emails" without double-sending.</summary>

```sql
-- each worker, in a short transaction:
WITH job AS (
  SELECT id FROM email_jobs
  WHERE status = 'PENDING' AND run_at <= now()
  ORDER BY run_at
  LIMIT 10
  FOR UPDATE SKIP LOCKED
)
UPDATE email_jobs j SET status = 'PROCESSING', locked_at = now(), attempts = attempts + 1
FROM job WHERE j.id = job.id
RETURNING j.*;
```
Send emails outside the DB transaction, then mark DONE or back to PENDING with backoff; a reaper resets PROCESSING rows stuck > N minutes; idempotency key per email so a retry after a crash doesn't double-send; partial index `WHERE status = 'PENDING'`.
</details>

<details><summary>Scenario: Design the schema for an e-commerce order system and justify keys, constraints and indexes.</summary>

`customers(id PK, email UNIQUE)`, `products(id PK, sku UNIQUE, price)`, `orders(id PK, customer_id FK NOT NULL, status, total, created_at)`, `order_items(order_id FK, line_no, product_id FK, qty CHECK>0, unit_price — copied snapshot, PK(order_id, line_no))`, `payments(id, order_id FK, idempotency_key UNIQUE, status)`, `inventory(product_id PK/FK, qty CHECK >= 0)`. Indexes: `orders(customer_id, created_at DESC)`, `order_items(product_id)` for reporting, partial index on open orders. Money as NUMERIC/BIGINT paise; timestamps in UTC; soft-delete only where business needs it; status changes via constrained enum/check.
</details>
