---
title: Linux Essentials — Shell, Files, Permissions, Users, Packages
level: 1
tags: linux, shell, permissions, users, packages, commands
---
<!-- deepened -->

## Start here: the basics

### Getting a Linux machine to practise on
- **Free in the browser**: Killercoda Linux playgrounds (link at the end) — a real terminal, nothing to install.
- **On Windows**: WSL (`wsl --install` in an admin PowerShell) gives you Ubuntu inside Windows.
- **A VM**: VirtualBox/VMware/Hyper-V with Ubuntu Server or Rocky Linux (RHEL-compatible — many companies run RHEL).

### The shell
The **shell** (usually `bash`) reads commands you type and runs programs. The prompt `user@host:~$` means: logged in as *user* on *host*, current directory `~` (your home), `$` = normal user (`#` = root).

```bash
pwd                      # print working directory
ls -lah                  # list files: long format, all (incl. hidden), human sizes
cd /var/log              # change directory (absolute path)
cd ..                    # up one level;  cd ~  or just cd → home;  cd - → previous dir
mkdir -p projects/demo   # make directories (with parents)
touch notes.txt          # create empty file / update timestamp
cp file.txt backup.txt   # copy;  cp -r dir1 dir2 for directories
mv old.txt new.txt       # move or rename
rm file.txt              # delete (no recycle bin!);  rm -r dir  (be very careful with rm -rf)
cat file.txt             # print a file;  less file.txt to scroll (q to quit)
head -n 20 file; tail -n 50 file; tail -f /var/log/syslog   # follow a growing log
man ls                   # manual page;  ls --help
history; !!              # previous commands; repeat last
```

### Getting help and not getting lost
`man`, `--help`, `tldr` (community cheat sheets), `type cmd` / `which cmd` (where a command comes from), Tab completion, Ctrl-R (search history), Ctrl-C (stop), Ctrl-D (end input / log out).

### Permissions in one picture
```
-rwxr-x---  1  riya  devs  4096  Nov 25 10:00  deploy.sh
│└┬┘└┬┘└┬┘     owner group
│ │  │  └── others: no permissions
│ │  └───── group (devs): read + execute
│ └──────── owner (riya): read + write + execute
└────────── type: - file, d directory, l symlink
```
r = 4, w = 2, x = 1 → `chmod 750 deploy.sh` = rwx r-x ---.
<!-- -->

---

## Deep dive

### Text processing — the sysadmin's superpower
```bash
grep -i "error" /var/log/syslog                  # search (case-insensitive)
grep -rn "listen" /etc/nginx/                    # recursive with line numbers
grep -v "^#" config.conf | grep -v "^$"          # strip comments and blank lines
cut -d: -f1 /etc/passwd                          # first field (usernames)
awk '{print $1}' access.log | sort | uniq -c | sort -rn | head   # top client IPs in an nginx log
awk -F, '$3 > 1000 {print $1, $3}' sales.csv     # filter CSV rows
sed -i 's/old-host/new-host/g' app.conf          # in-place replace (make a backup first!)
wc -l file                                        # count lines
sort -u, uniq, tr, xargs, tee, diff, find
find /var/log -name "*.log" -mtime +7 -size +100M     # logs older than 7 days and > 100 MB
find / -xdev -type f -size +1G 2>/dev/null            # big files on the root FS
du -sh /var/* | sort -h | tail                         # which directory is eating disk
```
Pipes (`|`) chain commands; redirection: `>` overwrite, `>>` append, `2>` stderr, `2>&1` merge stderr into stdout, `&> /dev/null` discard all.

### Permissions in depth
```bash
chmod u+x script.sh; chmod 640 secret.conf; chmod -R g+w shared/
chown riya:devs file; chown -R www-data: /var/www/site
umask                       # default permission mask (e.g. 0022 → new files 644, dirs 755)
```
| Special bit | On files | On directories |
|---|---|---|
| **setuid** (4xxx, `s` in owner x) | Runs with the file owner's privileges (`/usr/bin/passwd`) | — |
| **setgid** (2xxx) | Runs with group privileges | New files inherit the directory's group (shared team folders) |
| **sticky** (1xxx, `t`) | — | Only the owner can delete their files (`/tmp`) |

Directory permissions: `r` list names, `w` create/delete entries, `x` enter/traverse. You need `x` on every parent directory to reach a file.

**ACLs** for finer control: `setfacl -m u:arjun:rw report.txt`, `getfacl`. **SELinux/AppArmor** add mandatory access control on top (RHEL: `getenforce`, `ls -Z`, `restorecon`; never "fix" problems by permanently disabling SELinux in production).

### Users, groups and sudo
```bash
id; whoami; groups
sudo useradd -m -s /bin/bash -G devs priya      # create user with home dir and group
sudo passwd priya
sudo usermod -aG docker priya                    # -a append! (without it you replace all groups)
sudo userdel -r olduser
sudo groupadd devs
sudo visudo                                       # safely edit /etc/sudoers
```
Files: `/etc/passwd` (users), `/etc/shadow` (password hashes, root-only), `/etc/group`, `/etc/sudoers` + `/etc/sudoers.d/`. Best practice: no direct root SSH login; admins use personal accounts + sudo (audit trail).

### Package management
| Family | Low-level | High-level | Examples |
|---|---|---|---|
| Debian/Ubuntu | `dpkg` | `apt` | `apt update && apt install nginx`, `apt upgrade`, `apt remove` |
| RHEL/Rocky/Fedora | `rpm` | `dnf` (formerly `yum`) | `dnf install httpd`, `dnf update`, `rpm -qa`, `rpm -qf /path` (which package owns a file) |
| SUSE | `rpm` | `zypper` | |

Repositories, GPG-signed packages, pinning versions, unattended security updates, and internal mirrors are interview talking points.

### Processes and jobs
```bash
ps aux | grep nginx; ps -ef --forest; pgrep -a java
top / htop                    # live view: load, CPU, memory; press P / M to sort
kill PID; kill -9 PID; pkill -f "python app.py"
nohup ./long.sh &             # keep running after logout;  jobs, fg, bg, Ctrl-Z
lsof -i :8080                 # which process owns port 8080
lsof +D /var/log              # open files under a directory
```

### Archives and transfer
```bash
tar -czvf backup.tgz /etc     # create gzip archive;  tar -xzvf backup.tgz -C /restore
zip -r site.zip site/; unzip site.zip
scp file user@host:/tmp/;  rsync -avz --delete src/ user@host:/dest/   # rsync: incremental, resumable
```

### Environment
`env`, `export VAR=value`, `~/.bashrc` / `~/.profile`, `PATH`, aliases (`alias ll='ls -lah'`).

## Quick check questions

<details><summary>What does `chmod 755` mean on a directory?</summary>

Owner rwx (list, create/delete, enter); group and others r-x (list and enter, but not create or delete files).
</details>

<details><summary>Why is `usermod -G docker priya` dangerous compared to `usermod -aG docker priya`?</summary>

Without `-a`, `-G` replaces all supplementary groups with only `docker`, removing the user from sudo/other groups.
</details>

## Questions asked in interviews

<details><summary>Explain Linux file permissions and how to set them. <em>· TCS, Infosys, Wipro, Red Hat (RHCSA-style)</em></summary>

Three classes (user, group, others) × three bits (r=4, w=2, x=1); `chmod` with octal (750) or symbolic (u+x, g-w); `chown user:group`; special bits setuid/setgid/sticky; ACLs for exceptions; umask sets defaults.
</details>

<details><summary>How do you find which files are filling up the disk? <em>· Amazon (support), Accenture, IBM</em></summary>

`df -h` to find the full file system, then `du -sh /*` (or `du -xh --max-depth=1 /var | sort -h`) drilling down; `find / -xdev -size +1G`; check deleted-but-open files with `lsof +L1` (space isn't freed until the process closes them — restart or truncate).
</details>

<details><summary>How do you find which process is listening on a port? <em>· Cisco, HCL, Oracle</em></summary>

`ss -tulpn | grep :8080` (or `netstat -tulpn` on older systems), `lsof -i :8080`, `fuser 8080/tcp`.
</details>

<details><summary>What is the difference between `apt` and `dpkg` / `dnf` and `rpm`? <em>· Red Hat, Canonical-style questions</em></summary>

dpkg/rpm install individual package files without resolving dependencies; apt/dnf fetch from repositories and resolve dependencies, handle upgrades and removal.
</details>

<details><summary>What is sudo and why not log in as root? <em>· Infosys, Wipro, Amazon</em></summary>

sudo grants specific elevated commands to specific users with logging; avoids sharing the root password, limits blast radius, provides an audit trail of who ran what. Root SSH login is usually disabled.
</details>

<details><summary>Explain setuid, setgid and the sticky bit with examples. <em>· Red Hat, IBM</em></summary>

setuid: program runs as owner (`passwd` edits /etc/shadow as root). setgid on directory: new files inherit the group (team shares). Sticky on /tmp: users can only delete their own files.
</details>

<details><summary>Count the most frequent IP addresses in a web log. <em>· Amazon, Akamai, Flipkart (ops)</em></summary>

`awk '{print $1}' access.log | sort | uniq -c | sort -rn | head -10`.
</details>

<details><summary>What's in /etc/passwd and /etc/shadow? <em>· TCS, HCL</em></summary>

passwd: username, x (password in shadow), UID, GID, comment, home, shell — world-readable. shadow: username, password hash, ageing info — root-only.
</details>

<details><summary>What is a soft vs hard limit (ulimit)? <em>· Oracle, Red Hat</em></summary>

Resource limits per user/process (open files, processes). Soft limit is the current enforced value a user can raise up to the hard limit; set persistently in `/etc/security/limits.conf` or systemd `LimitNOFILE=`. "Too many open files" errors often need higher nofile limits.
</details>

<details><summary>How do you copy files between servers efficiently? <em>· Infosys, Amazon</em></summary>

`rsync -avz --partial` (incremental, resumable, preserves permissions) over SSH; `scp` for simple copies; for huge datasets, parallel rsync or object storage tools.
</details>

## End-to-end scenarios

<details><summary>Scenario: A developer says "Permission denied" when the app tries to write to /data/uploads. Debug it.</summary>

Check which user the app runs as (`ps -o user= -p PID` or the systemd unit's `User=`), then `ls -ld /data /data/uploads` (need x on /data and w+x on uploads), ownership/group, ACLs (`getfacl`), mount options (`mount | grep data` — read-only? noexec?), SELinux denials (`ausearch -m avc -ts recent`, `ls -Z`; fix with the correct context via `semanage fcontext` + `restorecon`). Grant the minimum (group write via setgid shared dir), never `chmod 777`.
</details>

<details><summary>Scenario: Onboard 30 new developers to a Linux build server with sudo only for restarting the app service.</summary>

Create users (script or, better, central identity via LDAP/AD/SSSD), add to a `devs` group, SSH key authentication only, a sudoers drop-in: `%devs ALL=(root) NOPASSWD: /usr/bin/systemctl restart myapp.service`, home directory quotas if needed, and audit logging. Automate with Ansible so it's repeatable.
</details>
