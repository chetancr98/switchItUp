---
title: Kubernetes for Backend Engineers — Architecture, Workloads, Networking, Scaling
level: 3
tags: kubernetes, k8s, helm, hpa
---
<!-- deepened -->

## Start here: the basics

### Why Kubernetes?
Docker runs containers on one machine. In production you need to run **many** containers across **many** machines, restart them when they crash, spread them across servers, scale them up at peak, roll out new versions without downtime, and route traffic to healthy ones. **Kubernetes (K8s)** does all of that.

### Core objects for beginners
| Object | What it is | Analogy |
|---|---|---|
| **Pod** | One or more containers running together; the smallest unit | A single delivery van |
| **Deployment** | "Keep 3 copies of this pod running, update them gradually" | Fleet manager |
| **Service** | A stable name/IP that load-balances to the pods | Company phone number routing to available staff |
| **Ingress** | HTTP routing from the outside world (`shop.com/api` → service) | Reception desk |
| **ConfigMap / Secret** | Configuration and sensitive values | Settings file / locked drawer |
| **Namespace** | Logical grouping (dev, prod, team-a) | Floors of a building |
| **Node** | A machine (VM) running pods | Parking garage |

### You describe *what* you want (declarative)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: shop }
spec:
  replicas: 3
  selector: { matchLabels: { app: shop } }
  template:
    metadata: { labels: { app: shop } }
    spec:
      containers:
        - name: shop
          image: ghcr.io/acme/shop:1.4.0
          ports: [{ containerPort: 8080 }]
---
apiVersion: v1
kind: Service
metadata: { name: shop }
spec:
  selector: { app: shop }
  ports: [{ port: 80, targetPort: 8080 }]
```
```bash
kubectl apply -f shop.yaml     # create/update
kubectl get pods               # see them
kubectl logs <pod>             # logs
kubectl scale deploy/shop --replicas=5
```
K8s constantly compares **desired state** (3 replicas) with **actual state** and fixes differences — if a pod dies, a new one is created.

---

## Architecture

```
Control plane                                   Worker nodes
┌───────────────────────────────┐              ┌──────────────────────────────┐
│ kube-apiserver  (REST front,  │◄────────────►│ kubelet (runs pods via CRI:  │
│   authn/z, admission)         │              │   containerd)                │
│ etcd (Raft KV store: ALL      │              │ kube-proxy (Service rules:   │
│   cluster state)              │              │   iptables/IPVS) or eBPF CNI │
│ kube-scheduler (pod → node)   │              │ CNI plugin (Calico, Cilium)  │
│ controller-manager (reconcile │              │ Pods                         │
│   loops: Deployment, RS, Node)│              └──────────────────────────────┘
│ cloud-controller-manager      │
└───────────────────────────────┘
```

**Core idea: declarative desired state + reconciliation loops.** You `apply` a spec; controllers continuously compare actual vs desired and act. Everything (Deployments, HPA, operators, Argo CD) follows this pattern.

What happens on `kubectl apply -f deployment.yaml`:
1. apiserver authenticates/authorises, runs admission (mutating → validating webhooks), persists to etcd.
2. Deployment controller creates a ReplicaSet; RS controller creates Pod objects (unscheduled).
3. Scheduler filters nodes (resources, taints, affinity) and scores them → binds pod to node.
4. kubelet on that node sees the pod, pulls the image, starts containers via containerd, runs probes.
5. Endpoints/EndpointSlice controller adds ready pod IPs to the Service.

## Workload objects

| Object | Purpose |
|---|---|
| **Pod** | Smallest unit: 1+ containers sharing network namespace (localhost) & volumes. Ephemeral |
| **ReplicaSet** | Keeps N identical pods |
| **Deployment** | Manages ReplicaSets → rolling updates & rollbacks. For stateless apps |
| **StatefulSet** | Stable identities (`db-0`, `db-1`), stable per-pod storage (PVC templates), ordered rollout. Databases, Kafka, ZooKeeper |
| **DaemonSet** | One pod per node: log shippers, node exporters, CNI |
| **Job / CronJob** | Run-to-completion / scheduled batch |

## A production-grade Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata: { name: order-service, labels: { app: order-service } }
spec:
  replicas: 3
  revisionHistoryLimit: 5
  strategy:
    type: RollingUpdate
    rollingUpdate: { maxSurge: 25%, maxUnavailable: 0 }     # zero-downtime
  selector: { matchLabels: { app: order-service } }
  template:
    metadata: { labels: { app: order-service } }
    spec:
      terminationGracePeriodSeconds: 45
      securityContext: { runAsNonRoot: true }
      topologySpreadConstraints:                             # spread across zones
        - { maxSkew: 1, topologyKey: topology.kubernetes.io/zone, whenUnsatisfiable: ScheduleAnyway,
            labelSelector: { matchLabels: { app: order-service } } }
      containers:
        - name: app
          image: ghcr.io/acme/order-service@sha256:...       # by digest
          ports: [{ containerPort: 8080 }]
          envFrom: [{ configMapRef: { name: order-config } }, { secretRef: { name: order-secrets } }]
          resources:
            requests: { cpu: 500m, memory: 768Mi }           # scheduling guarantee
            limits:   { memory: 768Mi }                      # memory limit = request; often no CPU limit
          startupProbe:  { httpGet: { path: /actuator/health/liveness, port: 8081 }, failureThreshold: 30, periodSeconds: 2 }
          livenessProbe: { httpGet: { path: /actuator/health/liveness, port: 8081 }, periodSeconds: 10 }
          readinessProbe:{ httpGet: { path: /actuator/health/readiness, port: 8081 }, periodSeconds: 5 }
          lifecycle:
            preStop: { exec: { command: ["sh", "-c", "sleep 10"] } }   # let endpoints/LBs drain before SIGTERM
```

### Requests vs limits & QoS
- **Requests**: what the scheduler reserves; CPU request = guaranteed share.
- **Limits**: CPU limit → **throttling** (CFS quota) — causes latency spikes, many teams omit CPU limits; memory limit → **OOMKilled** (exit 137).
- QoS classes: **Guaranteed** (requests = limits for all), **Burstable**, **BestEffort** (evicted first under pressure).

### Probes
- **startupProbe**: gives slow starters (JVM) time; liveness/readiness disabled until it passes.
- **livenessProbe**: failing → container **restarted**.
- **readinessProbe**: failing → removed from Service endpoints (no traffic), not restarted.

### Graceful shutdown sequence
Pod deletion → (in parallel) endpoints removal propagates to kube-proxy/ingress **and** kubelet runs `preStop` then sends `SIGTERM` → Spring graceful shutdown finishes in-flight requests → after `terminationGracePeriodSeconds`, `SIGKILL`. The `preStop sleep` covers the race where traffic still arrives after SIGTERM.

## Networking

- Every pod gets its own IP; all pods can reach all pods (flat network, via CNI) unless **NetworkPolicies** restrict it.
- **Service** = stable virtual IP + DNS name load-balancing over pods matched by label selector.

| Service type | Exposure |
|---|---|
| ClusterIP (default) | Internal only |
| NodePort | Port on every node |
| LoadBalancer | Cloud LB → NodePorts |
| Headless (`clusterIP: None`) | DNS returns pod IPs directly (StatefulSets, client-side LB, gRPC) |

- **Ingress** (L7 HTTP routing by host/path, TLS) via an ingress controller (NGINX, Traefik, cloud LB). Successor: **Gateway API** (more expressive, role-oriented).
- gRPC/HTTP2 long-lived connections defeat kube-proxy's L4 balancing (all requests stick to one pod) → use client-side LB with headless service or a mesh/L7 proxy.

## Config, secrets, storage
- **ConfigMap** (non-secret config), **Secret** (base64, enable etcd encryption, prefer External Secrets/Vault). Mounted as env or files (file mounts update live; env needs restart).
- **PersistentVolume / PersistentVolumeClaim / StorageClass** (dynamic provisioning of cloud disks). Running databases on K8s is possible (operators: CloudNativePG, Strimzi for Kafka) but managed DBs are usually wiser.

## Scaling

- **HPA** (Horizontal Pod Autoscaler): scales replicas on CPU/memory or custom metrics (RPS, Kafka lag via KEDA). Formula: `desired = ceil(current × currentMetric / target)`. Needs **requests** set.
- **VPA**: adjusts requests/limits (recreates pods).
- **Cluster Autoscaler / Karpenter**: adds/removes nodes when pods are unschedulable / nodes underused.
- **KEDA**: event-driven autoscaling (queue length, Kafka lag, cron), including scale to zero.
- **PodDisruptionBudget**: `minAvailable: 2` → voluntary disruptions (node drains, upgrades) can't take too many pods at once.

## Packaging & operations
- **Helm**: charts = templated manifests + values; releases with rollback. **Kustomize**: overlays without templates (built into kubectl).
- **Operators**: custom controllers + CRDs encoding operational knowledge (e.g., Postgres failover).
- RBAC (Roles/ClusterRoles bound to ServiceAccounts), Pod Security Standards (restricted), NetworkPolicies (default deny).

## Debugging cheat sheet
```bash
kubectl get pods -o wide                     # status, restarts, node
kubectl describe pod <p>                     # events: FailedScheduling, ImagePullBackOff, OOMKilled, probe failures
kubectl logs <p> -c app --previous           # logs of the crashed container
kubectl get events --sort-by=.lastTimestamp
kubectl exec -it <p> -- sh
kubectl debug -it <p> --image=busybox --target=app   # ephemeral debug container
kubectl top pod                              # metrics-server
kubectl rollout status|history|undo deploy/order-service
kubectl port-forward svc/order-service 8080:80
```
| Symptom | Usual cause |
|---|---|
| `Pending` | Not enough CPU/mem requests available, node selector/taints, PVC unbound |
| `ImagePullBackOff` | Wrong image/tag, missing registry credentials |
| `CrashLoopBackOff` | App exits on start: bad config, missing secret, failed DB connection, liveness too aggressive |
| `OOMKilled` (137) | Memory limit too low or heap+native > limit |
| Running but no traffic | Readiness failing, Service selector doesn't match pod labels, wrong targetPort |

## Quick check questions

<details><summary>1. Explain what happens when you run kubectl apply for a Deployment.</summary>

apiserver validates/admits and stores the object in etcd → Deployment controller creates/updates a ReplicaSet → RS controller creates pods → scheduler assigns nodes → kubelet pulls images and starts containers → probes pass → pods added to Service endpoints. Rolling update scales the new RS up and the old one down within surge/unavailable limits.
</details>

<details><summary>2. Liveness vs readiness vs startup probes?</summary>

Startup: protects slow-starting apps; other probes wait until it succeeds. Liveness: is the process healthy? fail → restart. Readiness: can it serve traffic now? fail → removed from load balancing. Don't put dependency checks in liveness.
</details>

<details><summary>3. How do you achieve zero-downtime deploys on Kubernetes?</summary>

RollingUpdate with maxUnavailable 0; correct readiness probes; graceful shutdown (SIGTERM handling, preStop delay for endpoint propagation, grace period > drain time); PDBs; backward-compatible DB migrations and APIs so old and new versions coexist; enough capacity for surge.
</details>

<details><summary>4. Your Java pod restarts with exit code 137. Diagnose.</summary>

137 = SIGKILL, usually the kernel OOM killer because container memory exceeded the limit (check `kubectl describe` → OOMKilled). Total JVM memory (heap + metaspace + threads + direct buffers + code cache) exceeded the limit. Fix: MaxRAMPercentage ~75, NMT to find native growth, raise limit. Could also be a liveness probe kill after the grace period — check events.
</details>

<details><summary>5. Why might HPA not scale your service?</summary>

No resource requests set (CPU utilisation is relative to requests), metrics-server missing, custom metric adapter not configured, already at maxReplicas, or the bottleneck is elsewhere (DB) so CPU stays low while latency rises — scale on a better metric (RPS, latency, lag).
</details>

## Questions asked at top companies

<details><summary>Explain Kubernetes architecture. <em>· Walmart, Amazon, Infosys, Paytm</em></summary>

Control plane: API server, etcd (state), scheduler, controller manager. Nodes: kubelet, kube-proxy/CNI, container runtime. Everything flows through the API server; controllers reconcile desired vs actual state.
</details>

<details><summary>Pod vs Deployment vs ReplicaSet vs StatefulSet. <em>· Flipkart, Accenture</em></summary>

Pod: unit of containers. ReplicaSet: maintains N pods. Deployment: manages ReplicaSets for rolling updates/rollbacks (stateless). StatefulSet: stable identities and storage per pod (databases, Kafka).
</details>

<details><summary>Types of Services in Kubernetes. <em>· Walmart, Deloitte</em></summary>

ClusterIP (internal), NodePort (port on every node), LoadBalancer (cloud LB), ExternalName (DNS alias), headless (direct pod IPs).
</details>

<details><summary>Liveness vs readiness vs startup probes. <em>· Amazon, Atlassian, Swiggy</em></summary>

Liveness failure → restart; readiness failure → removed from traffic; startup protects slow-starting apps.
</details>

<details><summary>How does a rolling update work and how do you roll back? <em>· Paytm, PhonePe</em></summary>

New ReplicaSet scaled up while old scaled down within maxSurge/maxUnavailable, gated by readiness. Rollback with `kubectl rollout undo` (or Helm/Argo).
</details>

<details><summary>ConfigMap vs Secret. <em>· Infosys, Capgemini</em></summary>

Both inject config; Secrets are for sensitive data (base64-encoded, can be encrypted at rest, tighter RBAC). Use external secret managers for real protection.
</details>

<details><summary>What is HPA and how does it work? <em>· Walmart, Flipkart</em></summary>

Horizontal Pod Autoscaler adjusts replicas based on metrics (CPU relative to requests, memory, custom metrics) using `desired = ceil(current × current/target)`.
</details>

<details><summary>Requests vs limits. <em>· Uber, Swiggy</em></summary>

Requests: guaranteed resources used for scheduling. Limits: maximum; exceeding memory → OOMKill, CPU → throttling.
</details>

<details><summary>Debug a pod in CrashLoopBackOff. <em>· Amazon, Walmart, Atlassian</em></summary>

`kubectl describe pod` (events, exit codes), `kubectl logs --previous`, check config/secrets/env, probe settings, resource limits (OOMKilled), image/entrypoint; reproduce locally with the same image and env.
</details>

<details><summary>What is Helm? <em>· Paytm, Infosys</em></summary>

Package manager for Kubernetes: charts template manifests with values per environment, releases with history and rollback.
</details>

<details><summary>What is an Ingress? <em>· Walmart, Myntra</em></summary>

An L7 HTTP routing resource (host/path rules, TLS) implemented by an ingress controller (NGINX, Traefik, cloud LB). Gateway API is the successor.
</details>

## End-to-end scenarios

<details><summary>Scenario: Deploy a Spring Boot service to K8s with zero downtime, autoscaling and secure config.</summary>

Deployment with ≥3 replicas across zones, RollingUpdate maxUnavailable=0, startup/readiness/liveness probes on actuator, preStop sleep + graceful shutdown, resource requests (+memory limit), HPA on CPU/RPS, PDB minAvailable=2, Service + Ingress with TLS, ConfigMap for config, External Secrets for credentials, NetworkPolicy, non-root securityContext, image by digest via Helm/Argo CD.
</details>

<details><summary>Scenario: After a deploy, half of requests fail for 30 seconds every time. Why?</summary>

Pods receive traffic before they're ready (no/weak readiness probe) or old pods are killed while still receiving traffic (no preStop delay; SIGTERM handled abruptly). Fix readiness probe to reflect real readiness (after warm-up), add preStop sleep and graceful shutdown with adequate termination grace period, maxUnavailable=0.
</details>
