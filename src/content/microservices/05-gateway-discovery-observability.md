---
title: API Gateway, Service Discovery, Config & Distributed Observability
level: 4
tags: api gateway, service discovery, spring cloud, observability
---
<!-- deepened -->

## Start here: the basics

### API Gateway — the front door
Clients (web, mobile) shouldn't know about 30 internal services. An **API Gateway** is a single entry point that routes `/api/orders/**` to the order service, `/api/users/**` to the user service, and handles common concerns once: authentication, rate limiting, TLS, logging.

### Service discovery — finding each other
Service instances start and stop constantly (autoscaling, deploys), so their IP addresses change. **Service discovery** keeps a live registry of "which instances of `order-service` are healthy and where". On Kubernetes this is built in: calling `http://order-service` resolves to healthy pods automatically.

### Centralised configuration
Instead of baking settings into each jar, services read config (URLs, feature flags, timeouts) from environment variables, ConfigMaps or a config server — change it without rebuilding.

### Observability — understanding a distributed system
When a request fails after passing through 6 services, you need to know **where** and **why**:
- **Logs** with a shared **trace ID** so you can search all logs for one request.
- **Metrics** dashboards: requests/sec, errors, latency per service.
- **Distributed tracing**: a timeline showing each service hop and its duration.

```
Trace 7f3a…  total 820 ms
 ├─ gateway            12 ms
 ├─ order-service      80 ms
 │   ├─ inventory      40 ms
 │   └─ payment       650 ms   ← here's the problem
 └─ notification       10 ms (async)
```

---

## API Gateway

A single entry point in front of services. Responsibilities:
- **Routing** (`/orders/**` → order-service), path rewriting, versioning
- **Cross-cutting edge concerns**: TLS termination, authentication (validate JWT once), rate limiting, CORS, request size limits, WAF
- **Aggregation / BFF**: compose multiple service calls for a client
- Observability: access logs, trace start, metrics
- Canary/traffic splitting, caching, protocol translation (REST → gRPC)

Options: **Spring Cloud Gateway** (reactive, Netty; Java filters), Kong, NGINX, Envoy, AWS API Gateway, Apigee.

```yaml
spring:
  cloud:
    gateway:
      routes:
        - id: orders
          uri: lb://order-service            # client-side load balancing via discovery
          predicates: [ Path=/api/orders/** ]
          filters:
            - StripPrefix=1
            - name: RequestRateLimiter       # Redis token bucket
              args: { redis-rate-limiter.replenishRate: 50, redis-rate-limiter.burstCapacity: 100, key-resolver: "#{@userKeyResolver}" }
            - name: CircuitBreaker
              args: { name: orders, fallbackUri: forward:/fallback/orders }
```

**Backend for Frontend (BFF)**: one gateway per client type (web, mobile, partner) tailored to its needs, owned by the frontend team. Avoids a bloated one-size-fits-all gateway.

**Anti-pattern**: putting business logic in the gateway → it becomes a new monolith and a deployment bottleneck.

## Service discovery

Instances come and go (autoscaling, deploys). Clients need current addresses.

| Pattern | How | Examples |
|---|---|---|
| **Client-side discovery** | Client queries a registry and load-balances itself | Eureka + Spring Cloud LoadBalancer |
| **Server-side discovery** | Client calls a stable address; LB/proxy routes | **Kubernetes Service** (kube-proxy/iptables/IPVS, DNS `order-service.prod.svc.cluster.local`), AWS ALB |
| Service mesh | Sidecar knows endpoints (xDS) | Istio, Linkerd, Consul Connect |

On Kubernetes, you usually **don't need Eureka**: K8s DNS + Services do discovery; readiness probes control membership. Know Eureka anyway (legacy Spring Cloud stacks, AP registry with self-preservation mode, client caching).

## Centralised configuration

- Spring Cloud Config Server (git-backed), Consul KV, AWS AppConfig/Parameter Store, **K8s ConfigMaps & Secrets** (mounted as files or env).
- Dynamic refresh: `@RefreshScope` + `/actuator/refresh` / Spring Cloud Bus, or K8s config reload (Spring Cloud Kubernetes / Reloader restarting pods).
- Secrets: Vault (dynamic DB credentials with leases), AWS Secrets Manager, External Secrets Operator, sealed secrets. K8s Secrets are only base64 — enable encryption at rest + RBAC.
- **Feature flags** (LaunchDarkly, Unleash, OpenFeature): decouple deploy from release.

## Observability across services

### Correlation
Generate/propagate a **trace id** at the edge (W3C `traceparent`); every log line includes it (MDC); every span reports to a tracing backend. Kafka messages carry trace headers so async hops join the trace.

### The stack
```
Apps (Micrometer + OpenTelemetry SDK/agent)
   ├─ metrics ──► Prometheus ──► Grafana dashboards, Alertmanager → PagerDuty
   ├─ traces  ──► OTel Collector ──► Tempo / Jaeger / Zipkin
   └─ logs    ──► Fluent Bit ──► Loki / Elasticsearch (ELK) / OpenSearch
```
**OpenTelemetry** is the vendor-neutral standard (API + SDK + collector + OTLP protocol) — say "OTel" in interviews.

### What to dashboard per service
- RED: request rate, error rate (by status/route), duration p50/p95/p99
- Saturation: CPU (and **throttling**), memory, GC pause, thread pools, DB connection pool active/pending, Kafka consumer lag
- Business KPIs: orders/min, payment success rate — often the first to show an incident

### Alerting philosophy
Alert on **symptoms users feel** (SLO burn rate, error rate, latency), not causes (CPU 80%). Every alert must be actionable with a runbook. Page for urgent, ticket for the rest.

### Incident response (behavioral + technical)
Detect → triage (scope, severity) → **mitigate first** (rollback, feature flag off, scale, failover) → communicate (status page) → resolve → **blameless postmortem** (timeline, root cause(s), contributing factors, action items with owners). Have one story ready about an incident you handled.

## Deployment & versioning concerns across services
- **Backward-compatible APIs & events** (tolerant reader: ignore unknown fields; never remove/rename without a deprecation cycle).
- **Expand/contract** for DB schema and API changes (see CI/CD → Deployment strategies).
- **Consumer-driven contract tests** (Pact) in CI to prevent breaking consumers.
- Independent pipelines per service; trunk-based development; feature flags.

## Quick check questions

<details><summary>1. Do you need Eureka on Kubernetes?</summary>

Usually not. Kubernetes Services provide stable virtual IPs/DNS names and load-balance across ready pods; readiness probes manage membership. Eureka adds value mainly outside K8s or in hybrid setups. A service mesh adds smarter L7 balancing if needed.
</details>

<details><summary>2. What belongs in the gateway vs in services?</summary>

Gateway: edge concerns — TLS, coarse authN (token validation), rate limiting, routing, request validation limits, CORS, observability. Services: authorization decisions on their resources (fine-grained), business logic, data validation. Never trust the gateway alone for authorization (zero trust; internal calls can bypass it).
</details>

<details><summary>3. How do you trace a request across an HTTP call and a Kafka message?</summary>

Propagate W3C trace context: HTTP via `traceparent` header (auto-instrumented clients), Kafka via record headers (Spring Kafka observation / OTel instrumentation). The consumer continues the trace (or links a new trace to it via span links for fan-out). Logs carry traceId via MDC so you can pivot from trace to logs.
</details>

<details><summary>4. Your p99 latency doubled after a deploy but averages look fine. How do you find the cause?</summary>

Compare before/after by version label in metrics; use traces filtered to slow requests (tail sampling helps) to see which span grew; check dependency latency, GC/CPU throttling, connection pool waits; diff the deploy (new query, N+1, logging, serialization); continuous profiler diff. Roll back first if SLOs are burning.
</details>

## Questions asked at top companies

<details><summary>What is an API gateway and what responsibilities does it have? <em>· Walmart, Paytm, Infosys, Amazon</em></summary>

Single entry point: routing, TLS termination, authentication, rate limiting, request/response transformation, aggregation, CORS, logging/metrics, canary routing. Avoid business logic in it.
</details>

<details><summary>API Gateway vs Load Balancer vs Service Mesh. <em>· Uber, Microsoft</em></summary>

LB distributes traffic among instances (L4/L7). Gateway is an L7 edge entry with API-management features. Service mesh handles service-to-service traffic inside the cluster (mTLS, retries, telemetry) via sidecars.
</details>

<details><summary>Client-side vs server-side service discovery. <em>· Walmart, Accenture</em></summary>

Client-side: client queries registry (Eureka) and balances itself. Server-side: client calls a stable endpoint (K8s Service/LB) that routes to instances.
</details>

<details><summary>What is the BFF pattern? <em>· Swiggy, Myntra, Atlassian</em></summary>

Backend for Frontend: a dedicated backend/gateway per client type (web, mobile) shaping APIs to that client's needs, owned by the frontend team.
</details>

<details><summary>How do you implement distributed tracing? <em>· Walmart, Flipkart, Uber</em></summary>

OpenTelemetry/Micrometer Tracing instruments HTTP clients/servers and Kafka; W3C traceparent headers propagate context; spans exported to Jaeger/Tempo/Zipkin; trace IDs in logs via MDC; sampling strategy.
</details>

<details><summary>How do you manage configuration and secrets across services? <em>· Infosys, Paytm</em></summary>

ConfigMaps/Config Server for config, Vault/Secrets Manager/External Secrets for secrets, injected as env/files, refresh mechanisms, never in git, least-privilege access, rotation.
</details>

<details><summary>What would you alert on for a microservice? <em>· Google, Amazon</em></summary>

User-facing symptoms: SLO burn rate on error rate and latency; saturation leading indicators (consumer lag, pool exhaustion, disk); avoid noisy cause-based alerts; every alert has a runbook.
</details>

<details><summary>What is a correlation ID? <em>· TCS Digital, Accenture</em></summary>

An ID generated at the edge and passed through every call/message and log line, letting you correlate all logs for one request (today usually the trace ID).
</details>

<details><summary>Eureka vs Kubernetes Service discovery? <em>· Walmart, Paytm</em></summary>

Eureka: client-side registry for Spring Cloud apps (AP, client caching). K8s: DNS + Services + readiness-based endpoints — usually sufficient on K8s, no extra registry needed.
</details>

<details><summary>How do you handle API versioning across many services? <em>· Atlassian, Thoughtworks</em></summary>

Backward-compatible changes by default (additive fields, tolerant readers), versioned endpoints/events for breaking changes, deprecation windows, consumer-driven contract tests in CI.
</details>

## End-to-end scenarios

<details><summary>Scenario: Users report intermittent 504 errors on checkout. You have 20 services. Find the cause.</summary>

504 = gateway timed out waiting for upstream. Filter traces for checkout requests with errors/high latency → identify which span exceeds the gateway timeout; correlate with that service's metrics (CPU throttling, pool waits, GC), logs by trace ID, recent deploys (version labels), and dependency health. Common culprits: slow DB query, connection pool exhaustion, retry storms. Mitigate (rollback/scale/circuit-break), then fix root cause; add alerting on that dependency's latency.
</details>

<details><summary>Scenario: Set up observability from scratch for a 10-service Spring Boot system on Kubernetes.</summary>

Micrometer + Prometheus (scrape `/actuator/prometheus`), Grafana dashboards per service (RED + JVM + pools + Kafka lag); OpenTelemetry Java agent or Micrometer Tracing → OTel Collector → Tempo/Jaeger; JSON structured logs with trace IDs → Fluent Bit → Loki/Elasticsearch; SLOs per user-facing API with burn-rate alerts via Alertmanager → PagerDuty/Slack; runbooks; on-call rotation.
</details>
