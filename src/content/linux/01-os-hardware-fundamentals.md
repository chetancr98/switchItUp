---
title: How Computers & Operating Systems Work — Hardware, Boot, Processes, Memory, Files
level: 1
tags: operating systems, hardware, boot process, processes, memory, file systems
---
<!-- deepened -->

## Start here: the basics

### The parts of a computer (and why a systems engineer cares)
| Component | What it does | What goes wrong / what you tune |
|---|---|---|
| **CPU** | Executes instructions; has cores (parallel workers) and caches | High load, throttling, too few cores for the workload |
| **RAM (memory)** | Fast, temporary working space for running programs | Out of memory → swapping, crashes, OOM killer |
| **Storage** (HDD, SSD, NVMe) | Persistent data | Full disks, slow I/O, failing drives |
| **Network interface (NIC)** | Connects to the network | Link down, wrong speed/duplex, saturation |
| **Motherboard, PSU, firmware (BIOS/UEFI)** | Connects everything, power, first code that runs | Hardware faults, firmware updates |

Speed ladder you should know: CPU cache (nanoseconds) → RAM (~100 ns) → NVMe SSD (~tens of µs) → network round trip in a data centre (~0.5 ms) → HDD seek (~5–10 ms). That's why "it's swapping to disk" makes a server crawl.

### What an operating system does
The OS (Linux, Windows, macOS) is the manager between programs and hardware:
- **Process management** — runs many programs at once by sharing CPU time.
- **Memory management** — gives each program its own private address space.
- **File systems** — organise data on disks into files and folders.
- **Device drivers** — talk to hardware.
- **Security** — users, permissions, isolation.
- **Networking** — the TCP/IP stack.

The **kernel** is the core of the OS running with full hardware access (*kernel mode*). Your programs run in *user mode* and ask the kernel for help through **system calls** (open a file, send data, create a process).

### What happens when you power on a server (the classic interview question)
1. **Power on → firmware (BIOS or UEFI)** runs POST (power-on self-test), initialises hardware.
2. Firmware finds a boot device (by boot order) and loads the **bootloader** (GRUB on Linux, Windows Boot Manager).
3. Bootloader loads the **kernel** and an **initramfs** (a small temporary root file system with drivers needed to mount the real disk).
4. Kernel initialises hardware/drivers, mounts the root file system, starts the first user process: **init** (PID 1 — `systemd` on modern Linux).
5. systemd starts services in dependency order (network, SSH, databases, web server) to reach the default **target** (like old runlevels).
6. Login prompt / services ready.
<!-- -->

---

## Deep dive

### Processes and threads
- A **process** is a running program with its own memory, open files and a **PID**. A **thread** is an execution path inside a process sharing its memory.
- Every process has a parent (`ps -ef` shows PPID). If the parent dies, orphans are adopted by PID 1.
- **States**: Running (R), Sleeping (S, waiting for an event), Uninterruptible sleep (D, usually waiting on disk/NFS I/O — can't be killed), Stopped (T), **Zombie (Z)** — finished but the parent hasn't collected its exit status.
- Creating processes on Linux: `fork()` copies the process (copy-on-write), `exec()` replaces it with a new program.
- **Signals**: `SIGTERM` (15, polite stop — handle and clean up), `SIGKILL` (9, immediate, can't be caught), `SIGHUP` (1, often "reload config"), `SIGINT` (2, Ctrl-C), `SIGSTOP`/`SIGCONT`.
- **Scheduling**: the kernel's scheduler (CFS/EEVDF on Linux) time-slices CPUs; **nice** values adjust priority (−20 highest to 19 lowest).
- **Context switch**: saving one task's state and loading another's — too many (thousands of threads) wastes CPU.

### Memory management
- **Virtual memory**: each process sees its own address space; the kernel maps virtual pages (4 KB) to physical RAM via page tables.
- **Page fault**: accessing a page not in RAM — minor (just map it) or major (read from disk).
- **Swap**: disk space used when RAM is full — prevents crashes but is very slow; heavy swapping ("thrashing") kills performance.
- **Page cache**: Linux uses free RAM to cache disk files — so "free" memory looks low on a healthy server. Look at **available**, not free (`free -h`).
- **OOM killer**: when RAM and swap are exhausted, the kernel kills a process (usually the biggest) — check `dmesg` / `journalctl -k` for "Out of memory: Killed process".
- **Memory leak**: a process's memory keeps growing without being released.

### Storage and file systems
- **Partition**: a slice of a disk (MBR: up to 4 primary, 2 TB limit; **GPT**: modern, large disks, many partitions).
- **File system**: structure on a partition — Linux: **ext4**, **XFS** (RHEL default), Btrfs; Windows: **NTFS**, ReFS; FAT32/exFAT for USB.
- **Inode** (Unix): metadata about a file (owner, permissions, size, timestamps, pointers to data blocks) — the name lives in the directory entry. You can run out of **inodes** with millions of tiny files even when space is free (`df -i`).
- **Hard link** vs **symbolic link**: hard link = another name for the same inode (same file system only); symlink = a small file pointing to a path (can dangle).
- **Mounting**: attaching a file system to a directory (`mount`, `/etc/fstab`); Linux has one tree starting at `/`.
- **Journaling**: file systems log metadata changes first, so they recover quickly after crashes.

### The Linux directory layout (FHS)
| Path | Contains |
|---|---|
| `/etc` | Configuration files |
| `/var` | Variable data: logs (`/var/log`), spools, caches, databases |
| `/home` | User home directories; `/root` for root |
| `/bin`, `/usr/bin` | User programs; `/sbin`, `/usr/sbin` admin programs |
| `/lib`, `/usr/lib` | Shared libraries |
| `/tmp` | Temporary files (often cleared on reboot) |
| `/boot` | Kernel, initramfs, bootloader files |
| `/dev` | Device files (`/dev/sda`, `/dev/null`) |
| `/proc`, `/sys` | Virtual file systems exposing kernel and process info |
| `/opt` | Optional third-party software |
| `/mnt`, `/media` | Mount points |

### Kernel vs user space, system calls
User programs can't touch hardware directly; they call the kernel (`read`, `write`, `open`, `fork`, `socket`). Tools like `strace` show these calls — gold for debugging "why does this program hang?".

### 32-bit vs 64-bit, CPU basics
64-bit addresses allow far more than 4 GB RAM per process. Know cores vs threads (hyper-threading), CPU sockets, NUMA (memory closer to some CPUs — matters for big databases and VMs), virtualization extensions (Intel VT-x / AMD-V).

### Windows equivalents
| Linux | Windows |
|---|---|
| systemd services | Windows Services (`services.msc`, `Get-Service`) |
| `/etc` config files | Registry + config files |
| ext4/XFS | NTFS |
| `ps`, `top` | Task Manager, `Get-Process`, Resource Monitor |
| journald / syslog | Event Viewer (System, Application, Security logs) |
| root | Administrator / SYSTEM |
| GRUB | Windows Boot Manager (BCD) |

## Quick check questions

<details><summary>`free -h` shows only 200 MB free on a 16 GB server. Is it out of memory?</summary>

Probably not. Linux uses spare RAM as page cache. Check the **available** column — memory that can be reclaimed for applications. Worry if available is low, swap usage grows and the system is swapping (`vmstat` si/so).
</details>

<details><summary>Why can't you kill a process in "D" state with kill -9?</summary>

It's in uninterruptible sleep waiting on I/O inside the kernel (often a hung disk or NFS server); signals are delivered only when it returns. Fix the underlying storage/network issue; sometimes only a reboot clears it.
</details>

## Questions asked in interviews

<details><summary>Explain the Linux boot process. <em>· TCS, Infosys, Wipro, HCL, Accenture, IBM (very common)</em></summary>

Firmware (BIOS/UEFI, POST) → bootloader (GRUB2) → kernel + initramfs → kernel mounts root FS → systemd (PID 1) → units/targets (multi-user.target or graphical.target) → login. Mention where to troubleshoot: GRUB menu, kernel parameters, `journalctl -b`, rescue/emergency targets.
</details>

<details><summary>Process vs thread? <em>· Cisco, Oracle, Infosys</em></summary>

Process: independent address space, own resources, heavier to create, isolated. Thread: lightweight execution unit within a process, shares memory and file descriptors, faster to create but needs synchronisation.
</details>

<details><summary>What is a zombie process and how do you get rid of it? <em>· Red Hat, IBM, Accenture</em></summary>

A process that has exited but whose parent hasn't called wait() to read its exit status; it holds only a PID table entry. You can't kill it (it's already dead); signal or fix/restart the parent (SIGCHLD / kill the parent) so init adopts and reaps it. Many zombies indicate a buggy parent.
</details>

<details><summary>What is an inode? What happens if you run out of inodes? <em>· Red Hat, Amazon (support engineer), Cognizant</em></summary>

A data structure storing file metadata and block pointers (not the name). Running out (`df -i` at 100%) prevents creating new files even with free disk space — common with millions of small cache/session files; clean them up or rebuild the file system with more inodes.
</details>

<details><summary>Hard link vs soft link. <em>· TCS, Wipro, HCL</em></summary>

Hard link: another directory entry for the same inode; same file system only; deleting one name keeps the data while links remain; can't link directories. Soft link: separate file containing a path; can cross file systems and point to directories; breaks if the target is removed.
</details>

<details><summary>What is swap and when is it a problem? <em>· Infosys, Oracle</em></summary>

Disk space used as overflow for RAM. A little swap use is normal; continuous swap-in/out (thrashing) makes the system extremely slow. Fix by adding RAM, reducing memory usage, tuning `vm.swappiness`, finding leaks.
</details>

<details><summary>What is the difference between kernel space and user space? <em>· Cisco, Juniper, Red Hat</em></summary>

Kernel space runs privileged code with direct hardware access; user space runs applications with restricted access, using system calls to request kernel services. Isolation prevents a buggy app from crashing the whole system.
</details>

<details><summary>BIOS vs UEFI, MBR vs GPT. <em>· Dell, HP, Infosys</em></summary>

UEFI is the modern firmware: GPT disks > 2 TB, faster boot, Secure Boot, graphical setup. BIOS is legacy with MBR (max 2 TB, 4 primary partitions). GPT stores redundant partition tables.
</details>

<details><summary>What does PID 1 do? <em>· Red Hat, SUSE</em></summary>

The first user-space process (systemd/init): starts and supervises services, manages targets, adopts orphaned processes and reaps zombies, handles shutdown.
</details>

<details><summary>Name common signals and their use. <em>· Amazon, Red Hat</em></summary>

SIGTERM (graceful stop), SIGKILL (force, uncatchable), SIGHUP (reload config/terminal hangup), SIGINT (Ctrl-C), SIGSTOP/SIGCONT (pause/resume), SIGCHLD (child exited). Always try SIGTERM before SIGKILL.
</details>

## End-to-end scenarios

<details><summary>Scenario: A server reboots and is stuck — it never reaches the login prompt. Walk through troubleshooting.</summary>

Get console access (iLO/iDRAC/hypervisor console). Identify the stage: no POST → hardware/firmware; GRUB error → bootloader/config, boot from rescue media, reinstall GRUB; kernel panic → try previous kernel from GRUB menu, check initramfs; drops to emergency shell → often a bad `/etc/fstab` entry or failed file system check — check `journalctl -xb`, fix fstab (use `nofail` for non-critical mounts), run `fsck`; services hang → `systemctl list-jobs`, disable the failing unit. Document the root cause and add monitoring.
</details>

<details><summary>Scenario: An application server becomes very slow every afternoon. Which OS-level signals do you check first?</summary>

CPU load vs core count (`uptime`, `top`), memory available and swapping (`free`, `vmstat 1`), disk I/O wait and latency (`iostat -x 1`), disk space (`df -h`, `df -i`), network errors/saturation, the busiest processes, and logs around that time (cron jobs, backups, log rotation). Correlate with monitoring graphs to find what changes at that hour — then dig into that process (Linux performance module).
</details>
