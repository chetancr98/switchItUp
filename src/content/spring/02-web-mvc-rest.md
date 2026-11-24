---
title: Spring MVC Request Lifecycle & Production-Grade REST APIs
level: 2
tags: spring mvc, rest, dispatcherservlet, validation
---
<!-- deepened -->

## Start here: the basics

### What happens when you open a URL?
Your browser (the **client**) sends an **HTTP request** to a **server**; the server sends back an **HTTP response**.

```
GET /api/products/42 HTTP/1.1          ← method + path
Host: shop.example.com
Accept: application/json               ← headers

HTTP/1.1 200 OK                        ← status code
Content-Type: application/json

{"id":42,"name":"Keyboard","price":1499}   ← body
```

### REST in one paragraph
REST is a style for designing web APIs around **resources** (nouns like `/products`, `/orders/7`) manipulated with standard **HTTP methods**:

| Method | Meaning | Example |
|---|---|---|
| GET | Read | `GET /products/42` |
| POST | Create | `POST /products` with JSON body |
| PUT | Replace | `PUT /products/42` |
| PATCH | Partially update | `PATCH /products/42 {"price": 1299}` |
| DELETE | Delete | `DELETE /products/42` |

Status code families: **2xx** success, **3xx** redirect, **4xx** client mistake (400 bad input, 401 not logged in, 403 not allowed, 404 not found), **5xx** server error.

### JSON
The common data format: objects `{}`, arrays `[]`, strings, numbers, booleans, null. Spring uses the **Jackson** library to convert Java objects ⇄ JSON automatically.

### A complete small REST controller
```java
public record ProductDto(Long id, String name, long pricePaise) {}
public record CreateProduct(@NotBlank String name, @Positive long pricePaise) {}

@RestController
@RequestMapping("/api/products")
public class ProductController {
    private final ProductService service;
    public ProductController(ProductService service) { this.service = service; }

    @GetMapping("/{id}")                         // GET /api/products/42
    public ProductDto get(@PathVariable Long id) { return service.get(id); }

    @GetMapping                                   // GET /api/products?q=key
    public List<ProductDto> search(@RequestParam(defaultValue = "") String q) { return service.search(q); }

    @PostMapping                                  // POST /api/products  {"name":"Mouse","pricePaise":49900}
    @ResponseStatus(HttpStatus.CREATED)
    public ProductDto create(@Valid @RequestBody CreateProduct body) { return service.create(body); }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long id) { service.delete(id); }
}
```
- `@PathVariable` reads `{id}` from the path; `@RequestParam` reads `?q=`; `@RequestBody` reads JSON body.
- `@Valid` triggers validation annotations (`@NotBlank`, `@Positive`); failures become 400.

### Layered architecture (what interviewers expect you to follow)
```
Controller  → handles HTTP only (parse input, return status)
Service     → business rules, transactions
Repository  → database access
DTOs        → shapes of data entering/leaving the API (never expose entities directly)
```

---

## The request lifecycle (draw this on the whiteboard)

```
Client
  │ HTTP
  ▼
Tomcat connector (NIO) → thread from Tomcat pool (default max 200) — or a virtual thread
  │
  ▼
Servlet Filter chain  (CharacterEncoding, CORS, Spring Security's DelegatingFilterProxy → FilterChainProxy,
  │                    request logging, tracing)              — Servlet level, sees raw request
  ▼
DispatcherServlet  (Front Controller)
  ├─ HandlerMapping           → finds handler (RequestMappingHandlerMapping matches @RequestMapping)
  ├─ HandlerInterceptor.preHandle()        — Spring level, knows the handler method
  ├─ HandlerAdapter           → invokes method:
  │     ├─ HandlerMethodArgumentResolvers  (@PathVariable, @RequestParam, @RequestBody via HttpMessageConverter/Jackson,
  │     │                                   @Valid → Bean Validation)
  │     ├─ your @Controller method
  │     └─ HandlerMethodReturnValueHandlers (@ResponseBody → HttpMessageConverter → JSON)
  ├─ HandlerInterceptor.postHandle()
  ├─ exception? → HandlerExceptionResolvers (@ExceptionHandler / @ControllerAdvice, ResponseStatus, defaults)
  └─ HandlerInterceptor.afterCompletion()
  ▼
Response back through filters
```

**Filter vs Interceptor vs AOP:**

| | Filter | HandlerInterceptor | AOP aspect |
|---|---|---|---|
| Level | Servlet container | Spring MVC | Any Spring bean |
| Knows handler method? | No | Yes | Yes (join point) |
| Can wrap request/response body? | Yes | No | No |
| Typical use | Security, CORS, compression, MDC/tracing | Auth checks per controller, locale, timing | Transactions, caching, metrics on services |

## Designing REST APIs that pass a senior review

### Resource modelling & verbs
```
GET    /v1/orders?status=PAID&page=0&size=20&sort=createdAt,desc
GET    /v1/orders/{id}
POST   /v1/orders                       → 201 Created + Location: /v1/orders/{id}
PUT    /v1/orders/{id}                  → full replace (idempotent)
PATCH  /v1/orders/{id}                  → partial (JSON Merge Patch / JSON Patch)
DELETE /v1/orders/{id}                  → 204 (idempotent; second call 204 or 404 — be consistent)
POST   /v1/orders/{id}/cancel           → actions that aren't CRUD: sub-resource verb is acceptable
```

| Method | Safe | Idempotent |
|---|---|---|
| GET, HEAD, OPTIONS | ✅ | ✅ |
| PUT, DELETE | ❌ | ✅ |
| POST | ❌ | ❌ (make it idempotent with an `Idempotency-Key` header) |
| PATCH | ❌ | Not necessarily |

### Status codes you must use precisely
`200` OK · `201` Created · `202` Accepted (async) · `204` No Content · `400` malformed/validation · `401` unauthenticated · `403` authenticated but forbidden · `404` · `409` conflict (duplicate, version mismatch) · `412` precondition failed (If-Match) · `422` semantic validation · `429` rate limited (+ `Retry-After`) · `500` · `502/503/504` upstream/unavailable/timeout.

### Controller — the right shape

```java
@RestController
@RequestMapping("/v1/orders")
@RequiredArgsConstructor
class OrderController {
    private final OrderService service;

    @PostMapping
    ResponseEntity<OrderResponse> create(@Valid @RequestBody CreateOrderRequest req,
                                         @RequestHeader("Idempotency-Key") String idemKey,
                                         UriComponentsBuilder uri) {
        OrderResponse created = service.create(req, idemKey);
        return ResponseEntity.created(uri.path("/v1/orders/{id}").build(created.id())).body(created);
    }

    @GetMapping("/{id}")
    OrderResponse get(@PathVariable UUID id) { return service.get(id); }

    @GetMapping
    Page<OrderSummary> list(@RequestParam(required = false) OrderStatus status,
                            @PageableDefault(size = 20, sort = "createdAt", direction = DESC) Pageable pageable) {
        return service.list(status, pageable);
    }
}

record CreateOrderRequest(
    @NotNull UUID customerId,
    @NotEmpty List<@Valid Line> lines,
    @Size(max = 500) String note) {
    record Line(@NotBlank String sku, @Positive int qty) {}
}
```

Rules:
- **Never expose JPA entities** — DTOs (records) in, DTOs out. Entities leak lazy-loading exceptions, internal fields, cause over-posting vulnerabilities (mass assignment), and couple your API to your schema.
- Controllers are thin: map HTTP ↔ service call. No business logic, no `@Transactional`.
- **Pagination**: offset (`page/size`) is simple but slow for deep pages (`OFFSET 100000` scans) and unstable under inserts. **Keyset/cursor** pagination (`WHERE (created_at, id) < (:c, :id) ORDER BY ... LIMIT 20`) scales — FAANG interviewers expect you to know this.

### Global error handling — RFC 9457 Problem Details

```java
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ProblemDetail onValidation(MethodArgumentNotValidException ex) {
        ProblemDetail pd = ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, "Validation failed");
        pd.setProperty("errors", ex.getBindingResult().getFieldErrors().stream()
            .map(fe -> Map.of("field", fe.getField(), "message", fe.getDefaultMessage())).toList());
        return pd;
    }

    @ExceptionHandler(OrderNotFoundException.class)
    ProblemDetail onNotFound(OrderNotFoundException ex) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    @ExceptionHandler(ObjectOptimisticLockingFailureException.class)
    ProblemDetail onConflict() { return ProblemDetail.forStatus(HttpStatus.CONFLICT); }
}
```
Enable built-in support: `spring.mvc.problemdetails.enabled=true`. Never leak stack traces.

### Validation deep-dive
- `@Valid` on `@RequestBody` → `MethodArgumentNotValidException`; on `@PathVariable/@RequestParam` with `@Validated` on the class → `ConstraintViolationException` (Spring 6.1 adds built-in method validation → `HandlerMethodValidationException`).
- Groups (`OnCreate`, `OnUpdate`), custom constraints (`@ConstraintValidator`), cross-field validation at class level.

### Idempotency key implementation
1. Client sends `Idempotency-Key: <uuid>` on POST.
2. Server: `INSERT INTO idempotency(key, request_hash, status) ...` with a unique constraint.
3. If it already exists and completed → return the stored response. If in progress → `409`. If request hash differs → `422`.
4. Store response with TTL (24 h). This is how Stripe/Razorpay do it.

### Versioning
URI (`/v1/`) — most common, explicit, cache-friendly. Header (`Accept: application/vnd.acme.v2+json`) — purer, harder to test. Spring Framework 7 / Boot 4 add first-class API versioning support. Rule: additive changes don't need a new version; removing/renaming fields does.

### HTTP caching & concurrency control
- `ETag` + `If-None-Match` → `304 Not Modified` (Spring `ShallowEtagHeaderFilter` or compute from `@Version`).
- **Optimistic concurrency over HTTP**: return `ETag: "v7"`; client sends `If-Match: "v7"` on PUT; mismatch → `412`. Prevents lost updates between two editors.

## Calling other services

| Client | Status |
|---|---|
| `RestTemplate` | Maintenance mode, blocking |
| `WebClient` | Reactive, non-blocking; usable from MVC |
| **`RestClient`** (Spring 6.1) | Modern fluent **blocking** client — use with virtual threads |
| **HTTP Interface** (`@HttpExchange`) | Declarative, like Feign, built-in |
| OpenFeign | Spring Cloud, declarative |

Always set **connect and read timeouts** (defaults are infinite in many clients!), pool connections, and wrap with resilience (see Microservices → Resilience).

## MVC vs WebFlux

| | Spring MVC | Spring WebFlux |
|---|---|---|
| Model | Thread-per-request, blocking | Event loop (Netty), non-blocking, Reactor `Mono/Flux` |
| Scales by | More threads (now virtual threads!) | Few threads, async I/O |
| Ecosystem | JDBC/JPA, everything | Needs R2DBC, reactive drivers end-to-end |
| Debuggability | Simple stack traces | Hard |
| When | Default — especially with Java 21 virtual threads | Streaming, very high concurrency gateways (Spring Cloud Gateway), back-pressure |

Senior answer: *"With virtual threads, MVC gives most of WebFlux's scalability for I/O-bound services while keeping imperative code. I'd pick WebFlux only for streaming or when the whole stack is reactive."*

## Quick check questions

<details><summary>1. Walk through what happens when a POST /orders with a JSON body hits a Spring Boot app.</summary>

Tomcat accepts, assigns a worker thread → filter chain (security authenticates the JWT, sets SecurityContext) → DispatcherServlet → RequestMappingHandlerMapping finds the method → interceptors preHandle → RequestResponseBodyMethodProcessor uses Jackson's MappingJackson2HttpMessageConverter to deserialize → @Valid triggers Hibernate Validator → controller → service (transactional proxy) → return value serialized by Jackson → postHandle/afterCompletion → filters → response. Exceptions are resolved via @ControllerAdvice.
</details>

<details><summary>2. 401 vs 403?</summary>

401: not authenticated (missing/invalid credentials) — "who are you?". Should include `WWW-Authenticate`. 403: authenticated but lacks permission — "I know who you are, and no." Some APIs return 404 instead of 403 to avoid leaking resource existence.
</details>

<details><summary>3. How do you make POST /payments safe to retry?</summary>

Idempotency key header persisted with a unique constraint; return the stored result for repeat keys; also make downstream effects idempotent (dedupe by key at the payment provider). Combine with client retries with exponential backoff + jitter.
</details>

<details><summary>4. Why is offset pagination a problem at scale and what's the alternative?</summary>

`OFFSET n` makes the DB read and discard n rows — O(n) per page — and results shift when rows are inserted/deleted between pages (duplicates/skips). Keyset (cursor) pagination uses an indexed `WHERE (sort_key, id) < (last_seen)` with `LIMIT`, giving O(log n) seeks and stable pages; trade-off: no random page jumps.
</details>

<details><summary>5. Where would you put request logging with a correlation ID?</summary>

A servlet Filter (`OncePerRequestFilter`) that reads/creates `X-Request-Id` (or uses the trace ID from Micrometer Tracing), puts it in MDC, adds it to the response header, and clears MDC in `finally`. Filter level so it covers security failures too.
</details>

## Questions asked at top companies

<details><summary>Explain the flow of a request in Spring MVC (DispatcherServlet). <em>· Amazon, Infosys, Walmart, Paytm</em></summary>

Filters → DispatcherServlet → HandlerMapping finds controller method → interceptors `preHandle` → HandlerAdapter resolves arguments (Jackson for `@RequestBody`, validation) and invokes the method → return value written by HttpMessageConverter → `postHandle`/`afterCompletion` → exceptions resolved by `@ControllerAdvice`.
</details>

<details><summary>@Controller vs @RestController? <em>· TCS, Wipro, Cognizant</em></summary>

`@RestController` = `@Controller` + `@ResponseBody` on every method: return values are serialized to the response body (JSON) rather than resolved as view names.
</details>

<details><summary>PUT vs PATCH vs POST; which are idempotent? <em>· Amazon, Microsoft, Razorpay</em></summary>

POST creates/acts (not idempotent). PUT replaces the whole resource (idempotent). PATCH partially updates (not necessarily idempotent). GET/DELETE/PUT are idempotent; GET is also safe.
</details>

<details><summary>How do you handle exceptions globally in Spring Boot? <em>· Paytm, Accenture, Swiggy</em></summary>

`@RestControllerAdvice` with `@ExceptionHandler` methods mapping exception types to `ProblemDetail`/`ResponseEntity` with proper status codes; one place for logging; no stack traces to clients.
</details>

<details><summary>@RequestParam vs @PathVariable vs @RequestBody? <em>· Infosys, HCL</em></summary>

PathVariable: identifies a resource in the URL path (`/orders/7`). RequestParam: query/filter options (`?status=PAID&page=2`). RequestBody: JSON payload for create/update.
</details>

<details><summary>How do you version a REST API? <em>· Atlassian, Walmart</em></summary>

URI (`/v1/`), header/media type, or query param. URI is most common. Only breaking changes need a new version; additive fields don't. Keep old versions for a deprecation window with `Deprecation`/`Sunset` headers.
</details>

<details><summary>How would you implement pagination and sorting? <em>· Flipkart, Myntra</em></summary>

Spring Data `Pageable` (`?page=0&size=20&sort=createdAt,desc`) returning `Page<T>`; for large/deep data use keyset (cursor) pagination with an indexed `WHERE (created_at, id) < (?, ?) LIMIT n`.
</details>

<details><summary>What is HATEOAS and does anyone use it? <em>· Thoughtworks, SAP Labs</em></summary>

Responses include links to related actions/resources, making the API discoverable. Spring HATEOAS supports it; rarely used fully in practice — most teams use OpenAPI docs instead.
</details>

<details><summary>Difference between Filter and Interceptor? <em>· Goldman Sachs, Infosys</em></summary>

Filter is a Servlet-level component (before DispatcherServlet, sees raw request/response, can wrap them). Interceptor is Spring MVC-level, knows the handler method, has pre/post/afterCompletion hooks. Security and CORS are filters.
</details>

<details><summary>How do you make an API idempotent for payments? <em>· Razorpay, PhonePe, Amazon Pay</em></summary>

Client-generated `Idempotency-Key`; server stores key + request hash + response with a unique constraint; duplicates return the saved response; in-progress duplicates get 409; pass the key to the payment provider too.
</details>

<details><summary>How do you document APIs? <em>· EPAM, Deloitte</em></summary>

OpenAPI via springdoc-openapi generating Swagger UI from controllers and annotations; generate client SDKs/TypeScript types from the spec; contract tests to keep docs truthful.
</details>

<details><summary>RestTemplate vs WebClient vs RestClient vs Feign? <em>· Walmart, Paytm</em></summary>

RestTemplate: blocking, maintenance mode. WebClient: reactive non-blocking. RestClient (6.1+): modern fluent blocking client. Feign/HTTP interfaces: declarative interfaces. Always configure timeouts and connection pools.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design the REST API for a food-ordering app's cart and checkout.</summary>

`GET /v1/carts/me`, `POST /v1/carts/me/items {menuItemId, qty}`, `PATCH /v1/carts/me/items/{itemId} {qty}`, `DELETE /v1/carts/me/items/{itemId}`, `POST /v1/orders` with `Idempotency-Key` (creates order from cart, returns 201 + Location), `GET /v1/orders/{id}`, `GET /v1/orders?status=&cursor=`, `POST /v1/orders/{id}/cancel`. DTOs with validation; 409 when restaurant closed or item unavailable; 422 for business rule failures; ProblemDetail errors; auth via JWT; rate limits on order creation; ETag/If-Match on cart to avoid lost updates from two devices.
</details>

<details><summary>Scenario: An endpoint returning a user's orders is slow (3 s) and returns huge JSON. Fix it end to end.</summary>

Profile: likely N+1 lazy loading during JSON serialization of entities (OSIV) and unbounded results. Fixes: return DTO projections with only needed fields; paginate (cursor); fetch join/EntityGraph for needed associations; disable OSIV; add index on `(user_id, created_at)`; compress responses (gzip); cache summary data if read-heavy. Verify with query count assertions and p95 latency.
</details>
