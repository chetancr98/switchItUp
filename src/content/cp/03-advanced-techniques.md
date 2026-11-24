---
title: Advanced CP Techniques — Lazy Segment Tree, Binary Lifting, Meet-in-the-Middle, Digit DP & Hacks
level: 5
tags: binary lifting, lazy propagation, meet in the middle, digit dp, mo's algorithm
---
<!-- deepened -->

## Start here: the basics

### When do you need "advanced" techniques?
Most interview problems are solved by the core patterns. Advanced techniques appear in hard problems and contests when constraints are large (n, q ≤ 10⁵–10⁶) and you need **many queries** answered fast or **search spaces** cut in half.

### Three ideas to understand first
1. **Precompute to answer many queries fast** — sparse tables, binary lifting, prefix structures.
2. **Lazy updates** — record "add 5 to this whole range" at a high level and push it down only when needed (lazy segment tree).
3. **Split the problem** — meet-in-the-middle: enumerate two halves separately (2^(n/2) each) and combine, instead of 2ⁿ.

### A taste: binary lifting
To jump k steps up a tree, precompute 1, 2, 4, 8… step ancestors for every node. Any k is a sum of powers of two, so you jump in O(log k).

---

## Lazy segment tree (range add, range sum)

```java
class LazySeg {
    private final int n; private final long[] sum, lazy;
    LazySeg(int n) { this.n = n; sum = new long[4 * n]; lazy = new long[4 * n]; }

    private void apply(int node, int l, int r, long v) { sum[node] += v * (r - l + 1); lazy[node] += v; }
    private void push(int node, int l, int r) {
        if (lazy[node] != 0) {
            int m = (l + r) >> 1;
            apply(2 * node, l, m, lazy[node]); apply(2 * node + 1, m + 1, r, lazy[node]);
            lazy[node] = 0;
        }
    }
    void add(int ql, int qr, long v) { add(1, 0, n - 1, ql, qr, v); }
    private void add(int node, int l, int r, int ql, int qr, long v) {
        if (qr < l || r < ql) return;
        if (ql <= l && r <= qr) { apply(node, l, r, v); return; }
        push(node, l, r);
        int m = (l + r) >> 1;
        add(2 * node, l, m, ql, qr, v); add(2 * node + 1, m + 1, r, ql, qr, v);
        sum[node] = sum[2 * node] + sum[2 * node + 1];
    }
    long query(int ql, int qr) { return query(1, 0, n - 1, ql, qr); }
    private long query(int node, int l, int r, int ql, int qr) {
        if (qr < l || r < ql) return 0;
        if (ql <= l && r <= qr) return sum[node];
        push(node, l, r);
        int m = (l + r) >> 1;
        return query(2 * node, l, m, ql, qr) + query(2 * node + 1, m + 1, r, ql, qr);
    }
}
```
Generalise by changing (combine, apply, compose-lazy). Range assign + range add needs two lazy tags with composition order. Segment tree "walk" (find first index with prefix ≥ k) in O(log n).

## Binary lifting — LCA & k-th ancestor in O(log n)

```java
int LOG = 18; int[][] up; int[] depth;
void preprocess(List<List<Integer>> g, int root, int n) {
    up = new int[LOG][n]; depth = new int[n];
    // BFS/iterative DFS to fill up[0][v] = parent, depth[v]
    for (int k = 1; k < LOG; k++)
        for (int v = 0; v < n; v++) up[k][v] = up[k - 1][up[k - 1][v]];
}
int kthAncestor(int v, int k) { for (int i = 0; i < LOG; i++) if (((k >> i) & 1) == 1) v = up[i][v]; return v; }
int lca(int a, int b) {
    if (depth[a] < depth[b]) { int t = a; a = b; b = t; }
    a = kthAncestor(a, depth[a] - depth[b]);
    if (a == b) return a;
    for (int k = LOG - 1; k >= 0; k--) if (up[k][a] != up[k][b]) { a = up[k][a]; b = up[k][b]; }
    return up[0][a];
}
```
Distance(u, v) = depth[u] + depth[v] − 2·depth[lca]. Also used for "jump k steps" in functional graphs (successor graphs) and doubling on sparse tables. LC 1483 Kth Ancestor of a Tree Node.

## Meet in the middle — O(2^(n/2))
n ≈ 40 subset-sum style: split into halves, enumerate all subset sums of each half (2²⁰ each), sort one, and for each sum in the other, binary search / two-pointer for the complement. LC 1755 Closest Subsequence Sum, LC 2035 Partition Array Into Two Arrays to Minimize Sum Difference.

## Digit DP — count numbers in [0, N] with a property

```java
// Count numbers in [0, N] whose digit sum is divisible by K (example)
long[][][] memo; char[] digits; int K;
long count(long N, int k) {
    digits = Long.toString(N).toCharArray(); K = k;
    memo = new long[digits.length][K][2];
    for (long[][] a : memo) for (long[] b : a) Arrays.fill(b, -1);
    return go(0, 0, 1);
}
long go(int pos, int mod, int tight) {
    if (pos == digits.length) return mod == 0 ? 1 : 0;
    if (memo[pos][mod][tight] != -1) return memo[pos][mod][tight];
    int limit = tight == 1 ? digits[pos] - '0' : 9;
    long res = 0;
    for (int d = 0; d <= limit; d++)
        res += go(pos + 1, (mod + d) % K, (tight == 1 && d == limit) ? 1 : 0);
    return memo[pos][mod][tight] = res;
}
// answer for [L, R] = count(R) − count(L − 1)
```
Add a `started` flag when leading zeros matter (e.g., "no two adjacent equal digits").

## Other techniques to recognise

| Technique | Signal | Idea |
|---|---|---|
| **Two pointers on sorted + monotonic** | count pairs with sum ≤ X | O(n) after sort |
| **Prefix XOR** | subarray XOR = k | `pre[r] ^ pre[l]` + hashmap |
| **Difference arrays (2D)** | many rectangle increments | 4 corner updates + 2D prefix |
| **Sweep line + ordered set** | intervals/rectangles events | Sort events, maintain active set |
| **Coordinate compression** | values up to 10⁹, n ≤ 2×10⁵ | Map to ranks before BIT/segtree |
| **Mo's algorithm** | offline range queries, no updates | Sort queries by (block of l, r); move pointers; O((n+q)√n) |
| **Sqrt decomposition** | range queries + updates, simple ops | Blocks of √n |
| **DSU on tree / small-to-large merging** | subtree distinct counts | Merge smaller set into larger → O(n log n) |
| **Euler tour (tin/tout)** | subtree queries | Subtree = contiguous range → segment tree |
| **Topological DP** | longest path in DAG | DP in topo order |
| **Bitset optimisation** | subset sum n·S/64 | `BitSet` shifts (`java.util.BitSet` lacks shift — implement with long[]) |
| **Binary search + greedy check** | min-max objectives | As in DSA 04 |
| **Ternary search** | unimodal function | Shrink thirds; integer version careful |
| **Randomisation / hashing** | compare multisets/subarrays | Random 64-bit values per element, XOR/sum hashes |
| **Constructive** (Codeforces) | "print any valid answer" | Find invariant/pattern from small cases |
| **Interactive problems** | judge answers queries | Flush after each query; binary search |

## Strings, advanced
- **Z-function**: `z[i]` = longest common prefix of s and s[i..] — pattern matching via `p + '$' + t`.
- **Manacher**: all palindromes in O(n).
- **Suffix array** (O(n log n) doubling) + **LCP (Kasai)**: distinct substrings = Σ(n − sa[i]) − Σlcp; longest repeated substring.
- **Aho-Corasick**: multi-pattern matching (trie + failure links).
- **String hashing** with two moduli; compare substrings in O(1).

## Graph extras
Dinic max-flow (bipartite matching, min-cut), Hopcroft-Karp, Tarjan SCC + condensation DAG, 2-SAT via SCC, bridges/articulation points, Eulerian circuits (Hierholzer), 0-1 BFS, Floyd-Warshall for n ≤ 400, Kruskal with DSU, shortest paths with state (node, k).

## Practice ladder
- CSES: Range Queries, Tree Algorithms, Advanced Techniques sections.
- Codeforces EDU section (segment tree, DSU, binary search, two pointers courses — excellent).
- AtCoder ABC D–F problems (clean, educational).
- LeetCode hards tagged Segment Tree, Binary Indexed Tree, Bitmask, Topological Sort.

## Quick check questions

<details><summary>1. When is Mo's algorithm applicable?</summary>

Offline range queries (all known upfront), no updates (or Mo's with updates), and when moving the range by one element can update the answer in O(1)/O(log n) — e.g., number of distinct elements in ranges. Complexity O((n + q)√n).
</details>

<details><summary>2. How does Euler tour help with subtree queries?</summary>

DFS entry/exit times map each subtree to a contiguous interval [tin[v], tout[v]] of the tour array, so subtree sum/update becomes a range query/update on a Fenwick or segment tree.
</details>

## Questions asked at top companies

<details><summary>Kth ancestor of a tree node (LC 1483). <em>· Google, Amazon</em></summary>

Binary lifting table up[j][v]; decompose k into bits. Preprocess O(n log n), query O(log n).
</details>

<details><summary>Range update and range query (e.g., add to a range, query sum). <em>· Google, Codeforces-style OAs</em></summary>

Lazy segment tree, or two Fenwick trees for range add + range sum.
</details>

<details><summary>Closest Subsequence Sum (LC 1755). <em>· Google</em></summary>

Meet in the middle: enumerate subset sums of each half, sort one, binary search complements. O(2^(n/2) · n).
</details>

<details><summary>Count numbers with unique digits / digit-property counts (LC 357, 233, 902). <em>· Google, Amazon</em></summary>

Digit DP over position, tight flag, used-digit mask/started flag.
</details>

<details><summary>Shortest path visiting all nodes (LC 847). <em>· Google, Amazon</em></summary>

BFS over states (node, visited mask) — 2ⁿ·n states.
</details>

<details><summary>Number of distinct elements in ranges (offline queries). <em>· Codeforces, Google</em></summary>

Mo's algorithm O((n+q)√n) or offline sweep with Fenwick tracking last occurrences O((n+q) log n).
</details>

## End-to-end scenarios

<details><summary>Scenario: An OA gives n = 40 items and asks whether some subset sums exactly to S (values up to 10¹²).</summary>

DP over sum is impossible (S huge); 2⁴⁰ too many. Meet in the middle: 2²⁰ sums per half, sort one half, for each sum in the other binary search S − sum. ~2·10⁷ operations — fits.
</details>

<details><summary>Scenario: 10⁵ queries on a tree: "sum of values in the subtree of v" with point updates.</summary>

Euler tour (tin/tout) maps subtrees to contiguous ranges; Fenwick tree over the tour: update O(log n), subtree sum = range query O(log n).
</details>
