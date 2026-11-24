---
title: Dynamic Programming — From Recursion to Tabulation, Every Major Pattern
level: 3
tags: dynamic programming, dp, memoization, knapsack, lis
---
<!-- deepened -->

## Start here: the basics

### The idea in one sentence
**Dynamic programming = recursion + remembering answers to subproblems you've already solved.**

### Example: climbing stairs
You can climb 1 or 2 steps at a time. How many ways to reach step n?
- To reach step n, your last move came from step n−1 or n−2.
- So `ways(n) = ways(n−1) + ways(n−2)`, with `ways(0) = 1`, `ways(1) = 1`.

```java
// Plain recursion: correct but O(2^n) — recomputes ways(3) many times
int ways(int n) { return n <= 1 ? 1 : ways(n - 1) + ways(n - 2); }

// Memoization (top-down): store results → O(n)
int[] memo = new int[100];
int waysMemo(int n) {
    if (n <= 1) return 1;
    if (memo[n] != 0) return memo[n];
    return memo[n] = waysMemo(n - 1) + waysMemo(n - 2);
}

// Tabulation (bottom-up): fill a table from small to large → O(n)
int waysTable(int n) {
    int[] dp = new int[n + 1]; dp[0] = 1; if (n >= 1) dp[1] = 1;
    for (int i = 2; i <= n; i++) dp[i] = dp[i - 1] + dp[i - 2];
    return dp[n];
}
```

### When to suspect DP
The question asks for **number of ways**, **minimum/maximum** cost, or **is it possible**, and making a choice at each step leads to smaller versions of the same problem.

### The 4 questions to ask every time
1. What does `dp[i]` (or `dp[i][j]`) **mean** in words?
2. How do I compute it from smaller states (the **recurrence**)?
3. What are the **base cases**?
4. Where is the **answer** (dp[n]? max of all?).

---

## The method (use it every time)

1. **Define the state** in words: `dp[i]` = "the answer for the subproblem consisting of …". Getting this sentence right is 80% of DP.
2. **Recurrence**: how `dp[i]` depends on smaller states (look at the *last decision*).
3. **Base cases**.
4. **Order** of computation (dependencies first) and the **answer** location.
5. Optimise **space** (rolling arrays) if needed.

Start with **recursion + memoization** (top-down) — it's how you discover the recurrence. Convert to tabulation (bottom-up) for performance/stack safety.

DP applies when there are **overlapping subproblems** and **optimal substructure**. Signals: "number of ways", "min/max cost", "is it possible", "longest/shortest", with choices at each step.

```java
// Climbing stairs: dp[i] = dp[i-1] + dp[i-2]
int climb(int n) { int a = 1, b = 1; for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; } return b; }
```

## Pattern 1 — 1D linear DP
| Problem | State / recurrence |
|---|---|
| House Robber (198) | `dp[i] = max(dp[i-1], dp[i-2] + a[i])` |
| House Robber II (213) | Circular → run twice excluding first / last |
| Decode Ways (91) | `dp[i] = (one-digit valid ? dp[i-1]) + (two-digit valid ? dp[i-2])` |
| Word Break (139) | `dp[i] = OR over j<i of dp[j] && dict.contains(s[j..i))` |
| Min Cost Climbing Stairs (746) | `dp[i] = cost[i] + min(dp[i-1], dp[i-2])` |
| Max product subarray (152) | Track max & min ending here |

## Pattern 2 — Knapsack family

### 0/1 knapsack
`dp[i][w]` = max value using first i items with capacity w. `dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i])`. 1D version iterates **w downward** so each item is used once.

```java
// Partition Equal Subset Sum (LC 416): can we reach sum/2?
boolean canPartition(int[] a) {
    int total = Arrays.stream(a).sum();
    if (total % 2 == 1) return false;
    int target = total / 2;
    boolean[] dp = new boolean[target + 1]; dp[0] = true;
    for (int x : a)
        for (int s = target; s >= x; s--)          // downward: 0/1
            dp[s] |= dp[s - x];
    return dp[target];
}
```
Variants: Target Sum (LC 494 → count subsets with sum (total+target)/2), Last Stone Weight II (LC 1049), Ones and Zeroes (LC 474, 2D capacity).

### Unbounded knapsack (items reusable) — iterate w **upward**
```java
// Coin Change (LC 322): min coins
int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1]; Arrays.fill(dp, amount + 1); dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
// Coin Change II (LC 518): number of COMBINATIONS → coins in the OUTER loop (avoids counting permutations)
int change(int amount, int[] coins) {
    int[] dp = new int[amount + 1]; dp[0] = 1;
    for (int c : coins) for (int a = c; a <= amount; a++) dp[a] += dp[a - c];
    return dp[amount];
}
// Combination Sum IV (LC 377) counts PERMUTATIONS → amount in the outer loop.
```
Loop order = combinations vs permutations — a top interview subtlety.

## Pattern 3 — Grid DP
`dp[r][c]` from top/left: Unique Paths (62/63), Minimum Path Sum (64), Dungeon Game (174 — compute from bottom-right), Maximal Square (221: `1 + min(top, left, diag)`), Cherry Pickup (741 — two walkers simultaneously, state (step, r1, r2)).

## Pattern 4 — Strings (two sequences)
`dp[i][j]` over prefixes `s[0..i)`, `t[0..j)`:

```java
// Longest Common Subsequence (LC 1143)
int lcs(String s, String t) {
    int m = s.length(), n = t.length(); int[][] dp = new int[m + 1][n + 1];
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = s.charAt(i-1) == t.charAt(j-1) ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
    return dp[m][n];
}

// Edit Distance (LC 72)
int minDistance(String a, String b) {
    int m = a.length(), n = b.length(); int[][] dp = new int[m + 1][n + 1];
    for (int i = 0; i <= m; i++) dp[i][0] = i;
    for (int j = 0; j <= n; j++) dp[0][j] = j;
    for (int i = 1; i <= m; i++)
        for (int j = 1; j <= n; j++)
            dp[i][j] = a.charAt(i-1) == b.charAt(j-1) ? dp[i-1][j-1]
                     : 1 + Math.min(dp[i-1][j-1], Math.min(dp[i-1][j], dp[i][j-1]));  // replace, delete, insert
    return dp[m][n];
}
```
More: Distinct Subsequences (115), Interleaving String (97), **Regular Expression Matching** (10), Wildcard Matching (44), Shortest Common Supersequence (1092), Longest Palindromic Subsequence (516 = LCS(s, reverse(s)) or interval DP).

## Pattern 5 — Longest Increasing Subsequence
O(n²): `dp[i] = 1 + max(dp[j]) for j < i with a[j] < a[i]`.
O(n log n) **patience sorting**: `tails[k]` = smallest tail of an increasing subsequence of length k+1.
```java
int lengthOfLIS(int[] a) {
    int[] tails = new int[a.length]; int len = 0;
    for (int x : a) {
        int i = Arrays.binarySearch(tails, 0, len, x);
        if (i < 0) i = -(i + 1);                    // lower bound
        tails[i] = x;
        if (i == len) len++;
    }
    return len;
}
```
Applications: Russian Doll Envelopes (LC 354 — sort width asc, height **desc**, LIS on heights), Number of LIS (673), Largest Divisible Subset (368), box stacking.

## Pattern 6 — Interval DP
`dp[i][j]` = answer for subarray i..j, iterate by **length**. Try every split k.
- **Burst Balloons** (LC 312): `dp[i][j] = max over k of dp[i][k] + dp[k][j] + a[i]·a[k]·a[j]` (k = last balloon burst in (i, j)).
- Matrix chain multiplication, Minimum Cost to Cut a Stick (1547), Palindrome Partitioning II (132), Strange Printer (664), Stone Game variants.

## Pattern 7 — State machine DP
Stock problems: states per day (holding / not holding / cooldown).
```java
// Best Time to Buy and Sell with Cooldown (LC 309)
int maxProfit(int[] p) {
    int hold = Integer.MIN_VALUE / 2, sold = 0, rest = 0;
    for (int x : p) {
        int prevSold = sold;
        sold = hold + x;                     // sell today
        hold = Math.max(hold, rest - x);     // keep or buy (only from rest)
        rest = Math.max(rest, prevSold);     // cooldown passes
    }
    return Math.max(sold, rest);
}
```
At most k transactions (LC 188): `buy[j], sell[j]` arrays. With fee (714).

## Pattern 8 — DP on trees
Return a tuple per subtree: House Robber III ([rob, notRob]), Binary Tree Cameras (3 states), Max path sum, tree diameter. **Rerooting** technique for "answer for every node as root" (LC 834 Sum of Distances in Tree).

## Pattern 9 — Bitmask DP
State includes a subset as an int mask (n ≤ 20).
- **TSP**: `dp[mask][i]` = min cost to visit `mask` ending at i. O(2ⁿ·n²).
- Shortest Path Visiting All Nodes (LC 847: BFS over (node, mask)), Partition to K Equal Sum Subsets (698), Smallest Sufficient Team (1125), assignment problems.

## Pattern 10 — Digit DP (CP-flavoured)
Count numbers ≤ N with a property: state (position, tight, …). E.g. LC 233 Number of Digit One, LC 902, LC 1012. Template in CP track.

## Memoization template (top-down)
```java
Integer[][] memo;
int solve(int i, int j) {
    if (/* base */ i == n) return 0;
    if (memo[i][j] != null) return memo[i][j];
    int best = /* try every choice */ Math.max(solve(i + 1, j), take(i, j));
    return memo[i][j] = best;
}
```
Use `long`/`mod` where counts explode (`1_000_000_007`).

## Must-solve list (ordered)
Climbing Stairs (70), House Robber I/II (198/213), Coin Change I/II (322/518), Decode Ways (91), Word Break (139), LIS (300), Partition Equal Subset (416), Target Sum (494), Unique Paths (62), LCS (1143), Edit Distance (72), Longest Palindromic Substring (5), Palindromic Substrings (647), Maximal Square (221), Stock with Cooldown (309), Burst Balloons (312), Regular Expression Matching (10), Russian Doll Envelopes (354), Shortest Path Visiting All Nodes (847), Distinct Subsequences (115).

## Quick check questions

<details><summary>1. Memoization vs tabulation — which do you prefer in an interview?</summary>

Start with memoized recursion — easier to derive and explain, only visits reachable states. Convert to tabulation if recursion depth could overflow (Java ~10⁴ frames by default) or if the interviewer wants space optimisation (rolling arrays need a bottom-up order).
</details>

<details><summary>2. Why does the loop order change the answer in coin change II vs combination sum IV?</summary>

Coins outer → each combination counted once in a canonical order (coins used in non-decreasing index order) → combinations. Amount outer → at each amount any coin can be last → different orders counted separately → permutations.
</details>

<details><summary>3. How do you reduce O(n·m) space for LCS?</summary>

Each row depends only on the previous row → keep two rows (or one row plus a variable for the diagonal) → O(min(n, m)). Reconstructing the actual subsequence then needs Hirschberg's algorithm or keeping the full table.
</details>

## Questions asked at top companies

<details><summary>Coin Change — minimum coins (LC 322). <em>· Amazon, Google, Microsoft, Walmart</em></summary>

dp[a] = min over coins (dp[a−c] + 1); init to infinity, dp[0]=0. O(amount·coins).
</details>

<details><summary>Longest Increasing Subsequence (LC 300). <em>· Microsoft, Google, Amazon</em></summary>

O(n²) dp or O(n log n) patience sorting with tails array + binary search.
</details>

<details><summary>Longest Common Subsequence (LC 1143). <em>· Amazon, Google, Microsoft</em></summary>

dp[i][j] = match ? dp[i−1][j−1]+1 : max(dp[i−1][j], dp[i][j−1]). O(mn).
</details>

<details><summary>Edit Distance (LC 72). <em>· Google, Amazon, Microsoft</em></summary>

dp over prefixes with insert/delete/replace minimum. O(mn).
</details>

<details><summary>0/1 Knapsack and Partition Equal Subset Sum (LC 416). <em>· Amazon, Flipkart, Goldman Sachs</em></summary>

Boolean subset-sum dp over sums iterating capacity downward for each item. O(n·sum).
</details>

<details><summary>House Robber I/II (LC 198/213). <em>· Amazon, Google, Cisco</em></summary>

dp[i] = max(dp[i−1], dp[i−2]+a[i]); circular version runs twice excluding first or last.
</details>

<details><summary>Word Break (LC 139). <em>· Amazon, Google, Meta</em></summary>

dp[i] true if some j<i with dp[j] and s[j..i) in dict; limit j by max word length.
</details>

<details><summary>Unique Paths / Minimum Path Sum (LC 62/64). <em>· Amazon, Microsoft, Goldman Sachs</em></summary>

Grid dp from top/left; space-optimise to one row; Unique Paths also = C(m+n−2, m−1).
</details>

<details><summary>Longest Palindromic Substring (LC 5). <em>· Amazon, Microsoft, Adobe</em></summary>

Expand around 2n−1 centres O(n²)/O(1), or dp table, or Manacher O(n).
</details>

<details><summary>Decode Ways (LC 91). <em>· Meta, Google, Amazon</em></summary>

dp[i] = (s[i−1] != '0' ? dp[i−1]) + (10 ≤ two-digit ≤ 26 ? dp[i−2]).
</details>

<details><summary>Best time to buy and sell stock with k transactions / cooldown (LC 188/309). <em>· Amazon, Google, Goldman Sachs</em></summary>

State machine dp (hold/sold/rest) or buy[j]/sell[j] arrays per transaction count.
</details>

<details><summary>Burst Balloons / Matrix Chain Multiplication (LC 312). <em>· Google, Amazon</em></summary>

Interval dp: dp[i][j] = max over k of dp[i][k] + dp[k][j] + cost(i,k,j), iterate by interval length. O(n³).
</details>

## End-to-end scenarios

<details><summary>Scenario: A delivery app offers vouchers with (cost in points, value in ₹). The user has P points. Choose vouchers to maximise value — each voucher at most once.</summary>

0/1 knapsack: dp[p] = max value using p points, iterate vouchers and p from P down to cost. O(n·P). If vouchers can be reused → unbounded (iterate p upward). If P is huge but values small → dp over value (min cost to reach value v). Reconstruct choices with a parent table.
</details>

<details><summary>Scenario: Build "did you mean?" spell suggestions for a search box.</summary>

Edit distance between the query and dictionary words; too slow against all words → generate candidates with BK-trees or symmetric delete (SymSpell), limit distance to ≤ 2, rank by distance and word popularity; use the DP edit distance only to verify/rank candidates.
</details>
