---
title: Linux Performance & Troubleshooting — A Method for Any Incident
level: 4
tags: linux, performance, troubleshooting, use method, top, vmstat, iostat, strace
---
<!-- deepened -->

## Start here: the basics

### Troubleshooting is a method, not a guess
Interviewers care more about *how* you investigate than whether you guess the answer. A reliable approach:
1. **Define the problem**: what exactly is wrong, since when, for whom, what changed?
2. **Check the obvious**: is it up? disk full? recent deploy/patch/config change?
3. **Gather evidence** from metrics and logs — don't change things yet.
4. **Form a hypothesis**, test it with one change at a time.
5. **Fix / mitigate**, verify, then find the root cause.
6. **Document** and prevent recurrence (monitoring, automation).

### The first 60 seconds on a slow Linux server
```bash
uptime                 # load averages (1, 5, 15 min) vs number of CPUs
dmesg -T | tail        # kernel errors: OOM kills, disk errors, network drops
vmstat 1 5             # run queue (r), swapping (si/so), CPU user/system/idle/wait
mpstat -P ALL 1 3      # per-CPU usage — one core pegged?
pidstat 1 3            # which processes use CPU
iostat -xz 1 3         # disk utilisation, latency (await), queue
free -h                # memory available, swap used
sar -n DEV 1 3         # network throughput per interface
sar -n TCP,ETCP 1 3    # TCP connections, retransmits
top                    # overview; press 1 for per-CPU, P/M to sort
```
(This checklist is adapted from Brendan Gregg's well-known approach — link at the end.)
<!-- -->

---

## The USE method
For every resource (CPU, memory, disk, network, file descriptors…), check:
- **Utilisation** — how busy is it? (CPU %, disk %util)
- **Saturation** — is work queuing? (run queue > CPUs, swap activity, disk queue, TCP backlog)
- **Errors** — any? (disk errors in dmesg, NIC errors, OOM kills)

### Reading the numbers
| Signal | Healthy | Problem |
|---|---|---|
| Load average | ≤ number of CPU cores | ≫ cores → CPU saturation *or* many processes in D state (I/O) |
| `%wa` (iowait) | low | high → CPU waiting on disk |
| `vmstat si/so` | 0 | sustained > 0 → swapping |
| `iostat await` | SSD < ~1–5 ms | tens/hundreds of ms → slow/saturated storage |
| `%util` (disk) | < 70% | ~100% → disk saturated (less meaningful on SSD arrays) |
| `%st` (steal) | ~0 | high → hypervisor overcommitted (noisy neighbour) |
| TCP retransmits | very low | rising → packet loss/network issues |

### CPU problems
- One process at 100%: `top` → `pidstat -t -p PID 1` (threads) → application profiling (`perf top`, Java thread dumps with `jstack`).
- High **system** CPU: lots of syscalls/context switches (`vmstat cs`), interrupts, lock contention.
- High load but low CPU: processes in **D state** waiting on I/O (`ps -eo state,pid,cmd | grep '^D'`).

### Memory problems
- `free -h` available low, `vmstat` si/so > 0, `dmesg | grep -i "out of memory"`.
- Find the hog: `ps aux --sort=-%mem | head`, `smem`. Memory growing over days → leak (restart is a workaround, not a fix).
- Java apps: heap size vs container limit, GC logs.

### Disk problems
- Full: `df -h`, `df -i` (inodes), `lsof +L1` (deleted but open files).
- Slow: `iostat -xz 1`, find who's doing I/O: `iotop`, `pidstat -d 1`.
- Failing: `dmesg` I/O errors, `smartctl -a /dev/sda`, RAID status (`cat /proc/mdstat`).

### Network problems (detailed in the Networking track)
`ss -s` (socket summary), `ss -tan state time-wait | wc -l`, `ip -s link` (errors/drops), `ethtool eth0` (speed/duplex), `ping`, `mtr`, `curl -v`, `tcpdump -i eth0 port 443`.

### Digging into a single process
```bash
strace -fp PID -e trace=network,file   # what syscalls is it making? stuck on what?
strace -c -p PID                         # syscall summary
lsof -p PID                              # open files and sockets
cat /proc/PID/status; cat /proc/PID/limits
ls /proc/PID/fd | wc -l                  # number of open file descriptors (vs ulimit)
pstack PID / gdb -p PID                  # native stack; jstack for Java
```

### Logs are evidence
`journalctl -p err -S "-1h"`, application logs, `/var/log/messages`; correlate timestamps across systems (that's why NTP matters).

## Quick check questions

<details><summary>Load average is 32 on a 32-core server. Problem?</summary>

Not necessarily — roughly one runnable task per core means fully used but not queuing. Check latency and whether it's CPU or I/O wait. Load of 32 on a 4-core box would mean heavy saturation.
</details>

<details><summary>Load is high, CPU is mostly idle. What's going on?</summary>

Tasks are stuck in uninterruptible I/O wait (D state) — slow or hung storage/NFS. Check `vmstat` wa, `iostat`, D-state processes and dmesg for storage errors.
</details>

## Questions asked in interviews

<details><summary>A Linux server is slow. How do you troubleshoot? <em>· Amazon, Red Hat, IBM, Infosys, TCS — the most common systems question</em></summary>

Clarify scope and timing → check recent changes → USE method: CPU (uptime, top, mpstat), memory (free, vmstat si/so), disk (df, iostat, iotop), network (sar, ss, errors), kernel messages (dmesg) → identify the top consumer process → dig in (strace, lsof, app logs) → mitigate → root cause → monitoring/automation.
</details>

<details><summary>What does load average mean? <em>· Red Hat, Oracle, HCL</em></summary>

The average number of processes runnable or in uninterruptible sleep over 1, 5 and 15 minutes. Compare with CPU count; rising 1-min vs 15-min shows a growing problem.
</details>

<details><summary>How do you find which process is causing high disk I/O? <em>· Amazon, Flipkart (ops)</em></summary>

`iotop -o`, `pidstat -d 1`, `iostat -xz 1` to confirm device saturation, `lsof` to see files; often backups, log writers, databases or swap.
</details>

<details><summary>The disk shows 100% used but du shows much less. Why? <em>· Amazon, IBM, Infosys</em></summary>

Files deleted while a process still holds them open — space isn't released. `lsof +L1` or `lsof | grep deleted`; restart the process or truncate via `/proc/PID/fd/N`. Also reserved blocks (ext4 5% for root) or other mounts hiding files under a mountpoint.
</details>

<details><summary>What is iowait and steal time? <em>· VMware, Amazon</em></summary>

iowait: CPU idle while there's outstanding disk I/O. Steal: time the virtual CPU wanted to run but the hypervisor ran something else — sign of an overcommitted host or a CPU-credit-limited cloud instance.
</details>

<details><summary>How do you troubleshoot "Too many open files"? <em>· Oracle, Red Hat</em></summary>

Check the process's limit (`cat /proc/PID/limits`) and usage (`ls /proc/PID/fd | wc -l`); find leaks (fd count growing); raise limits via systemd `LimitNOFILE` or limits.conf; fix the leak (unclosed sockets/files).
</details>

<details><summary>What does strace do and when would you use it? <em>· Red Hat, Cisco</em></summary>

Traces system calls and signals of a process — shows what it's doing (waiting on a socket, failing to open a file, permission errors). Useful when logs say nothing. It adds overhead, so use carefully on production.
</details>

## End-to-end scenarios

<details><summary>Scenario: Every night at 01:00, a database server's response times spike for 30 minutes. Investigate.</summary>

Check what runs at 01:00: cron/systemd timers (`systemctl list-timers`, crontabs), backups, log rotation, antivirus scans, batch jobs, VM snapshots at the hypervisor. Use `sar` historical data (`sar -d -f /var/log/sa/saDD`), iostat and database logs from that window. Likely disk I/O contention from the backup → move schedule, throttle (ionice), use snapshot-based backups, or a replica for backups.
</details>

<details><summary>Scenario: A Java service gets OOM-killed in a container every few days.</summary>

Confirm via `dmesg`/`journalctl -k` ("Killed process … java") or container exit code 137. Compare JVM heap + non-heap with the container memory limit; set `-XX:MaxRAMPercentage`, check for leaks (heap dumps, growth trend in monitoring), native memory, too many threads. Short term: raise the limit; long term: fix the leak and alert on memory trend.
</details>
