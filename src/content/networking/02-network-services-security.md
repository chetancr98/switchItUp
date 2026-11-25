---
title: Network Services & Security — DNS, DHCP, NAT, Firewalls, VPN, TLS/PKI, Proxies, Load Balancers
level: 2
tags: dns, dhcp, nat, firewall, vpn, tls, pki, load balancer, proxy
---
<!-- deepened -->

## Start here: the basics

### DNS — the internet's phone book
DNS turns names (`mail.company.com`) into IP addresses. If DNS breaks, "everything is down" even though servers are fine — **"It's always DNS"** is an ops proverb for good reason.

Resolution path: your PC's cache → configured **resolver** (company DNS server / ISP / 8.8.8.8) → root servers → TLD servers (`.com`) → the domain's **authoritative** servers → answer cached for its **TTL**.

### DHCP — automatic IP configuration
When a device joins the network it gets its IP, subnet mask, gateway and DNS servers from a DHCP server through **DORA**: **D**iscover (broadcast) → **O**ffer → **R**equest → **A**cknowledge. Leases expire and renew. Reservations give a device the same IP every time.

### NAT — sharing one public IP
Private addresses (10.x, 192.168.x) aren't routable on the internet. A router/firewall doing **NAT/PAT** rewrites source addresses and ports so many internal devices share one public IP. **Port forwarding (DNAT)** exposes an internal server (e.g., public 443 → 10.0.1.10:443).

### Firewalls
Allow or block traffic by rules (source, destination, port, protocol, state). **Stateful** firewalls remember connections so replies are allowed automatically. Default-deny inbound, allow only what's needed.
<!-- -->

---

## DNS in depth
| Record | Purpose | Example |
|---|---|---|
| A / AAAA | Name → IPv4 / IPv6 | `app A 203.0.113.10` |
| CNAME | Alias to another name (not at the zone apex) | `www CNAME app.company.com.` |
| MX | Mail servers with priority | `MX 10 mail1.company.com.` |
| TXT | Text: SPF, DKIM, DMARC, domain verification | `v=spf1 include:_spf.google.com -all` |
| NS | Authoritative name servers for a zone | |
| SOA | Zone metadata (serial, refresh, TTL defaults) | |
| PTR | Reverse lookup IP → name | used by mail servers, logging |
| SRV | Service location (host + port) | Active Directory (`_ldap._tcp.dc._msdcs`) |

- **TTL**: how long answers are cached. Lower TTL (e.g., 60 s) *before* a migration so changes propagate fast.
- **Recursive vs authoritative** servers; **forwarders**; **split-horizon DNS** (internal vs external answers for the same name).
- Tools: `nslookup`, `dig +short app.company.com`, `dig @8.8.8.8 app.company.com`, `dig -x 203.0.113.10`, `Resolve-DnsName` (PowerShell). Linux client config: `/etc/resolv.conf` (often managed by systemd-resolved), `/etc/hosts` overrides.
- Email deliverability: SPF, DKIM, DMARC records.
- DNSSEC signs records against spoofing.

## DHCP in depth
Scopes per subnet, exclusions, reservations (by MAC), lease time, options (003 router, 006 DNS, 015 domain name). **DHCP relay / IP helper** forwards broadcasts from other VLANs to a central DHCP server. Problems: scope exhausted (new devices get 169.254.x.x), rogue DHCP servers (DHCP snooping on switches prevents them), duplicate IPs.

## Firewalls and security zones
- **Packet filter** (stateless ACLs on routers), **stateful firewall**, **next-generation firewall (NGFW)** with application awareness and IPS.
- Host firewalls: Linux `firewalld` (`firewall-cmd --add-service=https --permanent`), `ufw` on Ubuntu, `nftables`/`iptables`; Windows Defender Firewall.
- Cloud: security groups (stateful, per instance) and network ACLs (stateless, per subnet).
- **DMZ**: a segment for internet-facing servers, separated from the internal network.
- Principle: least privilege, default deny, document every rule with an owner and expiry, review regularly.

```bash
sudo firewall-cmd --list-all
sudo firewall-cmd --permanent --add-port=8080/tcp && sudo firewall-cmd --reload
sudo ufw allow from 10.0.0.0/8 to any port 22 proto tcp
```

## VPN
| Type | Use | Tech |
|---|---|---|
| Site-to-site | Connect office ↔ data centre / cloud | IPsec (IKEv2), routed with BGP or static routes |
| Remote access | Employees to the corporate network | SSL VPN, IPsec, WireGuard, OpenVPN |
| Zero Trust Network Access | Per-application access based on identity & device posture instead of full network access | ZTNA products |

Split tunnelling (only corporate traffic via VPN) vs full tunnel. Common issues: overlapping subnets between sites, MTU problems, expired certificates/pre-shared keys, IKE phase 1/2 mismatches.

## TLS and PKI (certificates)
- **TLS** encrypts traffic and authenticates the server (and optionally the client — mutual TLS).
- A **certificate** binds a public key to names (CN/SAN), signed by a **Certificate Authority (CA)**. Browsers trust a set of root CAs; the server must send the **full chain** (leaf + intermediates).
- Internal **PKI**: enterprise CA (e.g., Active Directory Certificate Services) for internal sites, Wi-Fi (802.1X), VPN.
- Certificate lifecycle: CSR → issue → install → **monitor expiry** → renew. Expired certificates cause a large share of outages — automate with ACME/Let's Encrypt or your CA's tooling and alert 30 days ahead.
```bash
openssl s_client -connect app.company.com:443 -servername app.company.com </dev/null | openssl x509 -noout -subject -issuer -dates
openssl req -new -newkey rsa:2048 -nodes -keyout app.key -out app.csr -subj "/CN=app.company.com"
```

## Proxies and load balancers
- **Forward proxy**: clients go through it to the internet (filtering, caching, logging) — corporate web proxies, PAC files.
- **Reverse proxy**: sits in front of servers (TLS termination, caching, routing) — nginx, HAProxy, F5, cloud ALB.
- **Load balancer**: distributes connections across servers with **health checks**. L4 (TCP) vs L7 (HTTP, path/host routing). Algorithms: round robin, least connections, source-IP hash (stickiness). High availability with a pair of LBs (VRRP/keepalived virtual IP).

## Other services you'll be asked about
- **NTP**: time sync (UDP 123); stratum hierarchy; Kerberos fails if clocks differ by > 5 minutes.
- **SNMP**: monitoring network devices (v3 for authentication/encryption).
- **Syslog**: central logging (UDP/TCP 514).
- **SMTP**: email relay; open relays are dangerous.
- **802.1X / RADIUS**: port-based network access control with user/device authentication.
- **Wi-Fi**: 2.4 vs 5/6 GHz, channels, WPA2/WPA3-Enterprise, roaming, interference.

## Quick check questions

<details><summary>A user gets IP 169.254.12.40. What does it mean?</summary>

APIPA: the client couldn't reach a DHCP server (cable/VLAN issue, relay missing, scope exhausted, DHCP service down).
</details>

<details><summary>Why lower a DNS TTL before migrating a server?</summary>

So resolvers cache the old IP for only a short time, letting the change take effect quickly and enabling a fast rollback.
</details>

## Questions asked in interviews

<details><summary>Explain how DNS resolution works. <em>· Amazon, Microsoft, Cisco, Infosys, TCS</em></summary>

Client cache/hosts → resolver (recursive) → root → TLD → authoritative server → answer returned and cached per TTL at each level. Mention record types, forwarders, and troubleshooting with nslookup/dig.
</details>

<details><summary>Explain the DHCP DORA process. <em>· Wipro, HCL, helpdesk & L2 roles</em></summary>

Discover (client broadcast), Offer (server proposes an IP), Request (client accepts), Acknowledge (server confirms lease with options: gateway, DNS, lease time). Across VLANs, a relay/IP helper forwards the broadcasts.
</details>

<details><summary>What is NAT and PAT? <em>· Cisco, Infosys</em></summary>

NAT translates private to public addresses; PAT (overload) maps many private hosts to one public IP using different source ports. DNAT/port forwarding exposes internal services.
</details>

<details><summary>Stateful vs stateless firewall. <em>· Palo Alto-style, Cisco, banks</em></summary>

Stateful tracks connections and automatically allows return traffic; stateless evaluates each packet against rules independently (needs explicit rules both ways, e.g., cloud NACLs).
</details>

<details><summary>How does an HTTPS certificate get validated? <em>· Microsoft, Amazon</em></summary>

Client checks the certificate chain up to a trusted root, the hostname matches the SAN, validity dates, revocation status (OCSP/CRL), and that the server proves possession of the private key during the handshake.
</details>

<details><summary>Site-to-site VPN vs remote-access VPN. <em>· Cisco, Fortinet-style, Infosys</em></summary>

Site-to-site connects whole networks permanently between gateways (IPsec); remote access connects individual users to the network on demand (SSL/IPsec/WireGuard clients). ZTNA is the modern per-application alternative.
</details>

<details><summary>What is a reverse proxy and why use one? <em>· Amazon, Akamai</em></summary>

A server in front of backend servers that receives client requests: TLS termination, load balancing, caching, compression, hiding internal topology, WAF and routing by path/host.
</details>

<details><summary>What are SPF, DKIM and DMARC? <em>· Microsoft 365 / email admin roles</em></summary>

SPF (TXT record listing allowed sending servers), DKIM (cryptographic signature of mail verified via a DNS public key), DMARC (policy telling receivers what to do when SPF/DKIM fail, plus reporting). Together they fight spoofing and improve deliverability.
</details>

## End-to-end scenarios

<details><summary>Scenario: The company website certificate expired this morning and customers see warnings. Fix and prevent.</summary>

Immediately: issue/renew the certificate (ACME or CA portal), install with the full chain on every endpoint that terminates TLS (load balancer, CDN, servers), reload services, verify with `openssl s_client` and an external SSL checker. Prevent: inventory all certificates, automate renewal (cert-manager/certbot/ACME), alert at 30/14/7 days, assign owners.
</details>

<details><summary>Scenario: Migrate an internal app to a new server with minimal downtime using DNS.</summary>

Days before: lower the A record TTL to 60–300 s. Build and test the new server (hosts-file override for testers). Cutover: sync data, switch the A record, monitor logs/traffic on both, keep the old server running until TTLs expire, then decommission; restore TTL afterwards. Rollback = revert the record.
</details>
