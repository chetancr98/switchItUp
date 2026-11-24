---
title: Git Internals — Objects, Refs, the DAG & the Index
level: 1
tags: git, internals
---
<!-- deepened -->

## Start here: the basics

### What is version control?
Version control records every change to your code: **who** changed **what**, **when** and **why**. You can go back to any version, work on features in parallel, and combine work from many people. **Git** is the most widely used version control system; **GitHub** is a website that hosts Git repositories and adds collaboration features (pull requests, reviews, CI).

### The everyday workflow
```bash
git clone https://github.com/acme/shop.git   # copy a repository to your machine
cd shop
git switch -c feature/cart-total             # create and move to a new branch
# … edit files …
git status                                   # what changed?
git diff                                     # see the changes
git add src/Cart.java                        # stage the file (prepare it for the next commit)
git commit -m "Add cart total calculation"   # save a snapshot with a message
git push -u origin feature/cart-total        # upload your branch to GitHub
# open a Pull Request on GitHub → review → merge
git switch main && git pull                  # get the latest main
```

### Three areas to remember
```
Working directory  ──git add──►  Staging area  ──git commit──►  Repository (history)
(your files)                     (next commit)                   (saved snapshots)
```

### Branches in one sentence
A branch is an independent line of work — a movable pointer to a commit. `main` is the shared, stable line; you create branches for features and merge them back.

### Good commit messages
Short summary in imperative mood (`Fix NPE when cart is empty`), body explaining *why* if needed. Small, focused commits are easier to review and revert.

---

## Git is a content-addressed object store + pointers

Everything in `.git/objects` is one of four object types, named by the **SHA-1** (or SHA-256) hash of its content:

| Object | Contains |
|---|---|
| **blob** | File contents (no name, no permissions) |
| **tree** | Directory listing: entries of (mode, name, blob/tree hash) |
| **commit** | Root tree hash, parent commit hash(es), author, committer, message |
| **tag** (annotated) | Points to an object + tagger + message (+ signature) |

```bash
$ git cat-file -p HEAD
tree 9c3f...e1
parent 1a2b...7f
author Asha <a@x.com> 1732460000 +0530
committer Asha <a@x.com> 1732460000 +0530

Add order cancellation

$ git cat-file -p 9c3f
100644 blob 5d1e...  pom.xml
040000 tree 7a9c...  src
```

Consequences:
- **Identical content is stored once** (same hash). Renames are not recorded — Git detects them by similarity at diff time.
- A commit hash covers the whole history beneath it (parent hashes) → tamper-evident, a Merkle DAG.
- **Commits are snapshots, not diffs.** Diffs are computed on demand. (Packfiles store objects delta-compressed for space — an implementation detail.)

## References

- **Branch** = a file containing a commit hash: `.git/refs/heads/main`. Creating a branch = writing 41 bytes. That's why branches are cheap.
- **HEAD** = pointer to the current branch (`ref: refs/heads/main`) or directly to a commit (**detached HEAD**).
- **Tags**: `refs/tags/v1.0` — lightweight (just a ref) or annotated (tag object).
- **Remote-tracking branches**: `refs/remotes/origin/main` — your last-known view of the remote, updated by `fetch`.
- `packed-refs` stores many refs in one file.

## The DAG

```
          C---D---E   feature
         /
A---B---F---G         main
```
Each commit points to its parent(s). A **merge commit** has two parents. History is a directed acyclic graph; branches are just movable labels on it.

Revision syntax: `HEAD~2` (2 first-parents back), `HEAD^2` (second parent of a merge), `main..feature` (commits in feature not in main), `main...feature` (symmetric difference), `@{u}` (upstream), `HEAD@{3}` (reflog entry).

## The three trees

```
 Working directory  ──git add──►  Index (staging area)  ──git commit──►  HEAD (repository)
        ◄────────── git restore ──────────    ◄──────── git restore --staged ─────────
```
- **Index** (`.git/index`) = the snapshot of the *next* commit — a sorted list of paths with blob hashes and stat info.
- `git add -p` stages hunks → craft focused commits.

### reset vs restore vs revert vs checkout

| Command | What it does |
|---|---|
| `git reset --soft X` | Move branch to X; keep index & working tree (changes appear staged) |
| `git reset --mixed X` (default) | Move branch; reset index; keep working tree (changes unstaged) |
| `git reset --hard X` | Move branch; reset index **and working tree** — discards changes |
| `git restore <file>` | Discard working-tree changes to a file (from index) |
| `git restore --staged <file>` | Unstage |
| `git revert X` | New commit that **undoes** X — safe on shared branches |
| `git switch <branch>` | Change branches (`checkout`'s branch half) |

## What `fetch`, `pull`, `push` really do

- `fetch`: download objects + update `refs/remotes/origin/*`. Never touches your branches or working tree.
- `pull` = `fetch` + `merge` (or `rebase` with `pull.rebase=true`) of the upstream into the current branch.
- `push`: upload objects, ask remote to move its ref. Rejected if not a **fast-forward** (remote has commits you don't). `--force-with-lease` forces only if the remote ref is still what you last saw — **always use it instead of `--force`**.

## The reflog — your safety net

Every movement of HEAD and branch tips is logged locally (`git reflog`, ~90 days). "Lost" commits after a bad reset/rebase are still in the object store:

```bash
git reflog
# a1b2c3d HEAD@{0}: reset: moving to HEAD~3
# 9f8e7d6 HEAD@{1}: commit: the work I thought I lost
git reset --hard 9f8e7d6        # or: git branch rescue 9f8e7d6
```
Objects only disappear after `git gc` prunes unreachable objects older than the reflog expiry.

## Merge internals

- **Fast-forward**: target is an ancestor → just move the pointer, no merge commit (`--no-ff` forces one).
- **Three-way merge**: find the **merge base** (best common ancestor), compare both sides to it; changes on only one side apply automatically; changes to the same region on both sides → **conflict**. Default strategy **`ort`** (since Git 2.34, replaced `recursive`).

## Useful plumbing for understanding
```bash
git rev-parse HEAD                 # resolve to hash
git ls-files --stage               # the index
git merge-base main feature
git count-objects -vH
git log --oneline --graph --all --decorate
```

## Quick check questions

<details><summary>1. What is a branch in Git, physically?</summary>

A file under `.git/refs/heads/` (or a line in packed-refs) containing a 40-char commit hash. Committing on a branch writes the new commit object and updates that file. HEAD points at the branch.
</details>

<details><summary>2. Is a Git commit a diff?</summary>

No — it's a snapshot: a pointer to a root tree that describes every file's content (via blob hashes), plus parent pointers and metadata. Unchanged files share blobs with the previous commit, so snapshots are cheap. Packfiles delta-compress for storage.
</details>

<details><summary>3. I ran `git reset --hard` and lost commits. Can I recover them?</summary>

Yes, usually: `git reflog` shows where HEAD was; reset or branch to that hash. Unreachable objects survive until garbage-collected (default ≥ 2 weeks, reflog 90 days). Uncommitted, unstaged changes, however, are gone (unless `git add`ed — then `git fsck --lost-found` can find the blobs).
</details>

<details><summary>4. --force vs --force-with-lease?</summary>

`--force` overwrites the remote branch unconditionally, potentially destroying teammates' pushed commits. `--force-with-lease` only overwrites if the remote ref still matches your remote-tracking ref — if someone pushed in between, it refuses.
</details>

## Questions asked at top companies

<details><summary>Git vs GitHub. <em>· TCS, Infosys, Accenture</em></summary>

Git is a distributed version control tool running locally. GitHub is a hosting service for Git repositories adding pull requests, code review, issues, Actions CI, permissions.
</details>

<details><summary>git fetch vs git pull. <em>· Infosys, Walmart, Paytm</em></summary>

fetch downloads remote changes into remote-tracking branches without touching your work. pull = fetch + merge (or rebase) into your current branch.
</details>

<details><summary>git reset vs git revert. <em>· Amazon, Atlassian, Wipro</em></summary>

reset moves the branch pointer (rewrites history; soft/mixed/hard affect index/working tree) — for local commits. revert creates a new commit undoing a previous one — safe for shared branches.
</details>

<details><summary>What is the staging area? <em>· TCS, Capgemini</em></summary>

The index: a snapshot of what will go into the next commit, letting you commit selected changes (`git add -p`).
</details>

<details><summary>How does Git store data internally? <em>· Microsoft, Atlassian</em></summary>

Content-addressed objects (blobs, trees, commits, tags) named by hash; branches are refs pointing to commits; commits form a DAG of snapshots.
</details>

<details><summary>What is HEAD and detached HEAD? <em>· Walmart, Infosys</em></summary>

HEAD points to the current branch (or commit). Detached HEAD means HEAD points directly to a commit (e.g., after checking out a tag) — new commits aren't on any branch unless you create one.
</details>

<details><summary>How do you recover a deleted branch or lost commit? <em>· Amazon, Atlassian</em></summary>

`git reflog` to find the commit hash, then `git branch name <hash>` or `git reset --hard <hash>`.
</details>

<details><summary>What is .gitignore? <em>· Infosys, Accenture</em></summary>

A file listing patterns Git should not track (build outputs, IDE files, secrets like `.env`). Already-tracked files need `git rm --cached` to stop tracking.
</details>

<details><summary>git stash — when and how? <em>· Paytm, Wipro</em></summary>

Temporarily shelve uncommitted changes (`git stash push -m msg`), switch context, then `git stash pop`/`apply`. `-u` includes untracked files.
</details>

<details><summary>Explain git reset --soft, --mixed, --hard. <em>· Walmart, Goldman Sachs</em></summary>

All move the branch pointer. soft keeps changes staged; mixed (default) keeps them unstaged; hard discards them from index and working tree.
</details>

## End-to-end scenarios

<details><summary>Scenario: You committed 3 changes on `main` locally by mistake (not pushed). Move them to a feature branch.</summary>

`git branch feature/x` (points at your commits) → `git reset --hard origin/main` (main back to remote) → `git switch feature/x` → push and open a PR.
</details>

<details><summary>Scenario: You accidentally committed a large 500 MB file three commits ago (not pushed). Remove it from history.</summary>

Interactive rebase to the commit before it (`git rebase -i HEAD~4`), `edit` that commit, `git rm --cached bigfile`, amend, continue; add it to .gitignore. If already pushed: `git filter-repo --path bigfile --invert-paths`, force-push with lease and coordinate with the team; consider Git LFS for large binaries.
</details>
