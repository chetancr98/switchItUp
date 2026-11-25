---
title: Security for Systems Engineers — Hardening, Patching, Identity, PKI, Logging & Incident Response
level: 3
tags: security, hardening, patch management, mfa, least privilege, siem, incident response, cis benchmarks
---
<!-- deepened -->

## Start here: the basics

### The CIA triad
- **Confidentiality** — only authorised people can read data (encryption, access control).
- **Integrity** — data isn't altered without authorisation (hashes, signatures, permissions, audit).
- **Availability** — systems are up when needed (redundancy, backups, DDoS protection).
Every security control protects one or more of these.

### Core principles you'll be asked about
| Principle | Meaning |
|---|---|
| **Least privilege** | Give accounts and services only the access they need, for only as long as needed |
| **Defence in depth** | Multiple layers (firewall + patching + MFA + EDR + backups) so one failure isn't a breach |
| **Zero trust** | Never trust by network location; verify identity, device and context for every access |
| **Separation of duties** | No single person can perform a critical action alone (e.g., change + approve) |
| **Secure by default** | Default-deny firewalls, disabled unused services, strong defaults |

### Authentication vs authorization
Authentication (AuthN) = proving who you are (password, MFA, certificate). Authorization (AuthZ) = what you're allowed to do (permissions, roles). **MFA** combines factors: something you know (password), have (phone/token), are (biometric).
<!-- -->

---

## Hardening servers

### Linux hardening checklist
- Minimal install; remove unused packages/services (`systemctl list-unit-files --state=enabled`).
- Patch regularly (automatic security updates where appropriate).
- SSH: keys only, no root login, restricted users, MFA via bastion, fail2ban.
- Host firewall default deny; only required ports.
- **SELinux/AppArmor enforcing**.
- File permissions on sensitive files; no world-writable directories without sticky bit; find setuid binaries.
- Separate partitions with mount options (`/tmp` noexec,nosuid).
- Logging and audit (`auditd` rules for sensitive files and privileged commands), central log shipping.
- Time sync, banner/legal notice, password policy (PAM), lock inactive accounts.
- Benchmark against **CIS Benchmarks**; automate with Ansible and scan with OpenSCAP/Lynis.

### Windows hardening checklist
- Apply security baselines via GPO/Intune (Microsoft Security Baselines, CIS).
- Remove local admin rights from users; **LAPS** for unique local admin passwords.
- Windows Defender / EDR, attack surface reduction rules, BitLocker disk encryption.
- Disable SMBv1, legacy protocols (NTLMv1, LM), restrict RDP (NLA, VPN/bastion only, MFA).
- Tiered admin model: separate admin accounts; privileged access workstations for domain admins.
- PowerShell logging, Sysmon for detailed telemetry, audit policies (logon events, privilege use).

### Network hardening
Segmentation (VLANs, firewalls between tiers), management interfaces on separate networks, disable unused switch ports, 802.1X for network access, secure protocols (SSH not Telnet, SNMPv3, HTTPS), IDS/IPS, DDoS protection at the edge, regular firewall rule reviews.

## Patch & vulnerability management
1. **Inventory** assets and software (you can't patch what you don't know).
2. **Scan** for vulnerabilities (Nessus, Qualys, Rapid7, Microsoft Defender Vulnerability Management, OpenVAS).
3. **Prioritise** by severity (CVSS), exploitability (known exploited vulnerabilities lists), exposure (internet-facing first) and asset criticality.
4. **Test** patches in a staging/pilot ring.
5. **Deploy** in waves with maintenance windows (WSUS/SCCM/Intune, Ansible/Satellite, cloud patch managers).
6. **Verify** and report compliance; document exceptions with compensating controls and expiry.
Emergency process for zero-days actively exploited: patch or mitigate within hours/days, not the monthly cycle.

## Identity and access management
- Central identity (AD/Entra ID/LDAP) with SSO; **joiner–mover–leaver** processes (access granted by role, adjusted on moves, removed on exit).
- **MFA everywhere**, phishing-resistant MFA (FIDO2/passkeys) for admins.
- **Privileged Access Management (PAM)**: vaulted admin credentials, just-in-time elevation, session recording, break-glass accounts kept offline and monitored.
- Service accounts: managed service accounts (gMSA) or cloud managed identities, no interactive logon, rotated secrets.
- Periodic **access reviews**; remove stale accounts.
- Password policy per modern guidance: long passphrases, block known-breached passwords, no forced frequent rotation without cause, lockout thresholds balanced against denial-of-service.

## Encryption and PKI
- **At rest**: BitLocker, LUKS/dm-crypt, cloud disk encryption with managed keys, database TDE.
- **In transit**: TLS 1.2+ (prefer 1.3), disable old protocols/ciphers, HSTS for web, SSH, IPsec VPN.
- **Key management**: HSM/KMS/Key Vault, rotation, access control on keys.
- **PKI**: internal CA hierarchy (offline root, issuing subordinates), certificate templates and auto-enrolment (AD CS), revocation (CRL/OCSP), certificate inventory and expiry monitoring.

## Logging, monitoring & detection
- Collect security-relevant logs centrally: authentication (Windows 4624/4625/4740/4672, Linux auth.log/secure), privilege changes (group membership 4728/4732), firewall/VPN, DNS, EDR alerts, cloud audit logs.
- **SIEM** (Splunk, Microsoft Sentinel, Elastic, QRadar) correlates events and alerts; SOC analysts triage.
- **EDR** on endpoints and servers detects malicious behaviour.
- Retention per compliance requirements; protect logs from tampering.

## Incident response (NIST-style lifecycle)
1. **Preparation** — playbooks, contacts, tools, backups, logging.
2. **Detection & analysis** — triage alerts, scope the incident, preserve evidence.
3. **Containment** — isolate hosts, disable compromised accounts, block IOCs.
4. **Eradication** — remove malware/persistence, patch the entry point, reset credentials.
5. **Recovery** — restore from clean backups, monitor closely.
6. **Lessons learned** — post-incident review, improve controls.

## Common attacks a systems engineer should explain
Phishing and credential theft, ransomware, brute force/password spraying, privilege escalation, lateral movement (Pass-the-Hash, RDP), exploitation of unpatched internet-facing services, misconfigured cloud storage, insider threats, DDoS, supply-chain attacks via software updates.

## Compliance awareness
ISO 27001, SOC 2, PCI DSS (card data), GDPR and India's DPDP Act (personal data), RBI/SEBI guidelines for financial organisations — know they exist and that they require access control, logging, encryption, patching evidence, change management and incident processes.

## Quick check questions

<details><summary>Why is "disable SELinux" a bad fix for a permission error?</summary>

It removes a whole security layer system-wide. Instead find the denial (`ausearch -m avc`), apply the correct file context or boolean (`semanage`, `setsebool`, `restorecon`) so the app works with SELinux enforcing.
</details>

<details><summary>What's the first thing to do when you suspect an admin account is compromised?</summary>

Contain: disable the account / revoke sessions and tokens (and reset its credentials), then investigate its recent activity and related hosts, and look for persistence such as new accounts or scheduled tasks.
</details>

## Questions asked in interviews

<details><summary>How do you harden a Linux (or Windows) server? <em>· banks, Infosys, TCS, Accenture security & infra roles</em></summary>

Minimal services, patching, secure remote access (keys/MFA/no root), host firewall, SELinux/AppArmor, least privilege, logging/audit to SIEM, encryption, CIS benchmark compliance automated via Ansible/GPO, regular scanning. Windows: baselines, LAPS, no local admin for users, EDR, BitLocker, disable legacy protocols, tiered admin.
</details>

<details><summary>Explain your patch management process. <em>· IBM, HCL, Wipro, banks</em></summary>

Inventory → vulnerability scanning → risk-based prioritisation → test/pilot ring → staged rollout in maintenance windows → verification and compliance reporting → exception handling; emergency path for actively exploited critical vulnerabilities.
</details>

<details><summary>What is least privilege and how do you implement it? <em>· Amazon, Microsoft</em></summary>

Minimum permissions for the minimum time: role-based groups, no standing admin rights (JIT elevation/PAM), separate admin accounts, service accounts scoped narrowly, regular access reviews, removing access on role change.
</details>

<details><summary>What is MFA and why isn't SMS ideal? <em>· banks, Microsoft</em></summary>

Multiple independent factors for authentication. SMS codes can be intercepted via SIM swapping and phishing; authenticator apps and especially phishing-resistant FIDO2 keys/passkeys are stronger.
</details>

<details><summary>Symmetric vs asymmetric encryption; where is each used? <em>· Infosys, security roles</em></summary>

Symmetric uses one shared key (AES) — fast, used for bulk data. Asymmetric uses key pairs (RSA/ECC) — used for key exchange, signatures and certificates. TLS uses asymmetric crypto to establish a symmetric session key.
</details>

<details><summary>What would you do in the first hour of a ransomware incident? <em>· consulting firms, banks, MSPs</em></summary>

Activate the IR plan; isolate affected systems (network disconnect, keep powered for forensics where possible); disable compromised accounts; protect backups (verify isolation); identify scope and strain; communicate to stakeholders; engage security/legal; don't pay or wipe hastily; begin recovery planning from clean backups.
</details>

<details><summary>What is a SIEM and what logs would you send to it? <em>· SOC-adjacent roles, banks</em></summary>

Central platform that collects, correlates and alerts on security events. Send authentication logs, privileged activity, firewall/VPN/proxy/DNS logs, EDR alerts, cloud audit logs, critical application logs.
</details>

## End-to-end scenarios

<details><summary>Scenario: The security team reports 300 servers with a critical vulnerability; 20 are internet-facing. Prioritise and execute.</summary>

Patch/mitigate the 20 internet-facing servers first (emergency change, within hours), then critical internal systems, then the rest in waves. If a patch isn't possible immediately, apply mitigations (disable the vulnerable feature, WAF rule, restrict network access). Track progress in a dashboard, verify with a rescan, report exceptions with owners and dates.
</details>

<details><summary>Scenario: Audit finds 40 users with permanent Domain Admin rights. Fix it without breaking operations.</summary>

Review each account's actual needs; move day-to-day tasks to delegated, scoped groups (help desk password resets via OU delegation); keep 2–3 named admin accounts plus a monitored break-glass account; introduce PAM/JIT elevation and separate admin accounts; alert on Domain Admins membership changes; schedule quarterly access reviews.
</details>
