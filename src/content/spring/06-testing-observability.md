---
title: Testing Strategy & Production Readiness — Actuator, Micrometer, Tracing
level: 4
tags: testing, testcontainers, actuator, observability
---
<!-- deepened -->

## Start here: the basics

### Why write tests?
Tests are code that checks your code. They let you change things without fear: if you break something, a test fails before your users notice.

### Kinds of tests
| Type | Tests | Speed | Example |
|---|---|---|---|
| **Unit** | One class, dependencies faked | ms | Does `PriceCalculator` apply GST correctly? |
| **Integration** | Several real parts together (DB, Spring context) | seconds | Does saving an order really write the right rows? |
| **End-to-end** | Whole system like a user | minutes | Can a user sign up, add to cart and pay? |

### Your first JUnit 5 test
```java
class PriceCalculatorTest {
    private final PriceCalculator calc = new PriceCalculator();

    @Test
    void addsEighteenPercentGst() {
        long total = calc.withGst(10_000);   // paise
        assertEquals(11_800, total);
    }

    @Test
    void rejectsNegativeAmounts() {
        assertThrows(IllegalArgumentException.class, () -> calc.withGst(-1));
    }
}
```
Pattern every test should follow: **Arrange** (set up) → **Act** (call) → **Assert** (check).

### Mocks — fake dependencies
When `OrderService` calls a payment API, you don't want real payments in a unit test. A **mock** is a fake object you program:
```java
PaymentClient payments = mock(PaymentClient.class);
when(payments.charge(any())).thenReturn(PaymentResult.success("txn-1"));
OrderService service = new OrderService(repo, payments);
service.place(order);
verify(payments).charge(any());   // was it called?
```

### Observability — seeing inside a running app
Once your app is in production you can't attach a debugger. You rely on:
- **Logs** — text records of events ("order 42 placed").
- **Metrics** — numbers over time (requests/second, error %, latency).
- **Traces** — the path of one request across services, with timings.
Spring Boot **Actuator** exposes health (`/actuator/health`) and metrics (`/actuator/prometheus`) out of the box.

---

## The test pyramid for a Spring service

```
            ▲  few      E2E / contract tests (Pact, Spring Cloud Contract)
           ▲▲▲          Integration: @SpringBootTest + Testcontainers (real Postgres/Kafka/Redis)
         ▲▲▲▲▲          Slice tests: @WebMvcTest, @DataJpaTest, @JsonTest
      ▲▲▲▲▲▲▲▲▲  many   Unit tests: plain JUnit 5 + Mockito/AssertJ, no Spring context
```

### Unit tests — no Spring
```java
class PricingServiceTest {
    private final DiscountRepository repo = mock(DiscountRepository.class);
    private final PricingService service = new PricingService(repo, Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), UTC));

    @Test
    void appliesGoldDiscount() {
        when(repo.rateFor(GOLD)).thenReturn(new BigDecimal("0.20"));
        assertThat(service.price(cart(1000), GOLD)).isEqualByComparingTo("800");
    }
}
```
Constructor injection makes this trivial. Inject a `Clock` instead of calling `Instant.now()` — time becomes testable.

### Slice tests
```java
@WebMvcTest(OrderController.class)              // only MVC infra + this controller
class OrderControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrderService service;          // Spring 6.2+ (replaces @MockBean)

    @Test
    void returns400OnInvalidBody() throws Exception {
        mvc.perform(post("/v1/orders").contentType(APPLICATION_JSON).content("{\"lines\":[]}"))
           .andExpect(status().isBadRequest())
           .andExpect(jsonPath("$.errors[0].field").value("customerId"));
    }
}

@DataJpaTest                                    // JPA + repositories, rollback after each test
@AutoConfigureTestDatabase(replace = NONE)      // use Testcontainers DB, not H2
class OrderRepositoryTest { ... }
```

### Integration tests with Testcontainers
```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@Testcontainers
class CheckoutIT {
    @Container @ServiceConnection                     // Boot 3.1+: auto-wires spring.datasource.*
    static PostgreSQLContainer<?> pg = new PostgreSQLContainer<>("postgres:16-alpine");

    @Container @ServiceConnection
    static KafkaContainer kafka = new KafkaContainer(DockerImageName.parse("apache/kafka:3.8.0"));

    @Autowired TestRestTemplate http;

    @Test void placesOrderAndPublishesEvent() { ... }
}
```
**Why not H2?** Different SQL dialect, no `SKIP LOCKED`, different locking/isolation, JSONB missing — tests pass, prod fails. Testcontainers gives the real thing.

Speed: reuse containers across test classes (singleton container pattern / `testcontainers.reuse.enable`), and keep the **Spring context cache** warm — every distinct `@MockitoBean` combination or `@DirtiesContext` creates a new context (slow!).

### What good tests look like (seniors are judged on this)
- Test **behaviour**, not implementation. Don't verify every mock interaction.
- One reason to fail per test; descriptive names (`rejectsOrderWhenStockInsufficient`).
- Deterministic: inject clocks/random/ID generators; no `Thread.sleep` — use **Awaitility** for async.
- Contract tests between services catch breaking API changes before deploy.
- Mutation testing (PIT) reveals tests that execute code but assert nothing.
- Architecture tests (**ArchUnit**): "controllers must not access repositories".

## Production readiness checklist

| Area | What to have |
|---|---|
| Health | `/actuator/health/liveness` and `/readiness` wired to K8s probes |
| Metrics | Micrometer → Prometheus; RED metrics per endpoint; JVM, Hikari, Kafka consumer lag |
| Tracing | Micrometer Tracing (OpenTelemetry bridge) → Tempo/Jaeger/Zipkin; trace IDs in logs |
| Logs | Structured JSON (Boot 3.4 has built-in structured logging), MDC with traceId, no PII |
| Config | Externalised, secrets from a vault, validated at startup |
| Graceful shutdown | `server.shutdown=graceful`, `spring.lifecycle.timeout-per-shutdown-phase=30s` |
| Resilience | Timeouts on every outbound call, retries with backoff, circuit breakers, bulkheads |
| Security | Actuator endpoints not exposed publicly; dependency scanning; least privilege |
| Data | Flyway migrations, backward-compatible (expand/contract) |
| Docs | OpenAPI (springdoc) generated from code |

### Actuator
```yaml
management:
  endpoints.web.exposure.include: health,info,prometheus,metrics
  endpoint.health:
    probes.enabled: true          # /actuator/health/liveness, /readiness
    show-details: when-authorized
  server.port: 8081               # separate management port, not exposed via ingress
```

**Liveness vs readiness** (classic): liveness failing → K8s **restarts** the pod. Readiness failing → pod **removed from Service endpoints** (no traffic), not restarted. Never put downstream dependencies (DB) in **liveness** — a DB blip would restart your whole fleet. Put them in readiness (carefully) or nowhere.

### Micrometer
```java
@Component
class CheckoutMetrics {
    private final Counter failed;
    private final Timer checkoutTimer;
    CheckoutMetrics(MeterRegistry r) {
        failed = Counter.builder("checkout.failed").tag("reason", "payment").register(r);
        checkoutTimer = Timer.builder("checkout.duration").publishPercentileHistogram().register(r);
    }
}
```
- **Counter** (monotonic), **Gauge** (current value: queue size), **Timer** (count + total + histogram), **DistributionSummary** (sizes).
- **Cardinality** is the enemy: never tag with user ID / order ID / raw URL — it explodes Prometheus memory. Boot uses URI *templates* (`/orders/{id}`).
- Publish **histograms** and compute percentiles in Prometheus (`histogram_quantile`) — client-side percentiles can't be aggregated across instances.
- `@Observed` (Observation API) produces both a metric and a span.

### The three pillars + one
- **Metrics**: what is wrong (alerting). **Traces**: where (which hop). **Logs**: why (details). **Profiles** (continuous profiling: Pyroscope/JFR): which line of code.
- Methods: **RED** (Rate, Errors, Duration) for services; **USE** (Utilisation, Saturation, Errors) for resources; Google's **four golden signals** (latency, traffic, errors, saturation).
- **SLI / SLO / SLA / error budget**: SLI = measured (% requests < 300 ms), SLO = target (99.9% over 30 days), SLA = contract with penalty, error budget = 0.1% → spend it on releases; when exhausted, freeze features. Alert on **burn rate**, not on raw thresholds.

### Distributed tracing internals
W3C `traceparent: 00-<trace-id 16B>-<parent-span-id 8B>-<flags>` header propagated over HTTP/Kafka headers. Each service creates spans with the same trace ID. Sampling: head-based (decide at start, e.g. 10%) vs tail-based (collector keeps all error/slow traces). Spring Boot 3: `micrometer-tracing-bridge-otel` + exporter; `RestClient`/`WebClient`/`KafkaTemplate` are auto-instrumented if built from the Boot-provided builders.

## Quick check questions

<details><summary>1. Why not use H2 for repository tests?</summary>

Dialect and behaviour differences (locking, isolation, JSON types, sequences, `ON CONFLICT`, `SKIP LOCKED`, case sensitivity) mean green tests don't prove production behaviour. Testcontainers runs the real database in Docker at modest cost.
</details>

<details><summary>2. Your test suite takes 25 minutes. How do you speed it up?</summary>

Find what dominates: often many Spring contexts (vary in @MockitoBean sets / @DirtiesContext) → standardise test base classes so the context cache hits; replace @SpringBootTest with slices or plain unit tests; reuse Testcontainers; run tests in parallel (JUnit 5 parallel / Gradle forks); remove sleeps (Awaitility); split integration tests into a separate CI stage.
</details>

<details><summary>3. Liveness probe checks the database. What's the risk?</summary>

DB outage → all pods fail liveness → Kubernetes restarts them all in a loop → nothing can recover gracefully, startup storms hammer the DB when it returns. Liveness should only detect a wedged process (deadlock); dependencies belong in readiness — and even then, think about whether removing all pods from the LB is better than serving degraded responses.
</details>

<details><summary>4. How do you define an SLO for a checkout API?</summary>

Pick user-visible SLIs: availability (non-5xx / total) and latency (% under 500 ms) measured at the load balancer. E.g. 99.9% availability and 99% < 500 ms over 28 days. Error budget 0.1% ≈ 40 min/month. Alert on multi-window burn rates (e.g. 14× over 1h and 5m). Use the budget to decide release velocity.
</details>

## Questions asked at top companies

<details><summary>Unit vs integration vs E2E tests — what ratio and why? <em>· Thoughtworks, Atlassian, Amazon</em></summary>

Test pyramid: many fast unit tests, fewer integration tests (real DB via Testcontainers), very few E2E. Faster feedback and less flakiness at the bottom; integration tests catch wiring/SQL issues units can't.
</details>

<details><summary>@SpringBootTest vs @WebMvcTest vs @DataJpaTest? <em>· Paytm, Walmart, Infosys</em></summary>

SpringBootTest loads the full context (integration). WebMvcTest loads only MVC infra + specified controllers (mock services). DataJpaTest loads JPA/repositories with transactional rollback per test.
</details>

<details><summary>@Mock vs @MockBean / @MockitoBean vs @Spy? <em>· Infosys, Accenture</em></summary>

`@Mock` (Mockito): plain mock without Spring. `@MockitoBean` (formerly `@MockBean`): replaces a bean in the Spring context with a mock. `@Spy`: wraps a real object, partially stubbed.
</details>

<details><summary>How do you test code that calls external REST APIs? <em>· Swiggy, Razorpay</em></summary>

Unit: mock the client interface. Integration: WireMock/MockWebServer to simulate responses incl. timeouts and 5xx; contract tests (Pact/Spring Cloud Contract) to verify compatibility with the provider.
</details>

<details><summary>What is Testcontainers and why use it? <em>· Atlassian, Walmart</em></summary>

Library starting real dependencies (Postgres, Kafka, Redis) in Docker for tests — production-like behaviour instead of H2/embedded fakes.
</details>

<details><summary>What do liveness and readiness probes check? <em>· Flipkart, Amazon</em></summary>

Liveness: is the process healthy (restart if not). Readiness: can it serve traffic now (remove from load balancer if not). Don't include downstream dependencies in liveness.
</details>

<details><summary>What metrics would you monitor for a REST service? <em>· Uber, PhonePe, Google</em></summary>

RED: request rate, error rate, duration (p50/p95/p99) per endpoint; saturation: CPU, memory, GC, thread & DB pool usage, queue/consumer lag; business KPIs.
</details>

<details><summary>Logs vs metrics vs traces. <em>· Microsoft, Atlassian</em></summary>

Metrics: cheap aggregates for alerting/trends. Traces: request path & latency breakdown across services. Logs: detailed event context for root cause. Correlate them via trace IDs.
</details>

<details><summary>What is code coverage and is 100% a good target? <em>· Thoughtworks, EPAM</em></summary>

Percentage of lines/branches executed by tests. 100% isn't meaningful (tests can execute without asserting). Aim for high coverage of critical logic plus mutation testing to validate assertions.
</details>

<details><summary>What is an SLO and an error budget? <em>· Google, Microsoft</em></summary>

SLO: target for a user-facing SLI (99.9% of requests succeed under 300 ms over 30 days). Error budget: allowed failures (0.1%); spend it on releases, freeze when exhausted.
</details>

## End-to-end scenarios

<details><summary>Scenario: Write a test strategy for an order service that uses Postgres, Kafka and a payment API.</summary>

Unit tests for domain logic (pricing, state transitions) with no Spring. `@WebMvcTest` for validation & error mapping. `@DataJpaTest` + Testcontainers Postgres for custom queries and locking. Integration test with Testcontainers Kafka verifying outbox → event published. WireMock for payment API happy path, declines, timeouts, retries. Contract tests with consumers of the order event. A small E2E smoke test in staging after deploy. Run unit+slice tests on every PR (<5 min), integration on merge.
</details>

<details><summary>Scenario: Users report "sometimes checkout is slow" but dashboards look fine. How do you find it?</summary>

Averages hide tails: add percentile histograms per endpoint and per dependency; look at p99/p999 and break down by tenant/region/payment method. Use traces with tail-based sampling to inspect slow requests and see which span grows (DB lock waits, payment provider, GC). Correlate with logs via trace id. Add an SLO on checkout latency with burn-rate alerts so it's caught before users report it.
</details>
