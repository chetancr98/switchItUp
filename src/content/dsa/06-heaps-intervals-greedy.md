---
title: Heaps, Intervals & Greedy Algorithms
level: 3
tags: heap, priority queue, intervals, greedy
---
<!-- deepened -->

## Start here: the basics

### Heap / Priority Queue
A structure that always gives you the **smallest** (min-heap) or **largest** (max-heap) element quickly. Insert and remove are O(log n); peek is O(1). Think "hospital emergency queue — most urgent first".
```java
PriorityQueue<Integer> minHeap = new PriorityQueue<>();
minHeap.addAll(List.of(5, 1, 8, 3));
minHeap.poll();   // 1
PriorityQueue<Integer> maxHeap = new PriorityQueue<>(Comparator.reverseOrder());
```
**"Top K"** questions → heap of size K.

### Intervals
Problems with start/end pairs (meetings, bookings). Almost always: **sort by start time**, then sweep through, merging or counting overlaps.
```java
// Do any meetings overlap?
Arrays.sort(m, (a, b) -> Integer.compare(a[0], b[0]));
for (int i = 1; i < m.length; i++) if (m[i][0] < m[i - 1][1]) return true;
return false;
```

### Greedy
Make the best local choice at each step and never undo it. Works only when you can argue that a local best choice never hurts the final answer (e.g., to fit the most meetings in a room, always pick the one that **ends earliest**).

---

# Heaps

## Patterns
| Pattern | Technique |
|---|---|
| **Top K largest** | Min-heap of size K (pop when > K) → O(n log K). Answer = heap contents |
| K-th largest | Same; or **Quickselect** average O(n) |
| Top K frequent (LC 347) | Count map + size-K heap, or **bucket sort** by frequency → O(n) |
| Merge K sorted | Heap of (value, list, index) |
| **Two heaps** — running median (LC 295) | Max-heap for lower half, min-heap for upper half, balance sizes |
| Scheduling by earliest end / most profit | Sort + heap |
| Dijkstra | Min-heap by distance |
| K closest points (LC 973) | Max-heap size K by distance |

```java
// Running median — LC 295
class MedianFinder {
    private final PriorityQueue<Integer> lo = new PriorityQueue<>(Collections.reverseOrder()); // max-heap
    private final PriorityQueue<Integer> hi = new PriorityQueue<>();                           // min-heap
    public void addNum(int x) {
        lo.offer(x);
        hi.offer(lo.poll());                       // move largest of lower half up
        if (hi.size() > lo.size()) lo.offer(hi.poll());   // keep lo.size() >= hi.size()
    }
    public double findMedian() {
        return lo.size() > hi.size() ? lo.peek() : (lo.peek() + (double) hi.peek()) / 2;
    }
}
```
Sliding window median (LC 480): two heaps with lazy deletion or two TreeMaps/multisets.

```java
// Quickselect — k-th largest in O(n) average (LC 215)
int findKthLargest(int[] a, int k) {
    int target = a.length - k, lo = 0, hi = a.length - 1;
    Random rnd = new Random();
    while (true) {
        int p = partition(a, lo, hi, lo + rnd.nextInt(hi - lo + 1));
        if (p == target) return a[p];
        if (p < target) lo = p + 1; else hi = p - 1;
    }
}
int partition(int[] a, int lo, int hi, int pivotIdx) {
    int pivot = a[pivotIdx]; swap(a, pivotIdx, hi);
    int store = lo;
    for (int i = lo; i < hi; i++) if (a[i] < pivot) swap(a, i, store++);
    swap(a, store, hi);
    return store;
}
```

**Task Scheduler** (LC 621): greedy formula `max(n_tasks, (maxFreq − 1) × (cooldown + 1) + countOfMaxFreq)` or simulate with heap + cooldown queue. **Reorganize String** (LC 767): heap of counts, place two different chars at a time. **IPO** (LC 502): sort projects by capital, push affordable into a max-heap by profit. **Meeting Rooms II** with heap of end times.

# Intervals

Almost always: **sort by start** (sometimes by end), then sweep.

```java
// Merge intervals — LC 56
int[][] merge(int[][] iv) {
    Arrays.sort(iv, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> out = new ArrayList<>();
    for (int[] cur : iv) {
        if (out.isEmpty() || out.get(out.size() - 1)[1] < cur[0]) out.add(cur);
        else out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], cur[1]);
    }
    return out.toArray(new int[0][]);
}

// Minimum meeting rooms — LC 253 (sweep line)
int minMeetingRooms(int[][] iv) {
    int n = iv.length; int[] s = new int[n], e = new int[n];
    for (int i = 0; i < n; i++) { s[i] = iv[i][0]; e[i] = iv[i][1]; }
    Arrays.sort(s); Arrays.sort(e);
    int rooms = 0, best = 0;
    for (int i = 0, j = 0; i < n; i++) {
        if (s[i] < e[j]) rooms++; else j++;      // a meeting ended before this one starts → reuse
        best = Math.max(best, rooms);
    }
    return best;
}
```
- Insert Interval (LC 57): three phases — before, overlapping (merge), after.
- **Non-overlapping Intervals** (LC 435): sort by **end**, greedily keep earliest-ending → classic activity selection; removals = n − kept.
- Minimum Arrows to Burst Balloons (LC 452): same greedy.
- Interval List Intersections (LC 986): two pointers, advance the one that ends first.
- Employee Free Time (LC 759), My Calendar I/II/III (TreeMap / sweep counts).
- **Sweep line with events**: `+1` at start, `−1` at end, sort events (ends before starts at equal times if half-open) → max overlap, skyline (LC 218 with a max-heap / TreeMap of heights).

# Greedy

A greedy algorithm makes the locally optimal choice and never reconsiders. Correct only when you can prove it — usually by an **exchange argument** ("any optimal solution can be transformed to include the greedy choice without getting worse").

Classic greedy problems:
| Problem | Greedy choice |
|---|---|
| Activity selection / non-overlapping intervals | Earliest finishing time |
| Jump Game (LC 55) | Track farthest reachable |
| Jump Game II (LC 45) | BFS-like levels: farthest within current jump range |
| Gas Station (LC 134) | If total ≥ 0 a solution exists; restart after a negative prefix |
| Candy (LC 135) | Two passes (left→right, right→left) |
| Partition Labels (LC 763) | Last occurrence of each char; cut when index == max last |
| Assign Cookies, Boats to Save People (LC 881) | Sort + two pointers |
| Minimum platforms / meeting rooms | Sweep |
| Huffman coding | Merge two smallest (heap) |
| Fractional knapsack | Value/weight ratio (0/1 knapsack is NOT greedy → DP) |
| Queue Reconstruction by Height (LC 406) | Sort tall first, insert at index k |

```java
// Jump Game II — LC 45, O(n)
int jump(int[] a) {
    int jumps = 0, curEnd = 0, farthest = 0;
    for (int i = 0; i < a.length - 1; i++) {
        farthest = Math.max(farthest, i + a[i]);
        if (i == curEnd) { jumps++; curEnd = farthest; }
    }
    return jumps;
}
```

**When greedy fails**: coin change with arbitrary denominations ({1, 3, 4}, amount 6: greedy 4+1+1 = 3 coins, optimal 3+3 = 2) → DP. If you can't argue exchange, try a small counter-example before committing.

## Must-solve list
Kth Largest (215), Top K Frequent (347), K Closest Points (973), Find Median from Data Stream (295), Merge K Lists (23), Task Scheduler (621), Merge Intervals (56), Insert Interval (57), Non-overlapping Intervals (435), Meeting Rooms II (253), Jump Game I/II (55/45), Gas Station (134), Partition Labels (763), The Skyline Problem (218), IPO (502).

## Quick check questions

<details><summary>1. Heap of size K vs Quickselect vs sorting for top-K — trade-offs?</summary>

Sorting: O(n log n), simple. Heap: O(n log K), streaming-friendly, O(K) memory — best when n is huge/unbounded. Quickselect: O(n) average, O(n²) worst (randomise pivot), mutates the array, not streaming. Bucket sort for frequencies: O(n).
</details>

<details><summary>2. Why sort by end time for activity selection instead of start time?</summary>

Choosing the interval that finishes earliest leaves the maximum remaining time for others; an exchange argument shows any optimal schedule can swap its first interval for the earliest-finishing one without reducing the count. Sorting by start can pick a long interval that blocks many short ones.
</details>

## Questions asked at top companies

<details><summary>Kth largest element in an array (LC 215). <em>· Meta, Amazon, Microsoft, LinkedIn</em></summary>

Min-heap of size k O(n log k), or Quickselect average O(n).
</details>

<details><summary>Find median from data stream (LC 295). <em>· Google, Amazon, Microsoft, Uber</em></summary>

Max-heap for lower half, min-heap for upper half, rebalance; median from tops. O(log n) add, O(1) median.
</details>

<details><summary>Merge intervals / insert interval (LC 56/57). <em>· Google, Meta, Amazon, LinkedIn</em></summary>

Sort by start; merge overlapping by extending end. Insert: add before, merge overlapping, add after.
</details>

<details><summary>Meeting Rooms II — minimum rooms (LC 253). <em>· Google, Amazon, Meta, Uber</em></summary>

Min-heap of end times or sorted start/end arrays sweep; answer = max simultaneous meetings.
</details>

<details><summary>Non-overlapping intervals (LC 435). <em>· Amazon, Google</em></summary>

Sort by end; greedily keep earliest-ending non-overlapping; removals = n − kept.
</details>

<details><summary>Task Scheduler (LC 621). <em>· Meta, Amazon, Microsoft</em></summary>

max(n, (maxFreq − 1)(cooldown + 1) + countMaxFreq), or heap + cooldown queue simulation.
</details>

<details><summary>K closest points to origin (LC 973). <em>· Meta, Amazon, Uber</em></summary>

Max-heap of size k by distance squared; or quickselect.
</details>

<details><summary>Jump Game I/II (LC 55/45). <em>· Amazon, Google, Microsoft</em></summary>

I: track farthest reachable. II: greedy levels — jump when reaching current range end.
</details>

<details><summary>Gas Station (LC 134). <em>· Amazon, Google, Bloomberg</em></summary>

If total gas ≥ total cost a solution exists; start after any index where running tank goes negative.
</details>

<details><summary>Minimum platforms needed at a railway station. <em>· Amazon, Flipkart, Paytm (GFG classic)</em></summary>

Sort arrivals and departures separately; sweep counting trains present; max is answer. O(n log n).
</details>

<details><summary>Merge k sorted arrays / smallest range covering k lists (LC 632). <em>· Google, Amazon</em></summary>

Min-heap holding one element per list, track current max; shrink range by advancing the min list.
</details>

<details><summary>Reorganize string so no two adjacent are same (LC 767). <em>· Google, Amazon, Meta</em></summary>

Max-heap by count; place top two different chars alternately; impossible if maxCount > (n+1)/2.
</details>

## End-to-end scenarios

<details><summary>Scenario: A calendar service must answer "can this meeting be booked?" and "how many rooms are needed at peak?" as bookings stream in.</summary>

Store bookings per room in a TreeMap start → end; new booking fits if floorEntry's end ≤ start and ceilingEntry's start ≥ end (O(log n)). Peak rooms: sweep-line difference map (TreeMap time → +1/−1) and prefix maximum, or segment tree with range add/max for dynamic updates.
</details>

<details><summary>Scenario: Find the top 10 most frequent search queries from a 50 GB log on a machine with 4 GB RAM.</summary>

Hash-partition queries into N files by hash(query) % N so each fits in memory; count each partition with a HashMap and keep top-10 with a min-heap of size 10; merge partition top-10s. Mention approximate streaming alternatives (Count-Min Sketch + heap) and MapReduce/Spark for distributed scale.
</details>
