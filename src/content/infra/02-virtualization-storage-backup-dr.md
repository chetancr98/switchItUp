---
title: Virtualization, Storage, Backup & Disaster Recovery
level: 3
tags: virtualization, vmware, hyper-v, kvm, san, nas, backup, disaster recovery, rpo, rto
---
<!-- deepened -->

## Start here: the basics

### Virtualization
A **hypervisor** lets one physical server run many **virtual machines (VMs)**, each with its own OS. Benefits: better hardware utilisation, isolation, snapshots, fast provisioning, live migration between hosts.
- **Type 1 (bare metal)**: runs directly on hardware — VMware ESXi, Microsoft Hyper-V, KVM (Linux), Xen, Proxmox VE. Used in data centres.
- **Type 2 (hosted)**: runs on top of a desktop OS — VirtualBox, VMware Workstation. Used on laptops for labs.

**Containers** (Docker) are different: they share the host OS kernel and isolate processes — lighter than VMs, but less isolation. VMs virtualise hardware; containers virtualise the operating system.

### Storage types
| Type | What it presents | Protocols | Example use |
|---|---|---|---|
| **DAS** (direct attached) | Local disks | SATA/SAS/NVMe | Single server |
| **NAS** | Files over the network | NFS, SMB/CIFS | Shared file shares, home drives |
| **SAN** | Block devices over a dedicated network | Fibre Channel, iSCSI, NVMe-oF | VM datastores, databases |
| **Object storage** | Objects via HTTP API | S3, Azure Blob | Backups, archives, media, data lakes |

### Backup vs snapshot vs replication
- **Snapshot**: point-in-time state on the same storage — quick rollback before a change, **not a backup** (same failure domain) and keeping VM snapshots for long hurts performance.
- **Backup**: an independent copy stored elsewhere, restorable after loss.
- **Replication**: continuously copies data to another site — great for availability, but replicates corruption/deletion too.
<!-- -->

---

## Virtualization in depth

### VMware vSphere vocabulary (most enterprise interviews)
ESXi (hypervisor), **vCenter** (central management), datastores (VMFS/NFS/vSAN), **vMotion** (live-migrate a running VM to another host), **Storage vMotion** (move its disks), **HA** (restart VMs on another host if a host fails — brief downtime), **DRS** (automatic load balancing across hosts), **Fault Tolerance** (lock-step secondary VM — zero downtime), templates and clones, VMware Tools, resource pools, shares/reservations/limits.
Hyper-V equivalents: Hyper-V Manager / SCVMM, Live Migration, Failover Clustering, Cluster Shared Volumes. KVM: libvirt/virsh, Proxmox, OpenStack.

### Overcommitment and performance
- CPU: vCPUs exceed physical cores — fine to a degree; watch **CPU ready** (VMware) / steal time (Linux guests).
- Memory: ballooning, swapping, compression when overcommitted — avoid for databases.
- Storage: IOPS and latency on shared datastores ("noisy neighbours"); thin vs thick provisioning (thin saves space but can run the datastore out of space!).
- Right-size VMs: more vCPUs isn't always faster (scheduling overhead).

### Storage in depth
- **IOPS, throughput, latency** — the three performance metrics; random small I/O (databases) needs IOPS/latency, sequential large I/O (backups, video) needs throughput.
- **SSD vs HDD vs NVMe**; tiering and caching.
- **RAID** (see Linux admin) and modern erasure coding.
- **iSCSI**: initiator (server) ↔ target (storage); multipathing (MPIO) for redundancy; separate storage VLAN/network.
- **LUNs**, zoning and masking in Fibre Channel SANs.
- **Thin provisioning**, **deduplication**, **compression**.
- **Quotas** on file shares; **snapshots** on NAS (Previous Versions for users).

## Backup strategy

### The 3-2-1(-1-0) rule
- **3** copies of data, on **2** different media/storage types, **1** off-site.
- Modern extension: **1** copy offline or **immutable** (ransomware can't encrypt/delete it), **0** errors after verified restore tests.

### Backup types
| Type | Backs up | Restore needs | Trade-off |
|---|---|---|---|
| Full | Everything | That backup | Slow, large |
| Incremental | Changes since the last backup (any type) | Last full + every incremental since | Fast backups, slower restores |
| Differential | Changes since the last full | Last full + latest differential | Grows during the week, quicker restore |
| Synthetic full | Built from full + incrementals on the backup server | — | Avoids reading production again |

Retention schemes (e.g., GFS: daily/weekly/monthly/yearly), application-consistent backups (VSS on Windows, database dumps/log backups so the backup isn't corrupt mid-transaction), encryption, offsite/cloud copies. Tools: Veeam, Commvault, Veritas NetBackup, Azure Backup, AWS Backup, restic/borg on Linux, database-native tools (pg_dump/pg_basebackup + WAL, SQL Server backups).

**A backup you haven't restored is not a backup.** Schedule restore tests and document restore steps.

## Disaster recovery
- **RPO** (Recovery Point Objective): how much data loss is acceptable (time since last good copy).
- **RTO** (Recovery Time Objective): how long until service is restored.
- Business Impact Analysis decides RPO/RTO per system; cost rises sharply as they approach zero.

| Strategy | RPO/RTO | Cost |
|---|---|---|
| Backup & restore | hours–days | Low |
| Pilot light (minimal core running at DR site) | minutes–hours | Medium |
| Warm standby (scaled-down full copy) | minutes | Higher |
| Active-active multi-site | near zero | Highest |

DR plan contents: contact list, priorities (which systems first), runbooks, failover/failback steps, DNS changes, credentials access (break-glass), communication plan. **Test it** (tabletop exercises, partial and full failover drills). Business continuity (BCP) covers people and processes beyond IT.

### High availability vs DR
HA keeps a service running through component failures inside a site (clusters, load balancers, redundant power/network, RAID). DR recovers after a site-wide disaster (fire, region outage, ransomware).

## Quick check questions

<details><summary>Is a VM snapshot a backup?</summary>

No. It lives on the same storage and depends on the base disk; if the datastore fails or gets encrypted, the snapshot is gone too. Long-lived snapshots also degrade performance. Use proper backups stored elsewhere.
</details>

<details><summary>RPO 15 minutes, RTO 1 hour for the order database — what does that imply?</summary>

You need at least log shipping/replication every ≤ 15 minutes (or continuous replication) and an automated or well-rehearsed failover/restore that completes within an hour — nightly backups alone won't meet it.
</details>

## Questions asked in interviews

<details><summary>Type 1 vs Type 2 hypervisor? VM vs container? <em>· VMware, TCS, Infosys, Wipro</em></summary>

Type 1 runs on bare metal (ESXi, Hyper-V, KVM) for production; Type 2 runs on a host OS (VirtualBox, Workstation) for desktops/labs. VMs virtualise hardware with full guest OS; containers share the host kernel, start faster, use less overhead, weaker isolation.
</details>

<details><summary>What is vMotion, HA and DRS? <em>· VMware-focused roles, HCL, IBM</em></summary>

vMotion: live migration of running VMs between hosts with no downtime. HA: automatically restarts VMs on surviving hosts after a host failure. DRS: balances VM placement across a cluster based on resource usage.
</details>

<details><summary>SAN vs NAS. <em>· Dell, HP, NetApp-style questions</em></summary>

SAN presents block storage (LUNs) over FC/iSCSI — the server formats it; used for VMs/databases. NAS presents file shares over NFS/SMB — the NAS manages the file system; used for shared files.
</details>

<details><summary>Full vs incremental vs differential backups. <em>· Infosys, Accenture, banks</em></summary>

Full copies everything; incremental copies changes since the last backup of any type (fastest backups, restore needs the chain); differential copies changes since the last full (restore needs full + last differential).
</details>

<details><summary>Explain RPO and RTO. <em>· banks, Amazon, consulting firms</em></summary>

RPO: maximum acceptable data loss measured in time; RTO: maximum acceptable downtime. They drive backup frequency, replication and DR architecture choices.
</details>

<details><summary>How do you protect backups against ransomware? <em>· security-conscious employers, banks</em></summary>

Immutable/WORM storage or object lock, offline/air-gapped copies, separate credentials and MFA for the backup system (not domain-joined admin accounts), encryption, monitoring for mass deletion, regular restore tests.
</details>

<details><summary>Thin vs thick provisioning risk? <em>· VMware, storage admins</em></summary>

Thin allocates on write and allows overcommitment — efficient but can exhaust the datastore and crash/pause VMs; requires monitoring and alerts. Thick reserves space up front.
</details>

## End-to-end scenarios

<details><summary>Scenario: Ransomware encrypted the file server and its local snapshots. What now?</summary>

Isolate affected systems from the network, preserve evidence, engage incident response/security, identify the infection scope and time of compromise, restore from the latest clean backup copy from immutable/offline storage into a clean environment (rebuild the server rather than decrypt), reset credentials (especially privileged), patch the entry point, validate data with business owners, then review: backup isolation, MFA, EDR, segmentation.
</details>

<details><summary>Scenario: Design backup and DR for a small company with one Hyper-V host running 8 VMs.</summary>

Daily application-aware VM backups to a local backup appliance/NAS (fast restores) + copy to cloud object storage with immutability (off-site), 30 days daily + 12 monthly retention, database log backups every 15 minutes for the ERP, documented restore runbook, quarterly restore test; for faster recovery, replicate critical VMs to a second host or cloud DR target (Hyper-V Replica / Azure Site Recovery), and define RPO/RTO with management.
</details>
