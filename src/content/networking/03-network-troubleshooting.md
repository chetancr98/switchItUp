---
title: Network Troubleshooting — Tools, Layer-by-Layer Method and Real Scenarios
level: 3
tags: network troubleshooting, ping, traceroute, tcpdump, wireshark, dns, connectivity
---
<!-- deepened -->

## Start here: the basics

### The layer-by-layer method
Work up (or down) the stack; each layer depends on the one below.
| Layer | Question | Tools |
|---|---|---|
| 1 Physical | Cable/Wi-Fi connected? Link lights? | Link status, `ip link`, `ethtool`, switch port status |
| 2 Data link | Right VLAN? MAC learned? | `ip neigh` / `arp -a`, switch MAC table |
| 3 Network | Correct IP/mask/gateway? Can I reach the gateway and the target? | `ip addr`, `ipconfig /all`, `ping`, `traceroute`/`tracert`, `ip route` |
| 4 Transport | Is the port open and reachable? | `nc -zv host 443`, `Test-NetConnection host -Port 443`, `ss -tulpn`, firewall logs |
| 7 Application | Does the service respond correctly? DNS OK? | `curl -v`, `nslookup`/`dig`, app logs |

### The essential commands (Linux / Windows)
| Purpose | Linux | Windows |
|---|---|---|
| IP config | `ip addr`, `ip route` | `ipconfig /all`, `route print` |
| Reachability | `ping -c 4 host` | `ping host` |
| Path | `traceroute host`, `mtr host` | `tracert host`, `pathping host` |
| DNS | `dig host`, `nslookup host` | `nslookup host`, `Resolve-DnsName host` |
| Port test | `nc -zv host 443`, `curl -v telnet://host:443` | `Test-NetConnection host -Port 443` |
| Listening ports | `ss -tulpn` | `netstat -ano`, `Get-NetTCPConnection` |
| Packet capture | `tcpdump -i eth0 host 10.0.0.5 and port 443` | Wireshark, `pktmon` |
| Flush DNS cache | `resolvectl flush-caches` | `ipconfig /flushdns` |
| Renew DHCP | `dhclient -r && dhclient` / `nmcli` | `ipconfig /release` then `/renew` |
<!-- -->

---

## Deep dive

### Reading ping and traceroute
- `ping` fails ≠ host down: ICMP may be blocked by firewalls. Test the actual service port too.
- Request timed out vs **Destination host unreachable** (a router says it has no route / ARP failed locally).
- High or varying latency → congestion, Wi-Fi issues, overloaded devices; packet loss → bad cables, duplex mismatch, saturated links.
- `traceroute` stars (`* * *`) at one hop are often just routers not answering ICMP; what matters is whether later hops respond. `mtr` combines both and shows loss per hop over time.

### Packet captures (tcpdump / Wireshark)
```bash
sudo tcpdump -i any -nn host 10.0.1.20 and port 5432 -w db.pcap   # capture to file, open in Wireshark
sudo tcpdump -i eth0 -nn 'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'  # SYNs and RSTs only
```
What to look for:
- **SYN with no SYN-ACK** → firewall drop or host down / wrong route.
- **SYN → RST** → port closed (nothing listening) or a firewall rejecting.
- **Retransmissions / duplicate ACKs** → packet loss.
- **TLS handshake alert** → certificate/protocol mismatch.
- **Large packets missing** → MTU problem.

### DNS troubleshooting
`nslookup name` vs `nslookup name 8.8.8.8` (does the internal resolver differ?), check `/etc/resolv.conf` / adapter DNS settings, stale cache (`ipconfig /flushdns`), wrong record or TTL not expired, split-horizon differences, `/etc/hosts` overrides, search domains (short names resolving oddly).

### Common root causes checklist
- Wrong IP/subnet/gateway (static IP typo, duplicate IP).
- DHCP failure (169.254.x.x).
- DNS (wrong server, stale record, missing record).
- Firewall/ACL/security group change.
- Routing (missing route, asymmetric routing, overlapping subnets over VPN).
- VLAN mismatch on the switch port.
- MTU/MSS through tunnels.
- Proxy settings (browser works, CLI tools don't — or vice versa).
- Certificate problems (expired, missing intermediate, wrong name).
- The service itself isn't listening on that interface (`127.0.0.1` vs `0.0.0.0`).

### Wi-Fi specifics
Signal strength and interference (2.4 GHz crowded), channel overlap, roaming between access points, captive portals, 802.1X certificate issues, DHCP exhaustion on guest networks.

## Quick check questions

<details><summary>Ping to the server works but the website doesn't load. Next steps?</summary>

Layer 3 is fine; test Layer 4/7: is the port reachable (`Test-NetConnection -Port 443` / `nc -zv`), is the service listening (`ss -tulpn` on the server), any firewall in between, DNS resolving to the same IP the browser uses, proxy settings, TLS errors (`curl -v`).
</details>

<details><summary>The service listens on 127.0.0.1:8080. Why can't other machines connect?</summary>

It's bound to the loopback interface only; it must listen on 0.0.0.0 (all interfaces) or the specific NIC IP — and the firewall must allow it.
</details>

## Questions asked in interviews

<details><summary>A user says "the internet is not working". Walk me through it. <em>· helpdesk, L1/L2, Infosys, TCS, Wipro, HCL</em></summary>

Scope (one user or many, wired/Wi-Fi), physical link, IP config (`ipconfig /all`: 169.254 → DHCP), ping gateway, ping a public IP (8.8.8.8) to separate routing from DNS, `nslookup` a domain, proxy/browser settings, recent changes; escalate with evidence if it's wider than one user.
</details>

<details><summary>How do you check whether a port is open on a remote server? <em>· Amazon, Cisco, Accenture</em></summary>

`Test-NetConnection host -Port 443`, `nc -zv host 443`, `curl -v`, `nmap -p 443 host` (with permission); on the server `ss -tulpn` to confirm it's listening; check firewalls/security groups along the path.
</details>

<details><summary>What would you look for in a tcpdump of a failing connection? <em>· Cisco, Juniper, Akamai</em></summary>

Whether SYNs get SYN-ACKs, RSTs (closed/rejected), retransmissions (loss), ICMP errors (unreachable, fragmentation needed), TLS alerts, timing gaps showing where latency appears.
</details>

<details><summary>Some websites work and others don't for all users. Possible causes? <em>· Microsoft, Infosys</em></summary>

DNS (forwarder failing for some domains), proxy/web filter categories, MTU issues affecting larger responses, IPv6 partially broken, firewall/geo rules, certificate inspection problems, an upstream ISP routing issue.
</details>

<details><summary>Explain how you'd troubleshoot slow network performance between two data centres. <em>· Amazon, Cisco, banks</em></summary>

Measure latency/loss (`mtr`), throughput (`iperf3`), check interface errors/drops and utilisation on each hop, duplex/speed mismatches, QoS policies, VPN encryption overhead and MTU, TCP window/bandwidth-delay product, and whether the "network" slowness is actually the application.
</details>

## End-to-end scenarios

<details><summary>Scenario: After a firewall change last night, the payroll app can't reach its database. Fix it under time pressure.</summary>

Confirm the symptom from the app server (`nc -zv db 1433` fails while ping may work), check the change log for that night, review firewall logs for denies between app and DB IPs/port, roll back or add the precise allow rule (source app servers → DB port only), verify connectivity and app health, then do a post-incident review: change process needed a pre-check/test plan for dependent apps.
</details>

<details><summary>Scenario: Remote VPN users can reach some internal servers but not those in the 10.50.0.0/16 network.</summary>

Likely routing: the VPN's pushed routes don't include 10.50.0.0/16 (split tunnel), or 10.50.x overlaps users' home networks, or the internal routers lack a return route to the VPN pool, or firewall rules exclude the VPN subnet. Check `route print` on a client, VPN config, traceroute from client and a return traceroute from the server side.
</details>
