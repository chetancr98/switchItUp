---
title: Networking Fundamentals — OSI, TCP/IP, IP Addressing & Subnetting, Routing, Switching
level: 1
tags: networking, osi model, tcp/ip, subnetting, routing, vlan, tcp, udp
---
<!-- deepened -->

## Start here: the basics

### What a network is
Devices (hosts) exchanging data through switches and routers. To make different vendors' equipment interoperate, networking is split into **layers**, each with one job.

### The OSI model (7 layers) vs TCP/IP (4 layers)
| # | OSI layer | Job | Examples | Device |
|---|---|---|---|---|
| 7 | Application | What the user's app speaks | HTTP, DNS, SMTP, SSH, FTP | — |
| 6 | Presentation | Encoding, encryption | TLS (loosely), JPEG, UTF-8 | — |
| 5 | Session | Sessions | RPC, NetBIOS | — |
| 4 | Transport | End-to-end delivery, ports | **TCP**, **UDP** | Firewall (L4) |
| 3 | Network | Addressing & routing between networks | **IP**, ICMP | **Router** |
| 2 | Data link | Delivery on the local network, MAC addresses | Ethernet, Wi-Fi, ARP, VLANs | **Switch** |
| 1 | Physical | Bits on the wire | Cables, fibre, radio | Hub, cable |

TCP/IP model: Application (5–7) · Transport (4) · Internet (3) · Link (1–2). Mnemonic for OSI 1→7: **P**lease **D**o **N**ot **T**hrow **S**ausage **P**izza **A**way.

### Key addresses
- **MAC address**: hardware address of a network card (48-bit, e.g. `00:1a:2b:3c:4d:5e`), used within a local network (Layer 2).
- **IP address**: logical address for routing across networks (Layer 3). IPv4: `192.168.1.10` (32 bits). IPv6: `2001:db8::1` (128 bits).
- **Port**: identifies the application on a host (Layer 4): 22 SSH, 53 DNS, 80 HTTP, 443 HTTPS, 3389 RDP, 25/587 SMTP, 3306 MySQL, 5432 PostgreSQL, 389/636 LDAP/LDAPS, 88 Kerberos, 445 SMB, 123 NTP, 161 SNMP, 67/68 DHCP.

### What happens when you open https://example.com
1. **DNS** resolves `example.com` to an IP address.
2. Your PC checks: is the IP on my subnet? No → send to the **default gateway** (router). **ARP** finds the gateway's MAC.
3. **TCP three-way handshake** with the server on port 443: SYN → SYN-ACK → ACK.
4. **TLS handshake**: agree on encryption, verify the server's certificate.
5. **HTTP request/response** inside the encrypted channel.
6. Routers forward packets hop by hop using routing tables; NAT may translate private addresses at the edge.
<!-- -->

---

## IPv4 addressing and subnetting (practise until it's automatic)

### Private and special ranges
| Range | Use |
|---|---|
| 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 | **Private** (RFC 1918) — not routed on the internet; reach out via NAT |
| 127.0.0.0/8 | Loopback (localhost) |
| 169.254.0.0/16 | APIPA / link-local — "DHCP failed" sign on Windows |
| 100.64.0.0/10 | Carrier-grade NAT |
| 0.0.0.0 | "this host / any address"; 0.0.0.0/0 = default route |

### CIDR and subnet masks
`/24` means the first 24 bits are the network part → mask `255.255.255.0` → 256 addresses, **254 usable hosts** (first = network address, last = broadcast).

| CIDR | Mask | Addresses | Usable hosts |
|---|---|---|---|
| /30 | 255.255.255.252 | 4 | 2 (point-to-point links) |
| /29 | .248 | 8 | 6 |
| /28 | .240 | 16 | 14 |
| /27 | .224 | 32 | 30 |
| /26 | .192 | 64 | 62 |
| /25 | .128 | 128 | 126 |
| /24 | 255.255.255.0 | 256 | 254 |
| /23 | 255.255.254.0 | 512 | 510 |
| /22 | 255.255.252.0 | 1 024 | 1 022 |
| /16 | 255.255.0.0 | 65 536 | 65 534 |

Usable hosts = 2^(32 − prefix) − 2.

### Worked example
**Which subnet is 192.168.10.77/27 in?**
/27 → block size 32 (256 − 224). Subnets: .0, .32, .64, .96 … 77 falls in **.64–.95**. Network 192.168.10.64, broadcast 192.168.10.95, hosts .65–.94, gateway typically .65.

**Split 10.20.0.0/24 into 4 equal subnets**: borrow 2 bits → /26 (64 addresses each): .0/26, .64/26, .128/26, .192/26.

**Need 500 hosts?** 2^9 = 512 → /23.

Cloud note: AWS reserves 5 addresses per subnet (network, router, DNS, future, broadcast).

### IPv6 basics
128-bit, written in hex groups (`2001:0db8:0000:0000:0000:ff00:0042:8329` → `2001:db8::ff00:42:8329`). No broadcast (uses multicast), SLAAC auto-configuration, link-local `fe80::/10`, typically /64 subnets. Dual-stack networks run IPv4 and IPv6 together.

## Switching (Layer 2)
- A switch learns which MAC is on which port (**MAC address table**) and forwards frames only there.
- **ARP** maps IP → MAC on the local network (`ip neigh` / `arp -a`). Duplicate IPs cause flapping ARP entries.
- **VLANs** split one physical switch into separate broadcast domains (e.g., VLAN 10 users, 20 servers, 30 voice). **Trunk** ports carry multiple VLANs tagged with **802.1Q**; access ports carry one.
- **STP (Spanning Tree Protocol)** prevents loops (which cause broadcast storms) by blocking redundant paths.
- Link aggregation (LACP / bonding / NIC teaming) combines links for bandwidth and redundancy.

## Routing (Layer 3)
- A router forwards packets between networks using the **longest prefix match** in its routing table.
- **Default gateway**: where a host sends traffic for other networks.
- **Static routes** vs **dynamic routing protocols**: OSPF (link-state, inside an organisation), BGP (between organisations/ISPs — the internet's routing protocol; also used in data centres and cloud VPN/Direct Connect), RIP (old).
- Inter-VLAN routing: a router or Layer-3 switch routes between VLANs.
```bash
ip addr show; ip route show            # Linux: addresses and routing table
ip route add 10.50.0.0/16 via 10.0.0.1
route print / ipconfig /all            # Windows
traceroute / tracert                    # path of routers to a destination
```

## Transport: TCP vs UDP
| | TCP | UDP |
|---|---|---|
| Connection | Yes (3-way handshake) | No |
| Reliability | Retransmission, ordering, flow & congestion control | None — app handles it |
| Overhead | Higher | Lower |
| Uses | HTTP(S), SSH, databases, email | DNS (mostly), VoIP, video streaming, DHCP, NTP, gaming, QUIC/HTTP3 |

TCP states worth knowing: LISTEN, SYN_SENT, ESTABLISHED, **TIME_WAIT** (after closing, waits 2×MSL — huge counts on busy proxies), CLOSE_WAIT (the app hasn't closed its side — often a bug/leak).

**MTU**: max packet size (1500 bytes on Ethernet; jumbo frames 9000). MTU mismatches through VPNs/tunnels cause "small requests work, big ones hang".

## Quick check questions

<details><summary>How many usable hosts in a /26?</summary>

2^(32−26) − 2 = 64 − 2 = 62.
</details>

<details><summary>Which layer do switches and routers work at?</summary>

Switches at Layer 2 (MAC addresses); routers at Layer 3 (IP). Layer-3 switches do both.
</details>

## Questions asked in interviews

<details><summary>Explain the OSI model with protocols at each layer. <em>· Cisco, TCS, Infosys, Wipro, HCL, Juniper (near-universal)</em></summary>

Physical (cables), Data link (Ethernet, MAC, ARP, VLAN), Network (IP, ICMP, routing), Transport (TCP/UDP, ports), Session, Presentation (encoding/encryption), Application (HTTP, DNS, SMTP, SSH). Relate to the TCP/IP model and give a troubleshooting example per layer.
</details>

<details><summary>TCP vs UDP and examples of each. <em>· Cisco, Amazon, Accenture</em></summary>

TCP: connection-oriented, reliable, ordered, flow/congestion control — web, SSH, databases. UDP: connectionless, low overhead, no guarantees — DNS queries, VoIP, streaming, DHCP, NTP.
</details>

<details><summary>Explain the TCP three-way handshake (and connection teardown). <em>· Cisco, Juniper, Infosys</em></summary>

SYN (client sends initial sequence number) → SYN-ACK (server acknowledges and sends its own) → ACK. Teardown: FIN/ACK in each direction (four segments), with TIME_WAIT on the side that closes first.
</details>

<details><summary>Subnet question: given 192.168.5.130/26, find network, broadcast and host range. <em>· every networking interview</em></summary>

/26 → block 64 → subnets .0, .64, .128, .192. 130 is in .128: network 192.168.5.128, broadcast .191, hosts .129–.190.
</details>

<details><summary>What is ARP and what is ARP spoofing? <em>· Cisco, security roles</em></summary>

ARP resolves IP addresses to MAC addresses on a LAN via broadcast requests. Spoofing sends forged replies to redirect traffic (man-in-the-middle); mitigated with dynamic ARP inspection, static entries for critical hosts, encryption.
</details>

<details><summary>What is a VLAN and why use it? Access vs trunk port? <em>· Cisco, HP Aruba, Infosys</em></summary>

A logical broadcast domain on shared switches — segmentation for security and performance, grouping by function not location. Access ports carry one untagged VLAN (end devices); trunk ports carry multiple tagged VLANs between switches/routers (802.1Q).
</details>

<details><summary>Hub vs switch vs router. <em>· TCS, Wipro</em></summary>

Hub: L1, repeats to all ports (one collision domain). Switch: L2, forwards by MAC to one port. Router: L3, forwards between networks by IP, separates broadcast domains.
</details>

<details><summary>Static vs dynamic routing; OSPF vs BGP. <em>· Cisco, Juniper, telecoms</em></summary>

Static: manual, simple, doesn't adapt. Dynamic: routers exchange routes and adapt to failures. OSPF: link-state IGP within an organisation, fast convergence. BGP: path-vector EGP between autonomous systems, policy-based — the internet's routing protocol.
</details>

<details><summary>What is a default gateway? What happens if it's wrong? <em>· helpdesk / L2 support interviews</em></summary>

The router a host sends packets to for destinations outside its subnet. Wrong/missing gateway → local subnet works but nothing beyond it (internet, other VLANs) is reachable.
</details>

<details><summary>What is MTU and what problems does it cause? <em>· Cisco, cloud networking roles</em></summary>

Maximum frame payload size. Mismatches (often through VPN/GRE tunnels with blocked ICMP "fragmentation needed") cause large packets to drop — symptoms: SSH connects but hangs on large output, web pages partially load. Fix with correct MTU/MSS clamping.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design the IP plan for a new office: 120 employees, 40 IP phones, 20 printers, 15 servers, guest Wi-Fi.</summary>

Use a private block (e.g., 10.30.0.0/16) with room to grow: VLAN 10 users 10.30.10.0/24 (254 hosts, growth), VLAN 20 voice 10.30.20.0/25, VLAN 30 printers 10.30.30.0/26, VLAN 40 servers 10.30.40.0/26 (static IPs), VLAN 50 guest 10.30.50.0/24 isolated with internet-only firewall rules, VLAN 99 management. DHCP scopes per VLAN with reservations for printers; inter-VLAN routing on a L3 switch/firewall with ACLs; document everything in an IPAM.
</details>

<details><summary>Scenario: Users on VLAN 10 can reach the internet but not the file server on VLAN 40. Troubleshoot.</summary>

Since internet works, the host IP/gateway/DNS are basically fine. Check: the server is up and listening (from its own VLAN); inter-VLAN routing/ACLs/firewall rules between VLAN 10 and 40 (recent changes?); the server's own firewall (Windows Defender/iptables) and default gateway (asymmetric routing if wrong); DNS resolves the right IP; `tracert` to see where it stops; test the port (`Test-NetConnection server -Port 445`).
</details>
