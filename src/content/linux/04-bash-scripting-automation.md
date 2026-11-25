---
title: Bash Scripting & Automation with Ansible
level: 2
tags: bash, shell scripting, automation, ansible, cron
---
<!-- deepened -->

## Start here: the basics

### Why scripting is non-negotiable
The rule in operations: **if you do it twice, script it; if you do it on many servers, automate it.** Interviewers for systems roles almost always ask you to write a small script live — check disk usage and alert, rotate backups, parse a log, restart a stuck service.

### Your first script
```bash
#!/usr/bin/env bash
# hello.sh — greet a user
name="${1:-world}"            # first argument, default "world"
echo "Hello, ${name}! Today is $(date +%A)."
```
```bash
chmod +x hello.sh
./hello.sh Priya              # Hello, Priya! Today is Wednesday.
```

### The building blocks
```bash
count=5                                # variables: no spaces around =
echo "$count files"                    # always quote variables
files=$(ls /var/log | wc -l)           # command substitution
if [[ $count -gt 3 ]]; then echo "many"; elif [[ $count -eq 3 ]]; then echo "three"; else echo "few"; fi
for f in /var/log/*.log; do echo "$f"; done
for i in {1..5}; do echo "$i"; done
while read -r line; do echo "got: $line"; done < input.txt
greet() { local who="$1"; echo "hi $who"; }      # functions
greet "Arjun"
echo $?                                          # exit status of the last command (0 = success)
```
Test operators: numbers `-eq -ne -lt -le -gt -ge`; strings `==`, `!=`, `-z` (empty), `-n` (non-empty); files `-f` (file exists), `-d` (directory), `-r/-w/-x`, `-s` (non-empty).
<!-- -->

---

## Writing scripts like a professional

### Safety header
```bash
#!/usr/bin/env bash
set -euo pipefail          # exit on error, on unset variables, and if any command in a pipeline fails
IFS=$'\n\t'                # safer word splitting
trap 'echo "Error on line $LINENO" >&2' ERR
```
Without `set -e`, a failed `cd /wrong/dir` followed by `rm -rf *` deletes the wrong directory — the classic disaster.

### A real script: disk usage alert
```bash
#!/usr/bin/env bash
# disk_alert.sh — warn when any file system exceeds a threshold
set -euo pipefail

THRESHOLD="${1:-85}"
HOST="$(hostname)"
alert=0

while read -r fs size used avail pct mount; do
    usage="${pct%\%}"                                   # strip the % sign
    if (( usage >= THRESHOLD )); then
        echo "[$(date -Is)] WARNING ${HOST}: ${mount} at ${pct} (${avail} free)"
        alert=1
    fi
done < <(df -hP -x tmpfs -x devtmpfs | tail -n +2)

exit "$alert"                                          # non-zero exit lets monitoring/cron detect it
```

### A real script: backup with retention
```bash
#!/usr/bin/env bash
set -euo pipefail
SRC="/var/www"
DEST="/backups"
KEEP_DAYS=14
STAMP="$(date +%F_%H%M)"
LOG="/var/log/site-backup.log"

mkdir -p "$DEST"
{
  echo "[$(date -Is)] starting backup"
  tar -czf "$DEST/site_$STAMP.tgz" -C "$SRC" .
  sha256sum "$DEST/site_$STAMP.tgz" > "$DEST/site_$STAMP.tgz.sha256"
  find "$DEST" -name 'site_*.tgz*' -mtime +"$KEEP_DAYS" -delete
  echo "[$(date -Is)] done"
} >> "$LOG" 2>&1
```
Schedule with cron or a systemd timer; copy off-host (rsync/S3) and **test restores**.

### Parsing logs
```bash
# Top 10 URLs returning 5xx in an nginx access log
awk '$9 ~ /^5/ {print $7}' /var/log/nginx/access.log | sort | uniq -c | sort -rn | head
# Failed SSH logins by source IP
grep "Failed password" /var/log/auth.log | grep -oE '[0-9]+(\.[0-9]+){3}' | sort | uniq -c | sort -rn | head
```

### Arrays, arguments, options
```bash
servers=(app01 app02 app03)
for s in "${servers[@]}"; do ssh "$s" uptime; done
echo "${#servers[@]} servers"

while getopts ":d:t:v" opt; do       # ./script.sh -d /data -t 90 -v
  case $opt in
    d) dir="$OPTARG" ;; t) threshold="$OPTARG" ;; v) verbose=1 ;;
    *) echo "usage: $0 -d dir [-t pct] [-v]" >&2; exit 2 ;;
  esac
done
```

### Good habits
Quote every variable (`"$var"`), use `[[ ]]` not `[ ]`, `$(...)` not backticks, `local` in functions, log with timestamps, meaningful exit codes, `shellcheck` your scripts (it catches most bugs), keep scripts in **Git**, and make them **idempotent** (safe to run twice).

## Ansible — automation across many servers
Ansible is agentless: it connects over SSH (WinRM for Windows) and applies **idempotent** tasks described in YAML.

```ini
# inventory.ini
[web]
web01.example.com
web02.example.com
[db]
db01.example.com
```
```yaml
# site.yml
- name: Configure web servers
  hosts: web
  become: true
  vars:
    app_user: orders
  tasks:
    - name: Install nginx
      ansible.builtin.package:
        name: nginx
        state: present
    - name: Create app user
      ansible.builtin.user:
        name: "{{ app_user }}"
        system: true
    - name: Deploy nginx config
      ansible.builtin.template:
        src: templates/orders.conf.j2
        dest: /etc/nginx/conf.d/orders.conf
      notify: Reload nginx
    - name: Ensure nginx is running and enabled
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: true
  handlers:
    - name: Reload nginx
      ansible.builtin.service:
        name: nginx
        state: reloaded
```
```bash
ansible all -i inventory.ini -m ping
ansible-playbook -i inventory.ini site.yml --check --diff     # dry run
ansible-playbook -i inventory.ini site.yml --limit web01
```
Concepts to know: inventory (static/dynamic from cloud), modules, idempotency, handlers, variables and facts, Jinja2 templates, **roles** for reuse, **Ansible Vault** for secrets, `--check` dry runs. Compare with Terraform (provisions infrastructure) vs Ansible (configures what's on it); Puppet/Chef (agent-based) as alternatives.

## Quick check questions

<details><summary>What does `set -euo pipefail` do?</summary>

`-e` exits when a command fails; `-u` errors on unset variables; `-o pipefail` makes a pipeline fail if any command in it fails (not just the last). Together they stop scripts from continuing after errors.
</details>

<details><summary>Why quote "$var"?</summary>

Unquoted variables undergo word splitting and glob expansion — a filename with spaces becomes two arguments, `*` expands to files. Quoting preserves the value exactly.
</details>

## Questions asked in interviews

<details><summary>Write a script that monitors a service and restarts it if it's down. <em>· TCS, Infosys, Amazon (ops), Accenture</em></summary>

```bash
#!/usr/bin/env bash
set -euo pipefail
svc="${1:?usage: $0 service}"
if ! systemctl is-active --quiet "$svc"; then
  echo "[$(date -Is)] $svc down, restarting" | tee -a /var/log/watchdog.log
  systemctl restart "$svc"
  sleep 5
  systemctl is-active --quiet "$svc" || { echo "restart failed" >&2; exit 1; }
fi
```
Mention better options: systemd `Restart=on-failure` plus monitoring alerts, so you don't hide recurring crashes.
</details>

<details><summary>What's the difference between `$*` and `$@`, and `$?`, `$$`, `$!`? <em>· Wipro, HCL, Cognizant</em></summary>

`"$@"` expands to each argument separately (correct for forwarding), `"$*"` to one string. `$?` last exit status, `$$` current shell PID, `$!` PID of last background job, `$#` number of arguments, `$0` script name.
</details>

<details><summary>How do you make a script idempotent? <em>· Red Hat, Atlassian</em></summary>

Check state before changing it (`id user || useradd ...`, `grep -q line file || echo line >> file`, `mkdir -p`), use declarative tools (Ansible modules) that converge to a desired state, so running twice changes nothing the second time.
</details>

<details><summary>Ansible vs Terraform vs shell scripts? <em>· Amazon, Infosys, Accenture</em></summary>

Shell scripts: quick, imperative, hard to scale safely. Ansible: agentless configuration management, idempotent modules, great for OS/app config. Terraform: declarative provisioning of infrastructure (VMs, networks, cloud services) with state. Often combined: Terraform creates, Ansible configures.
</details>

<details><summary>How do you store secrets used by automation? <em>· banks, Amazon</em></summary>

Never in scripts or Git. Ansible Vault, a secrets manager (HashiCorp Vault, AWS Secrets Manager, Azure Key Vault), environment injection by CI with least privilege, rotation and audit.
</details>

<details><summary>Write a one-liner to find and delete files older than 30 days in /tmp/app. <em>· TCS, IBM</em></summary>

`find /tmp/app -type f -mtime +30 -print -delete` (run without `-delete` first to review).
</details>

## End-to-end scenarios

<details><summary>Scenario: You manage 200 Linux servers and a critical OpenSSL vulnerability is announced. Plan the patch.</summary>

Inventory affected versions (Ansible ad-hoc `rpm -q openssl` / package facts); test the update on staging; roll out in waves with Ansible (`serial: 10%`), restarting services that link OpenSSL (or reboot), with health checks between waves; verify versions afterwards; document exceptions with compensating controls; report completion to security.
</details>

<details><summary>Scenario: Write a script that checks 20 websites every 5 minutes and alerts if one is down or slow.</summary>

Loop over a URL list with `curl -s -o /dev/null -w '%{http_code} %{time_total}' --max-time 10`; alert (mail/Slack webhook) if code isn't 2xx/3xx or time > threshold; avoid alert storms by alerting on state change; run via systemd timer; log results. Then explain why a monitoring tool (Uptime Kuma, Prometheus blackbox exporter) is better long-term.
</details>
