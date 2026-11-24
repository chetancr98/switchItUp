---
title: Coding Q&A 4 — Dynamic Programming & Backtracking (16 problems with solutions)
minutes: 240
level: 3
tags: coding, dynamic programming, backtracking, practice
---
<!-- deepened -->

## How to use this module
For every DP problem, write the **state definition in a comment first** (`dp[i] = …`). For backtracking, draw the first two levels of the decision tree before coding.

---

### 1. Climbing stairs — LC 70 · Amazon, Adobe
<details><summary>Solution</summary>

```java
public int climbStairs(int n) { int a = 1, b = 1; for (int i = 2; i <= n; i++) { int c = a + b; a = b; b = c; } return b; }
```
</details>

### 2. House robber — LC 198 · Amazon, Google
<details><summary>Solution</summary>

```java
public int rob(int[] a) {
    int prev2 = 0, prev1 = 0;               // best up to i-2, up to i-1
    for (int x : a) { int cur = Math.max(prev1, prev2 + x); prev2 = prev1; prev1 = cur; }
    return prev1;
}
```
</details>

### 3. Coin change — LC 322 · Amazon, Microsoft, Walmart
<details><summary>Solution</summary>

```java
public int coinChange(int[] coins, int amount) {
    int[] dp = new int[amount + 1];          // dp[a] = min coins to make a
    Arrays.fill(dp, amount + 1); dp[0] = 0;
    for (int a = 1; a <= amount; a++)
        for (int c : coins) if (c <= a) dp[a] = Math.min(dp[a], dp[a - c] + 1);
    return dp[amount] > amount ? -1 : dp[amount];
}
```
O(amount × coins).
</details>

### 4. Longest increasing subsequence — LC 300 · Microsoft, Google
<details><summary>Solution</summary>

```java
public int lengthOfLIS(int[] a) {
    int[] tails = new int[a.length]; int len = 0;
    for (int x : a) {
        int lo = 0, hi = len;
        while (lo < hi) { int m = (lo + hi) >>> 1; if (tails[m] < x) lo = m + 1; else hi = m; }
        tails[lo] = x;
        if (lo == len) len++;
    }
    return len;
}
```
O(n log n).
</details>

### 5. Longest common subsequence — LC 1143 · Amazon, Google
<details><summary>Solution</summary>

```java
public int longestCommonSubsequence(String s, String t) {
    int[][] dp = new int[s.length() + 1][t.length() + 1];   // dp[i][j] = LCS of s[0..i), t[0..j)
    for (int i = 1; i <= s.length(); i++)
        for (int j = 1; j <= t.length(); j++)
            dp[i][j] = s.charAt(i - 1) == t.charAt(j - 1) ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    return dp[s.length()][t.length()];
}
```
</details>

### 6. Word break — LC 139 · Amazon, Meta, Google
<details><summary>Solution</summary>

```java
public boolean wordBreak(String s, List<String> words) {
    Set<String> dict = new HashSet<>(words);
    boolean[] dp = new boolean[s.length() + 1]; dp[0] = true;   // dp[i]: s[0..i) segmentable
    for (int i = 1; i <= s.length(); i++)
        for (int j = 0; j < i && !dp[i]; j++)
            dp[i] = dp[j] && dict.contains(s.substring(j, i));
    return dp[s.length()];
}
```
</details>

### 7. Unique paths — LC 62 · Amazon, Google
<details><summary>Solution</summary>

```java
public int uniquePaths(int m, int n) {
    int[] dp = new int[n]; Arrays.fill(dp, 1);
    for (int r = 1; r < m; r++) for (int c = 1; c < n; c++) dp[c] += dp[c - 1];
    return dp[n - 1];
}
```
</details>

### 8. Partition equal subset sum — LC 416 · Amazon, Meta
<details><summary>Solution</summary>

```java
public boolean canPartition(int[] a) {
    int sum = Arrays.stream(a).sum();
    if (sum % 2 == 1) return false;
    boolean[] dp = new boolean[sum / 2 + 1]; dp[0] = true;
    for (int x : a) for (int s = sum / 2; s >= x; s--) dp[s] |= dp[s - x];
    return dp[sum / 2];
}
```
</details>

### 9. Edit distance — LC 72 · Google, Amazon (hard-ish)
<details><summary>Solution</summary>

Prefix DP: if chars equal `dp[i-1][j-1]` else `1 + min(replace, delete, insert)` with base cases dp[i][0]=i, dp[0][j]=j (full code in DSA → DP). O(mn).
</details>

### 10. Decode ways — LC 91 · Meta, Google
<details><summary>Solution</summary>

```java
public int numDecodings(String s) {
    int prev2 = 1, prev1 = s.charAt(0) == '0' ? 0 : 1;
    for (int i = 2; i <= s.length(); i++) {
        int cur = 0, one = s.charAt(i - 1) - '0', two = Integer.parseInt(s.substring(i - 2, i));
        if (one != 0) cur += prev1;
        if (two >= 10 && two <= 26) cur += prev2;
        prev2 = prev1; prev1 = cur;
    }
    return prev1;
}
```
</details>

### 11. Subsets — LC 78 · Meta, Amazon
<details><summary>Solution</summary>

```java
public List<List<Integer>> subsets(int[] a) {
    List<List<Integer>> res = new ArrayList<>();
    backtrack(a, 0, new ArrayList<>(), res);
    return res;
}
private void backtrack(int[] a, int start, List<Integer> path, List<List<Integer>> res) {
    res.add(new ArrayList<>(path));
    for (int i = start; i < a.length; i++) { path.add(a[i]); backtrack(a, i + 1, path, res); path.remove(path.size() - 1); }
}
```
</details>

### 12. Permutations — LC 46 · Microsoft, LinkedIn
<details><summary>Solution</summary>

```java
public List<List<Integer>> permute(int[] a) {
    List<List<Integer>> res = new ArrayList<>();
    perm(a, new boolean[a.length], new ArrayList<>(), res);
    return res;
}
private void perm(int[] a, boolean[] used, List<Integer> path, List<List<Integer>> res) {
    if (path.size() == a.length) { res.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < a.length; i++) {
        if (used[i]) continue;
        used[i] = true; path.add(a[i]);
        perm(a, used, path, res);
        path.remove(path.size() - 1); used[i] = false;
    }
}
```
</details>

### 13. Combination sum — LC 39 · Amazon, Uber
<details><summary>Solution</summary>

```java
public List<List<Integer>> combinationSum(int[] c, int target) {
    Arrays.sort(c);
    List<List<Integer>> res = new ArrayList<>();
    go(c, 0, target, new ArrayList<>(), res);
    return res;
}
private void go(int[] c, int start, int rem, List<Integer> path, List<List<Integer>> res) {
    if (rem == 0) { res.add(new ArrayList<>(path)); return; }
    for (int i = start; i < c.length && c[i] <= rem; i++) {
        path.add(c[i]); go(c, i, rem - c[i], path, res); path.remove(path.size() - 1);
    }
}
```
</details>

### 14. Generate parentheses — LC 22 · Google, Amazon
<details><summary>Solution</summary>

```java
public List<String> generateParenthesis(int n) {
    List<String> res = new ArrayList<>();
    gen(new StringBuilder(), 0, 0, n, res);
    return res;
}
private void gen(StringBuilder sb, int open, int close, int n, List<String> res) {
    if (sb.length() == 2 * n) { res.add(sb.toString()); return; }
    if (open < n)     { sb.append('('); gen(sb, open + 1, close, n, res); sb.deleteCharAt(sb.length() - 1); }
    if (close < open) { sb.append(')'); gen(sb, open, close + 1, n, res); sb.deleteCharAt(sb.length() - 1); }
}
```
</details>

### 15. Word search — LC 79 · Amazon, Microsoft
<details><summary>Solution</summary>

```java
public boolean exist(char[][] b, String w) {
    for (int r = 0; r < b.length; r++) for (int c = 0; c < b[0].length; c++) if (dfs(b, w, 0, r, c)) return true;
    return false;
}
private boolean dfs(char[][] b, String w, int i, int r, int c) {
    if (i == w.length()) return true;
    if (r < 0 || c < 0 || r >= b.length || c >= b[0].length || b[r][c] != w.charAt(i)) return false;
    char t = b[r][c]; b[r][c] = '#';                     // mark visited
    boolean found = dfs(b, w, i + 1, r + 1, c) || dfs(b, w, i + 1, r - 1, c) || dfs(b, w, i + 1, r, c + 1) || dfs(b, w, i + 1, r, c - 1);
    b[r][c] = t;                                         // undo
    return found;
}
```
</details>

### 16. N-Queens — LC 51 · Amazon, Microsoft (hard)
<details><summary>Solution</summary>

```java
public List<List<String>> solveNQueens(int n) {
    List<List<String>> res = new ArrayList<>();
    char[][] board = new char[n][n]; for (char[] row : board) Arrays.fill(row, '.');
    place(0, n, board, new boolean[n], new boolean[2 * n], new boolean[2 * n], res);
    return res;
}
private void place(int r, int n, char[][] b, boolean[] cols, boolean[] d1, boolean[] d2, List<List<String>> res) {
    if (r == n) { List<String> s = new ArrayList<>(); for (char[] row : b) s.add(new String(row)); res.add(s); return; }
    for (int c = 0; c < n; c++) {
        if (cols[c] || d1[r - c + n] || d2[r + c]) continue;
        cols[c] = d1[r - c + n] = d2[r + c] = true; b[r][c] = 'Q';
        place(r + 1, n, b, cols, d1, d2, res);
        cols[c] = d1[r - c + n] = d2[r + c] = false; b[r][c] = '.';
    }
}
```
</details>

## End-to-end scenario

<details><summary>Scenario: "Minimum cost to buy exactly N kg of rice given packet sizes and prices (unlimited packets)." Derive, code, and optimise.</summary>

Unbounded knapsack minimisation: `dp[w] = min over packets (dp[w − size] + price)`, dp[0] = 0, others ∞; iterate w upward. Answer dp[N] or −1. O(N × packets) time, O(N) space. Reconstruct by storing the chosen packet per w. If N is huge (10⁹) but sizes small, note the problem becomes number-theoretic (best ratio packet + DP on remainder).
</details>
