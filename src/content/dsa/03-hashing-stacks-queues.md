---
title: Hashing, Stacks, Queues & Monotonic Stack/Deque
level: 2
tags: stack, monotonic stack, deque, hashing
---
<!-- deepened -->

## Start here: the basics

### Hash map — instant lookup
"Have I seen this before?" and "how many times?" are answered in O(1) average with `HashSet`/`HashMap`.
```java
Map<Character, Integer> count = new HashMap<>();
for (char c : "banana".toCharArray()) count.merge(c, 1, Integer::sum);   // {b=1, a=3, n=2}
```

### Stack — last in, first out (LIFO)
Like a stack of plates: push on top, pop from top. Used for undo, matching brackets, "previous greater element", DFS.
```java
Deque<Integer> stack = new ArrayDeque<>();
stack.push(1); stack.push(2);
stack.pop();   // 2
stack.peek();  // 1
```

### Queue — first in, first out (FIFO)
Like a line at a ticket counter. Used for BFS, scheduling, buffering.
```java
Deque<Integer> q = new ArrayDeque<>();
q.offer(1); q.offer(2);
q.poll();      // 1
```

### Monotonic stack — the trick in one sentence
Keep the stack always increasing (or decreasing); when a new element breaks the order, it's the **answer** ("next greater") for every element you pop.

---

## Hashing patterns

| Pattern | Example |
|---|---|
| Complement lookup | Two Sum: `map.get(target - x)` |
| Frequency counting | Top K frequent, valid anagram, `int[26]` beats HashMap for lowercase letters |
| Canonical key grouping | Group anagrams (sorted string / count signature), group shifted strings |
| Seen-set for O(1) membership | Longest consecutive sequence, happy number cycle detection |
| Index map | First unique character, isomorphic strings (two maps) |
| Prefix-state map | Subarray sum = K, longest subarray with equal 0s/1s |
| Rolling hash | Repeated DNA sequences (LC 187), Rabin-Karp |

**Design questions** (very common): LRU cache (LC 146), LFU cache (LC 460), Insert Delete GetRandom O(1) (LC 380: ArrayList + index map, swap-with-last on delete), Time-Based Key-Value Store (LC 981: map of TreeMap / binary search), design HashMap (LC 706: array of buckets with chaining).

```java
// LC 380 — O(1) insert/delete/getRandom
class RandomizedSet {
    private final List<Integer> vals = new ArrayList<>();
    private final Map<Integer, Integer> idx = new HashMap<>();
    private final Random rnd = new Random();
    public boolean insert(int v) { if (idx.containsKey(v)) return false; idx.put(v, vals.size()); vals.add(v); return true; }
    public boolean remove(int v) {
        Integer i = idx.remove(v); if (i == null) return false;
        int last = vals.remove(vals.size() - 1);
        if (i < vals.size()) { vals.set(i, last); idx.put(last, i); }   // move last into the hole
        return true;
    }
    public int getRandom() { return vals.get(rnd.nextInt(vals.size())); }
}
```

## Stack patterns

### Matching / nesting
```java
boolean isValid(String s) {                       // LC 20
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        if (c == '(') st.push(')'); else if (c == '[') st.push(']'); else if (c == '{') st.push('}');
        else if (st.isEmpty() || st.pop() != c) return false;
    }
    return st.isEmpty();
}
```
Related: Min Stack (LC 155: store pairs (val, minSoFar)), Evaluate RPN (LC 150), **Decode String** (LC 394: stacks of counts and builders), Simplify Path (LC 71), Basic Calculator I/II (LC 224/227), Asteroid Collision (LC 735), Remove K Digits (LC 402 — monotonic).

### Queue via two stacks (LC 232)
Push into `in`; on pop/peek, if `out` empty, move everything from `in` to `out`. Amortised O(1).

## Monotonic stack — "next greater / smaller element"

Maintain a stack whose values are monotonic. When a new element breaks monotonicity, it is the **answer** for the popped elements.

```java
// Next greater element to the right for each index (−1 if none). O(n): each index pushed & popped once.
int[] nextGreater(int[] a) {
    int n = a.length; int[] res = new int[n]; Arrays.fill(res, -1);
    Deque<Integer> st = new ArrayDeque<>();          // indices, values decreasing
    for (int i = 0; i < n; i++) {
        while (!st.isEmpty() && a[st.peek()] < a[i]) res[st.pop()] = a[i];
        st.push(i);
    }
    return res;
}
```
Variants by choosing direction (scan L→R or R→L), comparison (`<` / `<=` for duplicates), and greater/smaller:
- **Daily Temperatures** (LC 739): distance to next greater.
- **Next Greater Element II** (LC 503): circular → iterate 2n with `i % n`.
- **Online Stock Span** (LC 901): previous greater, store (price, span).
- **Largest Rectangle in Histogram** (LC 84) — the classic:

```java
int largestRectangleArea(int[] h) {
    Deque<Integer> st = new ArrayDeque<>();          // indices with increasing heights
    int best = 0, n = h.length;
    for (int i = 0; i <= n; i++) {
        int cur = (i == n) ? 0 : h[i];               // sentinel 0 flushes the stack
        while (!st.isEmpty() && h[st.peek()] > cur) {
            int height = h[st.pop()];
            int left = st.isEmpty() ? -1 : st.peek(); // previous smaller
            best = Math.max(best, height * (i - left - 1)); // i is next smaller
        }
        st.push(i);
    }
    return best;
}
```
- **Maximal Rectangle** (LC 85): histogram per row.
- **Sum of Subarray Minimums** (LC 907): each element contributes `a[i] × left × right` where left/right are distances to previous smaller / next smaller-or-equal (careful with duplicates). Mod 1e9+7.
- **Trapping Rain Water** with stack variant.
- **Remove Duplicate Letters / Smallest Subsequence** (LC 316): monotonic stack + last occurrence + in-stack set.

## Monotonic deque — sliding window max/min

```java
int[] maxSlidingWindow(int[] a, int k) {          // LC 239, O(n)
    int[] res = new int[a.length - k + 1];
    Deque<Integer> dq = new ArrayDeque<>();        // indices, values decreasing front→back
    for (int i = 0; i < a.length; i++) {
        if (!dq.isEmpty() && dq.peekFirst() <= i - k) dq.pollFirst();     // out of window
        while (!dq.isEmpty() && a[dq.peekLast()] <= a[i]) dq.pollLast(); // useless forever
        dq.offerLast(i);
        if (i >= k - 1) res[i - k + 1] = a[dq.peekFirst()];
    }
    return res;
}
```
Also: **Shortest Subarray with Sum at Least K** (LC 862, negatives allowed → prefix sums + increasing deque), **Constrained Subsequence Sum** (LC 1425, DP + deque), Longest subarray with |max−min| ≤ limit (LC 1438, two deques).

## Queues & BFS preview
`ArrayDeque` as a queue: `offer`/`poll`. BFS processes level by level (`int size = q.size(); for (...)`). Detailed in the Graphs module.

## Must-solve list
| Problem | Key idea |
|---|---|
| Valid Parentheses (20) | Stack |
| Min Stack (155) | Pair stack |
| Daily Temperatures (739) | Monotonic stack |
| Largest Rectangle in Histogram (84) | Monotonic stack + sentinel |
| Sliding Window Maximum (239) | Monotonic deque |
| Decode String (394) | Two stacks |
| Basic Calculator II (227) | Stack with last operator |
| LRU Cache (146) | HashMap + DLL |
| Insert Delete GetRandom (380) | List + map swap trick |
| Sum of Subarray Minimums (907) | Contribution technique |
| Car Fleet (853) | Sort + stack of arrival times |

## Quick check questions

<details><summary>1. Why is the monotonic stack O(n) despite the nested while loop?</summary>

Each index is pushed once and popped at most once, so total pops across all iterations ≤ n. Amortised O(1) per element.
</details>

<details><summary>2. How do you handle duplicates in "sum of subarray minimums"?</summary>

Break ties asymmetrically: use strictly-less for the previous smaller and less-or-equal for the next smaller (or vice versa), so each subarray's minimum is attributed to exactly one index.
</details>

## Questions asked at top companies

<details><summary>Valid Parentheses (LC 20). <em>· Amazon, Microsoft, Meta, Infosys</em></summary>

Stack of expected closers; mismatch or leftover → invalid. O(n).
</details>

<details><summary>Group Anagrams (LC 49). <em>· Amazon, Meta, Uber</em></summary>

Key = sorted chars or 26-count signature; HashMap key → list. O(n·k log k) or O(n·k).
</details>

<details><summary>Top K Frequent Elements (LC 347). <em>· Amazon, Meta, Google</em></summary>

Count map + min-heap of size k (O(n log k)) or bucket sort by frequency (O(n)).
</details>

<details><summary>Min Stack (LC 155). <em>· Amazon, Microsoft, Bloomberg</em></summary>

Stack of (value, minSoFar) pairs or two stacks. All O(1).
</details>

<details><summary>Daily Temperatures / Next Greater Element (LC 739, 496, 503). <em>· Amazon, Google, Flipkart</em></summary>

Monotonic decreasing stack of indices; pop when current is warmer. O(n).
</details>

<details><summary>Largest Rectangle in Histogram (LC 84). <em>· Google, Amazon, Microsoft</em></summary>

Monotonic increasing stack; on pop compute width between previous smaller and current index; sentinel 0 at end. O(n).
</details>

<details><summary>Sliding Window Maximum (LC 239). <em>· Amazon, Google, Microsoft</em></summary>

Monotonic deque of indices with decreasing values; drop out-of-window from front. O(n).
</details>

<details><summary>Implement Queue using Stacks / Stack using Queues (LC 232/225). <em>· Microsoft, Amazon, TCS</em></summary>

Two stacks with lazy transfer (amortized O(1)); stack via one queue rotating after push.
</details>

<details><summary>LRU Cache (LC 146). <em>· Amazon, Microsoft, Google, Swiggy, PhonePe</em></summary>

HashMap + doubly linked list with sentinels; move to front on access; evict tail. O(1).
</details>

<details><summary>Decode String (LC 394). <em>· Google, Amazon, Bloomberg</em></summary>

Two stacks (counts, previous builders); on ']' pop and repeat. O(output length).
</details>

<details><summary>Evaluate Reverse Polish Notation / Basic Calculator II (LC 150/227). <em>· Amazon, Meta, LinkedIn</em></summary>

RPN: stack of operands. Calculator II: process numbers with last operator; push for +/−, combine immediately for */÷; sum stack.
</details>

<details><summary>First Unique Character in a String (LC 387). <em>· Amazon, Goldman Sachs, Bloomberg</em></summary>

Count array then second pass for first count == 1. O(n).
</details>

## End-to-end scenarios

<details><summary>Scenario: Design a "browser history" with visit, back(steps), forward(steps) in O(1) per step (LC 1472).</summary>

Two stacks (back and forward) or an ArrayList with current index and logical end; visiting truncates forward history. Discuss memory limits and persistence.
</details>

<details><summary>Scenario: Given server logs (timestamp, userId), find users who made more than 100 requests in any 60-second window.</summary>

Per user maintain a queue (deque) of timestamps; on each log, push and pop timestamps older than t−60; if size > 100 flag user. O(total logs). For streaming at scale, sliding window counters in Redis per user.
</details>
