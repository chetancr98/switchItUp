---
title: Docker Deep Dive — Images, Layers, Multi-stage Builds & Containerising Java
level: 2
tags: docker, containers, dockerfile
---
<!-- deepened -->

## Start here: the basics

### "Works on my machine"
Your app needs Java 21, certain environment variables, maybe ImageMagick. The server has Java 17 and different libraries. It breaks. **Containers** package the app **with everything it needs** into one portable unit that runs the same everywhere.

### Image vs container
- **Image** — a read-only template (like a class): OS files + Java + your jar + startup command.
- **Container** — a running instance of an image (like an object). You can run many containers from one image.
- **Registry** — a store for images (Docker Hub, GitHub Container Registry, AWS ECR).

### A first Dockerfile
```dockerfile
FROM eclipse-temurin:21-jre          # start from an image that already has Java
WORKDIR /app
COPY target/shop.jar app.jar         # add your application
EXPOSE 8080                          # document the port
ENTRYPOINT ["java", "-jar", "app.jar"]
```
```bash
docker build -t shop:1.0 .                     # build an image from the Dockerfile
docker run -d -p 8080:8080 --name shop shop:1.0  # run it; map host port 8080 → container 8080
docker ps                                      # list running containers
docker logs -f shop                            # follow logs
docker exec -it shop sh                        # open a shell inside
docker stop shop && docker rm shop
```

### docker compose — run several containers together
```yaml
services:
  app: { build: ., ports: ["8080:8080"], depends_on: [db] }
  db:  { image: postgres:16, environment: { POSTGRES_PASSWORD: secret } }
```
`docker compose up` starts both; the app reaches the database at hostname `db`.

---

## What a container really is

**Not a VM.** A container is a normal Linux **process** isolated with kernel features:
- **Namespaces** — what it can *see*: `pid` (own process tree, PID 1), `net` (own network stack), `mnt` (own filesystem view), `uts` (hostname), `ipc`, `user` (uid mapping), `cgroup`.
- **cgroups** — what it can *use*: CPU shares/quotas, memory limits (exceed → OOM kill), I/O, pids.
- **Union filesystem** (overlayfs) — image layers stacked read-only + a thin writable layer.
- Plus seccomp, capabilities, AppArmor/SELinux for security.

VM = own kernel on a hypervisor (strong isolation, GBs, boots in seconds-minutes). Container = shared host kernel (lighter isolation, MBs, starts in ms).

## Images & layers

- Each Dockerfile instruction that changes the filesystem (`RUN`, `COPY`, `ADD`) creates a **layer** (a tar diff). Layers are content-addressed (sha256) and **shared** between images.
- **Build cache**: a layer is reused if the instruction and its inputs are unchanged — and **every layer after the first changed one is rebuilt**. So order from least- to most-frequently changing.
- Image = manifest + config + layers. Tag (`:1.4`) is a mutable pointer; **digest** (`@sha256:...`) is immutable — deploy by digest.
- Deleting a file in a later layer doesn't shrink the image (it's still in the earlier layer) → clean up in the **same** `RUN`.

## Production Dockerfile for Spring Boot

```dockerfile
# ---- build stage ----
FROM eclipse-temurin:21-jdk AS build
WORKDIR /src
COPY .mvn/ .mvn/
COPY mvnw pom.xml ./
RUN ./mvnw -B dependency:go-offline           # cached unless pom.xml changes
COPY src ./src
RUN ./mvnw -B package -DskipTests && \
    java -Djarmode=tools -jar target/*.jar extract --layers --launcher --destination /extracted

# ---- runtime stage ----
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S app && adduser -S app -G app
WORKDIR /app
# Boot layered jar: dependencies change rarely, application code often → better layer caching
COPY --from=build /extracted/dependencies/ ./
COPY --from=build /extracted/spring-boot-loader/ ./
COPY --from=build /extracted/snapshot-dependencies/ ./
COPY --from=build /extracted/application/ ./
USER app
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75 -XX:+ExitOnOutOfMemoryError"
ENTRYPOINT ["java", "org.springframework.boot.loader.launch.JarLauncher"]
```

Why each line matters:
- **Multi-stage**: JDK + Maven only in the build stage; runtime has just a JRE → ~200 MB instead of ~700 MB, smaller attack surface.
- **Dependency layer first** → code changes don't re-download dependencies.
- **Non-root user** — container breakout risk reduction; many K8s policies require it.
- **Exec-form `ENTRYPOINT`** (JSON array) → Java is PID 1 and receives `SIGTERM` directly for graceful shutdown. Shell form (`ENTRYPOINT java -jar app.jar`) wraps it in `/bin/sh -c`, which doesn't forward signals → K8s waits for grace period then `SIGKILL`.
- `MaxRAMPercentage` — container-aware heap sizing; `ExitOnOutOfMemoryError` → crash fast and let the orchestrator restart rather than limp along.
- Alternatives: **Jib** (daemonless, no Dockerfile, layered automatically), **Cloud Native Buildpacks** (`./mvnw spring-boot:build-image`), **distroless** base images (no shell/package manager), GraalVM native images (tiny, ms startup).

## React app image

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf   # SPA fallback: try_files $uri /index.html; long cache for hashed assets
```
Often better: upload the static build to S3/GCS + CDN, no container at all.

## `.dockerignore`
```
target
node_modules
.git
*.log
.env
```
Smaller build context, faster builds, and **no secrets leaked into images**.

## Instructions that trip people up

| | Difference |
|---|---|
| `CMD` vs `ENTRYPOINT` | ENTRYPOINT = the executable; CMD = default args (overridden by `docker run image args`) |
| `COPY` vs `ADD` | ADD also extracts tars and fetches URLs — prefer COPY (explicit) |
| `ARG` vs `ENV` | ARG = build-time only; ENV = persists into runtime. Never pass secrets via either (visible in `docker history`) → `RUN --mount=type=secret` |
| `EXPOSE` | Documentation only; doesn't publish ports (`-p` does) |
| `RUN apt-get update && apt-get install -y ... && rm -rf /var/lib/apt/lists/*` | Must be one RUN, else stale cache and bigger image |

## Networking & storage

- Network drivers: **bridge** (default, NAT, containers on a user-defined bridge resolve each other by name), **host** (share host stack), **none**, **overlay** (multi-host, Swarm).
- `-p 8080:80` publishes host 8080 → container 80.
- Storage: **volumes** (managed by Docker, best for DB data), **bind mounts** (host path, dev), **tmpfs**. Container filesystem is ephemeral.

## docker compose for local dev

```yaml
services:
  app:
    build: .
    ports: ["8080:8080"]
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://db:5432/orders
      SPRING_DATASOURCE_USERNAME: app
      SPRING_DATASOURCE_PASSWORD: app
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_DB: orders, POSTGRES_USER: app, POSTGRES_PASSWORD: app }
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL", "pg_isready -U app"], interval: 5s, retries: 10 }
  redis:
    image: redis:7-alpine
volumes: { pgdata: {} }
```
Spring Boot 3.1+ `spring-boot-docker-compose` starts compose services automatically on `bootRun`.

## Image security checklist
Minimal base (alpine/distroless/chiselled), pin by digest, non-root, read-only root filesystem, drop capabilities, scan (Trivy/Grype), SBOM (Syft), sign (cosign/Sigstore), no secrets in layers, rebuild regularly for base image patches.

## Debugging containers
```bash
docker logs -f <c>
docker exec -it <c> sh                # no shell in distroless → kubectl debug / ephemeral containers
docker inspect <c>                    # config, env, mounts, IP
docker stats                          # live CPU/mem
docker history --no-trunc <image>     # layer commands & sizes
dive <image>                          # explore layers, find waste
```

## Quick check questions

<details><summary>1. Container vs VM?</summary>

VMs virtualise hardware and run a full guest OS kernel on a hypervisor — strong isolation, heavy. Containers are isolated processes sharing the host kernel via namespaces and cgroups — lightweight, fast startup, weaker isolation (gVisor/Kata/Firecracker bridge the gap).
</details>

<details><summary>2. Your image is 1.2 GB. How do you shrink it?</summary>

Multi-stage build (no build tools at runtime), JRE/distroless base, `.dockerignore`, combine RUN steps and clean caches in the same layer, remove unused dependencies, layered jars, or native image.
</details>

<details><summary>3. Why does my container take 30 s to stop?</summary>

The process isn't receiving SIGTERM — shell-form entrypoint makes `sh` PID 1 and it doesn't forward signals — so Docker/K8s waits for the grace period then SIGKILLs. Use exec form, or `exec java ...` in scripts, or `tini` as init. Also enable graceful shutdown in Spring.
</details>

<details><summary>4. How does layer caching affect build speed?</summary>

Docker reuses cached layers until an instruction or its inputs change; everything after is rebuilt. Copy dependency manifests and install deps before copying source code so code edits don't invalidate the dependency layer.
</details>

## Questions asked at top companies

<details><summary>Docker image vs container? <em>· Infosys, TCS, Accenture, Paytm</em></summary>

Image: immutable layered template. Container: running (or stopped) instance of an image with its own writable layer, process and network namespace.
</details>

<details><summary>Container vs virtual machine. <em>· Walmart, Amazon, Wipro</em></summary>

VMs virtualise hardware with separate guest kernels (heavier, stronger isolation). Containers share the host kernel using namespaces and cgroups (lightweight, fast startup).
</details>

<details><summary>What are Docker layers and how does caching work? <em>· Atlassian, Swiggy</em></summary>

Each filesystem-changing instruction creates a cached layer; a change invalidates that layer and all following ones. Order instructions from least to most frequently changed (dependencies before source).
</details>

<details><summary>What is a multi-stage build? <em>· Walmart, Flipkart</em></summary>

Multiple FROM stages: build in a heavy image (JDK/Maven), copy only artifacts into a slim runtime image — smaller, more secure images.
</details>

<details><summary>CMD vs ENTRYPOINT; COPY vs ADD. <em>· Infosys, Deloitte</em></summary>

ENTRYPOINT defines the executable, CMD default arguments (overridable). COPY copies files; ADD also extracts tars and fetches URLs — prefer COPY.
</details>

<details><summary>How do containers persist data? <em>· Paytm, Capgemini</em></summary>

Container filesystems are ephemeral; use volumes (managed) or bind mounts (host paths) for persistent data.
</details>

<details><summary>How do containers on the same host communicate? <em>· Infosys, Walmart</em></summary>

Via a user-defined bridge network where they resolve each other by container/service name (compose does this automatically).
</details>

<details><summary>How do you reduce Docker image size? <em>· Atlassian, PhonePe</em></summary>

Slim/distroless bases, multi-stage builds, .dockerignore, combine RUN steps and clean caches, remove unnecessary dependencies, layered jars, native images.
</details>

<details><summary>What are namespaces and cgroups? <em>· Google, Microsoft</em></summary>

Namespaces isolate what a process sees (PIDs, network, mounts, hostname, users); cgroups limit what it uses (CPU, memory, I/O).
</details>

<details><summary>Why run containers as non-root? <em>· Razorpay, Goldman Sachs</em></summary>

Limits damage from container escape or app compromise; many platforms enforce it; drop capabilities and use read-only filesystems too.
</details>

## End-to-end scenarios

<details><summary>Scenario: Containerise a Spring Boot + Postgres + Redis app for local development and production.</summary>

Multi-stage Dockerfile with layered jar, non-root user, exec-form entrypoint, `MaxRAMPercentage`; `.dockerignore`; compose file for local dev with Postgres/Redis, healthchecks and volumes; config via env vars; production image tagged by git SHA, scanned and pushed to registry; same image deployed to K8s with secrets injected.
</details>

<details><summary>Scenario: The container starts on your laptop but crashes in production with "exec format error".</summary>

Architecture mismatch: image built for ARM (Apple Silicon) but servers are x86_64 (or vice versa). Build multi-arch images with `docker buildx build --platform linux/amd64,linux/arm64` in CI, never ship laptop-built images.
</details>
