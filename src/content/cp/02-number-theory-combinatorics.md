---
title: Math for CP — Modular Arithmetic, Primes, Sieve, Combinatorics
level: 4
tags: number theory, modular arithmetic, sieve, combinatorics
---
<!-- deepened -->

## Start here: the basics

### Why "modulo 10⁹+7"?
Counting answers grow astronomically (number of paths, permutations). Problems ask for the answer **mod 1,000,000,007** to keep numbers in range. Apply `% MOD` after every addition and multiplication:
```java
final int MOD = 1_000_000_007;
long ways = 1;
for (int i = 1; i <= n; i++) ways = ways * i % MOD;   // n! mod p
```

### Primes and GCD — the essentials
- A **prime** has exactly two divisors (1 and itself). Check up to √n.
- **GCD** (greatest common divisor) via Euclid: `gcd(a, b) = gcd(b, a % b)`.
```java
long gcd(long a, long b) { return b == 0 ? a : gcd(b, a % b); }
boolean isPrime(int n) { if (n < 2) return false; for (int i = 2; (long) i * i <= n; i++) if (n % i == 0) return false; return true; }
```

### Fast power
Computing aⁿ by multiplying n times is too slow for n = 10¹⁸. **Binary exponentiation** squares the base and halves the exponent: O(log n).

### Combinations
C(n, r) = number of ways to choose r items from n = n! / (r!(n−r)!). With mod arithmetic, division becomes multiplication by a **modular inverse**.

---

## Modular arithmetic

Why `1e9+7`? It's prime (inverses exist), and `(1e9+7)² < 2⁶³` so the product of two residues fits in a `long`.

| Operation | Rule |
|---|---|
| Add | `(a + b) % M` |
| Subtract | `((a − b) % M + M) % M` |
| Multiply | `a % M * (b % M) % M` (use long) |
| Divide | `a × b⁻¹ mod M` — **never** `a / b % M` |
| Power | Binary exponentiation O(log e) |
| Inverse (M prime) | Fermat: `b^(M−2) mod M` |
| Inverse (general, gcd(b, M)=1) | Extended Euclid |

```java
// Extended Euclid: returns g = gcd(a,b) and finds x,y with ax + by = g
static long[] extGcd(long a, long b) {
    if (b == 0) return new long[]{a, 1, 0};
    long[] r = extGcd(b, a % b);
    return new long[]{r[0], r[2], r[1] - (a / b) * r[2]};
}
```
Multiplying two longs near 10¹⁸ mod M overflows → `Math.multiplyHigh` / `BigInteger` / mulmod via `__int128` doesn't exist in Java → use `Math.floorMod` with 128-bit trick or Montgomery; rarely needed.

## Primes

### Trial division — O(√n)
```java
static boolean isPrime(long n) {
    if (n < 2) return false;
    for (long i = 2; i * i <= n; i++) if (n % i == 0) return false;
    return true;
}
static Map<Long, Integer> factorize(long n) {
    Map<Long, Integer> f = new TreeMap<>();
    for (long p = 2; p * p <= n; p++) while (n % p == 0) { f.merge(p, 1, Integer::sum); n /= p; }
    if (n > 1) f.merge(n, 1, Integer::sum);
    return f;
}
```

### Sieve of Eratosthenes — O(n log log n)
```java
static boolean[] sieve(int n) {
    boolean[] composite = new boolean[n + 1];
    composite[0] = composite[1] = true;
    for (int i = 2; (long) i * i <= n; i++)
        if (!composite[i]) for (int j = i * i; j <= n; j += i) composite[j] = true;
    return composite;
}
```
**Smallest prime factor (SPF) sieve** → factorise any number ≤ n in O(log n): store `spf[j] = i` when first marked. Linear sieve gives primes + SPF in O(n).

Useful facts: number of primes below n ≈ n / ln n; number of divisors of n ≤ 10⁹ is at most 1344; sum over divisors via factorisation; Euler's totient φ(n) = n·Π(1 − 1/p); `a^φ(m) ≡ 1 (mod m)` when gcd(a, m) = 1.

### GCD/LCM facts
`gcd(a, b) = gcd(b, a mod b)` — O(log min). `gcd(a, 0) = a`. gcd of a range changes at most O(log max) times as the range extends → used in "count subarrays with gcd = k". `lcm(a, b) = a / gcd(a, b) * b` (divide first to avoid overflow).

## Combinatorics

### nCr mod p with precomputed factorials — O(1) per query
```java
static final int MOD = 1_000_000_007, MAX = 2_000_001;
static long[] fact = new long[MAX], inv = new long[MAX];
static {
    fact[0] = 1;
    for (int i = 1; i < MAX; i++) fact[i] = fact[i - 1] * i % MOD;
    inv[MAX - 1] = power(fact[MAX - 1], MOD - 2, MOD);
    for (int i = MAX - 1; i > 0; i--) inv[i - 1] = inv[i] * i % MOD;   // inverse factorials backwards
}
static long nCr(int n, int r) { return (r < 0 || r > n) ? 0 : fact[n] * inv[r] % MOD * inv[n - r] % MOD; }
```
Small n (≤ 5000) or non-prime modulus: Pascal's triangle `C[n][r] = C[n−1][r−1] + C[n−1][r]`.

### Counting toolkit
| Concept | Formula / use |
|---|---|
| Permutations of n | n! |
| Arrangements with repeats | n! / (a! b! …) |
| Stars and bars | Distribute n identical items into k bins: C(n + k − 1, k − 1) |
| Paths in grid (only right/down) | C(m + n, n) |
| **Catalan** | C(2n, n)/(n+1): valid parentheses, BST shapes (LC 96), triangulations, Dyck paths |
| Inclusion–exclusion | |A∪B∪C| = Σ|A| − Σ|A∩B| + |A∩B∩C| — count with "at least one" constraints, derangements |
| Derangements | D(n) = (n − 1)(D(n−1) + D(n−2)) |
| Pigeonhole | n+1 items in n boxes → a collision; prefix sums mod n → subarray divisible by n |
| Contribution technique | Sum over all subarrays = Σ a[i] × (i+1)(n−i) |
| Expected value linearity | E[X+Y] = E[X] + E[Y] even if dependent |

## Matrix exponentiation
Linear recurrences (Fibonacci, tiling counts, number of paths of length k in a graph) in O(d³ log n).
```java
static long[][] mul(long[][] A, long[][] B) {
    int n = A.length; long[][] C = new long[n][n];
    for (int i = 0; i < n; i++) for (int k = 0; k < n; k++) if (A[i][k] != 0)
        for (int j = 0; j < n; j++) C[i][j] = (C[i][j] + A[i][k] * B[k][j]) % MOD;
    return C;
}
static long fib(long n) {                       // [[1,1],[1,0]]^n
    long[][] R = {{1, 0}, {0, 1}}, M = {{1, 1}, {1, 0}};
    while (n > 0) { if ((n & 1) == 1) R = mul(R, M); M = mul(M, M); n >>= 1; }
    return R[0][1];
}
```

## Other math essentials
- **Sum formulas**: 1..n = n(n+1)/2; squares n(n+1)(2n+1)/6; geometric series via modular inverse.
- **Floor division sums** / harmonic trick: Σ n/i for i=1..n takes O(√n) distinct values → iterate blocks.
- Binary representation: number of set bits, power-of-two checks, `Long.numberOfLeadingZeros` for floor(log₂).
- Geometry basics: cross product for orientation, avoid floating point when possible (compare with long cross products), shoelace formula for polygon area.
- Game theory: **Sprague-Grundy** (Nim: XOR of piles ≠ 0 → first player wins), minimax with memo for small games (LC 877, 464, 1140).
- Probability DP: expected steps with `dp` + modular inverse for fractions.

## Practice set
CSES Mathematics section (Exponentiation, Counting Divisors, Common Divisors, Binomial Coefficients, Creating Strings II, Distributing Apples, Christmas Party, Fibonacci Numbers, Throwing Dice); LeetCode 50 (Pow), 204 (Count Primes), 372 (Super Pow), 62 (Unique Paths with nCr), 1735, 1569, 1916; Codeforces number-theory tag at 1300–1700.

## Quick check questions

<details><summary>1. Why can't you compute (a / b) mod M directly?</summary>

Modular reduction doesn't distribute over integer division — (a mod M)/(b mod M) is meaningless. Instead multiply by the modular inverse of b, which exists when gcd(b, M) = 1 (always for prime M unless b ≡ 0).
</details>

<details><summary>2. Count primes below 5×10⁶ — approach and complexity?</summary>

Sieve of Eratosthenes: O(n log log n) time, O(n) bits/booleans memory; start crossing at i² and only for i ≤ √n. A bitset or odd-only sieve halves memory.
</details>

## Questions asked at top companies

<details><summary>Count primes less than n (LC 204). <em>· Amazon, Microsoft, Apple</em></summary>

Sieve of Eratosthenes starting at i² up to √n. O(n log log n).
</details>

<details><summary>Implement pow(x, n) (LC 50). <em>· Meta, Google, LinkedIn, Amazon</em></summary>

Binary exponentiation; handle negative n with 1/x and Integer.MIN_VALUE by using long. O(log n).
</details>

<details><summary>GCD/LCM of an array. <em>· Infosys, TCS, Amazon OA</em></summary>

Fold gcd across elements; lcm = a / gcd(a,b) * b with overflow care.
</details>

<details><summary>Unique paths in a grid using combinatorics. <em>· Google, Goldman Sachs</em></summary>

C(m+n−2, m−1) computed iteratively with long or with factorials mod p.
</details>

<details><summary>Number of trailing zeros in n! (LC 172). <em>· Microsoft, Bloomberg, Goldman Sachs</em></summary>

Count factors of 5: n/5 + n/25 + n/125 + …
</details>

<details><summary>Excel sheet column title/number (LC 168/171). <em>· Microsoft, Amazon, Goldman Sachs</em></summary>

Bijective base-26 conversion (subtract 1 before modulo for title).
</details>

<details><summary>Happy number / Ugly number (LC 202/264). <em>· Google, Amazon</em></summary>

Happy: cycle detection with set or slow/fast. Ugly II: three pointers merging multiples of 2, 3, 5.
</details>

<details><summary>Why can't you divide under modulo directly? <em>· Codeforces/OA theory</em></summary>

Modular arithmetic doesn't distribute over division; multiply by the modular inverse (Fermat for prime modulus).
</details>

## End-to-end scenarios

<details><summary>Scenario: "Count ways to distribute n identical candies to k children (each can get 0), mod 1e9+7" with n, k ≤ 10⁶ and 10⁵ queries.</summary>

Stars and bars: C(n + k − 1, k − 1). Precompute factorials and inverse factorials up to 2·10⁶ once (O(N)), answer each query in O(1).
</details>

<details><summary>Scenario: Find the number of integers in [1, 10¹²] divisible by 3, 5 or 7.</summary>

Inclusion–exclusion over divisors: N/3 + N/5 + N/7 − N/15 − N/21 − N/35 + N/105 (use lcm for each subset). O(2^k).
</details>
