---
title: CI/CD Fundamentals & a Production Pipeline with GitHub Actions
level: 2
tags: ci/cd, github actions, pipeline, devops
---
<!-- deepened -->

## Start here: the basics

### The problem CI/CD solves
Without automation: developers merge code rarely, conflicts pile up, someone builds the jar on their laptop, copies it to a server over SSH, and hopes it works. Releases are scary and infrequent.

### CI — Continuous Integration
Every time code is pushed, a server automatically **builds** it and runs the **tests**. If something breaks, the team knows within minutes, while the change is fresh.

### CD — Continuous Delivery / Deployment
After CI passes, the pipeline automatically **packages** the app (e.g., a Docker image) and **deploys** it to test environments — and to production either with one click (delivery) or automatically (deployment).

### A pipeline as stages
```
git push → [Build] → [Unit tests] → [Integration tests] → [Package image] → [Deploy to staging] → [Smoke tests] → [Deploy to prod]
              fail fast: any red stage stops the pipeline and notifies the author
```

### GitHub Actions basics
A workflow is a YAML file in `.github/workflows/`. Minimal example for a Spring Boot project:
```yaml
name: build
on: [push, pull_request]          # when to run
jobs:
  test:
    runs-on: ubuntu-latest        # a fresh virtual machine
    steps:
      - uses: actions/checkout@v4                 # get the code
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }
      - run: ./mvnw -B verify                     # compile + run tests
```
Vocabulary: **workflow** (the file), **trigger/event** (push, PR), **job** (runs on a machine), **step** (a command or reusable action), **runner** (the machine), **secrets** (encrypted values like API keys).

---

## Vocabulary — precisely

- **Continuous Integration**: every change merged to trunk frequently (≥ daily), each merge **built and tested automatically**. Goal: the main branch is always green.
- **Continuous Delivery**: every green build produces a **releasable artifact** that *can* go to production with one click/approval.
- **Continuous Deployment**: every green build **goes** to production automatically, no human gate.
- **DORA metrics** (how elite teams are measured): deployment frequency, lead time for changes, change failure rate, time to restore service (MTTR). Mention them when asked "how do you measure engineering effectiveness".

## Anatomy of a good pipeline

```
 PR opened ──► [ build + unit tests + lint + SAST ] ──► review ──► merge to main
                                                                       │
 main ──► build once ──► unit + integration tests (Testcontainers) ──► package Docker image (tag = git SHA)
      ──► scan image (Trivy/Grype) + SBOM + sign (cosign) ──► push to registry
      ──► deploy to DEV/staging (automatic) ──► smoke + contract + e2e tests
      ──► deploy to PROD (canary 5% → analyse metrics → 100%) ──► post-deploy verification
```

Principles:
1. **Build once, deploy many**: the same immutable artifact (image digest) is promoted across environments; only config differs. Never rebuild for prod.
2. **Fast feedback**: PR checks < 10 min. Parallelise, cache dependencies, split slow suites.
3. **Fail fast**: cheap checks first (compile, lint, unit) before expensive ones.
4. **Everything as code**: pipeline, infra (Terraform), config, dashboards.
5. **Shift-left security**: dependency scanning (Dependabot, OWASP dependency-check, Snyk), SAST (CodeQL, Semgrep), secret scanning, container scanning.
6. **Reproducibility**: pinned versions (actions by SHA, base images by digest), lockfiles, hermetic builds.
7. **Rollback is one click**, and practised.

## GitHub Actions — concepts

- **Workflow** (`.github/workflows/*.yml`) triggered by **events** (`push`, `pull_request`, `workflow_dispatch`, `schedule`, `release`).
- **Jobs** run on **runners** (GitHub-hosted or self-hosted); jobs run in **parallel** unless `needs:`.
- **Steps** run sequentially inside a job: `uses:` (an action) or `run:` (shell).
- **Matrix** builds, **caching**, **artifacts** (pass files between jobs), **environments** (with protection rules & required reviewers), **secrets** and **OIDC** (`id-token: write`) for cloud auth without long-lived keys.
- **Reusable workflows** (`workflow_call`) and composite actions to share pipelines across many microservice repos.
- **Concurrency groups** cancel superseded runs.

## A complete pipeline for a Spring Boot + React app

```yaml
name: ci-cd
on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

env:
  IMAGE: ghcr.io/${{ github.repository }}/order-service

jobs:
  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with: { distribution: temurin, java-version: '21', cache: maven }
      - name: Build & test (unit + Testcontainers integration)
        run: ./mvnw -B verify
      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v4
        with: { name: surefire-reports, path: '**/target/surefire-reports' }

  frontend:
    runs-on: ubuntu-latest
    defaults: { run: { working-directory: web } }
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm, cache-dependency-path: web/package-lock.json }
      - run: npm ci
      - run: npm run lint && npm test -- --run && npm run build

  image:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: [backend, frontend]
    runs-on: ubuntu-latest
    permissions: { contents: read, packages: write, id-token: write }
    outputs:
      digest: ${{ steps.push.outputs.digest }}
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with: { registry: ghcr.io, username: ${{ github.actor }}, password: ${{ secrets.GITHUB_TOKEN }} }
      - id: push
        uses: docker/build-push-action@v6
        with:
          push: true
          tags: ${{ env.IMAGE }}:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Scan image
        uses: aquasecurity/trivy-action@0.28.0
        with: { image-ref: '${{ env.IMAGE }}:${{ github.sha }}', severity: 'CRITICAL,HIGH', exit-code: '1' }

  deploy-staging:
    needs: image
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      - name: Bump image in GitOps repo / helm upgrade
        run: helm upgrade --install orders ./chart --set image.tag=${{ github.sha }} --wait --atomic
      - run: ./scripts/smoke-test.sh https://staging.example.com

  deploy-prod:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production        # protection rule: required reviewers, wait timer
    steps:
      - run: echo "promote the same digest ${{ needs.image.outputs.digest }} (canary via Argo Rollouts)"
```

Security notes interviewers like:
- `permissions:` least privilege for `GITHUB_TOKEN`.
- **OIDC** to AWS/GCP/Azure (`aws-actions/configure-aws-credentials` with `role-to-assume`) instead of storing cloud keys as secrets.
- `pull_request_target` + checking out PR code = classic **pwn request** vulnerability (untrusted code with secrets).
- Pin third-party actions to a **commit SHA**; supply-chain attacks on tags happen (tj-actions/changed-files, 2025).

## Push vs pull deployment: GitOps

- **Push** (CI runs `kubectl/helm`): simple; CI needs cluster credentials.
- **Pull / GitOps** (Argo CD, Flux): desired state lives in a Git repo; an in-cluster agent **reconciles** the cluster to match. CI only commits a new image tag to the config repo. ✅ Audit trail (git log), easy rollback (git revert), drift detection, no cluster creds in CI.

## Build tools — what to know
- **Maven**: lifecycle `validate → compile → test → package → verify → install → deploy`; `dependencyManagement` (BOMs), `mvn dependency:tree` for conflicts (nearest-wins resolution). Surefire (unit) vs Failsafe (`*IT`, integration).
- **Gradle**: incremental builds, build cache, Kotlin DSL — faster on big monorepos.
- Monorepos: build only what changed (Nx, Bazel, Gradle configuration on demand, path filters in Actions).

## Branching & release strategy
- **Trunk-based development**: short-lived branches (< 1–2 days), feature flags for incomplete work → enables CI for real. Preferred by high performers.
- **GitFlow**: develop/release/hotfix branches — heavier, suits versioned on-prem releases, not SaaS.
- **Semantic versioning** for libraries; for services, the git SHA + build number is enough.
- Release notes from **Conventional Commits** (`feat:`, `fix:`, `feat!:`) via semantic-release / release-please.

## Quick check questions

<details><summary>1. Continuous delivery vs continuous deployment?</summary>

Delivery: every change is automatically built, tested and made deployable; production release is a manual business decision. Deployment: every change that passes the pipeline goes to production automatically.
</details>

<details><summary>2. Why "build once, deploy many"?</summary>

Rebuilding per environment can produce a different artifact (dependency drift, different base image) — you'd ship something you never tested. Promote the same immutable image digest through environments and inject environment-specific config at deploy time.
</details>

<details><summary>3. Your CI takes 40 minutes. How do you bring it under 10?</summary>

Profile stages; cache dependencies and Docker layers; run jobs in parallel (matrix, test sharding); build only affected modules; move slow e2e tests to post-merge/nightly; reuse Testcontainers and Spring contexts; fail-fast ordering; bigger/self-hosted runners; remove sleeps and flaky retries.
</details>

<details><summary>4. How do you handle secrets in pipelines?</summary>

Store in the CI secret store or an external vault; prefer short-lived credentials via OIDC federation; least-privilege tokens per job/environment; never echo them (masking), never pass to untrusted PR builds; rotate regularly; scan repos for leaked secrets (push protection).
</details>

<details><summary>5. What is GitOps and why use it?</summary>

Declarative desired state in Git, reconciled by an in-cluster controller (Argo CD/Flux). Benefits: auditable changes via PRs, easy rollback via revert, drift detection/correction, CI doesn't need cluster credentials, consistent multi-cluster deployments.
</details>

## Questions asked at top companies

<details><summary>What is CI/CD and why is it important? <em>· Infosys, Accenture, Amazon, Walmart</em></summary>

CI: frequent merges with automated build/test for fast feedback. CD: automated release pipeline to environments; delivery (manual prod approval) vs deployment (automatic). Benefits: smaller, safer, faster releases, fewer integration issues, reproducibility.
</details>

<details><summary>Explain the stages of a pipeline you built. <em>· Walmart, Paytm, Deloitte</em></summary>

Checkout → build & unit tests → static analysis/lint/SAST → integration tests → package (Docker, tag with SHA) → scan & push to registry → deploy to staging → smoke/e2e → approval → canary prod → verification/rollback.
</details>

<details><summary>How do you handle secrets in CI? <em>· Atlassian, Razorpay</em></summary>

CI secret store or vault, OIDC federation for cloud credentials (no long-lived keys), least privilege per environment, masking, never exposed to forked PRs, rotation.
</details>

<details><summary>What is "build once, deploy many"? <em>· Thoughtworks, Walmart</em></summary>

Build a single immutable artifact and promote the same artifact through all environments with environment-specific config, ensuring what you tested is what you ship.
</details>

<details><summary>Jenkins vs GitHub Actions vs GitLab CI. <em>· Infosys, Wipro, Walmart</em></summary>

Jenkins: self-hosted, extremely flexible via plugins, heavy maintenance, Jenkinsfile pipelines. GitHub Actions: integrated with GitHub, hosted runners, marketplace actions. GitLab CI: integrated with GitLab, strong built-in features. Concepts are the same.
</details>

<details><summary>How do you speed up a slow pipeline? <em>· Uber, Flipkart</em></summary>

Caching dependencies/layers, parallel jobs and test sharding, building only changed modules, moving slow tests later, faster runners, removing flaky sleeps.
</details>

<details><summary>What are flaky tests and how do you deal with them? <em>· Google, Microsoft</em></summary>

Tests passing/failing without code changes (timing, shared state, network, order dependence). Quarantine and track, fix root causes (deterministic clocks, Awaitility, isolated data), don't just auto-retry forever.
</details>

<details><summary>What is GitOps? <em>· Walmart, Atlassian</em></summary>

Desired deployment state in Git, reconciled by an in-cluster agent (Argo CD/Flux); changes via PRs, rollback via revert, drift detection.
</details>

<details><summary>Maven lifecycle phases? <em>· TCS, Infosys, Accenture</em></summary>

validate → compile → test → package → verify → install → deploy; running a phase runs all previous ones; plugins bind goals to phases.
</details>

<details><summary>How do you roll back a bad release? <em>· Amazon, Swiggy</em></summary>

Redeploy previous image (helm rollback/argo revert/rollout undo), toggle off feature flag, or roll forward with a fix; DB migrations must be backward compatible so rollback is possible.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design the CI/CD pipeline for a team of 8 engineers working on 5 Spring Boot microservices and a React app.</summary>

Trunk-based with short-lived branches, PR checks (build, unit, lint, SAST, contract tests) under 10 min; reusable workflow shared across service repos; on merge: integration tests with Testcontainers, Docker image tagged by SHA, Trivy scan, SBOM, sign, push; GitOps repo updated per environment; Argo CD deploys to staging automatically, smoke tests, manual approval to prod with Argo Rollouts canary + automated analysis; React built and deployed to S3/CloudFront with cache-busting; DORA metrics dashboard.
</details>

<details><summary>Scenario: A release passed CI but broke production because a config value was missing. How do you prevent this class of failure?</summary>

Validate config at startup (`@ConfigurationProperties` + `@Validated` → app fails fast and canary never becomes healthy), config schema checks in CI, environment parity (staging uses same config keys via same Helm values structure), canary analysis catching errors early, readiness probes that verify required config, and a checklist/automation for adding new config keys across environments.
</details>
