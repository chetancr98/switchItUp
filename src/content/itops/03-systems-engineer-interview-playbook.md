---
title: Systems Engineer Interview Playbook — Rapid-Fire Questions, Live Tasks & Scenario Drills
level: 5
tags: systems engineer interview, sysadmin interview, troubleshooting scenarios, resume, certifications
---
<!-- deepened -->

## Start here: the basics

### How systems engineer interviews are run
Most loops (service companies, product companies, banks, MSPs, cloud providers) follow this pattern:
1. **Screening** — experience summary, certifications, shift/on-call flexibility.
2. **Technical rapid-fire** — 30–40 quick questions across OS, Linux, networking, Windows/AD, virtualization, cloud, backups, security.
3. **Scenario/troubleshooting** — "a server is slow", "website down", "users can't log in": they listen for **structure**.
4. **Hands-on** — terminal task or script (Bash/PowerShell), sometimes a lab environment.
5. **Design** (mid/senior) — HA setup, DR plan, new office network, cloud migration.
6. **Managerial/HR** — incidents, pressure, teamwork, communication, salary.

### The answer framework for any scenario
1. **Clarify**: scope (one user/all users), since when, what changed, error messages.
2. **Check the obvious**: is it up, reachable, disk full, recent change?
3. **Layer by layer** (network → OS → service → application) with named commands.
4. **Mitigate first** if business is impacted, then root cause.
5. **Communicate** (stakeholders, ticket updates).
6. **Prevent** (monitoring, automation, documentation).
Saying the commands you'd run ("I'd check `df -h`, then `journalctl -u nginx`") makes answers concrete and credible.
<!-- -->

---

## Rapid-fire round (practise answering each in 2–3 sentences)

### Operating systems & Linux
<details><summary>What happens when you boot a Linux server?</summary>

UEFI/BIOS POST → GRUB → kernel + initramfs → root mounted → systemd (PID 1) starts units to reach the default target → login.
</details>
<details><summary>How do you check CPU, memory and disk usage?</summary>

`top`/`htop`, `uptime`, `free -h`, `vmstat 1`, `df -h`, `df -i`, `du -sh`, `iostat -xz 1`.
</details>
<details><summary>How do you find and kill a process using a port?</summary>

`ss -tulpn | grep :8080` or `lsof -i :8080` → `kill PID` (then `kill -9` only if it won't stop).
</details>
<details><summary>What is the difference between a soft and hard link?</summary>

Hard link: another name for the same inode, same file system, survives deletion of the original name. Soft link: a pointer to a path, can cross file systems, breaks if the target moves.
</details>
<details><summary>Explain chmod 644 vs 755.</summary>

644: owner read/write, others read (typical files). 755: owner full, others read/execute (scripts, directories).
</details>
<details><summary>How do you extend a full file system?</summary>

LVM: add disk → `pvcreate` → `vgextend` → `lvextend -r -L +SIZE`. Cloud: grow the volume, `growpart`, then `xfs_growfs`/`resize2fs`.
</details>
<details><summary>How do you check logs for a failed service?</summary>

`systemctl status svc`, `journalctl -xeu svc`, `/var/log/...`, application logs.
</details>
<details><summary>What is a zombie process?</summary>

An exited process whose parent hasn't reaped it; fix or restart the parent.
</details>

### Networking
<details><summary>Explain the OSI model in one breath.</summary>

Physical, Data link (MAC/switches), Network (IP/routers), Transport (TCP/UDP ports), Session, Presentation, Application (HTTP, DNS).
</details>
<details><summary>TCP vs UDP?</summary>

TCP reliable, ordered, connection-oriented (web, SSH); UDP connectionless, fast, no guarantees (DNS, VoIP, DHCP).
</details>
<details><summary>How many hosts in a /27? What is the broadcast of 10.1.1.40/27?</summary>

30 usable hosts. Block size 32 → 40 is in 10.1.1.32–63 → broadcast 10.1.1.63.
</details>
<details><summary>How does DNS work, and which ports does it use?</summary>

Recursive resolver queries root → TLD → authoritative, caching per TTL; UDP/TCP 53.
</details>
<details><summary>What is DHCP DORA?</summary>

Discover, Offer, Request, Acknowledge.
</details>
<details><summary>What does 169.254.x.x mean?</summary>

APIPA — the client got no DHCP response.
</details>
<details><summary>Switch vs router? VLAN?</summary>

Switch forwards frames by MAC within a LAN; router forwards packets between networks by IP. VLAN segments a switch into separate broadcast domains.
</details>
<details><summary>Common ports?</summary>

22 SSH, 25 SMTP, 53 DNS, 80/443 HTTP(S), 88 Kerberos, 123 NTP, 389/636 LDAP(S), 445 SMB, 3389 RDP, 3306 MySQL, 5432 PostgreSQL, 1433 SQL Server.
</details>

### Windows & Active Directory
<details><summary>What is Active Directory? What are FSMO roles?</summary>

Central directory for identities/computers/policies. FSMO: Schema Master, Domain Naming Master, RID Master, PDC Emulator, Infrastructure Master.
</details>
<details><summary>How do you troubleshoot a GPO not applying?</summary>

`gpresult /r`, `gpupdate /force`, check OU link, security/WMI filtering, inheritance/enforcement, replication, event logs.
</details>
<details><summary>A user is locked out repeatedly — what do you check?</summary>

Event 4740 on the PDC Emulator for the source machine; stale credentials on phones, mapped drives, services or scheduled tasks.
</details>
<details><summary>How do you check which DC a client authenticated against?</summary>

`echo %LOGONSERVER%`, `nltest /dsgetdc:domain`.
</details>

### Virtualization, storage, backup, cloud
<details><summary>Type 1 vs Type 2 hypervisor; VM vs container?</summary>

Type 1 bare metal (ESXi, Hyper-V, KVM); Type 2 on a host OS (VirtualBox). Containers share the host kernel; VMs have their own OS.
</details>
<details><summary>RAID 1 vs 5 vs 10?</summary>

1 mirror (50%, survives 1 disk); 5 striping + parity (n−1, survives 1, slow rebuild); 10 mirrored stripes (50%, best for databases).
</details>
<details><summary>Incremental vs differential backup? RPO vs RTO?</summary>

Incremental: since last backup; differential: since last full. RPO: acceptable data loss; RTO: acceptable downtime.
</details>
<details><summary>Security group vs NACL?</summary>

Stateful instance-level allow rules vs stateless subnet-level allow/deny rules.
</details>

### Security & operations
<details><summary>How do you harden a server?</summary>

Minimal services, patching, firewall, SSH keys/MFA, no root login, least privilege, SELinux/AppArmor or Windows baselines, logging to SIEM, encryption, CIS benchmarks.
</details>
<details><summary>Incident vs problem vs change?</summary>

Incident restores service; problem removes root cause; change controls modifications with risk assessment and rollback plans.
</details>

## Live / hands-on tasks you should be able to do in 10 minutes
1. Find the 10 largest files under `/var` and the process holding a deleted log file open.
2. Write a Bash script that alerts when any file system is above 85% (Linux module 4).
3. Create a user with sudo rights for only restarting one service.
4. Write a systemd unit for a script and make it start at boot.
5. Add a disk, create an XFS file system and mount it persistently by UUID.
6. Show listening ports and the processes that own them; open port 8443 in the firewall.
7. PowerShell: list stopped services set to Automatic and start them; export AD users not logged in for 90 days to CSV.
8. Extract the top 5 IPs with failed SSH logins from `auth.log`.
9. Test whether a remote host's port 443 is reachable and show its certificate expiry date.
10. Schedule a nightly backup with 14-day retention.

## Scenario drills (answer out loud using the framework)

<details><summary>1. "Website is down" — users get a 502 Bad Gateway.</summary>

502 = the reverse proxy/LB can't get a valid response from the backend. Check backend service status and logs, whether it's listening on the expected port, LB health checks, recent deployments/config changes, resource exhaustion (memory/disk), and restore service (restart/rollback); then root cause.
</details>

<details><summary>2. "Users can't log in to their Windows PCs this morning."</summary>

Scope (all/some sites), domain controller health (`dcdiag`, services), DNS (clients must find DCs via SRV records), time sync (Kerberos skew), network to DCs, account lockouts/expired passwords, recent GPO or patch changes. Workarounds: cached credentials for laptops, bring a DC back, fix DNS.
</details>

<details><summary>3. "A server's disk filled up overnight."</summary>

Identify the directory (`du`), usually logs or backups; free space safely (rotate/compress, truncate active logs, remove old artefacts, handle deleted-open files); restore service; fix logrotate/retention; add alert at 80% and capacity planning.
</details>

<details><summary>4. "A VM is extremely slow but its own CPU looks low."</summary>

Check from the hypervisor: CPU ready/steal time (host overcommitted), memory ballooning/swapping, datastore latency, snapshots left running, VMware Tools; inside the VM: I/O wait, disk latency. Move to a less loaded host (vMotion), remove old snapshots, rightsize.
</details>

<details><summary>5. "We need to patch 500 servers this weekend without downtime for customer-facing apps."</summary>

Inventory and group by service; patch redundant nodes in rolling waves behind load balancers (drain → patch → reboot → health check → return); pilot group first; maintenance window and change approval; rollback plan (snapshots/previous kernel); automation (Ansible/WSUS/SCCM); verification and compliance report.
</details>

<details><summary>6. "Design high availability for an internal web application."</summary>

Two+ app servers across hosts/AZs behind a redundant load balancer with health checks, shared or replicated data (database cluster/replica, shared storage), no single points of failure in network/power, monitoring and automated failover, backups and DR to a second site, documented runbooks and regular failover tests.
</details>

<details><summary>7. "Set up IT for a new 30-person office from scratch."</summary>

Internet + firewall with VPN to HQ, switches with VLANs (users, voice, printers, guest), Wi-Fi with WPA2/3-Enterprise, DHCP/DNS (or central), identity (AD/Entra ID join, Intune), M365, file storage (SharePoint/OneDrive or file server), printers, endpoint security, backups, monitoring, documentation and asset inventory, user onboarding process.
</details>

<details><summary>8. "Suspicious logins from a foreign country on an admin account."</summary>

Treat as a security incident: disable/reset the account and revoke sessions, check sign-in and audit logs for actions taken, look for persistence (new users, mail forwarding rules, scheduled tasks), enforce MFA/conditional access, engage security, document and report.
</details>

## Certifications that move the needle (pick by target role)
| Area | Certification |
|---|---|
| Linux | **RHCSA**, then RHCE (Ansible) — hands-on, highly respected |
| Networking | **CCNA**; CompTIA Network+ for basics |
| Microsoft | **AZ-104** (Azure Administrator), MD-102 (Endpoint), MS-102 (M365 Admin) |
| AWS | Cloud Practitioner → **SysOps Administrator** / Solutions Architect Associate |
| Virtualization | VMware VCP-DCV |
| Security | CompTIA Security+ |
| Service management | ITIL 4 Foundation |
| Kubernetes | CKA (for platform-leaning roles) |

## Resume tips for systems roles
- Lead with scale and impact: "Administered 350 RHEL/Windows servers across 2 data centres with 99.95% availability."
- Quantify automation: "Automated patching with Ansible, cutting the monthly patch window from 3 nights to 1."
- Mention tools *in context*: "Migrated 40 VMs from VMware to Azure using Azure Migrate; reduced infra cost 22%."
- Incidents: "Led 15+ P1 incidents as on-call engineer; drove RCA that eliminated a recurring storage outage."
- List certifications prominently; keep it to 1–2 pages.

## Questions to ask the interviewer
On-call rotation and incident volume; how changes are approved; tools in use (monitoring, ticketing, automation); ratio of project work vs operations; training/certification budget; what success looks like in 6 months.

## End-to-end scenarios

<details><summary>Scenario (full mock): "Walk me through what you'd do in your first 30 days as our systems engineer."</summary>

Week 1: access, documentation, architecture and monitoring review, meet stakeholders, shadow on-call. Weeks 2–3: inventory (servers, backups, certificates, patch status), identify risks (single points of failure, unpatched systems, untested backups, expiring certs), quick wins (missing alerts, runbooks). Week 4: propose a prioritised improvement plan (automation, DR test, security baseline), take on-call independently. Shows you're methodical, risk-aware and communicative.
</details>

<details><summary>Scenario: The interviewer asks a question you don't know (e.g., a specific vendor's storage feature).</summary>

Be honest, then reason from fundamentals: "I haven't used that product, but I'd expect it to work like X because…; I'd verify in the vendor documentation and test in a lab." Interviewers value honesty and structured thinking over bluffing.
</details>
