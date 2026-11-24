---
title: IoC Container, Bean Lifecycle & Auto-Configuration Internals
level: 2
tags: spring, ioc, beans, autoconfiguration
---
<!-- deepened -->

## Start here: the basics

### The problem Spring solves
Imagine an `OrderService` that needs a repository, a payment client and an email sender. Without a framework:

```java
public class OrderService {
    private final OrderRepository repo = new JdbcOrderRepository(new DataSource("jdbc:..."));
    private final PaymentClient payments = new RazorpayClient("api-key");
    private final EmailSender email = new SmtpEmailSender("smtp.host");
}
```
Problems: `OrderService` knows how to build everything (tight coupling), you can't swap in a fake for tests, and config is hard-coded.

### Inversion of Control (IoC) and Dependency Injection (DI)
Flip it: the class only **declares** what it needs; someone else **provides** it.

```java
@Service
public class OrderService {
    private final OrderRepository repo;
    private final PaymentClient payments;
    public OrderService(OrderRepository repo, PaymentClient payments) {   // Spring passes these in
        this.repo = repo; this.payments = payments;
    }
}
```
The "someone else" is the **Spring container** (`ApplicationContext`). Objects it manages are called **beans**.

### How Spring finds beans
- **Annotations** on your classes: `@Component` (generic), `@Service` (business logic), `@Repository` (data access, adds exception translation), `@Controller`/`@RestController` (web).
- **@Configuration classes** with `@Bean` methods, for objects you can't annotate (third-party classes):
```java
@Configuration
class ClientsConfig {
    @Bean RestClient paymentsRestClient() { return RestClient.create("https://payments.example.com"); }
}
```
- **Component scanning** starts from the package of your `@SpringBootApplication` class and finds annotated classes in sub-packages.

### What Spring Boot adds on top
Plain Spring needs lots of configuration. **Spring Boot** adds:
1. **Starters** — one dependency pulls a tested set of libraries (`spring-boot-starter-web` = Spring MVC + Jackson + embedded Tomcat).
2. **Auto-configuration** — "you have Tomcat and Spring MVC on the classpath, so I'll set up a web server and DispatcherServlet for you" — unless you define your own.
3. **Embedded server** — run as a plain `java -jar app.jar`.
4. **Externalized config** — `application.yml`, environment variables, profiles.
5. **Actuator** — health checks and metrics.

### Your first Boot app
```java
@SpringBootApplication
public class ShopApplication {
    public static void main(String[] args) { SpringApplication.run(ShopApplication.class, args); }
}

@RestController
class HelloController {
    @GetMapping("/hello") String hello() { return "Hello"; }
}
```
```yaml
# application.yml
server.port: 8081
spring.application.name: shop
```

---

## What Spring actually is

A **container** that builds an object graph from **bean definitions**, then decorates those objects (proxies) at well-defined lifecycle hooks. Everything else (MVC, Data, Security) is built on those hooks.

## Startup sequence of a Spring Boot app

```
SpringApplication.run()
 ├─ create Environment (properties, profiles, env vars, command line)
 ├─ create ApplicationContext (AnnotationConfigServletWebServerApplicationContext)
 ├─ refresh()
 │   ├─ load BeanDefinitions  (component scan + @Configuration + auto-config imports)
 │   ├─ invoke BeanFactoryPostProcessors   ← modify DEFINITIONS (e.g. ConfigurationClassPostProcessor,
 │   │                                        PropertySourcesPlaceholderConfigurer)
 │   ├─ register BeanPostProcessors        ← will modify INSTANCES
 │   ├─ instantiate all non-lazy singletons ← lifecycle below, per bean
 │   ├─ start embedded web server (Tomcat/Jetty/Netty)
 │   └─ publish ContextRefreshedEvent
 ├─ run ApplicationRunner / CommandLineRunner beans
 └─ publish ApplicationReadyEvent  (readiness probe can go UP)
```

## Bean lifecycle (per bean)

1. **Instantiate** (constructor; constructor injection resolves dependencies first)
2. **Populate properties** (field/setter `@Autowired`, `@Value`)
3. **Aware callbacks** — `BeanNameAware`, `BeanFactoryAware`, `ApplicationContextAware`
4. `BeanPostProcessor.postProcessBeforeInitialization` (e.g. `@PostConstruct` is processed here by `CommonAnnotationBeanPostProcessor`)
5. **Init** — `@PostConstruct` → `InitializingBean.afterPropertiesSet()` → `@Bean(initMethod)`
6. `BeanPostProcessor.postProcessAfterInitialization` — **this is where AOP proxies are created** (`AbstractAutoProxyCreator`). The object stored in the container may be a *proxy*, not your instance.
7. Bean in use
8. On shutdown: `@PreDestroy` → `DisposableBean.destroy()` → `destroyMethod`

**Prototype** beans: Spring does **not** call destroy callbacks — you own their lifecycle.

## Scopes

| Scope | Lifetime |
|---|---|
| `singleton` (default) | One per container |
| `prototype` | New instance per injection/lookup |
| `request` / `session` / `application` | Per HTTP request / session / ServletContext |
| `websocket` | Per WebSocket session |

**Scoped bean injected into a singleton** — the singleton is created once, so it would hold one request-scoped instance forever. Fixes: `@Scope(value="request", proxyMode=ScopedProxyMode.TARGET_CLASS)` (inject a proxy that resolves the current request's instance per call), `ObjectProvider<T>`, or `@Lookup` method injection.

**Singletons are not thread-safe by magic.** One instance serves all requests concurrently → keep them **stateless** (no mutable instance fields holding request data).

## Dependency injection styles

```java
@Service
public class OrderService {
    private final OrderRepository repo;
    private final PaymentGateway gateway;

    // Constructor injection — preferred. Single constructor ⇒ @Autowired optional.
    public OrderService(OrderRepository repo, PaymentGateway gateway) {
        this.repo = repo; this.gateway = gateway;
    }
}
```

Why constructor injection: immutability (`final`), mandatory dependencies obvious, easy unit testing without Spring, fails fast, and **circular dependencies become an error** (good — they're a design smell). Spring Boot 2.6+ forbids circular references by default (`spring.main.allow-circular-references=false`).

Field injection can't be `final`, hides dependencies, requires reflection to test.

### Resolving multiple candidates
- `@Primary` — default winner.
- `@Qualifier("razorpay")` — explicit.
- Inject `List<PaymentGateway>` or `Map<String, PaymentGateway>` (bean name → bean) — the strategy-registry pattern.
- Matching by parameter name as last fallback.

## How circular dependencies used to "work" — three-level cache

For **setter/field** injection of singletons, `DefaultSingletonBeanRegistry` keeps:
1. `singletonObjects` — fully initialised beans
2. `earlySingletonObjects` — early references (instantiated, not yet populated)
3. `singletonFactories` — `ObjectFactory` that can produce an early reference (possibly an **early proxy** via `getEarlyBeanReference` so AOP still works)

A → needs B → B needs A → B gets A's early reference from level 3/2 → B completes → A completes. With **constructor injection** there's no early reference to hand out (A isn't even constructed) → `BeanCurrentlyInCreationException`. Interviewers love this.

## @Configuration vs @Component with @Bean methods

```java
@Configuration
class AppConfig {
    @Bean DataSource ds() { return new HikariDataSource(); }
    @Bean JdbcTemplate jdbc() { return new JdbcTemplate(ds()); }   // calls ds() — returns the SAME singleton
}
```
`@Configuration` classes are **CGLIB-subclassed**; calls to `@Bean` methods are intercepted and return the container's singleton. In `@Configuration(proxyBeanMethods = false)` ("lite mode") or a `@Component`, `ds()` is a plain Java call → **a second DataSource**. Boot's own auto-configs use `proxyBeanMethods=false` for startup speed and inject via parameters instead:
```java
@Bean JdbcTemplate jdbc(DataSource ds) { return new JdbcTemplate(ds); }
```

## Auto-configuration — the "magic" explained

1. `@SpringBootApplication` = `@SpringBootConfiguration` + `@ComponentScan` + **`@EnableAutoConfiguration`**.
2. `@EnableAutoConfiguration` imports `AutoConfigurationImportSelector`, which reads
   `META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports` from every jar on the classpath (Boot 2.7+; previously `spring.factories`).
3. ~150 candidate `@AutoConfiguration` classes are filtered by **conditions**:

| Condition | Meaning |
|---|---|
| `@ConditionalOnClass(DataSource.class)` | Only if that class is on the classpath (starter present) |
| `@ConditionalOnMissingBean` | Only if *you* haven't defined one → **your beans always win** |
| `@ConditionalOnProperty("feature.x.enabled")` | Feature flags |
| `@ConditionalOnBean`, `@ConditionalOnWebApplication`, `@ConditionalOnResource`, `@ConditionalOnCloudPlatform` | … |

4. Auto-configs are processed **after** user configuration (deferred import) so `@ConditionalOnMissingBean` sees your beans.

**Debugging:** run with `--debug` or `debug=true` → **Conditions Evaluation Report** (positive/negative matches and why). Actuator: `/actuator/conditions`.

### Write your own starter (asked at senior level)
```java
@AutoConfiguration
@ConditionalOnClass(AuditClient.class)
@EnableConfigurationProperties(AuditProperties.class)
public class AuditAutoConfiguration {
    @Bean @ConditionalOnMissingBean
    AuditClient auditClient(AuditProperties props) { return new AuditClient(props.getUrl()); }
}
```
```
# src/main/resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
com.acme.audit.AuditAutoConfiguration
```
Naming: `acme-audit-spring-boot-starter` (third-party), `spring-boot-starter-*` is reserved.

## Externalized configuration & precedence

Highest wins (abridged): command-line args → `SPRING_APPLICATION_JSON` → OS env vars → `application-{profile}.yml` outside jar → inside jar → `application.yml` outside jar → inside jar → `@PropertySource` → defaults.

Relaxed binding: `spring.datasource.url` ← `SPRING_DATASOURCE_URL`.

Prefer type-safe **`@ConfigurationProperties`** (validated with `@Validated`, immutable via records + constructor binding) over scattered `@Value`:

```java
@ConfigurationProperties(prefix = "payment")
@Validated
public record PaymentProperties(@NotBlank String apiKey, @DurationUnit(ChronoUnit.MILLIS) Duration timeout, int retries) {}
```

Profiles: `spring.profiles.active=prod`, `@Profile("!test")`, profile groups. Secrets: never in yml → env vars from Vault/K8s Secrets/AWS Secrets Manager (Spring Cloud Vault, `spring.config.import=vault://`).

## Events

```java
@TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
public void onOrderPlaced(OrderPlacedEvent e) { emailService.sendConfirmation(e.orderId()); }
```
Default `@EventListener` is **synchronous**, same thread, same transaction. Add `@Async` for async (with its own pool).

## Startup performance
Lazy init (`spring.main.lazy-initialization=true` — moves errors to runtime), trim starters, `spring-context-indexer` (deprecated), AOT processing + **GraalVM native image** (Spring Boot 3), **CRaC**, **CDS** support (`-XX:SharedArchiveFile`, Boot 3.3 extracts for CDS).

## Quick check questions

<details><summary>1. What's the difference between BeanFactoryPostProcessor and BeanPostProcessor?</summary>

BFPP runs once, before any bean is instantiated, and modifies **bean definitions** (metadata) — e.g. resolving `${}` placeholders, registering `@Configuration` beans. BPP runs for **every bean instance** around initialization and can modify or replace the instance — e.g. creating AOP proxies, processing `@Autowired`, `@PostConstruct`.
</details>

<details><summary>2. How does Spring Boot decide to create a DataSource for you?</summary>

`DataSourceAutoConfiguration` is listed in AutoConfiguration.imports; it's conditional on `DataSource` & embedded DB/JDBC classes being on the classpath and on no user-defined `DataSource` bean (`@ConditionalOnMissingBean`). It binds `spring.datasource.*` into `DataSourceProperties` and creates HikariCP (first pooled impl found on the classpath).
</details>

<details><summary>3. Why might a @PostConstruct method see a non-proxied `this`?</summary>

`@PostConstruct` runs in `postProcessBeforeInitialization`; the AOP proxy is created later in `postProcessAfterInitialization`. Calling a `@Transactional` method on `this` inside `@PostConstruct` runs with no transaction. Use `ApplicationReadyEvent` / `SmartInitializingSingleton` or call through the injected proxy.
</details>

<details><summary>4. Can you inject a prototype bean into a singleton and get a new one each time?</summary>

Not by plain injection — it's resolved once. Use `ObjectProvider<T>.getObject()`, `@Lookup` method injection, a scoped proxy, or `ApplicationContext.getBean` (service-locator smell).
</details>

<details><summary>5. Two beans of the same type exist and the app fails to start. What are your options?</summary>

`@Primary` on one, `@Qualifier` at injection points, inject all as `List`/`Map`, name the parameter after the bean, or make one conditional (`@ConditionalOnProperty`, `@Profile`).
</details>

<details><summary>6. Why are Boot's auto-configurations `proxyBeanMethods = false`?</summary>

Avoids CGLIB subclassing of configuration classes → faster startup, less memory, and compatible with GraalVM native images. Inter-bean dependencies are expressed via method parameters instead of method calls.
</details>

## Questions asked at top companies

<details><summary>What is IoC and DI? Types of injection and which is preferred? <em>· Every Spring interview: Infosys, Paytm, Amazon, Walmart</em></summary>

IoC hands object creation/wiring to the container; DI supplies dependencies from outside. Types: constructor, setter, field. Prefer constructor injection: immutable `final` fields, mandatory deps explicit, easy unit tests, circular deps fail fast.
</details>

<details><summary>Difference between @Component, @Service, @Repository and @Controller. <em>· TCS, Cognizant, Accenture, Paytm</em></summary>

All are stereotypes detected by component scanning. `@Repository` additionally translates persistence exceptions into Spring's `DataAccessException`. `@Controller` marks web handlers (with `@RestController` = `@Controller + @ResponseBody`). `@Service` is semantic (no extra behaviour) — documents the layer and allows targeted pointcuts.
</details>

<details><summary>What does @SpringBootApplication do? <em>· Infosys, Capgemini, Walmart</em></summary>

Combines `@SpringBootConfiguration` (a `@Configuration`), `@EnableAutoConfiguration` (load auto-configs conditionally) and `@ComponentScan` (scan this package and below).
</details>

<details><summary>How does auto-configuration work internally? <em>· Amazon, Goldman Sachs, Atlassian</em></summary>

`AutoConfigurationImportSelector` reads `META-INF/spring/...AutoConfiguration.imports` from all jars; each auto-config class is guarded by `@Conditional*` annotations (`OnClass`, `OnMissingBean`, `OnProperty`). They are processed after user configs, so your beans win. Debug with `--debug` (conditions report).
</details>

<details><summary>Explain bean scopes. Is a singleton bean thread-safe? <em>· Flipkart, Morgan Stanley</em></summary>

singleton, prototype, request, session, application, websocket. Singleton isn't automatically thread-safe — one instance serves concurrent requests, so keep beans stateless or protect shared mutable state.
</details>

<details><summary>Explain the Spring bean lifecycle. <em>· Oracle, Walmart, SAP Labs</em></summary>

Instantiate → inject dependencies → Aware callbacks → BeanPostProcessor before-init → `@PostConstruct` / `afterPropertiesSet` / init-method → BeanPostProcessor after-init (proxies created) → ready → on shutdown `@PreDestroy` / `destroy`.
</details>

<details><summary>How do you resolve "expected single matching bean but found 2"? <em>· Paytm, Infosys</em></summary>

`@Primary`, `@Qualifier("name")`, inject a `List`/`Map` of all implementations, conditional/profile-based beans, or match by parameter name.
</details>

<details><summary>How do profiles work? <em>· Accenture, Deloitte, Swiggy</em></summary>

`application-{profile}.yml` and `@Profile` beans are activated by `spring.profiles.active` (env var `SPRING_PROFILES_ACTIVE`). Used for env-specific config (dev/test/prod). Secrets should still come from env/vault, not profile files.
</details>

<details><summary>@Value vs @ConfigurationProperties? <em>· Goldman Sachs, Thoughtworks</em></summary>

`@Value` injects single properties with SpEL; scattered and untyped. `@ConfigurationProperties` binds a prefix into a typed (immutable record) object with validation, relaxed binding and IDE metadata — preferred for groups of settings.
</details>

<details><summary>How does Spring handle circular dependencies? <em>· Amazon, PhonePe</em></summary>

For field/setter-injected singletons, an early reference from the three-level cache breaks the cycle. Constructor injection cycles fail (`BeanCurrentlyInCreationException`). Boot 2.6+ disallows cycles by default; fix the design (extract a third bean, events, or `@Lazy` as last resort).
</details>

<details><summary>How would you create a custom Spring Boot starter? <em>· Atlassian, Razorpay</em></summary>

Separate module with an `@AutoConfiguration` class using conditional annotations and `@EnableConfigurationProperties`, registered in `AutoConfiguration.imports`; a starter pom bringing the dependencies; `@ConditionalOnMissingBean` so users can override.
</details>

<details><summary>What is the difference between BeanFactory and ApplicationContext? <em>· TCS, Oracle</em></summary>

BeanFactory is the basic lazy container. ApplicationContext extends it with eager singleton init, events, i18n, resource loading, environment/profiles, and automatic BeanPostProcessor registration — what you always use.
</details>

## End-to-end scenarios

<details><summary>Scenario: Your service must call either Razorpay or Stripe depending on the country, chosen per request, and you must be able to add PayPal later without touching existing code.</summary>

Define `PaymentGateway { String provider(); boolean supports(Country c); PaymentResult charge(...) }`. Each provider is a `@Component`. A `PaymentRouter` gets `List<PaymentGateway>` injected and picks the first that supports the country (or a config map country → provider via `@ConfigurationProperties`). Provider credentials in typed properties per provider. Adding PayPal = new class + config. Unit-test the router with fakes; integration-test each adapter with WireMock.
</details>

<details><summary>Scenario: The app takes 45 seconds to start in Kubernetes and gets killed by liveness probes. What do you investigate?</summary>

Use `--debug`/startup actuator endpoint (`/actuator/startup` with `BufferingApplicationStartup`) to find slow beans; common culprits: eager DB/HTTP calls in `@PostConstruct`, Hibernate schema validation on huge schemas, component scanning too broad, many auto-configs. Fixes: add a startupProbe with enough budget, lazy-init selected beans, move warm-up work after ApplicationReady, exclude unused auto-configs, enable CDS / AOT, give more CPU at startup.
</details>
