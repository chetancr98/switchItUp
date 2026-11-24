---
title: SOLID & Design Patterns in Real Java Code
level: 3
tags: solid, design patterns, lld
---
<!-- deepened -->

## Start here: the basics

### Why "design" at all?
Code that works today must also be **easy to change** tomorrow. Most cost in software is maintenance. Design principles are lessons from millions of hours of painful changes.

### SOLID in plain English
| Letter | Principle | One-line meaning | Smell when violated |
|---|---|---|---|
| **S** | Single Responsibility | A class should have one job / one reason to change | `UserService` that validates, saves, emails and makes PDFs |
| **O** | Open/Closed | Add new behaviour by adding code, not editing old code | Ever-growing `if/else` or `switch` on type |
| **L** | Liskov Substitution | A subclass must work wherever its parent works | Subclass throws "not supported" for parent methods |
| **I** | Interface Segregation | Small focused interfaces | Implementing methods you don't need with empty bodies |
| **D** | Dependency Inversion | Depend on interfaces, not concrete classes | `new MySqlRepository()` inside business logic |

### A tiny before/after
```java
// Before: adding UPI means editing this method (violates OCP)
double fee(String method, double amt) {
    if (method.equals("CARD")) return amt * 0.02;
    else if (method.equals("NETBANKING")) return 10;
    return 0;
}

// After: each method is its own class; adding UPI = adding a class
interface FeePolicy { double fee(double amt); }
class CardFee implements FeePolicy { public double fee(double a) { return a * 0.02; } }
class NetBankingFee implements FeePolicy { public double fee(double a) { return 10; } }
class UpiFee implements FeePolicy { public double fee(double a) { return 0; } }
```

### What is a design pattern?
A **named, reusable solution** to a common design problem. Knowing the names lets engineers communicate fast ("make that a Strategy"). Three families:
- **Creational** — how objects are created (Singleton, Factory, Builder).
- **Structural** — how objects are composed (Adapter, Decorator, Proxy, Facade).
- **Behavioral** — how objects interact (Strategy, Observer, Template Method, Chain of Responsibility, State, Command).

### The five patterns to learn first
1. **Strategy** — swap algorithms (the FeePolicy example above).
2. **Factory** — hide which concrete class gets created.
3. **Builder** — construct objects with many optional fields readably.
4. **Observer** — notify many listeners when something happens.
5. **Singleton** — one instance (in Spring, beans are singletons already).

---

## SOLID — with the violation, not the definition

### S — Single Responsibility
"A class should have one reason to change" = one **actor** it serves.

```java
// Violation: three actors (finance rules, DBA, ops/reporting) change this class
class InvoiceService {
    Money calculateTotal(Invoice i) { ... }
    void save(Invoice i) { /* JDBC */ }
    String renderPdf(Invoice i) { ... }
}
// Fix: InvoiceCalculator, InvoiceRepository, InvoiceRenderer
```

### O — Open/Closed
Open for extension, closed for modification. Smell: a growing `switch` on a type.

```java
// Violation
double discount(Customer c) {
    switch (c.type()) { case GOLD: return 0.2; case SILVER: return 0.1; default: return 0; }
}
// Fix: strategy — new tiers = new class, no edits to existing code
interface DiscountPolicy { boolean supports(Customer c); double rate(Customer c); }
@Component class GoldPolicy implements DiscountPolicy { ... }
// Spring injects List<DiscountPolicy>; pick the one that supports(c)
```
(With sealed types + exhaustive switch, a closed `switch` is acceptable — the compiler forces you to handle new cases. Know the trade-off: OCP favours adding *types*; switch-over-sealed favours adding *operations*. This is the "expression problem".)

### L — Liskov Substitution
Subtypes must honour the supertype's contract: no stronger preconditions, no weaker postconditions, preserve invariants, no new unchecked exceptions.

Classic: `Square extends Rectangle` — `setWidth(5)` on a Square also changes height, breaking callers that assume `area == w*h` after setting both. Another: `ReadOnlyList implements List` throwing `UnsupportedOperationException` from `add` — the JDK itself violates LSP with `List.of()`.

### I — Interface Segregation
Clients shouldn't depend on methods they don't use. `Worker { work(); eat(); }` forces `Robot` to implement `eat()`. Split into role interfaces. Spring Data does this well: `CrudRepository`, `PagingAndSortingRepository`, `ListCrudRepository`.

### D — Dependency Inversion
High-level policy depends on **abstractions owned by the high-level module**, not on low-level details.

```java
// Domain owns the port
public interface PaymentGateway { PaymentResult charge(Money m, CardToken t); }
// Infrastructure implements it
@Component class RazorpayGateway implements PaymentGateway { ... }
```
This is the heart of **hexagonal / ports-and-adapters** architecture. DI (Spring) is a *mechanism*; DIP is the *principle*.

## Creational patterns

### Singleton
Prefer an `enum` (serialization- and reflection-safe) or the holder idiom. In Spring, beans are singletons per container — you rarely hand-write one. Downsides: global state, hard to test.

```java
public enum IdGenerator { INSTANCE; private final AtomicLong seq = new AtomicLong(); public long next() { return seq.incrementAndGet(); } }
```

### Builder
For many optional params, immutability, and readable construction.

```java
public final class HttpRequest {
    private final String url; private final Duration timeout; private final Map<String,String> headers;
    private HttpRequest(Builder b) { url = b.url; timeout = b.timeout; headers = Map.copyOf(b.headers); }
    public static Builder builder(String url) { return new Builder(url); }
    public static final class Builder {
        private final String url; private Duration timeout = Duration.ofSeconds(5); private final Map<String,String> headers = new HashMap<>();
        private Builder(String url) { this.url = Objects.requireNonNull(url); }
        public Builder timeout(Duration d) { this.timeout = d; return this; }
        public Builder header(String k, String v) { headers.put(k, v); return this; }
        public HttpRequest build() { /* validate invariants here */ return new HttpRequest(this); }
    }
}
```

### Factory Method / Abstract Factory / Static factory
- Static factories (`List.of`, `Optional.of`, `Integer.valueOf`) — named, can cache, can return subtypes.
- Factory Method — subclass decides which object to create.
- Abstract Factory — families of related objects (`UIFactory` → `WindowsButton` + `WindowsCheckbox`).
- In Spring: `FactoryBean`, `@Bean` methods are factories.

### Prototype
Clone a configured instance. Spring `@Scope("prototype")`.

## Structural patterns

| Pattern | Intent | Real example |
|---|---|---|
| **Adapter** | Convert one interface to another | `Arrays.asList`, `InputStreamReader`, your wrapper over a vendor SDK |
| **Decorator** | Add behaviour by wrapping, same interface | `BufferedInputStream(new FileInputStream())`, `Collections.synchronizedList`, Spring `TransactionAwareDataSourceProxy` |
| **Proxy** | Control access, same interface | Spring AOP / `@Transactional` / `@Cacheable` proxies, Hibernate lazy-loading proxies, JDK dynamic proxy |
| **Facade** | Simple API over a subsystem | `JdbcTemplate`, SLF4J |
| **Composite** | Tree of uniform nodes | File system, UI components, org chart |
| **Flyweight** | Share immutable intrinsic state | `Integer` cache, String pool |

Decorator vs Proxy: same structure; **decorator adds behaviour** chosen by the client and stackable; **proxy controls access** and is usually transparent/created by infrastructure.

## Behavioral patterns

### Strategy
Swap algorithms at runtime. `Comparator`, payment methods, pricing rules. In modern Java a strategy is often just a lambda / `Function`.

### Observer / Pub-Sub
Spring `ApplicationEventPublisher` + `@EventListener` / `@TransactionalEventListener(phase = AFTER_COMMIT)` — the latter is how you send an email only after the order transaction actually committed.

### Template Method
Skeleton in base class, steps overridden. `JdbcTemplate` uses callbacks instead (composition flavour), `AbstractController`, `HttpServlet.service → doGet`.

### Chain of Responsibility
Request passed along handlers until one handles it (or all process it). **Servlet filters**, **Spring Security filter chain**, interceptors, validation pipelines.

```java
interface Handler { Optional<Response> handle(Request r, Chain next); }
```

### Command
Encapsulate a request as an object — undo/redo, queues, retries, `Runnable`.

### State
Behaviour varies by state; each state a class. Order lifecycle: `Created → Paid → Shipped → Delivered / Cancelled`. Avoids `if (status == ...)` everywhere and makes illegal transitions impossible.

```java
sealed interface OrderState permits Created, Paid, Shipped, Delivered, Cancelled {
    default OrderState pay()    { throw new IllegalStateException("cannot pay in " + this); }
    default OrderState ship()   { throw new IllegalStateException("cannot ship in " + this); }
    default OrderState cancel() { throw new IllegalStateException("cannot cancel in " + this); }
}
record Created() implements OrderState { public OrderState pay() { return new Paid(); } public OrderState cancel() { return new Cancelled(); } }
record Paid() implements OrderState { public OrderState ship() { return new Shipped(); } public OrderState cancel() { return new Cancelled(); } }
...
```

### Iterator, Visitor, Mediator, Memento
- **Visitor**: add operations to a closed hierarchy without modifying it (compilers/ASTs). Largely replaced by sealed types + pattern matching switch.
- **Mediator**: central coordinator (chat room, air traffic control).
- **Memento**: snapshot/restore state (undo).

## Patterns inside Spring (great interview material)

| Pattern | Where in Spring |
|---|---|
| Singleton | Default bean scope |
| Factory | `BeanFactory`, `FactoryBean`, `@Bean` |
| Proxy | AOP, `@Transactional`, `@Async`, `@Cacheable`, lazy JPA |
| Template | `JdbcTemplate`, `RestTemplate`, `KafkaTemplate`, `TransactionTemplate` |
| Front Controller | `DispatcherServlet` |
| Chain of Responsibility | Security `FilterChain`, `HandlerInterceptor`s |
| Observer | Application events |
| Strategy | `PlatformTransactionManager`, `HandlerMapping`, `ViewResolver`, `PasswordEncoder` implementations |
| Adapter | `HandlerAdapter` (lets DispatcherServlet call any handler type) |
| Decorator | `BeanPostProcessor` wrapping beans; `HttpServletRequestWrapper` |

## Anti-patterns to name
God class, anemic domain model (logic all in services, entities as data bags — fine for CRUD, bad for rich domains), service locator, singleton abuse, golden hammer, premature abstraction ("interface for every class with one impl").

## Quick check questions

<details><summary>1. Strategy vs State — same structure, what's different?</summary>

Strategy: the client chooses an interchangeable algorithm; strategies don't know each other. State: the object transitions between states itself; each state knows which state comes next. Intent differs: "how to do it" vs "what I am now".
</details>

<details><summary>2. How does Spring's @Transactional relate to the Proxy pattern, and what's the consequence?</summary>

Spring wraps the bean in a JDK dynamic proxy (interface) or CGLIB subclass proxy. Callers hit the proxy, which opens/commits the transaction around the target call. Consequence: **self-invocation** (`this.method()`) bypasses the proxy → no transaction; private/final methods can't be intercepted. See Spring → AOP & Proxies.
</details>

<details><summary>3. Give a real LSP violation you've seen and how you'd fix it.</summary>

E.g. a `CachedUserRepository` subclass that silently returns stale data where callers expect read-your-writes; or `List.of` throwing on `add`. Fix by narrowing the abstraction (separate read-only interface), or composition so the contract isn't inherited.
</details>

<details><summary>4. When is applying a pattern a mistake?</summary>

When it adds indirection without a real axis of change (YAGNI): interfaces with one implementation and no test seam need, factories for objects with one constructor, visitor for a hierarchy that changes often. Patterns should be discovered from pressure in the code, not pre-applied.
</details>

## Questions asked at top companies

<details><summary>Explain SOLID principles with examples from your project. <em>· Amazon, Thoughtworks, Infosys, Atlassian</em></summary>

Give one real example each: SRP — split a service that did validation + persistence + notifications; OCP — payment methods as strategies registered in Spring; LSP — replaced inheritance from a mutable base with composition; ISP — separated read and write repository interfaces; DIP — domain depends on `PaymentGateway` interface implemented by an adapter. Concrete examples beat definitions.
</details>

<details><summary>Write a thread-safe Singleton. How can it be broken? <em>· Goldman Sachs, Oracle, Paytm, Wipro</em></summary>

Best: `enum Singleton { INSTANCE; }` or the holder idiom. Double-checked locking needs `volatile`. Can be broken by reflection (call private constructor — guard by throwing if instance exists), serialization (implement `readResolve`), cloning, and multiple class loaders. Enum is immune to reflection and serialization attacks.
</details>

<details><summary>Factory vs Abstract Factory vs Builder. <em>· Walmart, Accenture, Amazon</em></summary>

Factory method: one method decides which subclass to instantiate. Abstract factory: creates families of related objects that must be used together. Builder: step-by-step construction of a complex object with many optional parts, producing an immutable result.
</details>

<details><summary>Decorator vs Proxy vs Adapter. <em>· Microsoft, Adobe</em></summary>

All wrap an object. Adapter changes the interface to one the client expects. Decorator keeps the interface and adds behaviour, stackable (`BufferedInputStream`). Proxy keeps the interface and controls access (lazy loading, security, transactions — Spring AOP).
</details>

<details><summary>Where does Spring use design patterns? <em>· Infosys, EPAM, Cognizant</em></summary>

Singleton (bean scope), Factory (BeanFactory, FactoryBean), Proxy (AOP, @Transactional), Template (JdbcTemplate, RestTemplate), Front Controller (DispatcherServlet), Observer (ApplicationEvent), Strategy (TransactionManager, PasswordEncoder), Chain of Responsibility (filter chain), Adapter (HandlerAdapter).
</details>

<details><summary>Explain the Observer pattern and a real use case. <em>· Flipkart, Swiggy</em></summary>

Subject keeps a list of observers and notifies them on change. Example: when an order is placed, inventory, email and analytics listeners react independently (`@EventListener`/Kafka in distributed systems). Decouples the publisher from consumers.
</details>

<details><summary>What is Dependency Injection and how is it related to Inversion of Control? <em>· nearly every Spring interview</em></summary>

IoC: the framework, not your code, controls object creation and wiring. DI is the technique — dependencies are supplied (constructor/setter) instead of created inside the class, enabling loose coupling and easy testing with mocks.
</details>

<details><summary>Implement the Strategy pattern for discount calculation. <em>· Amazon LLD round, Uber</em></summary>

```java
interface DiscountStrategy { BigDecimal apply(BigDecimal amount); }
class NoDiscount implements DiscountStrategy { public BigDecimal apply(BigDecimal a) { return a; } }
class PercentOff implements DiscountStrategy {
    private final BigDecimal pct; PercentOff(BigDecimal p) { pct = p; }
    public BigDecimal apply(BigDecimal a) { return a.subtract(a.multiply(pct).divide(BigDecimal.valueOf(100))); }
}
class Checkout { private final DiscountStrategy d; Checkout(DiscountStrategy d) { this.d = d; } BigDecimal total(BigDecimal a) { return d.apply(a); } }
```
</details>

<details><summary>What are anti-patterns you have seen? <em>· Thoughtworks, Atlassian</em></summary>

God class, anaemic domain model, copy-paste programming, magic numbers/strings, service locator, singleton abuse/global state, premature optimisation, overusing inheritance, "interface for everything" with single implementations.
</details>

<details><summary>Template Method vs Strategy? <em>· Oracle, SAP Labs</em></summary>

Template method uses inheritance: base class fixes the algorithm skeleton and subclasses override steps. Strategy uses composition: the whole algorithm is an injected object swappable at runtime. Prefer strategy for flexibility.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a notification module that sends Email, SMS and Push today, WhatsApp next month, with per-user preferences and retries. Which patterns and how?</summary>

`NotificationChannel` interface (Strategy) with one implementation per channel; Spring injects `List<NotificationChannel>` keyed by type (registry/factory) — adding WhatsApp = new class (OCP). A `Notification` built via Builder (recipient, template, params, priority). A decorator `RetryingChannel` wraps channels for retries/backoff; another decorator for metrics. Observer/events: domain events (`OrderShipped`) trigger the notification service. Preferences checked by a chain of filters (opt-out, quiet hours, rate limit). Each part testable in isolation.
</details>

<details><summary>Scenario: A 3 000-line `OrderService` has grown over 4 years. Plan a refactor without stopping feature work.</summary>

Add characterization tests around current behaviour; identify responsibilities (validation, pricing, inventory, payment, notifications); extract classes one at a time behind interfaces (SRP), replace type switches with strategies (OCP), inject dependencies (DIP); keep the public API stable; ship small PRs behind tests; use ArchUnit rules to stop regressions. Measure success by change lead time and bug rate.
</details>
