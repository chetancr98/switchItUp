---
title: Linked Lists & Binary Search (including Binary Search on the Answer)
level: 2
tags: linked list, binary search, fast slow pointers
---
<!-- deepened -->

## Start here: the basics

### Linked list
A chain of nodes; each node stores a value and a pointer to the next node.
```java
class ListNode { int val; ListNode next; ListNode(int v) { val = v; } }
// 1 → 2 → 3 → null
```
- Access by index is O(n) (walk from the head).
- Insert/delete at a known node is O(1) (just change pointers).

Practise drawing boxes and arrows on paper — most linked-list bugs are pointer mix-ups.

```java
// Print all values
for (ListNode cur = head; cur != null; cur = cur.next) System.out.println(cur.val);
```

### Binary search
In a **sorted** array, compare with the middle; discard half each time → O(log n).
```java
int binarySearch(int[] a, int target) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;
        if (a[mid] == target) return mid;
        if (a[mid] < target) lo = mid + 1; else hi = mid - 1;
    }
    return -1;
}
```
1 billion sorted elements → at most ~30 comparisons.

---

# Part A — Linked lists

## Techniques
- **Dummy (sentinel) head** removes edge cases when the head may change.
- **Fast & slow pointers**: middle, cycle detection, k-th from end (gap of k).
- **In-place reversal** (iterative, 3 pointers).
- Draw boxes and arrows. Always check: empty list, single node, two nodes.

```java
ListNode reverse(ListNode head) {                 // LC 206
    ListNode prev = null, cur = head;
    while (cur != null) { ListNode next = cur.next; cur.next = prev; prev = cur; cur = next; }
    return prev;
}

ListNode middle(ListNode head) {                  // LC 876: second middle for even length
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
    return slow;
}
```

### Floyd's cycle detection (LC 141/142)
```java
ListNode detectCycle(ListNode head) {
    ListNode s = head, f = head;
    while (f != null && f.next != null) {
        s = s.next; f = f.next.next;
        if (s == f) {                              // meet inside the cycle
            ListNode p = head;
            while (p != s) { p = p.next; s = s.next; }
            return p;                              // cycle start
        }
    }
    return null;
}
```
Why the second phase works: if the distance head→start is `a`, start→meeting is `b`, cycle length `c`, then slow travelled `a+b`, fast `2(a+b)`, and `a+b` is a multiple of `c` → `a ≡ c − b (mod c)`: walking `a` from head and from the meeting point both land on the start. Same trick: **Find the Duplicate Number** (LC 287) treating `i → nums[i]` as a linked list.

### Merge two sorted lists / Merge K (LC 21 / 23)
K lists: min-heap of heads → O(N log k), or divide-and-conquer pairwise merges.

### Reverse in groups of k (LC 25) — a common hard
```java
ListNode reverseKGroup(ListNode head, int k) {
    ListNode dummy = new ListNode(0, head), groupPrev = dummy;
    while (true) {
        ListNode kth = groupPrev;
        for (int i = 0; i < k && kth != null; i++) kth = kth.next;
        if (kth == null) break;
        ListNode groupNext = kth.next, prev = groupNext, cur = groupPrev.next;
        while (cur != groupNext) { ListNode nx = cur.next; cur.next = prev; prev = cur; cur = nx; }
        ListNode first = groupPrev.next;           // becomes the tail of the reversed group
        groupPrev.next = kth;
        groupPrev = first;
    }
    return dummy.next;
}
```
Others: Reorder List (LC 143: middle + reverse second half + merge), Palindrome List (LC 234), Remove Nth From End (LC 19), Add Two Numbers (LC 2), Copy List with Random Pointer (LC 138: interleave copies or hashmap), Intersection of Two Lists (LC 160: switch heads trick), Sort List (LC 148: merge sort O(n log n), O(log n) stack).

## LRU Cache from scratch (LC 146) — must be fluent
```java
class LRUCache {
    private static final class Node { int key, val; Node prev, next; Node(int k, int v) { key = k; val = v; } }
    private final int cap;
    private final Map<Integer, Node> map = new HashMap<>();
    private final Node head = new Node(0, 0), tail = new Node(0, 0);   // sentinels: head.next = MRU

    public LRUCache(int capacity) { cap = capacity; head.next = tail; tail.prev = head; }

    public int get(int key) {
        Node n = map.get(key);
        if (n == null) return -1;
        unlink(n); addFront(n);
        return n.val;
    }
    public void put(int key, int value) {
        Node n = map.get(key);
        if (n != null) { n.val = value; unlink(n); addFront(n); return; }
        if (map.size() == cap) { Node lru = tail.prev; unlink(lru); map.remove(lru.key); }
        n = new Node(key, value); map.put(key, n); addFront(n);
    }
    private void unlink(Node n) { n.prev.next = n.next; n.next.prev = n.prev; }
    private void addFront(Node n) { n.next = head.next; n.prev = head; head.next.prev = n; head.next = n; }
}
```
Follow-ups: thread safety (lock / segmented), TTL, LFU (LC 460: freq → DLL map + minFreq pointer).

---

# Part B — Binary search

## The one template to rule them all
Find the **first index where a monotonic predicate becomes true** (`F F F T T T`).

```java
// Returns smallest x in [lo, hi] with ok(x) true; hi+1 if none.
int firstTrue(int lo, int hi) {
    int ans = hi + 1;
    while (lo <= hi) {
        int mid = lo + (hi - lo) / 2;      // no overflow
        if (ok(mid)) { ans = mid; hi = mid - 1; }
        else lo = mid + 1;
    }
    return ans;
}
```
- Lower bound (first ≥ target): `ok(i) = a[i] >= target`.
- Upper bound (first > target): `ok(i) = a[i] > target`. Count of target = upper − lower.
- Last ≤ target = upper bound − 1.
Thinking in predicates eliminates off-by-one agony.

## Rotated sorted array (LC 33)
One half is always sorted. Check which, and whether the target lies in it.
```java
int search(int[] a, int t) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
        int mid = (lo + hi) >>> 1;
        if (a[mid] == t) return mid;
        if (a[lo] <= a[mid]) {                     // left half sorted
            if (a[lo] <= t && t < a[mid]) hi = mid - 1; else lo = mid + 1;
        } else {                                   // right half sorted
            if (a[mid] < t && t <= a[hi]) lo = mid + 1; else hi = mid - 1;
        }
    }
    return -1;
}
```
Min in rotated array (LC 153): compare `a[mid]` with `a[hi]`. With duplicates (LC 81/154): when equal, `hi--` (worst case O(n)).

## Binary search on the answer — the FAANG favourite

When asked to **minimise the maximum** / **maximise the minimum** / find the smallest capacity/speed/time such that something is feasible, and feasibility is **monotonic** in the answer: binary search the answer space, check feasibility greedily in O(n).

```java
// LC 875 Koko Eating Bananas: min speed k to finish within h hours
int minEatingSpeed(int[] piles, int h) {
    int lo = 1, hi = Arrays.stream(piles).max().getAsInt();
    while (lo < hi) {
        int k = lo + (hi - lo) / 2;
        long hours = 0;
        for (int p : piles) hours += (p + k - 1) / k;     // ceil division
        if (hours <= h) hi = k; else lo = k + 1;         // feasible → try smaller
    }
    return lo;
}
```
Same shape: LC 1011 Ship Packages Within D Days (answer range [max, sum]), **LC 410 Split Array Largest Sum**, LC 1482 Min Days for Bouquets, LC 774/2064 minimise max distance, Aggressive Cows / Magnetic Force (LC 1552, maximise min distance), LC 1283 smallest divisor, LC 2226 maximum candies, Median of two sorted arrays (LC 4: binary search the partition), K-th smallest in sorted matrix (LC 378: binary search on value + count ≤ mid).

Real-number binary search: iterate fixed 100 times or until `hi − lo < 1e-7`.

## Must-solve list
| Problem | Idea |
|---|---|
| Reverse Linked List (206) | 3 pointers |
| Linked List Cycle II (142) | Floyd |
| Merge K Sorted Lists (23) | Heap |
| Reorder List (143) | Middle + reverse + merge |
| Reverse Nodes in k-Group (25) | Careful pointer surgery |
| LRU Cache (146) | Map + DLL |
| Binary Search (704), Search Insert (35) | Template |
| Find First and Last Position (34) | Lower/upper bound |
| Search Rotated Sorted Array (33) | Sorted half |
| Find Peak Element (162) | Compare with neighbour |
| Koko (875), Ship Within D Days (1011) | BS on answer |
| Split Array Largest Sum (410) | BS on answer |
| Median of Two Sorted Arrays (4) | Partition BS |

## Quick check questions

<details><summary>1. How do you recognise "binary search on the answer"?</summary>

The question asks for a min/max value (capacity, speed, time, distance), you can write a function `feasible(x)` that's easy to check in O(n) or O(n log n), and feasibility is monotonic (if x works, every larger x works, or vice versa).
</details>

<details><summary>2. Why `lo + (hi - lo) / 2`?</summary>

`(lo + hi) / 2` overflows when lo + hi > Integer.MAX_VALUE (the famous JDK binarySearch bug fixed in 2006). Alternatively `(lo + hi) >>> 1` for non-negative ints.
</details>

## Questions asked at top companies

<details><summary>Reverse a linked list (iterative & recursive) (LC 206). <em>· Amazon, Microsoft, Infosys, TCS</em></summary>

Iterative with prev/cur/next pointers O(n)/O(1); recursive: reverse rest, then `head.next.next = head; head.next = null` (O(n) stack).
</details>

<details><summary>Detect a cycle and find its start (LC 141/142). <em>· Amazon, Microsoft, Goldman Sachs</em></summary>

Floyd's slow/fast pointers; after meeting, move one pointer to head and advance both by one — they meet at the start.
</details>

<details><summary>Merge two sorted lists / merge k sorted lists (LC 21/23). <em>· Amazon, Google, Meta, LinkedIn</em></summary>

Two: dummy head and compare. K: min-heap of heads O(N log k) or pairwise divide and conquer.
</details>

<details><summary>Find the middle node / remove Nth node from end (LC 876/19). <em>· Microsoft, Adobe, Paytm</em></summary>

Slow/fast pointers for middle; for Nth from end advance fast n steps then move both; use a dummy head.
</details>

<details><summary>Intersection of two linked lists (LC 160). <em>· Amazon, Microsoft</em></summary>

Two pointers switch to the other list's head at end; they meet at the intersection (or null) after ≤ m+n steps.
</details>

<details><summary>Palindrome linked list (LC 234). <em>· Amazon, Meta</em></summary>

Find middle, reverse second half, compare, optionally restore. O(n), O(1).
</details>

<details><summary>Add two numbers as linked lists (LC 2). <em>· Amazon, Microsoft, Adobe</em></summary>

Walk both with carry, dummy head, handle final carry. O(max(m,n)).
</details>

<details><summary>Search in rotated sorted array (LC 33). <em>· Microsoft, Amazon, LinkedIn</em></summary>

Binary search; determine sorted half; check target range. O(log n).
</details>

<details><summary>Find first and last position of an element (LC 34). <em>· Meta, Amazon</em></summary>

Two binary searches: lower bound and upper bound − 1.
</details>

<details><summary>Koko eating bananas / ship packages within D days (LC 875/1011). <em>· Google, Amazon, Uber</em></summary>

Binary search on the answer (speed/capacity) with a greedy feasibility check. O(n log range).
</details>

<details><summary>Median of two sorted arrays (LC 4). <em>· Google, Amazon, Goldman Sachs</em></summary>

Binary search the partition of the smaller array so left halves contain (m+n+1)/2 elements and maxLeft ≤ minRight. O(log min(m,n)).
</details>

<details><summary>Find peak element (LC 162). <em>· Google, Meta</em></summary>

Binary search: if a[mid] < a[mid+1] a peak exists to the right, else left. O(log n).
</details>

## End-to-end scenarios

<details><summary>Scenario: Implement a music playlist supporting next, previous, add after current, remove current, all O(1).</summary>

Doubly linked list with sentinel nodes plus a HashMap songId → node for O(1) removal by id; current pointer; handle removal of current (move to next or prev) and empty playlist edge cases.
</details>

<details><summary>Scenario: Given a sorted log file of 10⁹ timestamps on disk, count events between t1 and t2 quickly.</summary>

Binary search on file offsets (fixed-width records or via an index of block start timestamps) for lower bound of t1 and upper bound of t2; count = difference in record positions. O(log n) disk reads; build a sparse index for faster repeated queries.
</details>
