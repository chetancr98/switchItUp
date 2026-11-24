---
title: Rebase, Merge, Recovery & Team Workflows on GitHub
level: 2
tags: git, rebase, github, workflow, pull requests
---
<!-- deepened -->

## Start here: the basics

### Working in a team: the pull request flow
1. Create a branch from `main` for your task.
2. Commit small, logical changes.
3. Push and open a **Pull Request (PR)** describing what and why.
4. CI runs tests; teammates **review** and comment.
5. Address feedback, get approval, **merge** into main.
6. Delete the branch.

### Merge conflicts — don't panic
A conflict happens when two branches changed the same lines. Git marks them:
```
<<<<<<< HEAD
int discount = 10;
=======
int discount = 15;
>>>>>>> feature/sale
```
Decide the correct final code (maybe neither!), delete the markers, `git add` the file, and continue the merge/rebase. Then run the tests.

### Merge vs rebase (simple version)
- **Merge** combines branches and keeps history as it happened (adds a merge commit).
- **Rebase** replays your commits on top of the latest main, giving a straight-line history.
Rule: rebase your **own** unpublished branch to stay up to date; never rebase commits others are using.

### Keeping your branch up to date
```bash
git fetch origin
git rebase origin/main        # or: git merge origin/main
git push --force-with-lease   # needed after a rebase of an already-pushed branch (safe force)
```

---

## Merge vs rebase

```
Before:           C---D  feature
                 /
            A---B---E---F  main

merge:            C---D------M  feature        (M has parents D and F; history preserved)
                 /          /
            A---B---E---F--

rebase:                   C'--D'  feature       (C, D replayed on top of F as NEW commits)
                         /
            A---B---E---F  main
```

| | Merge | Rebase |
|---|---|---|
| History | True, with merge commits | Linear, rewritten |
| Commit hashes | Preserved | **New** hashes |
| Conflicts | Resolve once | Possibly per replayed commit |
| Safe on shared branches | ✅ | ❌ **Never rebase commits others have based work on** |
| Bisect/readability | Noisier | Clean |

**Golden rule**: rebase your *local/private* work freely; never rewrite published history others depend on.

Typical team flow: rebase your feature branch on `main` to stay current (`git pull --rebase` / `git rebase origin/main`), then **squash-merge** or **rebase-merge** the PR.

### PR merge options on GitHub
- **Merge commit**: keeps every commit + a merge commit.
- **Squash and merge**: one commit per PR on main → clean, revertible units. Most common for product teams.
- **Rebase and merge**: replays each commit linearly — requires well-crafted commits.

## Interactive rebase — clean up before review

```bash
git rebase -i HEAD~5         # or: git rebase -i origin/main
pick   a1 Add order entity
squash b2 fix typo                 # meld into previous, combine messages
fixup  c3 address review           # meld, discard message
reword d4 Add cancel endpoint      # edit message
drop   e5 debug logging
```
Auto-squash workflow: `git commit --fixup=a1` then `git rebase -i --autosquash origin/main`.

## Conflict resolution like a senior

```bash
git merge origin/main            # or rebase
# CONFLICT in OrderService.java
git status                        # see conflicted files
git diff                          # conflict hunks
git checkout --ours file   / --theirs file    # take a side entirely (careful: in REBASE, "ours" = upstream!)
git mergetool                     # or IDE 3-way merge
git add file && git rebase --continue   # or git commit for merge
git rebase --abort / git merge --abort  # bail out
```
- Enable **`rerere`** (`git config --global rerere.enabled true`) — Git remembers how you resolved a conflict and re-applies it.
- `merge.conflictStyle=zdiff3` shows the base version in conflict markers — makes resolutions far easier.
- Run the tests after resolving; a conflict-free merge can still be **semantically** broken.

## Power tools

| Tool | Use |
|---|---|
| `git cherry-pick <sha>` | Apply a specific commit elsewhere (hotfix to release branch). `-x` records origin |
| `git stash push -m "wip" ` / `stash pop` / `stash list` | Shelve work in progress; `stash -u` includes untracked |
| `git bisect start; bisect bad; bisect good v1.2` | Binary search for the commit that introduced a bug; `git bisect run ./test.sh` automates it — O(log n) |
| `git blame -w -C -C` / `git log -S "fnName"` (pickaxe) / `git log -L :method:File.java` | Who/when/why a line changed |
| `git worktree add ../hotfix main` | Second working directory, same repo — fix prod without stashing |
| `git commit --amend` | Fix last commit (unpushed) |
| `git revert -m 1 <merge-sha>` | Revert a merge commit (keep parent 1) |
| `git reflog` | Recover anything |
| `git clean -fdx` (dry-run with `-n` first) | Remove untracked/ignored files |
| `git sparse-checkout`, partial clone (`--filter=blob:none`) | Huge monorepos |
| `git switch -c` / `git restore` | Modern replacements for overloaded `checkout` |

### Recovery recipes
| Oops | Fix |
|---|---|
| Committed to main instead of a branch (unpushed) | `git branch feature; git reset --hard origin/main; git switch feature` |
| Wrong commit message (unpushed) | `git commit --amend` |
| Need to undo a pushed commit | `git revert <sha>` |
| Committed a secret | Rotate the secret **first** (it's compromised); then rewrite history with `git filter-repo` / BFG and force-push; ask GitHub support to purge caches |
| Bad rebase | `git reflog` → `git reset --hard HEAD@{n}` (or `ORIG_HEAD`) |
| Deleted a branch | `git reflog` / `git branch name <sha>` |

## Branching strategies

| Strategy | Shape | Fits |
|---|---|---|
| **Trunk-based** | Everyone integrates into main daily via short-lived branches; feature flags; release from main | SaaS, CI/CD, high-performing teams (Google uses a monorepo trunk) |
| **GitHub Flow** | main + feature branches + PRs; deploy from main | Most web teams |
| **GitFlow** | `develop`, `feature/*`, `release/*`, `hotfix/*`, `main` | Versioned/packaged software, multiple supported versions |
| Release branches | Cut `release/2.3` from main, cherry-pick fixes | Mobile apps, on-prem |

## GitHub collaboration

- **Branch protection / rulesets**: required reviews, required status checks, linear history, signed commits, no force-push, **CODEOWNERS** auto-assign reviewers per path.
- **Merge queue**: tests each PR against the latest main + PRs ahead of it → main never breaks under concurrent merges.
- **PR hygiene**: small (< 400 lines), one purpose, descriptive title, "what/why/how tested", screenshots for UI, link to ticket, self-review first.
- **Code review**: review for correctness, design, tests, readability; be specific and kind; distinguish blocking vs nit; approve with comments when appropriate.
- **Conventional Commits** (`feat(order): add cancel endpoint`) → automated changelogs & semver.
- Signed commits (GPG/SSH/Sigstore gitsign); Dependabot; secret scanning push protection; CodeQL.
- **Hooks**: client-side `pre-commit` (format, lint — use the `pre-commit` framework/husky), `commit-msg`; server-side enforcement belongs in CI/branch protection.

## Your public GitHub as a hiring asset
- Pin 3–6 repos that show depth: a microservices demo with CI/CD, tests, Docker/K8s manifests, README with architecture diagram and trade-offs.
- Real contributions to OSS (even docs/tests) signal collaboration skills.
- Green CI badges, meaningful commit history, issues/PR descriptions — reviewers read them.

## Quick check questions

<details><summary>1. When would you choose rebase over merge?</summary>

Rebase to keep a private feature branch current with main and to tidy commits before review (linear, readable history). Merge when integrating shared branches or when preserving the true history matters. Never rebase commits others have pulled.
</details>

<details><summary>2. A bug appeared somewhere in the last 300 commits. How do you find it fast?</summary>

`git bisect` between a known good tag and HEAD — ~9 steps (log₂300). Automate with `git bisect run` and a script that exits non-zero on failure.
</details>

<details><summary>3. During a rebase, what do "ours" and "theirs" mean?</summary>

They're swapped relative to merge: during rebase, "ours" is the branch being rebased onto (upstream, e.g. main) and "theirs" is your commit being replayed. During merge, "ours" is your current branch.
</details>

<details><summary>4. You pushed an API key to a public repo. What do you do?</summary>

Revoke/rotate the key immediately (assume compromised — bots scrape GitHub within seconds). Check logs for misuse. Then purge it from history (git filter-repo/BFG, force-push, coordinate re-clones), enable secret scanning push protection, and move secrets to a vault/env.
</details>

<details><summary>5. How do you revert a merge commit?</summary>

`git revert -m 1 <merge-sha>` — `-m 1` keeps the first parent (mainline) and undoes the changes brought in by the merged branch. Note: re-merging that branch later won't re-apply those commits unless you revert the revert.
</details>

## Questions asked at top companies

<details><summary>Merge vs rebase — differences and when to use each. <em>· Amazon, Atlassian, Walmart, Infosys</em></summary>

Merge preserves history with merge commits, safe for shared branches. Rebase rewrites commits onto a new base for linear history, ideal for private branches before review. Never rebase published shared history.
</details>

<details><summary>How do you resolve merge conflicts? <em>· TCS, Paytm, Accenture</em></summary>

Identify conflicted files (`git status`), understand both changes (`git diff`, 3-way view), edit to the correct result, remove markers, add, continue; run tests; communicate with the other author if unsure.
</details>

<details><summary>What is cherry-pick and when would you use it? <em>· Walmart, Flipkart</em></summary>

Apply a specific commit onto another branch — e.g., backporting a hotfix to a release branch.
</details>

<details><summary>Explain Git branching strategies (GitFlow, trunk-based, GitHub Flow). <em>· Atlassian, Infosys, Deloitte</em></summary>

GitFlow: develop/feature/release/hotfix branches for versioned releases. GitHub Flow: main + short-lived feature branches + PRs. Trunk-based: integrate to main daily with feature flags — best for CI/CD.
</details>

<details><summary>What is git bisect? <em>· Microsoft, Google</em></summary>

Binary search through history to find the commit that introduced a bug, manually or automated with `git bisect run`.
</details>

<details><summary>Squash merge vs merge commit vs rebase merge in PRs. <em>· Atlassian, Swiggy</em></summary>

Squash: one commit per PR (clean, easy revert). Merge commit: preserves all commits + merge node. Rebase merge: linear replay of each commit.
</details>

<details><summary>What makes a good pull request and code review? <em>· Google, Microsoft, Thoughtworks</em></summary>

Small focused PRs with clear description, tests and screenshots; self-review first. Reviews focus on correctness, design, tests, readability; specific, kind, distinguish blocking vs nits; timely.
</details>

<details><summary>--force vs --force-with-lease? <em>· Atlassian, Amazon</em></summary>

`--force-with-lease` refuses to overwrite remote commits you haven't seen, preventing accidental deletion of teammates' work.
</details>

<details><summary>How do you undo a merge that's already pushed? <em>· Walmart, Goldman Sachs</em></summary>

`git revert -m 1 <merge-commit>`; to re-merge later, revert the revert.
</details>

<details><summary>What are Git hooks? <em>· Infosys, Paytm</em></summary>

Scripts run on Git events (pre-commit, commit-msg, pre-push) for formatting/linting/message checks; enforce critical rules server-side via CI/branch protection.
</details>

## End-to-end scenarios

<details><summary>Scenario: A production bug must be fixed now while `main` contains unreleased features. Walk through the Git steps.</summary>

Branch from the release tag (`git switch -c hotfix/1.4.1 v1.4.0`), fix + test, PR into the release branch, tag `v1.4.1` and deploy; then cherry-pick or merge the fix into `main` so it isn't lost; add a regression test.
</details>

<details><summary>Scenario: Two developers rebased and force-pushed the same shared branch; commits are missing. Recover.</summary>

Find lost commits via each developer's `git reflog` or the remote's PR history/GitHub UI (events show old SHAs); recreate a branch at the lost SHA; merge/cherry-pick missing commits back; protect the branch (no force-push), use `--force-with-lease`, and keep shared branches merge-only.
</details>
