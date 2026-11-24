---
title: Complexity Analysis, Java DSA Toolkit & How to Run a Coding Interview
level: 1
tags: big-o, java, interview technique
---
<!-- deepened -->

## Start here: the basics

### What is an algorithm? What is a data structure?
- **Algorithm** — a step-by-step recipe to solve a problem (e.g., how to find a name in a phone book).
- **Data structure** — a way to organise data so certain operations are fast (an array, a hash map, a tree).
Choosing the right data structure usually *is* the solution.

### Big-O: how cost grows with input size
Big-O describes how the number of steps grows as input size `n` grows, ignoring constants.

| Big-O | Name | Example | n = 1,000,000 → steps (approx.) |
|---|---|---|---|
| O(1) | Constant | `arr[5]`, HashMap get | 1 |
| O(log n) | Logarithmic | Binary search | 20 |
| O(n) | Linear | Loop over array | 1,000,000 |
| O(n log n) | Linearithmic | Sorting | 20,000,000 |
| O(n²) | Quadratic | Nested loops over the array | 10¹² (too slow!) |
| O(2ⁿ) | Exponential | All subsets | impossible |

```java
int sum(int[] a) {                 // O(n): one pass
    int s = 0;
    for (int x : a) s += x;
    return s;
}
boolean hasDuplicatePair(int[] a) { // O(n²): every pair
    for (int i = 0; i < a.length; i++)
        for (int j = i + 1; j < a.length; j++)
            if (a[i] == a[j]) return true;
    return false;
}
boolean hasDuplicate(int[] a) {     // O(n) with extra O(n) memory — the classic trade
    Set<Integer> seen = new HashSet<>();
    for (int x : a) if (!seen.add(x)) return true;
    return false;
}
```

### Space complexity
Extra memory your algorithm uses (the HashSet above is O(n) space). Recursion uses stack space equal to its depth.

### How to practise DSA as a beginner
1. Learn one **pattern** at a time (this track is organised by pattern).
2. Solve 3–5 easy problems of that pattern, then mediums.
3. If stuck 20–30 min, read the hint/solution, **close it, and re-code yourself**.
4. Revisit the problem after 3, 7 and 21 days.

---

## The coding interview protocol (follow it every time, even in practice)

1. **Clarify** (2–3 min): input size & ranges, negatives/duplicates/empty, sorted?, return format, in-place allowed?
2. **Examples**: walk a normal case and an edge case by hand.
3. **Brute force** out loud with its complexity — shows you can always deliver something.
4. **Optimise**: name the bottleneck, map to a pattern (this track teaches the patterns). State target complexity before coding.
5. **Code** cleanly: meaningful names, helper functions, no premature micro-optimisation.
6. **Test**: dry-run your own example, then edge cases (empty, single, all same, max values, overflow).
7. **Complexity**: final time & space, and trade-offs.

Silence is the #1 killer. Think aloud. If stuck: try small examples, sort the input, think about what data structure answers the repeated question in O(1)/O(log n), or reverse the problem.

## Constraints → expected complexity

| n up to | Acceptable | Typical techniques |
|---|---|---|
| 10–12 | O(n!), O(n·2ⁿ) | Permutations, brute-force backtracking |
| 20–25 | O(2ⁿ), O(n²·2ⁿ) | Bitmask DP, meet-in-the-middle (n≈40) |
| 100–500 | O(n³) | Floyd-Warshall, interval DP |
| 10³–5×10³ | O(n²) | 2D DP, nested loops |
| 10⁵–10⁶ | O(n log n) / O(n) | Sorting, heaps, binary search, two pointers, hashing, segment trees |
| 10⁹+ | O(log n) / O(1) | Binary search on answer, math |

Rule of thumb: ~10⁸ simple operations/second in Java.

## Big-O beyond the basics

- **Amortised**: `ArrayList.add` is O(1) amortised — doubling (1.5× in Java) means total copy cost over n adds is O(n). Same for hash table resizing, dynamic arrays, union-find with path compression (α(n)).
- **Recursion**: T(n) = a·T(n/b) + f(n) → **Master theorem**: merge sort 2T(n/2)+O(n) = O(n log n); binary search T(n/2)+O(1) = O(log n). Naive Fibonacci T(n-1)+T(n-2) = O(φⁿ).
- **Recursion space** = max depth of the call stack (DFS on a skewed tree = O(n)).
- **String building**: `s += c` in a loop is O(n²) — use `StringBuilder`.
- **Hidden costs**: `list.remove(0)` on ArrayList is O(n); `String.substring` is O(k) (copies); `contains` on a List is O(n); sorting is O(n log n); `HashMap` iteration is O(capacity).

## Java toolkit for interviews

```java
// Arrays
int[] a = new int[n]; Arrays.fill(a, -1); Arrays.sort(a);                 // dual-pivot quicksort for primitives
Integer[] b = ...; Arrays.sort(b, (x, y) -> y - x);                        // objects: TimSort (stable)
int[][] iv = ...; Arrays.sort(iv, (p, q) -> Integer.compare(p[0], q[0])); // sort intervals
int[] copy = Arrays.copyOfRange(a, l, r);
int sum = Arrays.stream(a).sum(); int mx = Arrays.stream(a).max().getAsInt();

// Lists
List<Integer> list = new ArrayList<>(); Collections.sort(list); Collections.reverse(list);
List<List<Integer>> res = new ArrayList<>(); res.add(new ArrayList<>(path));   // copy when backtracking!

// Map / Set
Map<Integer, Integer> freq = new HashMap<>();
freq.merge(x, 1, Integer::sum);                         // count
freq.getOrDefault(x, 0);
Map<String, List<String>> groups = new HashMap<>();
groups.computeIfAbsent(key, k -> new ArrayList<>()).add(s);
TreeMap<Integer, Integer> tm = new TreeMap<>();         // floorKey, ceilingKey, firstKey, pollFirstEntry
TreeSet<Integer> ts = new TreeSet<>();                  // floor, ceiling, higher, lower

// Stack / Queue / Deque  — use ArrayDeque, never Stack
Deque<Integer> stack = new ArrayDeque<>(); stack.push(1); stack.pop(); stack.peek();
Deque<int[]> q = new ArrayDeque<>(); q.offer(new int[]{r, c}); q.poll();

// Heaps
PriorityQueue<Integer> minH = new PriorityQueue<>();
PriorityQueue<Integer> maxH = new PriorityQueue<>(Collections.reverseOrder());
PriorityQueue<int[]> pq = new PriorityQueue<>((x, y) -> x[1] - y[1]);  // careful with overflow → Integer.compare

// Strings
char[] cs = s.toCharArray(); String t = new String(cs); String.valueOf(cs);
StringBuilder sb = new StringBuilder(); sb.append(c); sb.reverse(); sb.setCharAt(i, 'x'); sb.deleteCharAt(sb.length()-1);
int[] cnt = new int[26]; for (char c : s.toCharArray()) cnt[c - 'a']++;
Character.isLetterOrDigit(c); Character.toLowerCase(c);

// Bits
Integer.bitCount(x); Integer.highestOneBit(x); Long.numberOfTrailingZeros(x); x & (x - 1) /* drop lowest set bit */; x & -x /* lowest set bit */;

// Pitfalls
// 1. Integer overflow: mid = lo + (hi - lo) / 2; use long for products/sums.
// 2. Integer caching: compare Integer objects with .equals(), never == (fails beyond 127).
// 3. Comparator (a,b)->a-b overflows for large/negative values → Integer.compare(a,b).
// 4. Modulo of negatives: (-7 % 3) == -1 in Java → ((x % m) + m) % m.
// 5. char arithmetic: (char)('a' + i).
```

## Recursion & the call stack — template mindset
Every recursive function needs: **base case**, **recurrence** (trust that smaller calls work), **combination**. Draw the recursion tree to get complexity: nodes × work per node.

## Spaced repetition plan
Keep a spreadsheet: problem, pattern, date, "solved alone?" (Y/N), key insight in one line. Re-solve N's after 3, 7, 21 days. Patterns stick from re-solving, not from reading solutions.

## Pattern map (what this track covers)

| Signal in the problem | Pattern / module |
|---|---|
| Sorted array, pair/triplet with target, in-place | Two pointers (02) |
| Contiguous subarray/substring with constraint | Sliding window (02) |
| Subarray sum equals K, range sums | Prefix sum + hashmap (02) |
| "Next greater/smaller", histogram | Monotonic stack (03) |
| Sorted / monotonic predicate / "minimise the maximum" | Binary search (on answer) (04) |
| Linked structure, cycle, middle | Fast & slow pointers (04) |
| Tree paths, LCA, serialisation | Tree DFS/BFS (05) |
| Top K / K-th / streaming median / merge K | Heap (06) |
| Overlapping intervals, scheduling | Sort + sweep / greedy (06) |
| Grid, shortest steps, dependencies, connectivity | BFS, topological sort, union-find, Dijkstra (07) |
| Count ways / min cost / "can we" with overlapping subproblems | DP (08) |
| All combinations/permutations/subsets | Backtracking (09) |
| Prefix matching, range queries with updates | Trie, segment tree, Fenwick (10) |

## Quick check questions

<details><summary>1. What's the time complexity of building a heap from n elements?</summary>

O(n) using bottom-up heapify (sum of heights is O(n)), not O(n log n) — though n successive `offer` calls is O(n log n). `new PriorityQueue<>(collection)` uses the O(n) approach.
</details>

<details><summary>2. Why is Arrays.sort different for int[] and Integer[]?</summary>

Primitives use dual-pivot quicksort (not stable, stability is irrelevant for primitives, worst case O(n²) is mitigated). Objects use TimSort — stable (needed for multi-key sorts) and adaptive to existing runs, O(n log n) worst case.
</details>

## Questions asked at top companies

<details><summary>What is the time complexity of HashMap get, ArrayList add, and sorting in Java? <em>· Amazon, Infosys, Walmart</em></summary>

HashMap get: O(1) average (O(log n) worst in Java 8+). ArrayList add at end: O(1) amortised. Arrays.sort / Collections.sort: O(n log n).
</details>

<details><summary>What's the complexity of this nested loop: `for i<n: for j<i: …`? <em>· Microsoft, Adobe</em></summary>

Sum of 0..n-1 = n(n−1)/2 → O(n²).
</details>

<details><summary>What's the complexity of `for (i = 1; i < n; i *= 2)`? <em>· Amazon, Goldman Sachs</em></summary>

O(log n) — i doubles each time.
</details>

<details><summary>Recursive Fibonacci complexity and how to improve it. <em>· Microsoft, TCS, Amazon</em></summary>

Naive O(2ⁿ) (≈ O(φⁿ)) because subproblems repeat; memoization or iteration gives O(n); matrix exponentiation O(log n).
</details>

<details><summary>What is amortized complexity? <em>· Google, Microsoft</em></summary>

Average cost per operation over a worst-case sequence — e.g., dynamic array append is O(1) amortized though an occasional resize is O(n).
</details>

<details><summary>Two Sum — brute force vs optimal. <em>· Amazon, Google, Microsoft, every company (LC 1)</em></summary>

Brute O(n²) checking all pairs; optimal O(n) time/space: HashMap from value → index, check `target − x` before inserting x.
</details>

<details><summary>Given constraints n ≤ 10⁵, which complexities are acceptable? <em>· Codeforces-style OAs at Amazon, Uber</em></summary>

O(n log n) or O(n); O(n²) = 10¹⁰ is too slow; O(n√n) borderline.
</details>

<details><summary>Time complexity of building a heap from n elements? <em>· Microsoft, Goldman Sachs</em></summary>

O(n) with bottom-up heapify.
</details>

## End-to-end scenarios

<details><summary>Scenario: In an OA you see "n ≤ 2·10⁵, values ≤ 10⁹, find number of pairs with sum ≤ K". Walk through choosing the approach.</summary>

n² is 4·10¹⁰ → too slow. Need O(n log n): sort, then two pointers (l=0, r=n−1: if a[l]+a[r] ≤ K, all pairs (l, l+1..r) count → add r−l, l++; else r--). Use `long` for the count (up to ~2·10¹⁰). Test with duplicates and all-equal values.
</details>

<details><summary>Scenario: Your solution passes examples but gets TLE on hidden tests. Debug systematically.</summary>

Recompute complexity against constraints; look for hidden O(n) operations inside loops (`list.contains`, `remove(0)`, string concatenation, `substring`); slow I/O (Scanner); recursion without memo; HashMap with boxing overhead in tight loops; switch to the intended pattern.
</details>
