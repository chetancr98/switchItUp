---
title: Competitive Programming in Java — Fast I/O, Templates & Pitfalls
level: 2
tags: competitive programming, java, fast io, codeforces
---
<!-- deepened -->

## Start here: the basics

### What is competitive programming (CP)?
Timed contests (LeetCode weekly, Codeforces, CodeChef, AtCoder) where you solve algorithmic problems; an automatic judge runs your code on hidden tests with strict **time limits** (1–2 s) and **memory limits**. It sharpens exactly the skills coding interviews test: speed, correctness, edge cases.

### How judges read your program
Input comes from **standard input** and output goes to **standard output** — no UI, no function signature like LeetCode.
```java
import java.util.*;
public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int t = sc.nextInt();               // number of test cases
        while (t-- > 0) {
            int n = sc.nextInt();
            long sum = 0;
            for (int i = 0; i < n; i++) sum += sc.nextLong();
            System.out.println(sum);
        }
    }
}
```
`Scanner` is fine for small input; for large inputs use the fast reader in this module.

### Verdicts you'll see
| Verdict | Meaning |
|---|---|
| AC | Accepted |
| WA | Wrong Answer — logic bug or edge case |
| TLE | Time Limit Exceeded — algorithm too slow or slow I/O |
| MLE | Memory Limit Exceeded |
| RE | Runtime Error — exception (array out of bounds, stack overflow) |

### A beginner's contest routine
Solve A and B first, read constraints carefully, test with the sample and your own edge cases, then submit. Afterwards, **upsolve** one problem you couldn't solve.

---

## Why CP matters for FAANG
Contests train exactly what coding rounds test: recognising patterns under time pressure, bug-free implementation, and edge-case thinking. A **LeetCode rating 1800+ / Codeforces 1400–1600** typically means FAANG coding rounds feel comfortable. Do one contest every weekend from Phase 3.

## Fast input/output — mandatory for large inputs

`Scanner` is ~10× too slow for 10⁶ numbers (regex parsing). `System.out.println` in a loop flushes constantly.

```java
import java.io.*;
import java.util.*;

public class Main {
    public static void main(String[] args) throws IOException {
        FastReader in = new FastReader(System.in);
        PrintWriter out = new PrintWriter(new BufferedWriter(new OutputStreamWriter(System.out)));
        int t = in.nextInt();
        while (t-- > 0) {
            int n = in.nextInt();
            long[] a = new long[n];
            for (int i = 0; i < n; i++) a[i] = in.nextLong();
            out.println(solve(n, a));
        }
        out.flush();                        // don't forget!
    }

    static long solve(int n, long[] a) { return 0; }

    // DataInputStream-based reader: fastest practical option
    static final class FastReader {
        private final DataInputStream din; private final byte[] buf = new byte[1 << 16];
        private int ptr, len;
        FastReader(InputStream is) { din = new DataInputStream(is); }
        private int read() throws IOException {
            if (ptr == len) { len = din.read(buf, 0, buf.length); ptr = 0; if (len <= 0) return -1; }
            return buf[ptr++];
        }
        int nextInt() throws IOException { return (int) nextLong(); }
        long nextLong() throws IOException {
            int c = read(); while (c <= ' ') c = read();
            boolean neg = c == '-'; if (neg) c = read();
            long r = 0;
            while (c >= '0' && c <= '9') { r = r * 10 + (c - '0'); c = read(); }
            return neg ? -r : r;
        }
        String next() throws IOException {
            int c = read(); while (c <= ' ') c = read();
            StringBuilder sb = new StringBuilder();
            while (c > ' ') { sb.append((char) c); c = read(); }
            return sb.toString();
        }
    }
}
```
Simpler middle ground: `BufferedReader` + `StringTokenizer`.

## Java-specific traps in CP

| Trap | Fix |
|---|---|
| **Anti-quicksort tests**: `Arrays.sort(int[])` is dual-pivot quicksort → adversarial inputs force O(n²) on Codeforces (hacks!) | Shuffle before sorting, or sort `Integer[]`/`long` via `List` (TimSort), or radix sort |
| Integer overflow (`int` max ≈ 2.1×10⁹) | Use `long` for sums/products; `1L * a * b`; check `n * n` up to 10¹⁸ fits in long (9.2×10¹⁸) |
| `Integer` comparisons with `==` beyond 127 | `.equals` or unbox to `int` |
| Recursion depth (default thread stack ~512KB–1MB) → StackOverflow at ~10⁴–10⁵ deep DFS | Run in a thread with a big stack: `new Thread(null, () -> {...}, "main", 1 << 28).start();` or iterative DFS |
| HashMap anti-hash tests (hack keys colliding) | Use arrays/coordinate compression, or randomise: map key `x ^ RANDOM_SALT`, or `TreeMap` |
| Boxing overhead in `ArrayList<Integer>` for huge n | Primitive arrays; custom IntList |
| String concatenation in loops | `StringBuilder` |
| Modulo of negatives | `((x % M) + M) % M` |
| Floating point equality | Compare with EPS, prefer integer arithmetic |

```java
static void shuffleSort(int[] a) {
    Random r = new Random();
    for (int i = a.length - 1; i > 0; i--) { int j = r.nextInt(i + 1); int t = a[i]; a[i] = a[j]; a[j] = t; }
    Arrays.sort(a);
}
```

## Template snippets worth memorising

```java
static final int MOD = 1_000_000_007;
static final int INF = (int) 1e9;
static final long LINF = (long) 4e18;

static long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
static long lcm(long a, long b) { return a / gcd(a, b) * b; }

static long power(long b, long e, long m) {           // binary exponentiation O(log e)
    long r = 1; b %= m;
    while (e > 0) { if ((e & 1) == 1) r = r * b % m; b = b * b % m; e >>= 1; }
    return r;
}
static long modInverse(long a, long m) { return power(a, m - 2, m); }   // m prime (Fermat)

// Coordinate compression
static int[] compress(int[] a) {
    int[] s = a.clone(); Arrays.sort(s);
    int m = 0; for (int i = 0; i < s.length; i++) if (i == 0 || s[i] != s[i - 1]) s[m++] = s[i];
    int[] r = new int[a.length];
    for (int i = 0; i < a.length; i++) r[i] = Arrays.binarySearch(s, 0, m, a[i]);
    return r;
}

// Pair with comparison
record P(int a, int b) implements Comparable<P> {
    public int compareTo(P o) { return a != o.a ? Integer.compare(a, o.a) : Integer.compare(b, o.b); }
}
```

## Contest strategy
1. **Read all problems** first (Codeforces Div 2: A, B usually easy; LeetCode: Q1–Q2 easy/medium).
2. Before coding, check constraints → target complexity (table in DSA 01).
3. Write a brute force for small cases when unsure; **stress test** (random small inputs, compare brute vs optimised) to find the counterexample.
4. Edge cases: n = 1, all equal, max values (overflow), negative numbers, empty strings.
5. If stuck > 20 min, move on; come back.
6. **Upsolve** after the contest: solve the next 1–2 problems you couldn't, read editorials. Upsolving is where rating comes from.
7. Track your weak tags (Codeforces problemset filter by tag & rating ±200 of your level).

## Platform roadmap
| Stage | Platform | Target |
|---|---|---|
| Start | LeetCode weekly/biweekly | Solve Q1–Q3 consistently |
| Grow | Codeforces Div 3 → Div 2 | 1200 → 1600 |
| Pattern drilling | CSES Problem Set (300 classic problems) | Sorting/searching, DP, graphs, range queries sections |
| Reference | cp-algorithms.com, USACO Guide | Theory |
| Interview-tuned | LeetCode company-tagged (last 6 months) | Before onsite |

## Quick check questions

<details><summary>1. Why can Arrays.sort(int[]) TLE on Codeforces?</summary>

Primitive sort is dual-pivot quicksort; adversarial "anti-Java-sort" tests trigger its O(n²) worst case. Shuffle first, use object sorting (TimSort, O(n log n) worst) or radix sort.
</details>

<details><summary>2. How do you debug a WA (wrong answer) with no failing test shown?</summary>

Stress testing: write a trivially correct brute force, generate random small inputs, run both, and stop at the first mismatch. Then reason on that minimal counterexample. Also re-check overflow, off-by-ones, multi-test-case state reset, and output format.
</details>

## Questions asked at top companies

<details><summary>Why is Scanner slow and what do you use instead? <em>· OAs on HackerRank/HackerEarth for Amazon, Uber, Goldman Sachs</em></summary>

Scanner uses regex-based parsing and small buffers. Use BufferedReader + StringTokenizer or a byte-buffer reader; output with PrintWriter/StringBuilder and flush once.
</details>

<details><summary>How do you avoid integer overflow in Java? <em>· Goldman Sachs, Amazon OA</em></summary>

Use long for sums/products, cast before multiplying (`1L * a * b`), `Math.addExact/multiplyExact` to detect overflow, modular arithmetic for big counts.
</details>

<details><summary>How do you handle deep recursion in Java (StackOverflowError)? <em>· Codeforces-style OAs</em></summary>

Convert to iterative with an explicit stack, or run solve() in a new Thread with a large stack size.
</details>

<details><summary>How do you test your solution before submitting? <em>· general OA advice</em></summary>

Samples, hand-made edge cases (min/max n, duplicates, negatives), and stress testing against a brute-force solution on random small inputs.
</details>

<details><summary>Why might HashMap be slow in contests? <em>· Codeforces hacks</em></summary>

Boxing overhead and adversarial anti-hash tests causing collisions; use arrays/coordinate compression or randomised keys.
</details>

## End-to-end scenarios

<details><summary>Scenario: In a 90-minute OA with 3 problems, you're stuck on problem 2 after 35 minutes. What do you do?</summary>

Submit a brute force that passes partial tests (many OAs give partial credit), move to problem 3, come back with fresh eyes; keep 10 minutes at the end for edge-case review. Read all problems in the first 5 minutes to prioritise.
</details>

<details><summary>Scenario: Your solution gets WA on test 7 of 20 and you can't see the test. Find the bug.</summary>

Stress test: write brute force, random generator for small n, compare outputs in a loop until mismatch; inspect common culprits — overflow, uninitialised state between test cases, off-by-one at boundaries, wrong output format, sorting comparator mistakes.
</details>
