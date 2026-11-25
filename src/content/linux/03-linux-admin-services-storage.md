---
title: Linux Administration — systemd, Logs, Storage & LVM, Scheduling, SSH, Web Servers
level: 2
tags: linux, systemd, journald, lvm, cron, ssh, nginx, storage
---
<!-- deepened -->

## Start here: the basics

### Services with systemd
A **service** (daemon) is a background program: web server, database, SSH server. On modern Linux, **systemd** starts, stops and supervises them.

```bash
systemctl status nginx            # is it running? recent log lines
sudo systemctl start nginx        # start now
sudo systemctl stop nginx
sudo systemctl restart nginx      # stop + start
sudo systemctl reload nginx       # re-read config without dropping connections (if supported)
sudo systemctl enable nginx       # start automatically at boot  (--now to also start)
systemctl list-units --type=service --state=failed
```

### Logs
```bash
journalctl -u nginx -f            # follow a service's logs
journalctl -b -p err              # errors since this boot
journalctl --since "1 hour ago"
ls /var/log                       # classic text logs: syslog/messages, auth.log/secure, nginx/
```

### Disks in one minute
```bash
lsblk                             # disks and partitions as a tree
df -h                             # space used per mounted file system
sudo fdisk -l / parted -l         # partition tables
mount | column -t                 # what's mounted where
```
<!-- -->

---

## systemd in depth

### Writing a unit for your own app
```ini
# /etc/systemd/system/orders.service
[Unit]
Description=Orders API
After=network-online.target postgresql.service
Wants=network-online.target

[Service]
User=orders
Group=orders
WorkingDirectory=/opt/orders
EnvironmentFile=/etc/orders/env
ExecStart=/usr/bin/java -jar /opt/orders/app.jar
Restart=on-failure
RestartSec=5
LimitNOFILE=65536
# hardening
NoNewPrivileges=true
ProtectSystem=full
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```
```bash
sudo systemctl daemon-reload && sudo systemctl enable --now orders
systemctl cat orders; systemctl show orders -p MainPID,Restart
systemd-analyze blame             # what slows down boot
```
Other unit types: **timers** (cron replacement), sockets, mounts, targets (`multi-user.target`, `graphical.target`, `rescue.target`, `emergency.target`).

### Logging architecture
- **journald** stores structured binary logs; persistent if `/var/log/journal` exists (`Storage=persistent`).
- **rsyslog** writes text files and forwards to central log servers (SIEM, ELK, Graylog, Splunk).
- **logrotate** compresses/rotates logs (`/etc/logrotate.d/`) so disks don't fill — a classic outage cause when misconfigured.
- Important logs: `/var/log/messages` or `syslog` (general), `/var/log/secure` or `auth.log` (logins, sudo), `dmesg` / `journalctl -k` (kernel: hardware, OOM, disk errors), application logs.

## Storage administration

### Adding a new disk (the hands-on interview task)
```bash
lsblk                                   # new disk appears as /dev/sdb (or /dev/nvme1n1)
sudo parted /dev/sdb mklabel gpt
sudo parted /dev/sdb mkpart primary xfs 0% 100%
sudo mkfs.xfs /dev/sdb1                 # or mkfs.ext4
sudo mkdir /data
sudo blkid /dev/sdb1                    # get the UUID
echo 'UUID=<uuid> /data xfs defaults,nofail 0 0' | sudo tee -a /etc/fstab
sudo mount -a && df -h /data            # test fstab BEFORE rebooting
```
Use UUIDs in fstab (device names can change). A typo in fstab can drop the server into emergency mode on reboot — `nofail` for non-critical mounts, and always test with `mount -a`.

### LVM — flexible volumes
```
physical disks ─► Physical Volumes (pvcreate) ─► Volume Group (vgcreate) ─► Logical Volumes (lvcreate) ─► file systems
```
```bash
sudo pvcreate /dev/sdc
sudo vgextend vg_data /dev/sdc                  # add disk to the pool
sudo lvextend -r -L +50G /dev/vg_data/lv_app     # grow LV and resize the FS online (-r)
pvs; vgs; lvs
sudo lvcreate -s -L 10G -n app_snap /dev/vg_data/lv_app   # snapshot before risky changes
```
XFS can grow but **not shrink**; ext4 can shrink offline. Know this — "extend a full /var online" is a common practical question.

### RAID basics
| Level | How | Survives | Usable capacity |
|---|---|---|---|
| RAID 0 | Striping | No failures | 100% (fast, risky) |
| RAID 1 | Mirroring | 1 disk | 50% |
| RAID 5 | Striping + parity | 1 disk | (n−1)/n — slow rebuilds on big disks |
| RAID 6 | Double parity | 2 disks | (n−2)/n |
| RAID 10 | Mirror + stripe | 1 per mirror pair | 50% — best for databases |

**RAID is not a backup** (deletes and corruption are mirrored instantly). Software RAID: `mdadm`; hardware RAID controllers; cloud volumes handle redundancy for you.

### Network file systems
NFS (Linux shares; `/etc/exports`, `showmount`, `mount -t nfs`), SMB/CIFS (Windows shares; Samba on Linux), iSCSI (block storage over IP). Hung NFS mounts cause processes stuck in D state — use `soft`/`timeo` options thoughtfully.

## Scheduling jobs
```bash
crontab -e                              # per-user;  /etc/cron.d/ for system jobs
# m  h  dom mon dow  command
  30 2  *   *   *    /opt/scripts/backup.sh >> /var/log/backup.log 2>&1   # daily 02:30
  */5 *  *   *   *    /opt/scripts/health.sh                                # every 5 minutes
```
Cron runs with a minimal environment (PATH!) — use absolute paths and log output. systemd timers give logging, dependencies and `Persistent=true` (run missed jobs after downtime). `at` for one-off jobs.

## SSH — secure remote access
```bash
ssh-keygen -t ed25519 -C "riya@laptop"
ssh-copy-id riya@server                 # install public key into ~/.ssh/authorized_keys
ssh -i key.pem ubuntu@10.0.1.5
ssh -J bastion.example.com app01        # jump through a bastion host
ssh -L 5432:db.internal:5432 bastion    # local port forward to reach a private DB
```
Hardening `/etc/ssh/sshd_config`: `PermitRootLogin no`, `PasswordAuthentication no`, `AllowGroups ssh-users`, non-default port is optional (obscurity), fail2ban for brute force, MFA for bastions. Permissions: `~/.ssh` 700, `authorized_keys` 600 — wrong permissions silently break key login.

## Web servers & reverse proxies
```nginx
# /etc/nginx/conf.d/orders.conf
server {
    listen 443 ssl;
    server_name orders.example.com;
    ssl_certificate     /etc/letsencrypt/live/orders.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/orders.example.com/privkey.pem;
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
`nginx -t` before reload; Apache httpd equivalents (`apachectl configtest`). Know: virtual hosts, TLS termination, reverse proxy, static file serving, access/error logs, 502 (upstream down) vs 504 (upstream timeout).

## Time, hostnames, kernel parameters
- Time sync: `chronyd`/`timedatectl` — skewed clocks break Kerberos/AD logins, TLS and log correlation.
- `hostnamectl set-hostname`, `/etc/hosts`.
- Kernel tunables: `sysctl -a`, persistent in `/etc/sysctl.d/*.conf` (e.g., `net.core.somaxconn`, `vm.swappiness`, `fs.file-max`).
- Kernel modules: `lsmod`, `modprobe`.

## Quick check questions

<details><summary>`reload` vs `restart` for a service?</summary>

Reload asks the running process to re-read configuration (e.g., nginx graceful reload — no dropped connections). Restart stops and starts the process — brief downtime, needed for binary upgrades or settings that can't reload.
</details>

<details><summary>You extended an LV but `df -h` still shows the old size. Why?</summary>

The file system wasn't grown. Run `xfs_growfs /mountpoint` (XFS) or `resize2fs /dev/vg/lv` (ext4), or use `lvextend -r` to do both.
</details>

## Questions asked in interviews

<details><summary>How do you create a systemd service for a custom application? <em>· Red Hat, IBM, Infosys</em></summary>

Write a unit file in /etc/systemd/system with [Unit] (description, ordering), [Service] (User, ExecStart, Restart, environment, limits) and [Install] (WantedBy=multi-user.target); `systemctl daemon-reload`, `enable --now`, check `status` and `journalctl -u`.
</details>

<details><summary>Explain LVM and how to extend a file system online. <em>· TCS, Wipro, HCL, Red Hat (RHCSA staple)</em></summary>

PV → VG → LV abstraction; add a disk with pvcreate + vgextend, then `lvextend -r -L +SIZE` (or lvextend + xfs_growfs/resize2fs) while mounted. Snapshots for safe changes. XFS can't shrink.
</details>

<details><summary>What is /etc/fstab and what happens if it's wrong? <em>· Accenture, Infosys</em></summary>

Defines file systems to mount at boot (device/UUID, mount point, type, options, dump, fsck order). A bad entry can stop boot and drop to emergency mode; use UUIDs, `nofail` for optional mounts, and test with `mount -a`.
</details>

<details><summary>RAID levels — which would you choose for a database? <em>· Dell, HP, Oracle, IBM</em></summary>

RAID 10 for databases (good write performance, fast rebuild, survives a disk per mirror). RAID 5/6 for read-heavy capacity storage. RAID 0 never for important data. And always backups — RAID isn't backup.
</details>

<details><summary>How do you schedule a job and debug a cron job that doesn't run? <em>· TCS, Amazon (ops)</em></summary>

crontab/cron.d or systemd timer. Debug: check syntax/timing (crontab.guru style reasoning), cron logs (`journalctl -u cron`/`/var/log/cron`), PATH and environment differences, executable permissions, output redirection to a log, user context, `%` escaping in crontab.
</details>

<details><summary>How do you secure SSH? <em>· Amazon, Infosys, banks</em></summary>

Keys only, disable root login and passwords, restrict users/groups, bastion/jump hosts, MFA, fail2ban/rate limiting, keep OpenSSH patched, rotate and revoke keys, audit `authorized_keys`, use short-lived certificates in larger orgs.
</details>

<details><summary>Where do you look when a service fails to start? <em>· Red Hat, IBM, Accenture</em></summary>

`systemctl status svc`, `journalctl -xeu svc`, application logs, config test command (nginx -t), permissions/SELinux denials, port conflicts (`ss -tulpn`), missing env/files, dependency services.
</details>

<details><summary>What is logrotate? <em>· HCL, Cognizant</em></summary>

A tool (run daily by cron/timer) that rotates, compresses and deletes old logs per config in /etc/logrotate.d (size/time, keep N, copytruncate or postrotate reload). Prevents logs from filling disks.
</details>

## End-to-end scenarios

<details><summary>Scenario: /var is 100% full on a production server at 3 AM and the app is failing. What do you do?</summary>

Contain: find the culprit fast (`du -xh --max-depth=1 /var | sort -h`), usually logs. Free space safely: compress/delete rotated old logs, truncate (not delete) an active huge log (`: > file` or `truncate -s 0`), check deleted-but-open files (`lsof +L1`) and restart the holder. Restore service, then fix the root cause: logrotate config, log level, separate /var/log volume, LVM extend, and a disk-usage alert at 80%. Write it up.
</details>

<details><summary>Scenario: Deploy a Spring Boot app on a fresh Linux VM behind nginx with HTTPS.</summary>

Create a service user; install Java; copy the jar to /opt/app; systemd unit with Restart=on-failure and hardening; nginx reverse proxy on 443 with a Let's Encrypt certificate (certbot) and HTTP→HTTPS redirect; firewall allows 22 (restricted), 80, 443 only; logrotate for app logs; health check endpoint monitored; automate it all with Ansible.
</details>
