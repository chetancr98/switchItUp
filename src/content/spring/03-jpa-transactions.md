---
title: JPA/Hibernate & Transactions — N+1, Propagation, Isolation, Locking
level: 3
tags: jpa, hibernate, transactions, isolation, locking
---
<!-- deepened -->

## Start here: the basics

### Why JPA/Hibernate?
Databases store **tables and rows**; Java works with **objects**. Writing SQL by hand and copying columns into fields for every class is repetitive. **ORM (Object-Relational Mapping)** maps classes ⇄ tables automatically.

- **JPA** (Jakarta Persistence API) — the standard *specification* (annotations + `EntityManager` API).
- **Hibernate** — the most popular *implementation* of JPA.
- **Spring Data JPA** — generates repository code for you on top of JPA.

### Mapping a class to a table
```java
@Entity
@Table(name = "orders")
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.SEQUENCE)
    private Long id;

    @Column(nullable = false)
    private String status;

    @ManyToOne(fetch = FetchType.LAZY)          // many orders → one customer
    @JoinColumn(name = "customer_id")
    private Customer customer;

    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<OrderLine> lines = new ArrayList<>();

    protected Order() {}                        // JPA needs a no-arg constructor
}
```

### Repositories without writing SQL
```java
public interface OrderRepository extends JpaRepository<Order, Long> {
    List<Order> findByStatus(String status);                         // query derived from method name
    List<Order> findByCustomerIdAndStatusOrderByIdDesc(Long id, String s);

    @Query("select o from Order o join fetch o.customer where o.id = :id")
    Optional<Order> findWithCustomer(Long id);                       // JPQL (works on entities, not tables)
}
```

### What is a transaction?
A group of database operations that succeed or fail **together**. Classic example — transfer money: debit A *and* credit B. If the credit fails, the debit must be undone.

**ACID**:
- **Atomicity** — all or nothing.
- **Consistency** — rules (constraints) hold before and after.
- **Isolation** — concurrent transactions don't see each other's half-done work (to a configurable degree).
- **Durability** — once committed, it survives crashes.

In Spring you just annotate:
```java
@Service
public class TransferService {
    @Transactional
    public void transfer(long fromId, long toId, long paise) {
        Account from = repo.findById(fromId).orElseThrow();
        Account to = repo.findById(toId).orElseThrow();
        from.debit(paise);     // throws if insufficient funds → whole transaction rolls back
        to.credit(paise);
    }                          // commit happens here automatically
}
```
Note there's no `save()` call — loaded entities are **managed**, and Hibernate detects the changes (dirty checking) at commit.

### Lazy vs eager loading
- **Lazy**: related data loaded only when you access it (`order.getCustomer().getName()` triggers a query then).
- **Eager**: loaded immediately with the parent.
Default to lazy and fetch what you need explicitly — eager loading everywhere makes every query huge.

---

## The persistence context — the concept everything hinges on

The **persistence context** (Hibernate `Session` / JPA `EntityManager`) is a first-level cache + unit of work, usually bound to the **transaction**.

- **Identity guarantee**: within one context, the same row → the same Java object (`find` twice = 1 query, `==` true).
- **Dirty checking**: at flush, Hibernate compares each managed entity with its loaded snapshot and issues `UPDATE`s automatically — **you don't need to call `save()` on a managed entity**.
- **Write-behind**: SQL is deferred until **flush** (before commit, before a query that might be affected — `FlushMode.AUTO`, or explicit `flush()`).

### Entity states
```
 new Order()  ──persist()──►  MANAGED  ──commit/close──►  DETACHED
  TRANSIENT                     │  ▲                         │
                         remove()│  │ merge() returns managed │
                                ▼  └─────────────────────────┘
                             REMOVED ──flush──► DELETE
```

`merge()` copies state of a detached object onto a managed one and **returns the managed copy** — the argument stays detached. Spring Data's `save()` calls `persist` if the entity is new (null id / version) else `merge` — which for assigned IDs (UUID set in the constructor) triggers an extra `SELECT` first. Fix: implement `Persistable<ID>#isNew` or use a `@Version` field.

## Fetching — N+1 and friends

### The N+1 problem
```java
List<Order> orders = orderRepo.findAll();          // 1 query
for (Order o : orders) o.getCustomer().getName();  // N queries (one per lazy customer)
```

Defaults: `@ManyToOne` / `@OneToOne` are **EAGER** (bad default — change to `LAZY` always). `@OneToMany` / `@ManyToMany` are LAZY.

Fixes, in order of preference:
1. **Fetch join** in JPQL: `select o from Order o join fetch o.customer where o.status = :s`
2. **`@EntityGraph(attributePaths = {"customer", "lines"})`** on a repository method.
3. **DTO projection**: `select new com.x.OrderView(o.id, c.name) from Order o join o.customer c` — fetch exactly the columns you need; fastest for read APIs.
4. **Batch fetching**: `@BatchSize(size = 50)` or `hibernate.default_batch_fetch_size=50` → N+1 becomes 1 + N/50 (`WHERE id IN (...)`).

**Detecting**: enable SQL logging in tests, `hibernate.generate_statistics`, assert query counts in tests (datasource-proxy / `QuickPerf`), or Hypersistence Optimizer.

### Fetch join + pagination trap
`join fetch` on a **collection** + `Pageable` → Hibernate warns `HHH90003004: firstResult/maxResults specified with collection fetch; applying in memory!` — loads **everything** and paginates in memory. Fix: page over IDs first, then fetch join by `id in :ids`.

### MultipleBagFetchException
Fetch-joining two `List` collections at once is forbidden (cartesian product). Use `Set`, or fetch them in separate queries.

### LazyInitializationException & Open Session In View
Accessing a lazy association after the context closed → exception. Spring Boot enables **OSIV** by default (`spring.jpa.open-in-view=true`, with a warning): the session stays open through view rendering so lazy loads "work" — but they run **outside the transaction**, hold a DB connection for the whole request, and hide N+1s. **Set it to false** and fetch what you need explicitly. Saying this in an interview is a strong signal.

## Spring @Transactional — how it really works

- A **proxy** (`TransactionInterceptor`) around the bean. On entry it asks the `PlatformTransactionManager` (`JpaTransactionManager`) to begin/join; binds the connection/EntityManager to the thread via `TransactionSynchronizationManager` (ThreadLocal); on exit commits or rolls back.

### The traps (asked constantly)
1. **Self-invocation**: `this.saveInternal()` from another method of the same bean bypasses the proxy → no transaction. Fixes: move the method to another bean, inject self (`@Lazy`), or `TransactionTemplate`.
2. **Non-public methods**: proxies only intercept public methods (Spring 6 supports protected/package with CGLIB, but don't rely on it).
3. **Checked exceptions don't roll back** by default — only `RuntimeException` and `Error`. Use `@Transactional(rollbackFor = Exception.class)`.
4. **Catching the exception inside** the transactional method → the interceptor never sees it → commit.
5. **Inner `REQUIRED` method throws, outer catches it** → the shared transaction is marked **rollback-only** → outer commit throws `UnexpectedRollbackException`.
6. `@Transactional` on a **`private`** method or in a class not managed by Spring → silently ignored.
7. Calling a **remote service / Kafka send inside a transaction** — DB rolls back but the message was already sent (or the HTTP call is slow and holds the connection). → outbox pattern.
8. `readOnly = true` — sets Hibernate `FlushMode.MANUAL` (skips dirty checking — faster), hints the driver; can route to replicas with `AbstractRoutingDataSource`. Doesn't *prevent* writes on all DBs.

### Propagation

| Propagation | Existing tx | No tx |
|---|---|---|
| `REQUIRED` (default) | Join it | Create new |
| `REQUIRES_NEW` | **Suspend** it, create new independent tx (new connection!) | Create new |
| `NESTED` | Savepoint within it (JDBC savepoints; not with JPA tx manager in most setups) | Create new |
| `SUPPORTS` | Join | Run non-transactionally |
| `MANDATORY` | Join | Throw |
| `NOT_SUPPORTED` | Suspend, run without | Run without |
| `NEVER` | Throw | Run without |

`REQUIRES_NEW` use case: **audit log** that must persist even if the business tx rolls back. Danger: needs a *second* connection while the first is held → connection pool exhaustion / deadlock under load if pool size ≤ concurrent requests.

## Isolation levels & anomalies

| Anomaly | Description |
|---|---|
| Dirty read | Read uncommitted data of another tx |
| Non-repeatable read | Same row read twice gives different values (someone committed an update) |
| Phantom read | Same *query* returns new rows (someone inserted) |
| Lost update | Two txs read-modify-write; one overwrites the other |
| Write skew | Two txs read overlapping data, write disjoint rows, jointly violate an invariant (two doctors both go off-call) |

| Level | Dirty | Non-repeatable | Phantom | Notes |
|---|---|---|---|---|
| READ UNCOMMITTED | possible | possible | possible | Practically unused |
| **READ COMMITTED** | ✗ | possible | possible | **PostgreSQL, Oracle, SQL Server default** |
| **REPEATABLE READ** | ✗ | ✗ | possible (std) | **MySQL InnoDB default**; InnoDB uses next-key/gap locks to prevent most phantoms; Postgres RR = snapshot isolation (no phantoms, but write skew possible) |
| SERIALIZABLE | ✗ | ✗ | ✗ | Postgres SSI aborts conflicting txs → you must retry |

**MVCC**: readers see a consistent snapshot without blocking writers (Postgres: tuple versions + `xmin/xmax`; InnoDB: undo logs). Writers still block writers on the same row.

## Locking strategies — preventing lost updates

### Optimistic locking (default choice)
```java
@Entity class Account {
    @Id Long id;
    long balance;
    @Version long version;     // Hibernate adds "WHERE id=? AND version=?" and increments
}
```
If 0 rows updated → `OptimisticLockException` (Spring: `ObjectOptimisticLockingFailureException`) → retry (Spring Retry `@Retryable`) or return `409`. Great for low-contention, long "think time" edits, and across HTTP requests (ETag = version).

### Pessimistic locking
```java
@Lock(LockModeType.PESSIMISTIC_WRITE)       // SELECT ... FOR UPDATE
@Query("select a from Account a where a.id = :id")
Optional<Account> findForUpdate(Long id);
```
For high contention short critical sections (inventory decrement, seat booking). Set a lock timeout (`jakarta.persistence.lock.timeout`), acquire locks in consistent order to avoid deadlocks. `SKIP LOCKED` (`FOR UPDATE SKIP LOCKED`) — the trick for building **job queues on Postgres/MySQL**: workers each grab different unlocked rows.

### Atomic SQL — often the best answer
```sql
UPDATE inventory SET qty = qty - :n WHERE sku = :sku AND qty >= :n;   -- 0 rows → out of stock
```
No read-modify-write race at all. Mention this before reaching for locks.

## Performance checklist for JPA in production

- `spring.jpa.open-in-view=false`
- All `@ManyToOne(fetch = LAZY)`
- `hibernate.jdbc.batch_size=50` + `order_inserts/order_updates=true` — and don't use `GenerationType.IDENTITY` if you need insert batching (Hibernate must execute each insert to get the id) → use `SEQUENCE` with `allocationSize=50` (pooled optimizer).
- DTO projections for reads; entities for writes.
- Bulk ops: `@Modifying @Query("update ...")` bypasses the persistence context → clear it (`clearAutomatically = true`).
- Large reads: `Stream<T>` with fetch size or `ScrollableResults`, plus `entityManager.detach/clear` periodically.
- `equals/hashCode` on entities: use the business key or id-based with constant hashCode — never all fields, never Lombok `@Data` on entities (lazy collections in `toString`/`hashCode` → N+1/stack overflow).
- Second-level cache (Ehcache/Caffeine via JCache) only for read-mostly reference data.
- HikariCP: small pool (10–20) beats huge pools; set `connectionTimeout`, `maxLifetime` < DB's idle timeout; monitor `hikaricp_connections_pending`.
- Schema migrations with **Flyway/Liquibase**, `ddl-auto=validate` (never `update` in prod).

## Quick check questions

<details><summary>1. You call `order.setStatus(PAID)` inside a @Transactional method and never call save(). Is it persisted?</summary>

Yes, if `order` is managed (loaded in this transaction). Dirty checking at flush/commit detects the change and issues an UPDATE. If it's detached (e.g. passed in from a controller), no — you'd need `merge`/`save`.
</details>

<details><summary>2. Method A (@Transactional) calls method B (@Transactional(propagation = REQUIRES_NEW)) in the same class. B fails. What happens?</summary>

Trick: same class → self-invocation → B's annotation is ignored; B runs in A's transaction. The exception propagates to A; if uncaught, A rolls back everything. To get the real REQUIRES_NEW behavior, B must be in a different bean.
</details>

<details><summary>3. How do you prevent two users from booking the same seat?</summary>

Options: (1) unique constraint on (show_id, seat_id) in a bookings table — the DB rejects the second insert (simplest, strongest); (2) conditional atomic update `UPDATE seats SET status='HELD', held_by=? WHERE id=? AND status='AVAILABLE'`; (3) pessimistic `SELECT ... FOR UPDATE`; (4) optimistic `@Version` with retry. Add a TTL'd hold (status HELD with expiry) for the payment window. At very high scale, Redis `SET NX PX` holds in front of the DB.
</details>

<details><summary>4. Explain write skew with an example and how to prevent it.</summary>

Two on-call doctors; invariant: at least one on call. T1 and T2 each read "2 on call", each sets themselves off-call (different rows) and commit → 0 on call. Snapshot isolation doesn't prevent it because they wrote different rows. Fix: SERIALIZABLE isolation, `SELECT ... FOR UPDATE` on the rows read, or materialize the conflict (a row both must update).
</details>

<details><summary>5. Why is `GenerationType.IDENTITY` bad for batch inserts?</summary>

The id is only known after the INSERT executes, so Hibernate must execute each insert immediately to put the entity in the persistence context — JDBC batching is disabled. SEQUENCE with a pooled optimizer allocates ids in blocks without a round-trip per entity.
</details>

<details><summary>6. What is UnexpectedRollbackException?</summary>

An inner `REQUIRED` participant threw a runtime exception → the shared physical transaction was marked rollback-only. The outer method caught the exception and tried to commit → Spring rolls back and throws `UnexpectedRollbackException` to tell you your commit didn't happen.
</details>

## Questions asked at top companies

<details><summary>What is the N+1 problem and how do you fix it? <em>· Amazon, Flipkart, Walmart, Paytm, Swiggy</em></summary>

One query loads N parents, then accessing a lazy association triggers one query per parent. Fix with fetch joins, `@EntityGraph`, DTO projections, or batch fetching (`default_batch_fetch_size`). Detect with SQL logging/statistics and query-count tests.
</details>

<details><summary>Explain @Transactional propagation levels with use cases. <em>· Goldman Sachs, Morgan Stanley, Paytm</em></summary>

REQUIRED (default, join or create), REQUIRES_NEW (suspend outer, independent tx — audit logs), NESTED (savepoint), SUPPORTS, MANDATORY, NOT_SUPPORTED, NEVER. Be ready to explain REQUIRES_NEW's extra connection and deadlock risk.
</details>

<details><summary>Why doesn't @Transactional work when called from the same class? <em>· Amazon, Walmart, Infosys, PhonePe</em></summary>

Spring applies transactions through a proxy; `this.method()` bypasses the proxy so no interceptor runs. Move the method to another bean, self-inject, or use TransactionTemplate.
</details>

<details><summary>Does @Transactional roll back on checked exceptions? <em>· Morgan Stanley, Oracle</em></summary>

No — only on RuntimeException and Error by default. Use `rollbackFor = Exception.class` or throw unchecked exceptions.
</details>

<details><summary>Explain isolation levels and the anomalies each prevents. <em>· Goldman Sachs, Amazon, Microsoft</em></summary>

READ UNCOMMITTED (dirty reads possible), READ COMMITTED (no dirty reads), REPEATABLE READ (no non-repeatable reads), SERIALIZABLE (no phantoms / full isolation). Postgres default RC, MySQL InnoDB default RR.
</details>

<details><summary>Optimistic vs pessimistic locking — when each? <em>· Flipkart, BookMyShow, Razorpay</em></summary>

Optimistic: `@Version` column; conflict detected at update → retry/409; best for low contention. Pessimistic: `SELECT ... FOR UPDATE`; blocks others; best for hot rows with short critical sections (inventory, seats).
</details>

<details><summary>save() vs saveAndFlush() vs persist() vs merge()? <em>· Infosys, Capgemini</em></summary>

`persist` makes a new entity managed; `merge` copies a detached entity's state onto a managed copy and returns it; Spring Data `save` chooses persist or merge by "isNew"; `saveAndFlush` also flushes SQL immediately (still within the transaction — not a commit).
</details>

<details><summary>What is the first-level and second-level cache in Hibernate? <em>· TCS, Oracle, Walmart</em></summary>

First-level: the persistence context per transaction/session — always on, guarantees identity. Second-level: optional, shared across sessions (Ehcache/Caffeine/Redis via JCache) for read-mostly entities; query cache separately.
</details>

<details><summary>What is LazyInitializationException and how do you avoid it? <em>· Paytm, Accenture</em></summary>

Accessing a lazy association after the session closed. Fetch needed data inside the transaction (fetch join/EntityGraph/DTO), not by enabling OSIV or switching to EAGER.
</details>

<details><summary>Difference between JPQL, native queries and Criteria API? <em>· Cognizant, EPAM</em></summary>

JPQL queries entities (portable). Native queries are raw SQL (DB-specific features, window functions). Criteria/Specifications build type-safe dynamic queries (filters). Querydsl/jOOQ are popular alternatives.
</details>

<details><summary>How do you insert 1 million rows efficiently? <em>· Walmart, PhonePe</em></summary>

Batching (`hibernate.jdbc.batch_size`, SEQUENCE ids with pooled optimizer, `order_inserts`), flush+clear every N entities, or bypass ORM: `JdbcTemplate.batchUpdate`, Postgres `COPY`, multi-row inserts; disable unnecessary indexes during load where safe.
</details>

<details><summary>CascadeType.ALL and orphanRemoval — what do they do? <em>· Infosys, HCL</em></summary>

Cascade propagates operations (persist/merge/remove) from parent to children. `orphanRemoval=true` deletes children removed from the parent's collection. Use only for true ownership (Order → OrderLines), never on `@ManyToOne`.
</details>

## End-to-end scenarios

<details><summary>Scenario: Flash sale — 10 000 users try to buy 100 units of an item at the same second. Design the inventory decrement.</summary>

Atomic conditional SQL: `UPDATE inventory SET qty = qty - 1 WHERE sku = ? AND qty > 0` → 1 row = success, 0 = sold out; no read-modify-write race. Wrap order creation in the same transaction. To protect the DB: pre-load stock into Redis and decrement with a Lua script (`DECR` if > 0), push successful reservations to a queue, persist asynchronously with idempotency, reconcile Redis vs DB; rate-limit and queue users at the edge. Reservations expire if payment isn't completed.
</details>

<details><summary>Scenario: Transfer money between accounts; two transfers A→B and B→A at the same time deadlock in the DB. Fix it.</summary>

Both transactions lock rows in opposite order. Lock in a consistent order (`SELECT ... FOR UPDATE` on the smaller account id first), keep transactions short, add retry on deadlock errors (`CannotAcquireLockException`) with backoff. Alternatively record transfers as ledger entries (append-only) and compute balances, reducing contention on balance rows.
</details>
