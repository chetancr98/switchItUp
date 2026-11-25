---
title: Cloud Infrastructure for Systems Engineers — AWS & Azure Core Services, IAM, Networking, Cost
level: 3
tags: cloud, aws, azure, iam, vpc, vnet, ec2, virtual machines, landing zone, cost
---
<!-- deepened -->

## Start here: the basics

### What the cloud changes for a systems engineer
Instead of racking servers, you **rent infrastructure through APIs**: virtual machines, networks, storage, databases, identity. The same fundamentals (Linux, networking, security, backups) still apply — but you build with code, pay per use, and share responsibility with the provider.

### Service models
| Model | You manage | Provider manages | Examples |
|---|---|---|---|
| **IaaS** | OS, patches, apps, data | Hardware, virtualization, network | EC2, Azure VMs |
| **PaaS** | Apps and data | Runtime, OS, scaling | Azure App Service, AWS Elastic Beanstalk, managed databases (RDS, Azure SQL) |
| **SaaS** | Your configuration/users | Everything else | Microsoft 365, Salesforce |

### Shared responsibility
The provider secures the **cloud** (data centres, hardware, hypervisor); you secure what's **in** the cloud (IAM, OS patching on VMs, network rules, data, encryption settings).

### AWS ↔ Azure ↔ on-prem vocabulary map
| Concept | AWS | Azure | On-prem equivalent |
|---|---|---|---|
| Virtual machine | EC2 | Virtual Machines | VMware VM |
| Private network | VPC | Virtual Network (VNet) | Data centre network/VLANs |
| Subnet firewall rules | Security Groups (instance), NACLs (subnet) | Network Security Groups | Firewalls/ACLs |
| Block disk | EBS | Managed Disks | SAN LUN |
| File share | EFS / FSx | Azure Files | NAS |
| Object storage | S3 | Blob Storage | — |
| Load balancer | ELB (ALB/NLB) | Load Balancer / Application Gateway | F5/HAProxy |
| DNS | Route 53 | Azure DNS | Windows DNS/BIND |
| Identity | IAM (+ IAM Identity Center) | Entra ID + Azure RBAC | Active Directory |
| VPN / private link | Site-to-Site VPN, Direct Connect | VPN Gateway, ExpressRoute | MPLS/IPsec |
| Monitoring | CloudWatch, CloudTrail | Azure Monitor, Activity Log | Nagios/Zabbix, syslog |
| Infrastructure as Code | CloudFormation (or Terraform) | Bicep/ARM (or Terraform) | Ansible/scripts |
| Backup | AWS Backup | Azure Backup | Veeam |
<!-- -->

---

## Deep dive

### Regions, availability zones, high availability
A **region** is a geographic area (Mumbai, Hyderabad); an **availability zone** is one or more isolated data centres within it. Spread VMs across ≥ 2 AZs behind a load balancer for HA; replicate to another region for DR.

### Networking in the cloud
```
VPC 10.0.0.0/16 (Mumbai)
├── Public subnets  10.0.1.0/24 (AZ-a), 10.0.2.0/24 (AZ-b)  ── route 0.0.0.0/0 → Internet Gateway
│      load balancer, bastion / NAT gateway
├── Private subnets 10.0.11.0/24, 10.0.12.0/24              ── route 0.0.0.0/0 → NAT Gateway (outbound only)
│      app servers
└── Data subnets    10.0.21.0/24, 10.0.22.0/24              ── no internet route
       databases
Connectivity: Site-to-Site VPN / Direct Connect to the office; VPC peering / Transit Gateway between VPCs
```
- **Security groups**: stateful, allow-only rules attached to instances (reference other SGs instead of IPs: "app SG may reach DB SG on 5432").
- **NACLs**: stateless subnet rules (need explicit return traffic) — rarely needed beyond defaults.
- Plan CIDRs so they don't overlap with on-prem or other VPCs (VPN/peering break otherwise).
- Private endpoints/PrivateLink to reach cloud services without the internet.

### Identity and access management (IAM)
- **Principle of least privilege**: grant only needed actions on needed resources.
- AWS: users (avoid long-lived keys), **roles** (temporary credentials — for EC2 instances, Lambda, cross-account, SSO users), policies (JSON allow/deny), groups. Azure: Entra ID identities + **RBAC** role assignments at scopes (management group → subscription → resource group → resource), **managed identities** for VMs/apps.
- Enforce **MFA**, use SSO, no root/global-admin for daily work, audit with CloudTrail/Activity Log, guardrails with SCPs / Azure Policy.

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:GetObject", "s3:PutObject"],
    "Resource": "arn:aws:s3:::company-backups/app01/*"
  }]
}
```

### Compute operations
Instance types/sizes, images (AMIs / Azure images, golden images built with Packer), user data / cloud-init for bootstrapping, auto scaling groups / VM scale sets, patching (AWS Systems Manager Patch Manager, Azure Update Manager), remote access without public IPs (SSM Session Manager, Azure Bastion), spot/preemptible instances for interruptible work.

### Storage operations
Disk types (gp3/io2, Premium SSD), snapshots (incremental, copy cross-region for DR), S3/Blob storage classes and **lifecycle rules** (move to cool/archive after N days), versioning and **object lock** for immutable backups, encryption at rest with KMS/Key Vault keys.

### Monitoring and logging
Metrics and alarms (CPU, disk via agent, status checks), log collection agents (CloudWatch agent, Azure Monitor Agent), audit trails (CloudTrail, Activity Log) shipped to a central account/workspace, dashboards, budget alerts.

### Cost management (FinOps basics)
Tag everything (owner, environment, cost centre), budgets and alerts, rightsizing idle/oversized VMs, stop non-prod at night, savings plans/reserved instances for steady workloads, storage lifecycle, watch **data egress** and NAT gateway costs, delete unattached disks/old snapshots/unused public IPs.

### Landing zones and governance
Multi-account (AWS Organizations) / multi-subscription (management groups) structure separating prod, non-prod, shared services, security/logging; central networking hub (Transit Gateway / hub-and-spoke VNets); guardrails (SCPs, Azure Policy), centralised identity (SSO), logging and backup policies — built with IaC (Terraform/Bicep/CloudFormation).

### Certifications that help these interviews
AWS Certified Cloud Practitioner → Solutions Architect – Associate / SysOps Administrator – Associate; Microsoft AZ-900 → **AZ-104 (Azure Administrator)**; RHCSA for Linux; CCNA for networking.

## Quick check questions

<details><summary>Security group vs NACL?</summary>

Security groups are stateful, allow-only and attached to instances/ENIs; NACLs are stateless, ordered allow/deny rules at the subnet level requiring rules for both directions.
</details>

<details><summary>How does a VM in a private subnet download OS updates without a public IP?</summary>

Through a NAT gateway (outbound-only) in a public subnet, or via private endpoints/an internal package mirror (e.g., a proxy or repository service).
</details>

## Questions asked in interviews

<details><summary>Explain IaaS, PaaS and SaaS with examples. <em>· Infosys, TCS, Accenture, Capgemini</em></summary>

IaaS: you manage OS and above (EC2, Azure VMs). PaaS: you deploy code/data on a managed platform (App Service, RDS). SaaS: complete software consumed as a service (Microsoft 365). Responsibility shifts to the provider as you move up.
</details>

<details><summary>What is a VPC and how would you design one for a 3-tier app? <em>· Amazon, Accenture, Deloitte</em></summary>

An isolated virtual network: public subnets (LB, NAT, bastion), private app subnets, isolated data subnets across 2–3 AZs; IGW/NAT routes; security groups referencing tiers; VPN/Direct Connect to on-prem; non-overlapping CIDRs; flow logs for auditing.
</details>

<details><summary>IAM user vs role; how do applications get credentials? <em>· Amazon, banks</em></summary>

Users are long-lived identities (avoid access keys); roles provide temporary credentials assumed by services, instances or federated users. Apps on EC2/Azure VMs should use instance roles / managed identities — never hard-coded keys.
</details>

<details><summary>How do you make an application highly available in the cloud? <em>· Amazon, Microsoft</em></summary>

Multiple instances across AZs behind a load balancer with health checks, auto scaling, managed multi-AZ databases, stateless app servers, backups and cross-region DR for critical systems, monitoring and alerts.
</details>

<details><summary>How do you reduce a cloud bill? <em>· Amazon, startups, MSPs</em></summary>

Visibility (tags, cost explorer), rightsizing, schedules for non-prod, commitments (savings plans/reserved), storage lifecycle and cleanup, reduce egress/NAT traffic, managed services where cheaper, budgets and anomaly alerts.
</details>

<details><summary>Azure: what's a resource group and how does RBAC work? <em>· Microsoft partners, TCS, HCL</em></summary>

A resource group is a logical container for related resources sharing a lifecycle. RBAC assigns roles (Owner, Contributor, Reader, or custom) to identities at a scope (management group, subscription, resource group, resource); permissions inherit downward.
</details>

## End-to-end scenarios

<details><summary>Scenario: Migrate 20 on-prem VMs (web, app, SQL Server, file server) to Azure or AWS. Outline your plan.</summary>

Discovery and dependency mapping, sizing and cost estimate; landing zone (network with VPN/ExpressRoute, identity, policies, logging, backup); choose strategy per server (rehost with Azure Migrate/AWS MGN, replatform SQL to managed database, file server to Azure Files/FSx); pilot migration, test, cutover plan with DNS TTL lowering and rollback; post-migration: monitoring, backup policies, patching, rightsizing after 2–4 weeks of metrics, decommission on-prem.
</details>

<details><summary>Scenario: An S3 bucket with customer files was found publicly readable. Respond.</summary>

Immediately block public access (account-level Block Public Access), review bucket policy/ACLs, check access logs/CloudTrail for downloads during exposure, involve security/legal for breach assessment, rotate anything sensitive exposed. Prevent: enforce Block Public Access via org policy, IaC with reviews, config rules/alerts for public resources, least-privilege access with presigned URLs for sharing.
</details>
