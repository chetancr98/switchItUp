---
title: Decomposition — Monolith vs Microservices, DDD & Bounded Contexts
level: 2
tags: microservices, ddd, architecture
---
<!-- deepened -->

## Start here: the basics

### Monolith first: what it is
A **monolith** is one application containing all features — users, catalog, orders, payments — built and deployed as a single unit, usually with one database.

```
            ┌───────────────────────────── one deployable app ─────────────────────────────┐
Browser ──► │ UserController  ProductController  OrderController  PaymentController       │ ──► one DB
            └───────────────────────────────────────────────────────────────────────────────┘
```
Monoliths are **great** for small teams: simple to develop, test, deploy and debug.

### Why companies move to microservices
As the company grows to dozens of teams:
- Every change requires deploying everything → slow, risky releases.
- One bug (memory leak in reports) can crash checkout.
- You can't scale just the busy part (search) independently.
- Teams step on each other's code.

**Microservices** split the system into small services, each owning one business capability and **its own data**, deployed independently, talking over the network.

```
          ┌──────────────┐      ┌───────────────┐      ┌──────────────┐
Client ─► │ API Gateway  │ ───► │ Order Service │ ───► │ Orders DB    │
          └──────────────┘      └───────┬───────┘      └──────────────┘
                 │                      │ events (Kafka)
                 ▼                      ▼
          ┌──────────────┐      ┌───────────────┐
          │ User Service │      │ Payment Svc   │ ──► Payments DB
          └──────────────┘      └───────────────┘
```

### The price you pay
Network calls can fail or be slow; data is spread across databases (no simple joins or transactions); you need service discovery, monitoring, tracing, CI/CD per service. **Microservices trade code complexity for operational complexity.**

### How to decide boundaries (beginner version)
Split by **business capability** (what the business does): Catalog, Cart, Orders, Payments, Shipping, Notifications. Not by technical layer ("DatabaseService") and not one service per table.

---

## The honest trade-off

Microservices buy **independent deployability and team autonomy** at the cost of **distributed-systems complexity**. Interviewers reward candidates who say *when not to*.

| | Modular monolith | Microservices |
|---|---|---|
| Deploy | One unit | Independent per service |
| Scaling | Whole app | Per service |
| Data consistency | ACID transactions | Eventual consistency, sagas |
| Calls | In-process (ns) | Network (ms, can fail) |
| Debugging | Stack trace | Distributed tracing |
| Team fit | 1–3 teams | Many teams (Conway's law) |
| Ops cost | Low | High: CI/CD per service, observability, service mesh, on-call |

**Conway's law**: systems mirror the communication structure of the organisation. **Inverse Conway manoeuvre**: shape teams to get the architecture you want.

Good reasons to split: different scaling profiles (search vs checkout), different release cadences, team ownership boundaries, isolation of failure/security domains (payments PCI scope), different tech needs.
Bad reasons: "it's modern", resume-driven development, splitting a 5-person team's app into 20 services (**distributed monolith**: services that must deploy together, share a DB, and call each other synchronously in long chains).

**Start with a modular monolith** (enforced module boundaries — Spring Modulith, ArchUnit, Java modules), extract services when a boundary is proven. Amazon Prime Video famously moved a monitoring pipeline *back* from serverless microservices to a monolith and cut costs 90%.

## Domain-Driven Design — strategic

- **Domain / subdomains**: *core* (your competitive advantage — build it well), *supporting*, *generic* (buy it: auth, payments gateway, email).
- **Ubiquitous language**: one precise vocabulary per context shared by devs and domain experts.
- **Bounded context**: a boundary within which a model and its language are consistent. "Product" in *Catalog* (descriptions, images) ≠ "Product" in *Inventory* (SKU, warehouse qty) ≠ in *Pricing*. Each context owns its model → natural **service boundary**.
- **Context mapping** patterns: Shared Kernel, Customer/Supplier, Conformist, **Anti-Corruption Layer** (translate a legacy/external model so it doesn't leak into yours), Open Host Service + Published Language, Separate Ways.

### Finding boundaries
- **Event storming**: domain events on orange stickies (`OrderPlaced`, `PaymentCaptured`, `ShipmentDispatched`), then commands, aggregates, and clusters → contexts.
- Decompose by **business capability** (what the business does: ordering, billing, fulfilment) rather than by technical layer or by entity ("CustomerService" CRUD wrappers lead to chatty, anaemic services).
- High cohesion inside, low coupling across: if two services always change together, they're one service.

## Domain-Driven Design — tactical

| Building block | Meaning |
|---|---|
| **Entity** | Identity over time (Order #123) |
| **Value object** | Defined by attributes, immutable (Money, Address, DateRange) |
| **Aggregate** | Cluster of entities/VOs with one **root**; the consistency & transaction boundary |
| **Repository** | Collection-like access to aggregates (one per aggregate root) |
| **Domain event** | Something that happened, past tense, immutable |
| **Domain service** | Logic that doesn't belong to one entity |

### Aggregate design rules (Vaughn Vernon)
1. Protect **true invariants** inside the boundary (an Order's total = sum of lines; can't add lines after shipping).
2. Design **small aggregates**.
3. Reference other aggregates **by ID only** (`customerId`, not `Customer customer`).
4. **One aggregate per transaction**; use **eventual consistency** (domain events) across aggregates.

```java
public class Order {                                   // aggregate root
    private final OrderId id;
    private final CustomerId customerId;               // reference by id
    private final List<OrderLine> lines = new ArrayList<>();
    private OrderStatus status = DRAFT;
    private final List<DomainEvent> events = new ArrayList<>();

    public void addLine(Sku sku, int qty, Money price) {
        if (status != DRAFT) throw new IllegalStateException("Order is " + status);
        lines.add(new OrderLine(sku, qty, price));
    }
    public void place() {
        if (lines.isEmpty()) throw new IllegalStateException("Empty order");
        status = PLACED;
        events.add(new OrderPlaced(id, customerId, total()));
    }
    public Money total() { return lines.stream().map(OrderLine::subtotal).reduce(Money.ZERO, Money::add); }
}
```
Spring Data supports publishing these with `@DomainEvents` / `AbstractAggregateRoot`.

## Data ownership: database per service

Each service owns its data; others access it **only through its API or events**. A shared database couples schemas, deployments and scaling — it's the #1 sign of a distributed monolith.

Consequences you must address:
- **No cross-service joins** → API composition, or replicate read models via events (CQRS).
- **No distributed ACID** → sagas, outbox (see Data patterns module).
- Reporting → stream events into a warehouse/lake.

## Migration from a monolith — Strangler Fig

```
            ┌──────────── API gateway / routing layer ────────────┐
 /orders ──►│ new Order Service (new DB) ◄── sync data via CDC    │
 /*      ──►│ legacy monolith                                      │
            └─────────────────────────────────────────────────────┘
```
1. Put a facade/gateway in front.
2. Pick a well-bounded, high-value capability; build it as a service.
3. Route its traffic to the new service; sync data (dual reads, CDC with Debezium, anti-corruption layer).
4. Repeat; the monolith shrinks until it can be removed.
Also: **branch by abstraction**, **parallel run** (call both, compare results, serve legacy) for risky logic.

## Twelve-Factor App (still the checklist)
Codebase per app · explicit dependencies · **config in environment** · backing services as attached resources · strict build/release/run · **stateless processes** · port binding · scale via processes · **disposability** (fast start, graceful shutdown) · dev/prod parity · logs as event streams · admin tasks as one-off processes.

## Quick check questions

<details><summary>1. How do you decide service boundaries?</summary>

Model the domain (event storming), find bounded contexts and business capabilities, align with team ownership, keep things that change together together, ensure each service owns its data and can deploy independently. Validate by checking communication patterns: chatty synchronous calls between two services suggest a wrong boundary.
</details>

<details><summary>2. What is a distributed monolith and how do you recognise one?</summary>

Microservices that are tightly coupled: shared database, lock-step deployments, long synchronous call chains, shared domain libraries that force simultaneous upgrades. You get all the costs of distribution and none of the autonomy.
</details>

<details><summary>3. Why should aggregates reference each other by ID?</summary>

It keeps aggregates small and independently loadable/lockable, defines clear transaction boundaries, avoids loading huge object graphs, and allows aggregates to live in different services/databases later.
</details>

<details><summary>4. Your company wants to break up a 10-year-old monolith. Outline the plan.</summary>

Understand domains and pain points; modularise inside the monolith first; add observability and CI/CD; put a gateway in front; strangle one bounded context at a time starting with something valuable but low-risk; separate its data (CDC to sync during transition); use anti-corruption layers; measure (deploy frequency, lead time, incidents) to prove value; stop when remaining parts don't justify extraction.
</details>

## Questions asked at top companies

<details><summary>Monolith vs microservices — pros, cons, and when would you NOT use microservices? <em>· Amazon, Walmart, Infosys, Paytm</em></summary>

Monolith: simple dev/test/deploy, in-process calls, ACID; but scaling and team autonomy suffer at size. Microservices: independent deploy/scale, fault isolation, team ownership, tech flexibility; but distributed complexity, eventual consistency, ops overhead. Avoid for small teams, early products, unclear domains — start with a modular monolith.
</details>

<details><summary>How do you identify microservice boundaries? <em>· Atlassian, Thoughtworks, Flipkart</em></summary>

DDD bounded contexts, business capabilities, event storming, team ownership (Conway's law), data ownership, change frequency; validate by low chattiness between services.
</details>

<details><summary>What is a bounded context? <em>· Thoughtworks, Walmart</em></summary>

A boundary within which a domain model and its language are consistent; the same word ("Product") can mean different models in different contexts. Usually maps to a service.
</details>

<details><summary>Database per service — why, and how do you query across services? <em>· Amazon, Uber, Swiggy</em></summary>

Prevents coupling via shared schema and allows independent scaling/evolution. Cross-service data via API composition, CQRS read models fed by events, or data warehouse for analytics.
</details>

<details><summary>What is the Strangler Fig pattern? <em>· Walmart, Goldman Sachs, Deloitte</em></summary>

Incrementally replace a monolith by routing specific features to new services behind a facade until the monolith can be retired.
</details>

<details><summary>What is an aggregate in DDD? <em>· Thoughtworks, Atlassian</em></summary>

A cluster of domain objects treated as a single unit for consistency with one root entity; modified in one transaction; referenced by ID from outside.
</details>

<details><summary>What is a distributed monolith? <em>· Uber, Atlassian</em></summary>

Services that must be deployed together due to shared DB, synchronous call chains or shared libraries — distribution costs without autonomy.
</details>

<details><summary>What are the 12-factor app principles you follow? <em>· Infosys, Accenture, Walmart</em></summary>

Config in env, stateless processes, backing services as resources, disposability (fast start, graceful shutdown), logs as streams, dev/prod parity, build-release-run separation, port binding, concurrency via processes, explicit dependencies, one codebase, admin processes.
</details>

<details><summary>How big should a microservice be? <em>· Microsoft, Thoughtworks</em></summary>

Sized by a cohesive business capability owned by one team (two-pizza team), not lines of code. If two services always change together, merge them; if a service has multiple unrelated reasons to change, split it.
</details>

<details><summary>What is Conway's Law? <em>· Atlassian, Amazon</em></summary>

Systems mirror the communication structure of the organisation that builds them; align team boundaries with desired service boundaries.
</details>

## End-to-end scenarios

<details><summary>Scenario: Break a food-delivery monolith into services. Which services, what data does each own, how do they talk?</summary>

Services: Identity (users, auth), Restaurant/Catalog (menus), Cart, Order (order lifecycle), Payment (transactions, refunds), Delivery/Dispatch (rider assignment, tracking), Notification, Pricing/Promotions, Search (read model from catalog events). Order service orchestrates a saga: create order → payment → restaurant acceptance → dispatch; events on Kafka (`OrderPlaced`, `PaymentCaptured`, `OrderAccepted`). Sync REST/gRPC only for queries needing immediate answers (price quote). Migrate with strangler fig, starting with Notification or Search (low risk).
</details>

<details><summary>Scenario: Two teams keep breaking each other because both write to the same `customers` table. Fix it.</summary>

Assign ownership of customer data to one service (Customer service); others read through its API or consume `CustomerUpdated` events into local read models; migrate writes behind the owning API; remove direct DB access with credentials per service; contract tests for the API/events.
</details>
