---
title: Recursion & Backtracking — Subsets, Permutations, Combinations, Constraint Search
level: 3
tags: backtracking, recursion, permutations, n-queens
---
<!-- deepened -->

## Start here: the basics

### Backtracking = try, explore, undo
Imagine solving a maze: walk a path; if you hit a dead end, **go back** to the last junction and try another path. Backtracking explores all choices systematically, undoing each choice after exploring it.

### Example: all subsets of [1, 2, 3]
```java
void subsets(int[] a, int i, List<Integer> path, List<List<Integer>> out) {
    if (i == a.length) { out.add(new ArrayList<>(path)); return; }   // one complete choice set
    path.add(a[i]);                 // choose: include a[i]
    subsets(a, i + 1, path, out);   // explore
    path.remove(path.size() - 1);   // un-choose (backtrack)
    subsets(a, i + 1, path, out);   // explore without a[i]
}
// → [1,2,3] [1,2] [1,3] [1] [2,3] [2] [3] []
```

### The decision tree
Each level is a decision, each branch a choice. The number of leaves tells you the complexity (2ⁿ subsets, n! permutations). **Pruning** — skipping branches that can't lead to a valid answer — is what makes backtracking fast enough.

---

## The template

```java
void backtrack(State state, List<Result> results) {
    if (isComplete(state)) { results.add(copyOf(state)); return; }
    for (Choice c : candidates(state)) {
        if (!isValid(state, c)) continue;       // prune early
        apply(state, c);                        // choose
        backtrack(state, results);              // explore
        undo(state, c);                         // un-choose
    }
}
```
Draw the **decision tree**: depth = number of decisions, branching factor = choices per decision → complexity ≈ (branching^depth) × cost per leaf.

The #1 bug: adding the mutable `path` itself to results → all entries end up identical/empty. Add `new ArrayList<>(path)`.

## Subsets (LC 78) — include/exclude or "start index"
```java
List<List<Integer>> subsets(int[] a) {
    List<List<Integer>> res = new ArrayList<>();
    dfs(a, 0, new ArrayList<>(), res);
    return res;
}
void dfs(int[] a, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));                  // every node is a subset
    for (int i = start; i < a.length; i++) {
        path.add(a[i]);
        dfs(a, i + 1, path, res);
        path.remove(path.size() - 1);
    }
}
```
O(n·2ⁿ). **With duplicates** (LC 90): sort, and skip `a[i] == a[i-1]` when `i > start` (same level).
Bitmask alternative: for `mask` in `0..2ⁿ−1`, include bit i.

## Combinations & combination sum
```java
// Combination Sum (LC 39): reuse allowed → recurse with i (not i+1)
void comb(int[] c, int start, int remain, List<Integer> path, List<List<Integer>> res) {
    if (remain == 0) { res.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length && c[i] <= remain; i++) {   // c sorted → prune
        path.add(c[i]);
        comb(c, i, remain - c[i], path, res);
        path.remove(path.size() - 1);
    }
}
```
LC 40 (each once, duplicates in input → sort + skip same-level dups, recurse i+1), LC 77 Combinations (prune when not enough elements left: `i <= n - (k - path.size()) + 1`), LC 216.

## Permutations (LC 46/47)
```java
void permute(int[] a, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == a.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < a.length; i++) {
        if (used[i]) continue;
        if (i > 0 && a[i] == a[i - 1] && !used[i - 1]) continue;   // LC 47 (sorted): skip duplicate branches
        used[i] = true; path.add(a[i]);
        permute(a, used, path, res);
        path.remove(path.size() - 1); used[i] = false;
    }
}
```
O(n·n!). Swap-based in-place variant avoids the `used` array.

## Constraint satisfaction
### N-Queens (LC 51)
Place row by row; track used columns, diagonals (`r − c`), anti-diagonals (`r + c`) in boolean arrays or bitmasks → O(1) validity checks.
```java
int totalNQueens(int n) { return solve(n, 0, 0, 0, 0); }
int solve(int n, int row, int cols, int d1, int d2) {         // bitmask version, very fast
    if (row == n) return 1;
    int count = 0, avail = ~(cols | d1 | d2) & ((1 << n) - 1);
    while (avail != 0) {
        int bit = avail & -avail;  avail -= bit;
        count += solve(n, row + 1, cols | bit, (d1 | bit) << 1, (d2 | bit) >> 1);
    }
    return count;
}
```
### Sudoku Solver (LC 37)
Track row/col/box sets; choose the empty cell with the **fewest candidates** first (MRV heuristic) → huge pruning.

### Word Search (LC 79) / Word Search II (LC 212)
Grid DFS marking visited in-place (`board[r][c] = '#'` then restore). For many words → build a **Trie** and DFS once, pruning trie nodes after a word is found.

## Partitioning & generation
- Palindrome Partitioning (LC 131): cut at each palindromic prefix (precompute `isPal[i][j]` DP).
- Generate Parentheses (LC 22): add `(` if open < n, `)` if close < open → Catalan number outputs.
- Letter Combinations of a Phone Number (LC 17).
- Restore IP Addresses (LC 93): 4 segments, each 0–255, no leading zeros.
- Expression Add Operators (LC 282): track running value and last operand for `*` precedence.
- Word Break II (LC 140): backtracking + memo on suffix.

## Pruning strategies (what makes backtracking pass)
1. **Sort** input to break early (`c[i] > remain → break`) and to skip duplicates.
2. **Constraint propagation**: maintain sets/bitmasks for O(1) validity.
3. **Ordering heuristics**: most constrained variable first (Sudoku MRV), largest items first (partition into K subsets).
4. **Bounding**: if the best possible from here can't beat the current best, stop (branch & bound).
5. **Memoize** when subproblems repeat → becomes DP.

## Complexity cheat-sheet
| Problem | Results | Time |
|---|---|---|
| Subsets | 2ⁿ | O(n·2ⁿ) |
| Permutations | n! | O(n·n!) |
| Combinations C(n,k) | C(n,k) | O(k·C(n,k)) |
| N-Queens | — | O(n!) upper bound |
| Parentheses | Catalan(n) ≈ 4ⁿ/n^1.5 | O(4ⁿ/√n) |

## Must-solve list
Subsets I/II (78/90), Permutations I/II (46/47), Combination Sum I/II (39/40), Combinations (77), Generate Parentheses (22), Letter Combinations (17), Word Search I/II (79/212), Palindrome Partitioning (131), N-Queens (51), Sudoku Solver (37), Partition to K Equal Sum Subsets (698), Expression Add Operators (282).

## Quick check questions

<details><summary>1. How do you avoid duplicate subsets when the input has duplicates?</summary>

Sort the input; in the loop, skip `a[i]` if `i > start` and `a[i] == a[i-1]` — this prevents choosing the same value twice at the same recursion depth while still allowing it at deeper levels.
</details>

<details><summary>2. What's the difference between backtracking and DP?</summary>

Backtracking enumerates the search space (all solutions or a feasible one) with pruning; DP solves optimisation/counting problems by caching overlapping subproblems. When a backtracking solution recomputes the same state (same index + same remaining capacity), memoizing it turns it into DP.
</details>

## Questions asked at top companies

<details><summary>Subsets / Subsets II (LC 78/90). <em>· Meta, Amazon, Microsoft</em></summary>

Start-index recursion adding every path; for duplicates sort and skip equal elements at the same level.
</details>

<details><summary>Permutations / Permutations II (LC 46/47). <em>· Microsoft, Amazon, LinkedIn</em></summary>

Used-array recursion (or swaps); for duplicates sort and skip a[i]==a[i−1] when a[i−1] unused.
</details>

<details><summary>Combination Sum I/II (LC 39/40). <em>· Amazon, Airbnb, Uber</em></summary>

Sorted candidates, prune when exceeding target; I reuses i, II moves to i+1 and skips duplicates.
</details>

<details><summary>Generate Parentheses (LC 22). <em>· Google, Amazon, Meta</em></summary>

Add '(' if open < n, ')' if close < open; Catalan-number outputs.
</details>

<details><summary>Word Search (LC 79) and Word Search II (LC 212). <em>· Amazon, Microsoft, Uber</em></summary>

Grid DFS marking visited; for many words build a Trie and prune nodes after match.
</details>

<details><summary>N-Queens (LC 51). <em>· Amazon, Microsoft, Goldman Sachs</em></summary>

Row by row with column/diagonal sets or bitmasks.
</details>

<details><summary>Letter Combinations of a Phone Number (LC 17). <em>· Amazon, Google, Meta</em></summary>

Recursion over digits appending each mapped letter; O(4ⁿ·n).
</details>

<details><summary>Palindrome Partitioning (LC 131). <em>· Amazon, Google</em></summary>

Cut at each palindromic prefix (precompute isPal DP), recurse on rest.
</details>

<details><summary>Sudoku Solver (LC 37). <em>· Uber, Microsoft, Amazon</em></summary>

Row/col/box constraint sets, choose cell with fewest candidates, backtrack on dead ends.
</details>

<details><summary>Rat in a maze — all paths. <em>· Amazon, Flipkart, Paytm (GFG classic)</em></summary>

DFS from (0,0) in allowed directions with visited marking and undo, collecting path strings at destination.
</details>

## End-to-end scenarios

<details><summary>Scenario: Generate all valid IP addresses from a string of digits (LC 93) — and discuss why it's fast despite being "brute force".</summary>

Exactly 4 segments each of 1–3 digits, value ≤ 255, no leading zeros; prune when remaining length can't fit remaining segments. At most 3⁴ = 81 branches → effectively constant time.
</details>

<details><summary>Scenario: Assign 12 interns to 4 teams of 3 maximising total compatibility score.</summary>

Backtracking with pruning (assign intern by intern to teams with space, symmetry-breaking: don't try identical empty teams twice, branch-and-bound with optimistic upper bound) or bitmask DP over subsets (dp[mask] for interns assigned, team formed as next 3) — 2¹² states manageable.
</details>
