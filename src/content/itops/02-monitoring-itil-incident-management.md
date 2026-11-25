---
title: Monitoring, ITIL & IT Service Management — Incidents, Problems, Changes, SLAs
level: 4
tags: monitoring, itil, incident management, change management, problem management, sla, on-call
---
<!-- deepened -->

## Start here: the basics

### Monitoring: know before users tell you
Monitoring collects measurements from systems and alerts when something is wrong.
- **Metrics** — numbers over time: CPU %, free disk, response time, error rate.
- **Logs** — events with details: "login failed for priya from 10.2.3.4".
- **Checks/probes** — is the website reachable? does the login page load?
- **Alerts** — notifications when a condition holds (disk > 90% for 10 minutes).

### ITIL in one paragraph
**ITIL** (IT Infrastructure Library) is the most common framework for running IT services. Interviewers for systems and support roles expect you to know its core processes and vocabulary — especially **incident**, **problem**, **change**, **service request** and **SLAs** — and tools like **ServiceNow**, Jira Service Management or BMC Remedy.

### Incident vs problem vs change vs request
| Term | Meaning | Example |
|---|---|---|
| **Incident** | Unplanned interruption or reduced quality of a service | Email is down |
| **Problem** | The underlying cause of one or more incidents | Exchange server crashes when the log disk fills |
| **Change** | Adding, modifying or removing something that could affect services | Increase the log disk, patch the server |
| **Service request** | A standard user request, not a failure | New laptop, access to a shared folder, password reset |
<!-- -->

---

## Monitoring in depth

### What to monitor (layers)
| Layer | Examples |
|---|---|
| Hardware/hypervisor | Host health, disk/RAID status, temperature, PSU, datastore space |
| OS | CPU, memory, disk space & latency, swap, load, process up |
| Network | Interface utilisation/errors, latency, packet loss, BGP/VPN tunnel state |
| Services | Port/HTTP checks, service status, certificate expiry, backup job success |
| Applications | Response time, error rate, queue lengths, business transactions |
| Security | Failed logins, privileged changes, AV/EDR alerts |

Methods: **USE** (utilisation, saturation, errors) for resources; **RED** (rate, errors, duration) for services; **golden signals** (latency, traffic, errors, saturation).

### Tools landscape
Zabbix, Nagios/Icinga, PRTG, SolarWinds (traditional infra monitoring); **Prometheus + Grafana** + Alertmanager (cloud-native metrics); ELK/OpenSearch, Graylog, Splunk, Loki (logs); Datadog, New Relic, Dynatrace (SaaS observability); CloudWatch/Azure Monitor (cloud); Uptime Kuma / blackbox probes (synthetic checks).

### Good alerting
- Alert on **symptoms users feel** and on imminent failures (disk will be full in 4 hours), not on every metric spike.
- Every alert must be **actionable** with a **runbook** link; route by severity (page vs ticket vs email).
- Use durations/hysteresis to avoid flapping; group related alerts; suppress during maintenance windows.
- Review noisy alerts monthly — alert fatigue makes people ignore real ones.

### SLI, SLO, SLA
- **SLI**: what you measure (percentage of successful logins in under 2 s).
- **SLO**: internal target (99.9% per month).
- **SLA**: contractual commitment with penalties (99.5% uptime, P1 response in 15 minutes).
- 99.9% monthly ≈ 43 minutes of allowed downtime; 99.99% ≈ 4.3 minutes.

## ITIL processes in depth

### Incident management
1. **Detect/log** (monitoring alert or user ticket).
2. **Categorise and prioritise**: Priority = **Impact** × **Urgency** (P1 critical — e.g., whole company/customer-facing outage; P4 low — single user cosmetic issue).
3. **Initial diagnosis**, knowledge base, workaround.
4. **Escalate**: functional (to L2/L3 specialists) or hierarchical (to management for P1s).
5. **Resolve and recover**, confirm with the user/business.
6. **Close** with resolution notes.

Major incidents (P1): an incident manager coordinates, a bridge call, regular status updates to stakeholders (every 30 min), status page, then a **post-incident review**.

Support tiers: **L1** service desk (logging, basic fixes, password resets), **L2** (deeper technical troubleshooting), **L3** (engineering/vendor-level experts).

### Problem management
- **Reactive**: after major/recurring incidents, find the root cause.
- **Proactive**: analyse trends to prevent incidents.
- Root cause techniques: **5 Whys**, **fishbone (Ishikawa)** diagrams, timeline analysis, fault tree.
- **Known error**: a problem with a documented root cause and workaround, stored in the known error database (KEDB).

### Change management (change enablement)
| Change type | Approval | Example |
|---|---|---|
| **Standard** | Pre-approved, low risk, repeatable | Add a user to a group, routine patch via an approved procedure |
| **Normal** | Assessed and approved by a change authority / **CAB** | Firewall rule change, server migration |
| **Emergency** | Expedited approval (ECAB) to fix an urgent issue | Patching an actively exploited vulnerability |

A good change request contains: description, reason, risk & impact assessment, affected services/CIs, implementation plan, **test plan**, **rollback (back-out) plan**, schedule/maintenance window, communication plan, approvals. Unauthorised changes are a leading cause of outages.

### Other ITIL concepts
- **CMDB** (configuration management database): configuration items (servers, apps, network devices) and their relationships — used for impact analysis.
- **Service catalogue**, **request fulfilment**, **knowledge management**, **release & deployment**, **availability & capacity management**, **continual improvement**.
- ITIL 4 frames these as "practices" within a service value system; the vocabulary above is what interviews use.

## On-call and documentation
- Runbooks for common alerts; architecture diagrams; contact/escalation lists; vendor support contracts and how to open cases.
- Handover notes between shifts; follow the sun.
- Blameless post-incident reviews: timeline, impact, root cause(s), what went well, action items with owners and dates.

## Quick check questions

<details><summary>Password reset request — incident or service request?</summary>

Service request (standard request fulfilled through a defined procedure), unless the inability to log in is caused by a system failure affecting the service.
</details>

<details><summary>What's the difference between a workaround and a resolution?</summary>

A workaround restores service or reduces impact without fixing the cause (restart the service); a resolution removes the root cause (fix the memory leak), usually via problem and change management.
</details>

## Questions asked in interviews

<details><summary>Explain incident vs problem vs change management. <em>· IBM, Accenture, Infosys, TCS, Wipro, HCL (ITIL questions are standard)</em></summary>

Incident: restore normal service ASAP. Problem: find and remove root causes of incidents. Change: control modifications to minimise risk. They connect: incidents raise problems, problems lead to changes, changes are tested and recorded.
</details>

<details><summary>How do you prioritise incidents? <em>· service desk and infra roles everywhere</em></summary>

Impact (how many users/services/business-critical?) × urgency (how fast will it hurt?) → priority matrix (P1–P4) with SLA response/resolution targets; escalate per policy; communicate.
</details>

<details><summary>What is a CAB and what does a change request need? <em>· IBM, HCL, banks</em></summary>

Change Advisory Board reviews normal changes for risk/impact/scheduling. A request needs description, justification, risk and impact, implementation steps, test and rollback plans, window, affected CIs, communication and approvals.
</details>

<details><summary>What would you monitor on a critical server and how do you avoid alert fatigue? <em>· Amazon, MSPs</em></summary>

CPU/memory/disk space & latency/network/process and service checks/logs/backup status/certificate expiry/application health. Avoid fatigue with actionable thresholds, durations, severity routing, deduplication, maintenance suppression and periodic tuning.
</details>

<details><summary>Explain SLA, SLO and SLI. <em>· Google SRE-influenced, Microsoft, banks</em></summary>

SLI: measured indicator; SLO: target for that indicator; SLA: contractual promise with consequences, usually looser than internal SLOs.
</details>

<details><summary>What is RCA and how do you perform one? <em>· IBM, Accenture, product companies</em></summary>

Root cause analysis: build a timeline from logs/monitoring/changes, identify contributing factors, use 5 Whys/fishbone, distinguish trigger vs root cause, define corrective and preventive actions with owners — blameless.
</details>

<details><summary>Describe a major incident you handled. <em>· behavioral, every company</em></summary>

STAR: situation (impact, users affected), your role (incident lead / technical responder), actions (triage steps, communication cadence, mitigation, escalation to vendors), result (time to restore, SLA), follow-up (RCA, changes to prevent recurrence).
</details>

## End-to-end scenarios

<details><summary>Scenario: At 10 AM the company's email stops working for everyone. You're the on-call engineer. Run the incident.</summary>

Acknowledge and declare a P1; open a bridge; verify scope (internal/external mail, OWA vs Outlook, M365 status page if cloud); check recent changes; triage quickly (mail flow, DNS/MX records, certificates, connectors, server/services health, licensing); communicate every 30 minutes; apply a workaround (e.g., reroute mail, roll back last night's change); confirm restoration with users; close with a timeline; schedule problem management for root cause.
</details>

<details><summary>Scenario: The same file server crashes every Monday morning. Treat it as a problem.</summary>

Open a problem record linking the incidents; gather data (event logs, crash dumps, performance counters, weekend jobs — backups, antivirus full scans, patch reboots); correlate with Monday morning logon surge; hypothesis (e.g., antivirus scan + logon storm exhausting memory); test the fix in a change (reschedule scans, add RAM, exclude paths); document the known error and workaround until fixed; verify over subsequent Mondays.
</details>
