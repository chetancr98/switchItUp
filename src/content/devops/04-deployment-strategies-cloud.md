---
title: Deployment Strategies, Database Migrations, Cloud (AWS) & Infrastructure as Code
level: 4
tags: blue-green, canary, aws, terraform, feature flags
---
<!-- deepened -->

## Start here: the basics

### Deploying is risky — strategies reduce the risk
A **deployment** replaces the running version of your app with a new one. If the new version has a bug, you want (1) as few users affected as possible and (2) a fast way back.

| Strategy | How it works (simple) |
|---|---|
| **Recreate** | Stop old, start new — downtime in between |
| **Rolling** | Replace servers one by one |
| **Blue-green** | Run the new version (green) next to the old (blue); flip all traffic at once; flip back if bad |
| **Canary** | Send 5% of users to the new version, watch metrics, then increase |
| **Feature flags** | Ship code turned off; turn it on for chosen users without redeploying |

### Cloud in plain words
Instead of buying servers, you rent computing from a cloud provider (AWS, Azure, GCP) by the minute:
| You need | AWS name | Simple meaning |
|---|---|---|
| A server | EC2 | Virtual machine |
| Run containers | EKS / ECS | Managed Kubernetes / containers |
| Store files | S3 | Unlimited file storage |
| A database | RDS / Aurora | Managed PostgreSQL/MySQL |
| Run code without servers | Lambda | Functions triggered by events |
| Spread traffic | ELB/ALB | Load balancer |
| Global fast delivery | CloudFront | CDN |

**Region** = a geographic area (Mumbai); **Availability Zone** = a separate data centre within a region. Run in multiple AZs so one data-centre failure doesn't take you down.

### Infrastructure as Code (IaC)
Instead of clicking in the AWS console, describe infrastructure in code (Terraform) stored in Git — reviewable, repeatable, versioned.

---

## Release strategies compared

| Strategy | How | Rollback | Cost | Risk |
|---|---|---|---|---|
| **Recreate** | Stop all old, start new | Redeploy old | Low | Downtime |
| **Rolling** | Replace instances gradually | Roll back gradually | Low | Both versions live during rollout; bad version reaches everyone eventually |
| **Blue-green** | Full new stack (green) beside old (blue); switch router | **Instant** (switch back) | 2× capacity during switch | DB must work for both; all users flip at once |
| **Canary** | Route small % (1 → 5 → 25 → 100) to new version, compare metrics | Fast (route back) | Low | Requires good metrics and automated analysis |
| **Shadow / dark launch** | Mirror real traffic to new version, discard responses | N/A | Extra capacity | Side effects must be suppressed |
| **A/B test** | Route by user segment to measure business metrics | — | — | Product experiment, not a deploy safety tool |
| **Feature flags** | Deploy code dark, enable per user/% at runtime | Toggle off in seconds | Flag debt | Decouples deploy from release |

### Canary in practice
- Tools: **Argo Rollouts**, Flagger, Spinnaker, AWS CodeDeploy, service mesh traffic splitting.
- Automated analysis: compare canary vs baseline on error rate, p99 latency, saturation, business KPIs → auto-promote or auto-abort.
- Make sure the canary gets **representative** traffic (not just health checks), and run long enough to see slow failures (memory leaks, cache warm-up).

```yaml
# Argo Rollouts excerpt
strategy:
  canary:
    steps:
      - setWeight: 5
      - pause: { duration: 10m }
      - analysis: { templates: [{ templateName: error-rate-and-latency }] }
      - setWeight: 25
      - pause: { duration: 10m }
      - setWeight: 100
```

### Feature flags — done right
- Types: release toggles (short-lived), experiment toggles, ops toggles/kill switches (long-lived), permission toggles.
- **Remove flags** after rollout (flag debt causes combinatorial testing nightmares — Knight Capital lost $440M in 45 minutes partly due to a repurposed old flag).
- Evaluate locally with cached rules (no network call per evaluation); default to safe value if the flag service is down.

## Database migrations without downtime — expand/contract

During a rolling or canary deploy, **old and new code run simultaneously against the same database**. Every migration must be compatible with both.

**Renaming column `name` → `full_name`:**
1. **Expand**: add `full_name` (nullable). Deploy code that **writes both**, reads `name`.
2. **Migrate**: backfill `full_name` in batches (avoid long locks).
3. Deploy code that **reads `full_name`**, still writes both.
4. Deploy code that writes only `full_name`.
5. **Contract**: drop `name` (after no old versions remain).

Rules:
- Never rename/drop a column in the same release that stops using it.
- Adding a `NOT NULL` column with a default can lock/rewrite large tables on some DBs/versions → add nullable, backfill, then add constraint (`NOT VALID` + `VALIDATE` in Postgres).
- Create indexes **concurrently** (`CREATE INDEX CONCURRENTLY` / online DDL / gh-ost, pt-online-schema-change for MySQL).
- Migrations run as a separate step (K8s Job / init container with a lock — Flyway handles locking) before the new code rolls out.
- Same idea for **APIs** and **event schemas**: add fields first, remove later; tolerant readers.

## Rollback vs roll-forward
Rollback is fast if the release is backwards-compatible (it usually is with expand/contract). When data has already been migrated irreversibly, **roll forward** with a fix. Always know which before you deploy.

## Cloud fundamentals (AWS vocabulary — maps to GCP/Azure)

| Need | AWS | Notes |
|---|---|---|
| Compute — VMs | EC2 (+ Auto Scaling Groups) | Instance types, spot for cheap interruptible |
| Containers | **EKS** (K8s), ECS (+ Fargate serverless containers) | |
| Functions | Lambda | Event-driven; cold starts (SnapStart helps Java) |
| Load balancing | ALB (L7), NLB (L4), API Gateway | |
| Object storage | **S3** | 11 nines durability; static sites + CloudFront |
| CDN | CloudFront | |
| Relational DB | RDS, **Aurora** (storage decoupled, 6 copies across 3 AZs) | Multi-AZ = HA; read replicas = scale reads |
| NoSQL | DynamoDB | Partition key design is everything |
| Cache | ElastiCache (Redis/Valkey, Memcached) | |
| Messaging | SQS (queue), SNS (pub/sub), Kinesis / **MSK** (Kafka), EventBridge | |
| Networking | VPC, subnets (public/private), NAT gateway, security groups (stateful), NACLs (stateless), Route 53 (DNS) | |
| Identity | IAM roles & policies (least privilege), IRSA / Pod Identity for K8s pods | |
| Secrets/config | Secrets Manager, Parameter Store, KMS | |
| Observability | CloudWatch, X-Ray | |

**Regions & availability zones**: an AZ = one or more isolated data centres; a region = multiple AZs. Deploy across **≥ 2–3 AZs** for HA; multi-region for disaster recovery / global latency.

**Disaster recovery** terms: **RPO** (how much data can you lose — time since last good copy) and **RTO** (how long to restore). Strategies by cost: backup & restore → pilot light → warm standby → multi-site active-active.

**Well-Architected pillars**: operational excellence, security, reliability, performance efficiency, cost optimisation, sustainability.

### Typical production architecture for a Spring Boot + React app
```
Route 53 → CloudFront (React static from S3, cache) ──/api──► ALB (TLS, WAF)
   → EKS (order-service pods across 3 AZs, HPA) → Aurora Postgres (Multi-AZ, read replica)
                                               → ElastiCache Redis
                                               → MSK (Kafka) → consumers
   Secrets Manager (via External Secrets), CloudWatch/Prometheus + Grafana, ECR for images
```

## Infrastructure as Code

- **Terraform/OpenTofu**: declarative HCL, providers for every cloud, **state file** (store remotely in S3 + DynamoDB/state locking), `plan` (diff) → `apply`. Modules for reuse. Drift detection.
- Alternatives: Pulumi (real languages), AWS CDK / CloudFormation, Crossplane (K8s-native).
- Practices: everything in Git, PR with `terraform plan` output as a comment, separate state per environment, no manual console changes (or detect them), policy as code (OPA/Conftest, Sentinel).

```hcl
module "orders_db" {
  source              = "terraform-aws-modules/rds-aurora/aws"
  name                = "orders"
  engine              = "aurora-postgresql"
  instance_class      = "db.r6g.large"
  instances           = { one = {}, two = {} }
  vpc_id              = module.vpc.vpc_id
  subnets             = module.vpc.database_subnets
  storage_encrypted   = true
  deletion_protection = true
}
```

## Quick check questions

<details><summary>1. Blue-green vs canary — when each?</summary>

Blue-green: when you need instant, all-at-once switchover and instant rollback, can afford double capacity briefly, and the change is hard to run side-by-side gradually. Canary: when you want to limit blast radius and validate with real traffic and metrics progressively — the default for high-traffic services with good observability.
</details>

<details><summary>2. How do you rename a column in a table used by a live service with zero downtime?</summary>

Expand/contract: add new column, dual-write, backfill in batches, switch reads, stop writing old, drop old column in a later release. Each step deploys separately and is compatible with the previous code version.
</details>

<details><summary>3. Define RPO and RTO and give a design for RPO ≈ 0, RTO < 5 min.</summary>

RPO: max acceptable data loss window; RTO: max acceptable downtime. For RPO≈0/RTO<5min: synchronous replication across AZs (Aurora/Multi-AZ RDS), automated failover, stateless app tier in multiple AZs behind a LB, health-checked DNS, rehearsed runbooks. Cross-region adds async replication (RPO seconds) unless using a globally consistent DB (Spanner).
</details>

<details><summary>4. What are feature flags' risks?</summary>

Flag debt and combinatorial states, stale flags repurposed accidentally, performance of remote evaluation, inconsistent experiences across services, security if flags gate authorization. Mitigate with ownership, expiry dates, cleanup tickets, local evaluation, and testing both paths.
</details>

## Questions asked at top companies

<details><summary>Blue-green vs canary vs rolling deployment. <em>· Walmart, Amazon, Atlassian, Paytm</em></summary>

Rolling: gradual replacement, cheap, both versions live. Blue-green: full parallel environment, instant switch/rollback, double capacity. Canary: small % of real traffic with metric analysis before full rollout — lowest blast radius.
</details>

<details><summary>How do you do database migrations with zero downtime? <em>· Flipkart, Razorpay, Uber</em></summary>

Expand/contract: additive backward-compatible changes first, dual writes, backfill in batches, switch reads, remove old columns in a later release; online index creation; migrations run separately before rollout.
</details>

<details><summary>What are feature flags and their risks? <em>· Atlassian, Swiggy</em></summary>

Runtime toggles decoupling deploy from release (gradual rollout, kill switches, experiments). Risks: flag debt, untested combinations, stale flags reused, dependency on flag service.
</details>

<details><summary>What is an Availability Zone and why deploy across several? <em>· Amazon, Microsoft</em></summary>

Isolated data centres within a region with independent power/network; multi-AZ deployments survive a single data-centre failure.
</details>

<details><summary>RPO vs RTO. <em>· Goldman Sachs, Amazon, banking</em></summary>

RPO: maximum acceptable data loss (time since last recoverable point). RTO: maximum acceptable downtime to restore service.
</details>

<details><summary>What is Infrastructure as Code? Terraform state? <em>· Walmart, Deloitte</em></summary>

Managing infrastructure via declarative code in version control. Terraform state maps resources to real infrastructure; store remotely with locking (S3 + DynamoDB) and never edit by hand.
</details>

<details><summary>Explain the shared responsibility model. <em>· Amazon, Infosys</em></summary>

Cloud provider secures the infrastructure (hardware, data centres, hypervisor); the customer secures what they put in it (IAM, data, OS patches on VMs, network config, app code).
</details>

<details><summary>Lambda/serverless — pros and cons for a Java service? <em>· Amazon, Swiggy</em></summary>

Pros: no servers, scale to zero, pay-per-use. Cons: cold starts (mitigate with SnapStart/native), execution limits, vendor lock-in, harder local testing, costs at sustained high load.
</details>

<details><summary>Vertical vs horizontal scaling. <em>· TCS, Infosys, Amazon</em></summary>

Vertical: bigger machine (simple, limited, downtime). Horizontal: more machines (needs stateless apps & load balancing, near-unlimited).
</details>

<details><summary>How do you design for disaster recovery? <em>· Goldman Sachs, Walmart</em></summary>

Choose strategy by RPO/RTO and cost: backups & restore, pilot light, warm standby, active-active multi-region; automated backups with PITR, cross-region replication, IaC to rebuild, regular DR drills.
</details>

## End-to-end scenarios

<details><summary>Scenario: Release a new pricing algorithm safely to 30 million users.</summary>

Ship behind a feature flag; enable for internal users, then 1% → 5% → 25% → 100% via flag targeting; canary deployment of the code path; dashboards comparing conversion, errors, latency between cohorts; automatic rollback thresholds; kill switch; remove flag after full rollout.
</details>

<details><summary>Scenario: Design AWS infrastructure for a Spring Boot + React app expecting 5k RPS, highly available.</summary>

Route 53 → CloudFront (React from S3) → ALB with WAF → EKS across 3 AZs (HPA, Karpenter) → Aurora PostgreSQL Multi-AZ + read replica → ElastiCache Redis cluster → MSK for events; Secrets Manager; CloudWatch/Prometheus/Grafana; all provisioned via Terraform modules; backups with PITR; cost controls (savings plans, spot for workers).
</details>
