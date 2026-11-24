---
title: Advanced Structures — Trie, Segment Tree, Fenwick Tree, Bit Manipulation, String Algorithms
level: 4
tags: trie, segment tree, fenwick, bit manipulation, kmp
---
<!-- deepened -->

## Start here: the basics

### Trie (prefix tree)
A tree where each edge is a character. Words sharing a prefix share a path. Great for "words starting with…" (autocomplete).
```
insert: car, cat, cup
        (root)
        /    \
       c      …
      / \
     a   u
    / \   \
   r*  t*  p*     (* = end of word)
```

### Segment tree / Fenwick tree — range questions with updates
"Sum of elements from index 3 to 900" with frequent updates: prefix sums need O(n) per update; these trees answer queries **and** updates in O(log n).

### Bit manipulation basics
Numbers are stored in binary. Bit tricks give fast operations:
```java
x & 1          // 1 if odd
x >> 1         // divide by 2
x << 1         // multiply by 2
x & (x - 1)    // remove lowest set bit; equals 0 ⇒ x is a power of two
a ^ a == 0     // XOR cancels equal values → find the single non-duplicated number
```

---

## Trie (prefix tree)

```java
class Trie {
    private static final class Node { Node[] next = new Node[26]; boolean end; int pass; /* words through this node */ }
    private final Node root = new Node();

    void insert(String w) {
        Node n = root;
        for (char c : w.toCharArray()) {
            int i = c - 'a';
            if (n.next[i] == null) n.next[i] = new Node();
            n = n.next[i]; n.pass++;
        }
        n.end = true;
    }
    boolean search(String w) { Node n = walk(w); return n != null && n.end; }
    boolean startsWith(String p) { return walk(p) != null; }
    private Node walk(String s) {
        Node n = root;
        for (char c : s.toCharArray()) { n = n.next[c - 'a']; if (n == null) return null; }
        return n;
    }
}
```
O(L) per operation. Use `HashMap<Character, Node>` for large alphabets.

Applications: autocomplete (store top-K at nodes), Word Search II (LC 212), Replace Words (648), Design Add and Search Words (211 — DFS on `.`), Longest word in dictionary, **Maximum XOR of Two Numbers** (LC 421 — **binary trie** over bits, greedily take the opposite bit), Palindrome Pairs (336).

## Segment tree — range queries with point/range updates

Use when you need **range query (sum/min/max/gcd) + updates**, both O(log n).

```java
class SegTree {                     // range sum, point update; iterative, size 2n
    private final int n; private final long[] t;
    SegTree(int[] a) {
        n = a.length; t = new long[2 * n];
        for (int i = 0; i < n; i++) t[n + i] = a[i];
        for (int i = n - 1; i > 0; i--) t[i] = t[2 * i] + t[2 * i + 1];
    }
    void update(int i, long v) {
        for (t[i += n] = v; i > 1; i >>= 1) t[i >> 1] = t[i] + t[i ^ 1];
    }
    long query(int l, int r) {      // sum on [l, r)
        long res = 0;
        for (l += n, r += n; l < r; l >>= 1, r >>= 1) {
            if ((l & 1) == 1) res += t[l++];
            if ((r & 1) == 1) res += t[--r];
        }
        return res;
    }
}
```
- **Lazy propagation** for range updates (add v to [l, r]) + range queries — recursive tree with `lazy[]` pushed down on visit. Template in CP track.
- Problems: Range Sum Query Mutable (LC 307), Count of Smaller Numbers After Self (LC 315), Range Module (715), My Calendar III, Falling Squares (699), Rectangle Area II (850, sweep + segment tree).

## Fenwick tree (Binary Indexed Tree)

Simpler & faster than a segment tree for **prefix sums with point updates** (and inversions counting).

```java
class Fenwick {
    private final long[] bit;     // 1-indexed
    Fenwick(int n) { bit = new long[n + 1]; }
    void add(int i, long delta) { for (i++; i < bit.length; i += i & -i) bit[i] += delta; }
    long prefix(int i) { long s = 0; for (i++; i > 0; i -= i & -i) s += bit[i]; return s; }  // sum [0..i]
    long range(int l, int r) { return prefix(r) - (l > 0 ? prefix(l - 1) : 0); }
}
```
`i & -i` = lowest set bit = the size of the range node i covers.
**Count inversions / smaller after self**: coordinate-compress values, iterate from the right, `ans[i] = prefix(rank − 1)`, then `add(rank, 1)`.

## Sparse table — O(1) static range min/max
Precompute `st[k][i]` = min of `a[i .. i + 2^k)` in O(n log n); query `[l, r]` = min of two overlapping power-of-two blocks. Static arrays only.

## Bit manipulation

| Trick | Meaning |
|---|---|
| `x & 1` | Odd? |
| `x & (x − 1)` | Clear lowest set bit; `== 0` → power of two (x > 0) |
| `x & −x` | Isolate lowest set bit |
| `x ^ x = 0`, `x ^ 0 = x` | XOR cancels pairs |
| `(x >> i) & 1` | i-th bit |
| `x | (1 << i)`, `x & ~(1 << i)`, `x ^ (1 << i)` | Set / clear / toggle |
| `Integer.bitCount(x)` | Popcount |
| `>>>` vs `>>` | Unsigned vs sign-extending right shift in Java |

Classics:
- **Single Number** (LC 136): XOR all. Single Number III (260): XOR all → split by lowest set bit.
- Single Number II (137): count bits mod 3.
- Missing Number (268): XOR indices and values.
- Counting Bits (338): `dp[i] = dp[i >> 1] + (i & 1)`.
- Reverse Bits (190), Number of 1 Bits (191).
- Sum of Two Integers without `+` (371): `a ^ b` sum without carry, `(a & b) << 1` carry.
- Subsets via masks; iterate submasks: `for (int s = mask; s > 0; s = (s - 1) & mask)` → O(3ⁿ) over all masks.
- Gray code (89): `i ^ (i >> 1)`.

## String algorithms

### KMP — O(n + m) pattern matching
```java
int[] prefixFunction(String p) {          // pi[i] = length of longest proper prefix of p[0..i] that's also a suffix
    int[] pi = new int[p.length()];
    for (int i = 1, k = 0; i < p.length(); i++) {
        while (k > 0 && p.charAt(i) != p.charAt(k)) k = pi[k - 1];
        if (p.charAt(i) == p.charAt(k)) k++;
        pi[i] = k;
    }
    return pi;
}
int indexOf(String text, String pat) {     // LC 28
    int[] pi = prefixFunction(pat);
    for (int i = 0, k = 0; i < text.length(); i++) {
        while (k > 0 && text.charAt(i) != pat.charAt(k)) k = pi[k - 1];
        if (text.charAt(i) == pat.charAt(k)) k++;
        if (k == pat.length()) return i - k + 1;
    }
    return -1;
}
```
Uses: Shortest Palindrome (LC 214: prefix function of `s + "#" + reverse(s)`), Repeated Substring Pattern (459), counting occurrences.

### Rabin-Karp rolling hash
`h = (h * B + c) mod M`; slide: remove `c_out * B^(L-1)`. Use two moduli or a 64-bit mod to reduce collisions. Uses: Longest Duplicate Substring (LC 1044, binary search on length + hashing), repeated DNA.

### Z-function, Manacher, suffix arrays
Z-algorithm (all prefix matches in O(n)), Manacher (all palindromic radii in O(n) — LC 5 in linear time), suffix array + LCP (distinct substrings, longest repeated substring). Covered in the CP track.

## Monotonic queue, ordered sets & more for hard problems
- `TreeMap`/`TreeSet` as balanced BST: floor/ceiling queries, multiset via counts (LC 220 Contains Duplicate III, LC 2034, LC 352).
- **LFU cache**, **skip list** (LC 1206 design), consistent hashing ring with `TreeMap`.

## Must-solve list
Implement Trie (208), Design Add and Search Words (211), Word Search II (212), Maximum XOR (421), Range Sum Query Mutable (307), Count of Smaller Numbers After Self (315), Reverse Pairs (493), Count of Range Sum (327), Single Number I/II/III, Counting Bits (338), Find the Index of First Occurrence (28 via KMP), Shortest Palindrome (214), Longest Duplicate Substring (1044).

## Quick check questions

<details><summary>1. Segment tree vs Fenwick tree?</summary>

Fenwick: less code, less memory, faster constants — ideal for prefix sums with point updates (and range updates/point queries via difference trick). Segment tree: handles any associative operation (min, max, gcd, custom merges), range updates with lazy propagation, and more complex queries (e.g., k-th element, max subarray in range).
</details>

<details><summary>2. When is a trie better than a hash set of words?</summary>

When you need prefix operations (startsWith, autocomplete, longest common prefix), wildcard search, or to prune a grid/backtracking search as soon as a prefix can't lead to any word. A HashSet only answers exact membership.
</details>

## Questions asked at top companies

<details><summary>Implement Trie (LC 208). <em>· Amazon, Google, Microsoft, Uber</em></summary>

Node with children array/map and end flag; insert/search/startsWith walk characters. O(L).
</details>

<details><summary>Design Add and Search Words (LC 211). <em>· Meta, Amazon</em></summary>

Trie with DFS branching on '.' wildcard.
</details>

<details><summary>Maximum XOR of two numbers (LC 421). <em>· Google, Amazon</em></summary>

Binary trie of numbers from MSB; for each number greedily follow opposite bits. O(n·32).
</details>

<details><summary>Range Sum Query – Mutable (LC 307). <em>· Google, Meta</em></summary>

Fenwick tree or segment tree: point update and prefix/range query in O(log n).
</details>

<details><summary>Count of smaller numbers after self (LC 315). <em>· Google, Amazon</em></summary>

Coordinate compress, iterate from right querying Fenwick prefix counts then adding; or merge sort counting.
</details>

<details><summary>Single Number I/II/III (LC 136/137/260). <em>· Amazon, Google, Adobe</em></summary>

I: XOR all. II: count bits mod 3. III: XOR all, split by lowest set bit into two groups.
</details>

<details><summary>Number of 1 bits / power of two / counting bits (LC 191/231/338). <em>· Microsoft, Apple, Adobe</em></summary>

`x & (x−1)` loop; `x > 0 && (x & (x−1)) == 0`; dp[i] = dp[i>>1] + (i&1).
</details>

<details><summary>Implement strStr with KMP (LC 28). <em>· Microsoft, Amazon</em></summary>

Prefix function for the pattern, then linear scan of the text. O(n+m).
</details>

<details><summary>Longest duplicate substring (LC 1044). <em>· Google, Amazon</em></summary>

Binary search on length + Rabin-Karp rolling hash set (double hashing to limit collisions); or suffix array + LCP.
</details>

<details><summary>Design a leaderboard with rank queries. <em>· Amazon, Dream11, gaming companies</em></summary>

Fenwick/segment tree over score buckets for rank counts, or a balanced BST/skip list (Redis sorted set) for score → rank in O(log n).
</details>

## End-to-end scenarios

<details><summary>Scenario: Build an autocomplete service suggesting the top 5 searches for any prefix.</summary>

Trie where each node stores top-5 (query, count) for its subtree; insert updates top-5 along the path; serve from memory, rebuild periodically from logs, shard by first characters, cache hot prefixes at CDN; trade-off of memory vs latency vs freshness.
</details>

<details><summary>Scenario: Live cricket app needs "runs scored between over 10 and 15" with corrections to past balls.</summary>

Fenwick tree over balls (or overs) for runs: corrections are point updates O(log n), range queries O(log n). Segment tree if also needing max-scoring over in a range.
</details>
