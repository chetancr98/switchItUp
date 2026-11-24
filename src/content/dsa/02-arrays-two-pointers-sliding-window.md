---
title: Arrays & Strings — Two Pointers, Sliding Window, Prefix Sums, Kadane
level: 1
tags: two pointers, sliding window, prefix sum, arrays
---
<!-- deepened -->

## Start here: the basics

### Arrays
An array stores elements in **contiguous memory**, so `a[i]` is instant (O(1)). Size is fixed; inserting in the middle requires shifting (O(n)).

```java
int[] a = {5, 2, 8, 1};
a.length;            // 4
a[0];                // 5
for (int i = 0; i < a.length; i++) { /* index loop */ }
for (int x : a) { /* value loop */ }
int[] copy = Arrays.copyOf(a, a.length);
Arrays.sort(a);      // [1, 2, 5, 8]
```

### Strings in Java
Strings are **immutable**; each "change" creates a new string. Build strings with `StringBuilder`. Use `char[] cs = s.toCharArray()` for character manipulation and `int[26]` counts for lowercase letters.

### Pattern 1 — Two pointers (beginner picture)
Use two indexes that move toward each other or in the same direction instead of nested loops.
```java
// Is "racecar" a palindrome?
boolean isPalindrome(String s) {
    int l = 0, r = s.length() - 1;
    while (l < r) if (s.charAt(l++) != s.charAt(r--)) return false;
    return true;
}
```

### Pattern 2 — Sliding window (beginner picture)
For "best **contiguous** subarray/substring" questions, keep a window `[l, r]`: expand `r`, and shrink `l` when the window breaks a rule.
```java
// Maximum sum of any 3 consecutive elements
int maxSum3(int[] a) {
    int window = a[0] + a[1] + a[2], best = window;
    for (int r = 3; r < a.length; r++) {
        window += a[r] - a[r - 3];          // slide: add new, drop old
        best = Math.max(best, window);
    }
    return best;
}
```

### Pattern 3 — Prefix sums
`pre[i]` = sum of the first i elements. Any range sum becomes a subtraction: `sum(l..r) = pre[r+1] − pre[l]`.

---

## 1. Two pointers

### Opposite ends (sorted input or symmetric checks)
```java
// Two Sum II (sorted): O(n), O(1)
int[] twoSum(int[] a, int target) {
    int l = 0, r = a.length - 1;
    while (l < r) {
        int s = a[l] + a[r];
        if (s == target) return new int[]{l, r};
        if (s < target) l++; else r--;
    }
    return new int[]{-1, -1};
}
```
Why it works: if `a[l] + a[r] < target`, no pair using `a[l]` with any element ≤ `a[r]` works → discard `a[l]`.

**3Sum** (LC 15): sort, fix `i`, two-pointer on the rest, **skip duplicates** at all three positions. O(n²).
```java
List<List<Integer>> threeSum(int[] a) {
    Arrays.sort(a);
    List<List<Integer>> res = new ArrayList<>();
    for (int i = 0; i < a.length - 2; i++) {
        if (i > 0 && a[i] == a[i - 1]) continue;
        if (a[i] > 0) break;
        int l = i + 1, r = a.length - 1;
        while (l < r) {
            int s = a[i] + a[l] + a[r];
            if (s < 0) l++;
            else if (s > 0) r--;
            else {
                res.add(List.of(a[i], a[l], a[r]));
                while (l < r && a[l] == a[l + 1]) l++;
                while (l < r && a[r] == a[r - 1]) r--;
                l++; r--;
            }
        }
    }
    return res;
}
```

**Container With Most Water** (LC 11): move the shorter side — the area is limited by it, so keeping it can't improve.

**Trapping Rain Water** (LC 42): water at i = `min(maxLeft, maxRight) − h[i]`. Two pointers: process the side with the smaller max — its bound is known.
```java
int trap(int[] h) {
    int l = 0, r = h.length - 1, lm = 0, rm = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) { lm = Math.max(lm, h[l]); water += lm - h[l]; l++; }
        else             { rm = Math.max(rm, h[r]); water += rm - h[r]; r--; }
    }
    return water;
}
```

### Same direction (read/write pointers — in-place)
```java
// Remove duplicates from sorted array (LC 26)
int removeDuplicates(int[] a) {
    int w = 0;
    for (int r = 0; r < a.length; r++) if (w == 0 || a[r] != a[w - 1]) a[w++] = a[r];
    return w;
}
// Move zeroes (LC 283), Remove element (LC 27), Sort Colors / Dutch national flag (LC 75: 3 pointers)
```

## 2. Sliding window

Use for **contiguous** subarrays/substrings where the constraint is monotonic as the window grows/shrinks.

### Variable window template
```java
int longestWindow(String s) {
    Map<Character, Integer> cnt = new HashMap<>();
    int best = 0;
    for (int l = 0, r = 0; r < s.length(); r++) {
        cnt.merge(s.charAt(r), 1, Integer::sum);        // 1. expand: add s[r]
        while (/* window invalid */ cnt.get(s.charAt(r)) > 1) {   // 2. shrink until valid
            cnt.merge(s.charAt(l), -1, Integer::sum);
            l++;
        }
        best = Math.max(best, r - l + 1);              // 3. record answer (valid window)
    }
    return best;
}
```
That's LC 3 (Longest Substring Without Repeating Characters). Same skeleton solves:
- **LC 424** Longest Repeating Character Replacement: valid iff `windowLen − maxFreq ≤ k` (maxFreq never needs decreasing — subtle).
- **LC 1004** Max Consecutive Ones III: at most k zeros in window.
- **LC 76** Minimum Window Substring (shortest valid window — record answer *inside* the shrink loop):

```java
String minWindow(String s, String t) {
    int[] need = new int[128];
    for (char c : t.toCharArray()) need[c]++;
    int missing = t.length(), start = 0, best = Integer.MAX_VALUE;
    for (int l = 0, r = 0; r < s.length(); r++) {
        if (need[s.charAt(r)]-- > 0) missing--;
        while (missing == 0) {                          // valid → try to shrink
            if (r - l + 1 < best) { best = r - l + 1; start = l; }
            if (++need[s.charAt(l++)] > 0) missing++;
        }
    }
    return best == Integer.MAX_VALUE ? "" : s.substring(start, start + best);
}
```

### Fixed window
Maintain the window of size k: add `a[r]`, remove `a[r-k]`. E.g. max average subarray, **LC 438 Find All Anagrams** (compare count arrays, or track matches), LC 567 Permutation in String.

### Counting subarrays with "at most K"
`exactly(K) = atMost(K) − atMost(K−1)` → LC 992 Subarrays with K Different Integers, LC 1248 Count Nice Subarrays.

### When sliding window fails
Negative numbers break monotonicity of sums (growing the window may decrease the sum) → use **prefix sums + hashmap** or a deque.

## 3. Prefix sums

`pre[i] = a[0] + … + a[i-1]` → `sum(l..r) = pre[r+1] − pre[l]` in O(1).

### Subarray sum equals K (LC 560) — the hashmap trick
```java
int subarraySum(int[] a, int k) {
    Map<Integer, Integer> seen = new HashMap<>();
    seen.put(0, 1);                         // empty prefix
    int sum = 0, count = 0;
    for (int x : a) {
        sum += x;
        count += seen.getOrDefault(sum - k, 0);   // a previous prefix p with sum - p == k
        seen.merge(sum, 1, Integer::sum);
    }
    return count;
}
```
Variants: LC 525 Contiguous Array (map 0 → −1, find sum 0), LC 974 Subarray Sums Divisible by K (store `((sum % k) + k) % k`), LC 523 Continuous Subarray Sum (store first index of each remainder), LC 1074 (2D).

- **2D prefix sums** (LC 304): `P[i+1][j+1] = a[i][j] + P[i][j+1] + P[i+1][j] − P[i][j]`.
- **Difference array** for range updates: `d[l] += v; d[r+1] -= v;` then prefix-sum once (LC 1109 Corporate Flight Bookings, LC 370).
- **Product of Array Except Self** (LC 238): prefix products × suffix products, O(1) extra space.

## 4. Kadane's algorithm — maximum subarray

```java
int maxSubArray(int[] a) {
    int best = a[0], cur = a[0];
    for (int i = 1; i < a.length; i++) {
        cur = Math.max(a[i], cur + a[i]);     // extend or restart
        best = Math.max(best, cur);
    }
    return best;
}
```
It's DP: `cur` = best subarray ending at i. Variants: max product subarray (track min and max — negatives flip), circular max subarray (`max(kadane, total − minSubarray)`, unless all negative), best time to buy & sell stock (LC 121: track min price).

## 5. Other array essentials
- **Boyer–Moore majority vote** (LC 169) O(1) space; LC 229 for n/3 (two candidates).
- **Cyclic sort / index as hash** for values in 1..n: LC 41 First Missing Positive, LC 442 duplicates, LC 448 disappeared numbers (mark by negating).
- **Next permutation** (LC 31): find first i from right with a[i] < a[i+1], swap with the next larger from the right, reverse suffix.
- **Rotate array** by reversal: reverse all, reverse first k, reverse rest.
- **Merge sorted arrays from the back** (LC 88).
- **Matrix**: spiral (LC 54), rotate 90° = transpose + reverse rows (LC 48), set zeroes using first row/col as markers (LC 73).

## Strings specifics
- Palindromes: expand around centres O(n²) (LC 5, LC 647); Manacher O(n) for CP.
- Anagram grouping: key = sorted chars or count signature (LC 49).
- **String matching**: KMP (prefix function) O(n+m); Rabin-Karp rolling hash; Z-function (see CP track).
- `StringBuilder` for building; compare strings with `.equals`.

## Must-solve list (in order)
| # | Problem | Pattern |
|---|---|---|
| 1 | Two Sum (LC 1) | Hashmap |
| 2 | Best Time to Buy/Sell Stock (121) | Running min |
| 3 | Product Except Self (238) | Prefix/suffix |
| 4 | Maximum Subarray (53) | Kadane |
| 5 | 3Sum (15) | Sort + two pointers |
| 6 | Container With Most Water (11) | Two pointers |
| 7 | Longest Substring w/o Repeat (3) | Sliding window |
| 8 | Longest Repeating Char Replacement (424) | Sliding window |
| 9 | Minimum Window Substring (76) | Sliding window |
| 10 | Subarray Sum Equals K (560) | Prefix + hashmap |
| 11 | Trapping Rain Water (42) | Two pointers |
| 12 | Sliding Window Maximum (239) | Monotonic deque (next module) |
| 13 | First Missing Positive (41) | Index as hash |
| 14 | Longest Consecutive Sequence (128) | HashSet, start only at sequence heads |
| 15 | Group Anagrams (49) | Hashing |

## Quick check questions

<details><summary>1. How do you know a problem is sliding window vs prefix sum?</summary>

Sliding window needs monotonicity: extending the window only makes the constraint "more violated" (e.g., non-negative sums, distinct counts) so shrinking from the left fixes it. With negative numbers or "exactly equals" sums, monotonicity breaks → prefix sums with a hashmap.
</details>

<details><summary>2. Longest Consecutive Sequence in O(n)?</summary>

Put all numbers in a HashSet. For each x where x−1 isn't in the set (a sequence start), count x+1, x+2… Each element is visited at most twice → O(n).
</details>

## Questions asked at top companies

<details><summary>Two Sum (LC 1). <em>· Amazon, Google, Microsoft, Adobe</em></summary>

HashMap value → index; for each x check map for target−x. O(n) time/space.
</details>

<details><summary>Best Time to Buy and Sell Stock (LC 121). <em>· Amazon, Microsoft, Goldman Sachs</em></summary>

Track minimum price so far; profit = price − min; keep max. O(n), O(1).
</details>

<details><summary>Maximum Subarray / Kadane (LC 53). <em>· Microsoft, Amazon, Walmart, Infosys</em></summary>

cur = max(x, cur + x); best = max(best, cur). O(n). Follow-up: return indices — track start when restarting.
</details>

<details><summary>Longest Substring Without Repeating Characters (LC 3). <em>· Amazon, Google, Adobe, Uber</em></summary>

Sliding window with last-seen index map; on repeat, move l to max(l, last[c]+1). O(n).
</details>

<details><summary>Container With Most Water (LC 11). <em>· Amazon, Google, Goldman Sachs</em></summary>

Two pointers from ends; area = min(h[l],h[r])·(r−l); move the shorter side. O(n).
</details>

<details><summary>3Sum (LC 15). <em>· Meta, Amazon, Microsoft</em></summary>

Sort; fix i; two pointers on the rest; skip duplicates. O(n²).
</details>

<details><summary>Trapping Rain Water (LC 42). <em>· Google, Amazon, Goldman Sachs, Flipkart</em></summary>

Two pointers with leftMax/rightMax, process smaller side. O(n), O(1).
</details>

<details><summary>Product of Array Except Self (LC 238). <em>· Amazon, Meta, Microsoft</em></summary>

Prefix products left-to-right into output, then multiply suffix products right-to-left. No division. O(n), O(1) extra.
</details>

<details><summary>Subarray Sum Equals K (LC 560). <em>· Meta, Google, Amazon</em></summary>

Prefix sum + hashmap of counts of previous prefix sums; add count[sum − k]. O(n). Works with negatives.
</details>

<details><summary>Minimum Window Substring (LC 76). <em>· Meta, Google, Uber, LinkedIn</em></summary>

Need-count array + missing counter; expand r; while valid, record and shrink l. O(|s| + |t|).
</details>

<details><summary>Merge Intervals / Sort Colors / Move Zeroes. <em>· Microsoft, Amazon, Walmart</em></summary>

Merge: sort by start, extend last. Sort colors: Dutch flag with low/mid/high pointers. Move zeroes: write pointer for non-zeros then fill zeros.
</details>

<details><summary>Longest Consecutive Sequence (LC 128). <em>· Google, Amazon</em></summary>

HashSet; start counting only from numbers whose predecessor is absent. O(n).
</details>

<details><summary>Rotate array by k (LC 189). <em>· Microsoft, Amazon</em></summary>

k %= n; reverse whole array, reverse first k, reverse rest. O(n), O(1).
</details>

## End-to-end scenarios

<details><summary>Scenario: Given a stream of daily stock prices, answer "max profit with one transaction" at the end of each day.</summary>

Maintain running min and best profit — O(1) per day, constant memory; output best after each update. Follow-up "unlimited transactions" → sum of positive day-to-day differences; "with cooldown/fee" → state-machine DP.
</details>

<details><summary>Scenario: Find the length of the longest subarray with sum ≤ K where numbers can be negative.</summary>

Sliding window fails with negatives. Use prefix sums: for each r, need smallest l with pre[l] ≥ pre[r+1] − K; maintain an increasing array of prefix maxima and binary search → O(n log n). (If all non-negative, plain sliding window O(n).)
</details>
