---
title: Spring Security — Filter Chain, JWT, OAuth2/OIDC & Common Attacks
level: 3
tags: security, jwt, oauth2, oidc
---
<!-- deepened -->

## Start here: the basics

### Authentication vs authorization
- **Authentication (AuthN)** — *who are you?* (login with password, OTP, Google).
- **Authorization (AuthZ)** — *what are you allowed to do?* (only admins can delete products).

### Sessions vs tokens
**Session-based** (classic web apps): after login the server creates a session stored on the server and gives the browser a cookie `JSESSIONID=abc`. Each request sends the cookie; the server looks up the session.

**Token-based** (APIs, mobile, microservices): after login the server returns a signed **token** (usually a **JWT**). The client sends it in every request header:
```
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ1c2VyLTQyIn0.sig...
```
The server verifies the signature — no session lookup needed (stateless), which scales easily across many servers.

### What's inside a JWT?
Three Base64 parts: `header.payload.signature`.
```json
// payload ("claims")
{ "sub": "user-42", "roles": ["USER"], "exp": 1735689600 }
```
Anyone can **read** the payload (it's encoded, not encrypted). The **signature** proves the server created it and nobody changed it. So: never put passwords or secrets inside.

### Hashing passwords
Never store passwords as text, and never use fast hashes like MD5/SHA-256 alone. Use a **slow, salted** algorithm — **bcrypt** or **Argon2**:
```java
PasswordEncoder enc = new BCryptPasswordEncoder();
String stored = enc.encode("myPassw0rd");        // $2a$10$... (includes random salt)
enc.matches("myPassw0rd", stored);              // true
```

### Spring Security in one picture
Every request passes through a **chain of filters** before reaching your controller. One filter reads the token, verifies it and records "this is user-42 with role USER" in the `SecurityContext`. Another filter checks your rules:
```java
http.authorizeHttpRequests(a -> a
    .requestMatchers("/api/public/**").permitAll()
    .requestMatchers("/api/admin/**").hasRole("ADMIN")
    .anyRequest().authenticated());
```

### OAuth2 in plain English
"Log in with Google" = **OAuth2 + OpenID Connect**. Your app never sees the Google password: the user logs in at Google, Google sends your app a code, your app exchanges it for tokens that say who the user is.

---

## Architecture

```
Servlet container filters
  └─ DelegatingFilterProxy("springSecurityFilterChain")     ← bridges servlet world to a Spring bean
       └─ FilterChainProxy
            ├─ SecurityFilterChain #1  (matches /api/**)   ← first matching chain wins
            │    DisableEncodeUrlFilter
            │    SecurityContextHolderFilter      (load SecurityContext)
            │    HeaderWriterFilter               (HSTS, X-Content-Type-Options, frame options)
            │    CorsFilter
            │    CsrfFilter
            │    LogoutFilter
            │    BearerTokenAuthenticationFilter  (or UsernamePasswordAuthenticationFilter …)
            │    RequestCacheAwareFilter, SecurityContextHolderAwareRequestFilter
            │    AnonymousAuthenticationFilter
            │    ExceptionTranslationFilter       (AuthenticationException → 401 entry point,
            │                                      AccessDeniedException → 403 handler)
            │    AuthorizationFilter              (authorizeHttpRequests rules)
            └─ SecurityFilterChain #2  (matches /**)
```

### Authentication flow (components)
`Filter` extracts credentials → builds an unauthenticated `Authentication` → **`AuthenticationManager`** (`ProviderManager`) iterates **`AuthenticationProvider`s** (`DaoAuthenticationProvider` uses `UserDetailsService` + `PasswordEncoder`; `JwtAuthenticationProvider` uses a `JwtDecoder`) → authenticated `Authentication` with authorities → stored in **`SecurityContextHolder`** (ThreadLocal by default).

### Modern configuration (Spring Security 6)

```java
@Configuration
@EnableMethodSecurity            // enables @PreAuthorize
class SecurityConfig {

    @Bean
    SecurityFilterChain api(HttpSecurity http) throws Exception {
        return http
            .securityMatcher("/api/**")
            .csrf(csrf -> csrf.disable())                         // stateless bearer-token API (see CSRF below)
            .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
            .cors(Customizer.withDefaults())
            .authorizeHttpRequests(auth -> auth
                .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                .requestMatchers("/api/admin/**").hasRole("ADMIN")
                .anyRequest().authenticated())
            .oauth2ResourceServer(o -> o.jwt(jwt -> jwt.jwtAuthenticationConverter(rolesConverter())))
            .build();
    }

    @Bean PasswordEncoder passwordEncoder() { return PasswordEncoderFactories.createDelegatingPasswordEncoder(); } // bcrypt default
}

@Service
class OrderService {
    @PreAuthorize("hasRole('ADMIN') or #userId == authentication.name")
    public List<Order> ordersOf(String userId) { ... }
}
```

`hasRole('ADMIN')` checks authority `ROLE_ADMIN`; `hasAuthority('orders:read')` checks exactly. Use **authorities/scopes** for fine-grained permissions.

## JWT — the right mental model

`header.payload.signature`, each Base64URL. **Signed, not encrypted** — anyone can read the payload. Never put secrets/PII in it.

```json
{ "alg": "RS256", "kid": "2024-key-1" }
{ "sub": "user-42", "iss": "https://auth.acme.com", "aud": "orders-api",
  "exp": 1732460000, "iat": 1732459100, "scope": "orders:read orders:write", "roles": ["USER"] }
```

### Validation checklist (each one is an interview point)
1. **Signature** with the issuer's public key (fetched from **JWKS** endpoint, cached, rotated by `kid`).
2. **`alg` whitelisting** — reject `none`; prevent RS256→HS256 confusion attack (attacker signs with the public key as an HMAC secret).
3. `exp`, `nbf` (with small clock skew), `iss`, **`aud`** (a token minted for service A must not be accepted by service B).

### Symmetric (HS256) vs asymmetric (RS256/ES256)
HS256: one shared secret — every verifier can also **mint** tokens. In microservices use RS256/ES256: only the auth server holds the private key; services verify with the public key.

### Access + refresh tokens
- **Access token**: short-lived (5–15 min), sent as `Authorization: Bearer`.
- **Refresh token**: long-lived, stored server-side (hash in DB) → can be **revoked**; **rotate on every use** and detect reuse (reuse of an old refresh token ⇒ theft ⇒ revoke the whole family).
- **Revocation problem**: JWTs are valid until `exp`. Options: short expiry, a deny-list of `jti` in Redis (checked per request — reintroduces state), or token introspection (opaque tokens).

### Where to store tokens in the browser (asked in full-stack interviews)
| Storage | XSS | CSRF |
|---|---|---|
| `localStorage` | ❌ Readable by any injected script | ✅ Not sent automatically |
| `HttpOnly; Secure; SameSite` cookie | ✅ Not readable by JS | ⚠️ Sent automatically → need SameSite/CSRF token |
| In-memory + refresh cookie | ✅ Best SPA pattern | ✅ |

Current best practice: **BFF (Backend-for-Frontend)** — the SPA talks to its own backend with a session cookie; the BFF holds tokens and calls APIs. Spring Cloud Gateway / Spring Authorization Server support this.

## OAuth 2.0 & OpenID Connect

**OAuth 2.0 = delegated authorization** ("let this app access my photos"). **OIDC = authentication layer on top** (adds the **ID token** — a JWT about the user, plus `/userinfo`).

Roles: Resource Owner (user), Client (app), Authorization Server (Keycloak, Okta, Auth0, Cognito, Spring Authorization Server), Resource Server (your API).

### Authorization Code + PKCE (the one to know)
```
1. Client creates code_verifier (random), code_challenge = BASE64URL(SHA256(verifier))
2. Browser → /authorize?response_type=code&client_id=..&redirect_uri=..&scope=openid profile
            &state=<csrf>&code_challenge=..&code_challenge_method=S256
3. User logs in + consents at the Authorization Server
4. AS → redirect_uri?code=XYZ&state=..        (client verifies state)
5. Client → POST /token  code=XYZ + code_verifier (+ client secret if confidential)
6. AS verifies SHA256(verifier) == challenge → returns access_token, id_token, refresh_token
```
PKCE stops an intercepted authorization code from being redeemed. Now required for **all** clients (OAuth 2.1). **Implicit** and **password** grants are deprecated.

Other grants: **Client Credentials** (service-to-service, no user), **Device Code** (TVs/CLIs), **Refresh Token**, **Token Exchange** (RFC 8693, propagate identity across services).

### Service-to-service auth in microservices
- User context: forward the access token or exchange it for a downscoped one.
- Service identity: client credentials tokens, or **mTLS** (service mesh — Istio/Linkerd issue SPIFFE identities).

## Attacks you must be able to explain

| Attack | Mechanism | Defence |
|---|---|---|
| **CSRF** | Victim's browser auto-sends cookies to your site from a malicious page | SameSite=Lax/Strict cookies, CSRF tokens (synchronizer/double-submit), check Origin. Bearer-token APIs aren't vulnerable because the browser doesn't auto-attach headers |
| **XSS** | Injected script runs in your origin, steals tokens/acts as user | Output encoding (React escapes by default — beware `dangerouslySetInnerHTML`), CSP, HttpOnly cookies, sanitize HTML (DOMPurify) |
| **SQL injection** | String-concatenated SQL | Parameterized queries / JPA parameters; never concatenate into JPQL either; least-privilege DB user |
| **IDOR / BOLA** | `/orders/123` → change to 124 and see someone else's | Authorization check on every object (`@PostAuthorize`, ownership in the query: `findByIdAndOwnerId`) — **#1 on OWASP API Top 10** |
| **Mass assignment** | Client sends `"role":"ADMIN"` bound into entity | DTOs with explicit fields |
| **SSRF** | Server fetches attacker-supplied URL (cloud metadata `169.254.169.254`) | Allow-lists, block private ranges, IMDSv2 |
| **CORS misconfig** | `Access-Control-Allow-Origin: *` with credentials / reflecting any origin | Explicit allowed origins |
| Brute force / credential stuffing | | Rate limiting, lockouts with care, MFA, breached-password checks |
| Timing attacks on secrets | `String.equals` short-circuits | `MessageDigest.isEqual` constant-time compare |

**Passwords**: bcrypt/scrypt/**Argon2id** with per-user salt (built-in), adaptive cost. Never SHA-256 alone. `DelegatingPasswordEncoder` stores `{bcrypt}$2a$...` so you can migrate algorithms.

**CORS is not security for your API** — it's a browser relaxation of the same-origin policy. Non-browser clients ignore it.

## Quick check questions

<details><summary>1. Explain how a request with a JWT is authenticated in Spring Security.</summary>

`BearerTokenAuthenticationFilter` extracts the token → `AuthenticationManager` → `JwtAuthenticationProvider` uses `JwtDecoder` (Nimbus) to verify the signature against cached JWKS keys and validate exp/iss/aud → `JwtAuthenticationConverter` maps claims (scope/roles) to `GrantedAuthority`s → a `JwtAuthenticationToken` is stored in the SecurityContext → `AuthorizationFilter` evaluates URL rules; `@PreAuthorize` checks method rules. Failures go through `ExceptionTranslationFilter` to a 401/403.
</details>

<details><summary>2. How do you log out a user with JWTs?</summary>

You can't "un-sign" a JWT. Options: delete client-side tokens and revoke the refresh token server-side (access token dies at expiry — keep it short); maintain a deny-list of `jti` until `exp` in Redis; or use opaque tokens + introspection / sessions for instant revocation.
</details>

<details><summary>3. Why is CSRF protection disabled for a stateless JWT API but required for session cookies?</summary>

CSRF exploits automatic credential attachment by the browser (cookies). A bearer token in the Authorization header is only attached by your own JS, which a cross-site page can't invoke. If you store the JWT in a cookie, you're back to needing CSRF protection (or SameSite).
</details>

<details><summary>4. What's the difference between OAuth2 and OIDC?</summary>

OAuth2 is for authorization (access tokens for APIs; the client shouldn't parse them). OIDC adds authentication: an ID token (JWT with user identity, `aud` = client), standard scopes (`openid profile email`), `/userinfo`, and discovery (`/.well-known/openid-configuration`).
</details>

<details><summary>5. A user can view other users' invoices by changing the ID in the URL. How do you fix it systematically?</summary>

That's BOLA/IDOR. Enforce ownership in the data access layer (`findByIdAndTenantIdAndOwnerId`), or `@PostAuthorize("returnObject.ownerId == authentication.name")`, or Hibernate filters / Postgres row-level security for multi-tenancy. Add integration tests that try cross-user access. Use non-guessable IDs (UUIDs) as defence-in-depth, not as the fix.
</details>

## Questions asked at top companies

<details><summary>Explain the JWT authentication flow end to end. <em>· Paytm, Walmart, Infosys, Swiggy</em></summary>

Login with credentials → server verifies (bcrypt) → issues short-lived access JWT + refresh token → client sends `Authorization: Bearer` → filter verifies signature, expiry, issuer, audience → builds Authentication with authorities → authorization rules → on expiry client uses refresh token (rotated, server-side revocable).
</details>

<details><summary>Where should a SPA store JWTs? <em>· Atlassian, Razorpay, Microsoft</em></summary>

localStorage is readable by XSS. HttpOnly Secure SameSite cookies protect from XSS but need CSRF protection. Best: access token in memory + refresh token in an HttpOnly cookie, or a BFF holding tokens server-side.
</details>

<details><summary>How do you revoke a JWT? <em>· Amazon, PhonePe</em></summary>

Keep access tokens short-lived; revoke refresh tokens in DB; maintain a deny-list of `jti` in Redis until expiry; or use opaque tokens with introspection; rotate signing keys in emergencies.
</details>

<details><summary>What is CSRF and when do you need to protect against it? <em>· Goldman Sachs, Oracle</em></summary>

A malicious site triggers a request that the browser sends with the victim's cookies. Needed when auth is cookie-based; defend with SameSite cookies, CSRF tokens, Origin checks. Header-based bearer token APIs aren't vulnerable.
</details>

<details><summary>What is CORS? Is it a security feature for your API? <em>· Flipkart, Myntra, Infosys</em></summary>

Browser mechanism that relaxes the same-origin policy via `Access-Control-Allow-*` headers after a preflight `OPTIONS`. It protects users' browsers, not your API — curl/Postman ignore it. Configure explicit allowed origins.
</details>

<details><summary>OAuth2 grant types — which one for a mobile app, a backend job, a SPA? <em>· Google, Microsoft, Atlassian</em></summary>

Mobile & SPA: Authorization Code + PKCE. Backend-to-backend: Client Credentials. TV/CLI: Device Code. Implicit and Password grants are deprecated.
</details>

<details><summary>Difference between hasRole and hasAuthority? <em>· Paytm, Accenture</em></summary>

`hasRole("ADMIN")` checks authority `ROLE_ADMIN` (adds prefix). `hasAuthority("orders:read")` checks the exact string — use for fine-grained permissions/scopes.
</details>

<details><summary>How do you secure microservice-to-microservice calls? <em>· Uber, Walmart</em></summary>

mTLS (service mesh identities), client-credentials tokens with audience restrictions, propagate/exchange user tokens for user context, network policies, zero-trust (every service authorizes requests).
</details>

<details><summary>Why bcrypt instead of SHA-256 for passwords? <em>· Amazon, Adobe</em></summary>

SHA-256 is fast — attackers can try billions of guesses/second with GPUs. bcrypt/Argon2 are deliberately slow (tunable cost) and salted, so precomputed tables fail and brute force is expensive.
</details>

<details><summary>What is IDOR and how do you prevent it? <em>· Razorpay, PhonePe, CRED</em></summary>

Insecure Direct Object Reference: changing `/orders/123` to `/orders/124` exposes someone else's data. Always check ownership in the query/authorization layer, not just authentication.
</details>

<details><summary>What is the role of SecurityContextHolder and how does it work with async code? <em>· Walmart, Goldman Sachs</em></summary>

Holds the current Authentication in a ThreadLocal by default. Async threads don't inherit it — use `DelegatingSecurityContextExecutor`/task decorators or the `MODE_INHERITABLETHREADLOCAL` strategy (carefully).
</details>

## End-to-end scenarios

<details><summary>Scenario: Implement "Login with OTP" for a mobile app securely.</summary>

`POST /auth/otp {phone}` → rate-limit per phone/IP/device, generate 6-digit OTP with SecureRandom, store **hash** + expiry (2–5 min) + attempt counter in Redis, send via SMS provider (async, priority lane). `POST /auth/otp/verify {phone, otp}` → constant-time compare, max 5 attempts then lock, delete on success → issue access JWT (15 min) + refresh token (stored hashed, rotated, device-bound). Defences: SMS-pumping fraud limits, CAPTCHA after anomalies, audit logs, no user enumeration in responses.
</details>

<details><summary>Scenario: A pentest reports that users can view other users' invoices by changing IDs. Fix it across 40 endpoints.</summary>

Centralise authorization: tenant/owner-scoped repository methods (`findByIdAndOwnerId`), `@PostAuthorize` or a policy service checked in services, Hibernate filters or Postgres row-level security for tenant isolation; add an automated security test suite that tries cross-user access on every endpoint; switch to non-guessable IDs as defence-in-depth; log and alert on authorization failures.
</details>
