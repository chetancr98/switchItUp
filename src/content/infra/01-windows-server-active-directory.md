---
title: Windows Server, Active Directory, Group Policy, PowerShell & Entra ID
level: 2
tags: windows server, active directory, group policy, powershell, entra id, azure ad, microsoft 365
---
<!-- deepened -->

## Start here: the basics

### Why Active Directory matters
Most companies run Windows desktops and many Windows servers. **Active Directory Domain Services (AD DS)** is the central directory: one place for user accounts, computers, groups and policies. Employees log in once with their domain account and get access to email, files, printers and apps.

### Key concepts in plain words
| Term | Meaning |
|---|---|
| **Domain** | A security boundary for users and computers, e.g. `corp.example.com` |
| **Domain Controller (DC)** | A server running AD DS that stores the directory and authenticates users. Always have at least two |
| **Forest / tree** | One or more domains sharing a schema and trust — the top-level container |
| **OU (Organizational Unit)** | A folder inside a domain to organise objects and apply Group Policy / delegate admin rights |
| **Group** | Collection of users/computers for granting permissions |
| **Group Policy Object (GPO)** | Settings pushed to users/computers (password policy, drive maps, software, security settings) |
| **Kerberos** | The default authentication protocol in AD (tickets instead of sending passwords) |
| **DNS** | AD depends on DNS (SRV records) to find domain controllers |

### Everyday admin tasks
Create users, reset passwords, unlock accounts, add users to groups, join computers to the domain, apply GPOs, manage file share permissions — via the GUI tools (**Active Directory Users and Computers**, **Group Policy Management**) or **PowerShell**.
<!-- -->

---

## Active Directory in depth

### Structure and roles
- **Schema**: definitions of object types/attributes (forest-wide).
- **Global Catalog**: partial replica of all objects in the forest for searches/logons.
- **Sites and replication**: sites map to physical locations/subnets; DCs replicate changes (multi-master). Check with `repadmin /replsummary`, `dcdiag`.
- **FSMO roles** (only one DC holds each): Schema Master and Domain Naming Master (per forest); RID Master, PDC Emulator (time source, password changes, lockouts), Infrastructure Master (per domain). `netdom query fsmo`.
- **Trusts** between domains/forests for cross-access.
- **Functional levels**, **Read-only DCs** for branch offices.

### Groups and permissions (AGDLP)
Group scopes: **Domain Local**, **Global**, **Universal**; types: security vs distribution. Best practice **AGDLP**: put **A**ccounts in **G**lobal groups (by role), nest those in **D**omain **L**ocal groups (by resource), and grant **P**ermissions to the domain local groups. Share vs NTFS permissions: effective access is the most restrictive of the two — common practice: share "Authenticated Users: Change", control access with NTFS.

### Group Policy
- Linked to **Site → Domain → OU** (LSDOU order; later wins), with **Enforced** and **Block Inheritance** options, security and WMI filtering.
- Computer configuration applies at startup/background refresh (~90 min ± 30), user configuration at logon.
- Troubleshooting: `gpupdate /force`, `gpresult /r` or `/h report.html`, Resultant Set of Policy, check that the object is in the linked OU and the GPO isn't filtered out, replication of SYSVOL.
- Common GPOs: password and lockout policy, mapped drives, printers, software deployment, desktop restrictions, Windows Update settings, BitLocker, firewall, LAPS (local admin password rotation).

### Authentication: Kerberos vs NTLM
Kerberos: client gets a TGT from the KDC (on DCs), then service tickets — mutual authentication, requires DNS names and synchronized clocks (5-minute skew limit). NTLM: older challenge-response, used when Kerberos isn't possible (IP addresses, workgroups) — weaker; reduce its use. "Clock skew too great" and SPN issues are classic Kerberos problems.

### Core Windows Server roles
DNS, DHCP, File Server (DFS namespaces & replication, FSRM quotas), Print Server, IIS (web), Hyper-V, Remote Desktop Services, Windows Server Update Services (WSUS), Certificate Services (AD CS), failover clustering. Server Core (no GUI) is preferred for smaller attack surface — managed via PowerShell/Windows Admin Center.

### PowerShell for administrators
PowerShell passes **objects**, not text — filter and select properties.
```powershell
Get-Service | Where-Object Status -eq 'Stopped' | Select-Object Name, StartType
Get-Process | Sort-Object CPU -Descending | Select-Object -First 5
Get-EventLog -LogName System -EntryType Error -Newest 20     # or Get-WinEvent
Test-NetConnection fileserver -Port 445
Get-CimInstance Win32_LogicalDisk | Select DeviceID, @{n='FreeGB';e={[math]::Round($_.FreeSpace/1GB,1)}}

# Active Directory module
Import-Module ActiveDirectory
New-ADUser -Name "Priya Shah" -SamAccountName pshah -UserPrincipalName pshah@corp.example.com `
  -Path "OU=Finance,DC=corp,DC=example,DC=com" -AccountPassword (Read-Host -AsSecureString) -Enabled $true
Add-ADGroupMember -Identity "Finance-Users" -Members pshah
Unlock-ADAccount -Identity pshah
Search-ADAccount -LockedOut | Select Name, LastLogonDate
Get-ADUser -Filter * -Properties LastLogonDate | Where-Object { $_.LastLogonDate -lt (Get-Date).AddDays(-90) }   # stale accounts

# Bulk create users from CSV
Import-Csv .\new_hires.csv | ForEach-Object {
  New-ADUser -Name $_.Name -SamAccountName $_.Sam -Department $_.Dept -Path $_.OU `
    -AccountPassword (ConvertTo-SecureString $_.TempPassword -AsPlainText -Force) -ChangePasswordAtLogon $true -Enabled $true
}

# Remote management
Invoke-Command -ComputerName app01, app02 -ScriptBlock { Get-Service w3svc }
```
Execution policy, PowerShell remoting (WinRM), modules, error handling with `try/catch` and `-ErrorAction Stop`.

### Microsoft Entra ID (formerly Azure AD) and Microsoft 365
- Entra ID is a **cloud identity** service (modern authentication: OAuth/OpenID Connect/SAML) — not the same as AD DS (no OUs/GPOs/Kerberos domain controllers).
- **Hybrid identity**: on-prem AD synced to Entra ID with **Entra Connect** (password hash sync, pass-through auth, or federation).
- **Conditional Access** (require MFA, compliant device, block legacy auth), **Intune** for device management, **SSO** to SaaS apps.
- Microsoft 365 admin tasks: licences, mailboxes (Exchange Online), shared mailboxes, Teams, SharePoint permissions, retention.

### Security basics for AD
Tiered admin model (separate admin accounts; domain admins never log on to workstations), LAPS, MFA for admins, disable/clean stale accounts, monitor privileged group changes, patch DCs, protect against credential theft (Pass-the-Hash), backups of AD (system state) and tested forest recovery.

## Quick check questions

<details><summary>Why do AD logins fail when a client's clock is 10 minutes off?</summary>

Kerberos tickets are time-stamped; the default maximum skew is 5 minutes. Fix time sync (domain hierarchy with the PDC Emulator syncing to a reliable source).
</details>

<details><summary>A GPO isn't applying to a user. First commands?</summary>

`gpresult /r` (or `/h`) on the machine to see applied/denied GPOs, `gpupdate /force`, check the user/computer is in the linked OU, security filtering, WMI filters, and that it's a user vs computer setting.
</details>

## Questions asked in interviews

<details><summary>What is Active Directory and what are its components? <em>· TCS, Infosys, Wipro, HCL, Microsoft (support)</em></summary>

Directory service for centralised identity and policy: domains, forests, trees, OUs, objects (users, computers, groups), domain controllers, global catalog, schema, sites, DNS integration, Group Policy, Kerberos authentication, FSMO roles.
</details>

<details><summary>Name the FSMO roles and what each does. <em>· Wipro, HCL, Capgemini (very common)</em></summary>

Schema Master (schema changes) and Domain Naming Master (add/remove domains) — one per forest; RID Master (allocates RID pools for SIDs), PDC Emulator (time, password changes, lockouts, GPO editing default), Infrastructure Master (cross-domain references) — one per domain.
</details>

<details><summary>OU vs group? <em>· Infosys, Accenture</em></summary>

OUs organise objects for applying GPOs and delegating administration; groups collect objects for granting permissions/access. An object lives in one OU but can belong to many groups.
</details>

<details><summary>Explain Kerberos authentication. <em>· Microsoft, Cognizant</em></summary>

User authenticates to the KDC and receives a TGT; to access a service, presents the TGT to get a service ticket for that SPN; presents it to the service. Passwords aren't sent over the network; mutual authentication; depends on time sync and DNS/SPNs.
</details>

<details><summary>Explain GPO processing order and how to troubleshoot it. <em>· HCL, IBM</em></summary>

Local → Site → Domain → OU (nested OUs top-down); last applied wins unless Enforced; Block Inheritance stops parent GPOs. Troubleshoot with gpresult, RSoP, event logs, replication (SYSVOL), filtering.
</details>

<details><summary>NTFS vs share permissions. <em>· TCS, Wipro</em></summary>

Share permissions apply over the network only; NTFS applies locally and over the network. Effective access = most restrictive combination. Common practice: broad share permissions, granular NTFS.
</details>

<details><summary>What is the difference between AD DS and Entra ID? <em>· Microsoft, Accenture (M365 roles)</em></summary>

AD DS: on-premises directory with Kerberos/NTLM, LDAP, OUs, GPOs, domain-joined machines. Entra ID: cloud identity platform for SaaS/modern auth (OAuth/OIDC/SAML), Conditional Access, MFA; managed devices via Intune; hybrid sync via Entra Connect.
</details>

<details><summary>A user's account keeps getting locked out. Investigate. <em>· helpdesk / L2, Infosys</em></summary>

Find the source: DC security logs (event 4740 on the PDC Emulator shows caller computer), stale credentials on phones (email), mapped drives, scheduled tasks or services using the old password, cached credentials; tools like Lockout Status. Fix the source, then unlock.
</details>

<details><summary>Write PowerShell to list disabled users or stale computers. <em>· Microsoft, banks</em></summary>

`Search-ADAccount -AccountDisabled -UsersOnly`; `Get-ADComputer -Filter * -Properties LastLogonDate | Where-Object LastLogonDate -lt (Get-Date).AddDays(-90)`.
</details>

## End-to-end scenarios

<details><summary>Scenario: Set up IT for a new 50-person branch office connected to HQ.</summary>

Site and subnet in AD Sites and Services, a read-only or full DC at the branch (depending on security) or rely on HQ over a redundant VPN, local DHCP scope, DNS pointing to DCs, OU for branch users/computers with GPOs (drive maps, printers, security), local file share or SharePoint, Wi-Fi with 802.1X, backup of local server, monitoring. Test logon, GPO application and failover if the WAN drops.
</details>

<details><summary>Scenario: An employee leaves the company today. Write the offboarding procedure.</summary>

Disable the AD/Entra account at exit time (don't delete immediately), reset password, revoke sessions and MFA tokens, remove from groups (record memberships), convert mailbox to shared/forward per policy, transfer OneDrive/files to the manager, remove device access (Intune wipe of corporate data), revoke VPN/SaaS/privileged accounts, collect hardware, delete after retention period. Automate with PowerShell and an HR-triggered workflow; log everything for audit.
</details>
