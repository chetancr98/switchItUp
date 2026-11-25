---
title: Sorting & Searching — Every Algorithm, Implemented and Compared
level: 1
tags: sorting, searching, quicksort, mergesort, heapsort, binary search, counting sort
minutes: 90
---
<!-- deepened -->

## Start here: the basics

### Why sorting is asked so often
Sorting is the "hello world" of algorithms: it tests loops, recursion, divide-and-conquer, complexity analysis and edge cases in one small problem. And **sorted data unlocks faster algorithms** — binary search, two pointers, merging intervals, deduplication, greedy scheduling. In interviews you'll be asked to (1) implement a sort (usually merge or quick), (2) compare sorts by time, space and stability, and (3) recognise when sorting first makes a problem easy.

**Watch them run**: the [Algorithm Visualizer](#/visualizer) animates all 10 sorts below and lets you race them on random, nearly-sorted, reversed and duplicate-heavy data.

### Vocabulary
| Term | Meaning |
|---|---|
| **In-place** | Uses O(1) (or O(log n) stack) extra memory |
| **Stable** | Equal elements keep their original relative order — matters when sorting records by one key after another |
| **Comparison sort** | Decides order only by comparing pairs; can't beat **Ω(n log n)** in the worst case |
| **Non-comparison sort** | Uses the values' structure (digits, ranges) — counting/radix/bucket sorts can be O(n) |
| **Adaptive** | Faster on partially sorted input (insertion sort, TimSort) |

### The cheat sheet (memorise this table)
| Algorithm | Best | Average | Worst | Space | Stable | In-place | Notes |
|---|---|---|---|---|---|---|---|
| Bubble | n | n² | n² | 1 | ✅ | ✅ | Teaching only; early-exit flag gives O(n) best |
| Selection | n² | n² | n² | 1 | ❌ | ✅ | Minimum number of swaps (≤ n) |
| Insertion | n | n² | n² | 1 | ✅ | ✅ | Best for small / nearly-sorted arrays |
| Shell | n log n | ~n^1.25 | n² (gap-dependent) | 1 | ❌ | ✅ | Gapped insertion sort |
| **Merge** | n log n | n log n | n log n | n | ✅ | ❌ | Guaranteed; linked lists; external sorting |
| **Quick** | n log n | n log n | n² | log n | ❌ | ✅ | Fastest in practice; random pivot |
| **Heap** | n log n | n log n | n log n | 1 | ❌ | ✅ | Guaranteed + O(1) space; poor cache locality |
| Counting | n + k | n + k | n + k | n + k | ✅ | ❌ | Small integer range k |
| Radix (LSD) | d(n + b) | d(n + b) | d(n + b) | n + b | ✅ | ❌ | Fixed-width ints/strings |
| Bucket | n + k | n + k | n² | n + k | ✅* | ❌ | Uniformly distributed floats |
| TimSort | n | n log n | n log n | n | ✅ | ❌ | Python `sorted`, Java object sort |
| Introsort | n log n | n log n | n log n | log n | ❌ | ✅ | C++ `std::sort` (quick → heap fallback) |

### What Java actually uses
- `Arrays.sort(int[])` and other primitives: **dual-pivot quicksort** (not stable — irrelevant for primitives).
- `Arrays.sort(Object[])`, `Collections.sort`, `List.sort`: **TimSort** (stable, adaptive merge sort with insertion-sorted runs).
- `Arrays.parallelSort`: parallel merge on the ForkJoin pool for large arrays.
<!-- -->

---

## The simple O(n²) sorts

```java
static void swap(int[] a, int i, int j) { int t = a[i]; a[i] = a[j]; a[j] = t; }

// Bubble sort — adjacent swaps; stop when a pass makes no swaps.
static void bubbleSort(int[] a) {
    for (int end = a.length - 1; end > 0; end--) {
        boolean swapped = false;
        for (int i = 0; i < end; i++)
            if (a[i] > a[i + 1]) { swap(a, i, i + 1); swapped = true; }
        if (!swapped) return;
    }
}

// Selection sort — pick the minimum of the unsorted part each time.
static void selectionSort(int[] a) {
    for (int i = 0; i < a.length - 1; i++) {
        int min = i;
        for (int j = i + 1; j < a.length; j++) if (a[j] < a[min]) min = j;
        swap(a, i, min);
    }
}

// Insertion sort — insert each element into the sorted prefix by shifting.
static void insertionSort(int[] a) {
    for (int i = 1; i < a.length; i++) {
        int key = a[i], j = i - 1;
        while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
        a[j + 1] = key;
    }
}

// Shell sort — insertion sort with shrinking gaps.
static void shellSort(int[] a) {
    for (int gap = a.length / 2; gap > 0; gap /= 2)
        for (int i = gap; i < a.length; i++) {
            int x = a[i], j = i;
            while (j >= gap && a[j - gap] > x) { a[j] = a[j - gap]; j -= gap; }
            a[j] = x;
        }
}
```
Why insertion sort matters: it's O(n + inversions). On nearly sorted data it's essentially linear, so hybrid sorts (TimSort, introsort) switch to it for small subarrays (≈16–64 elements).

## Merge sort (divide and conquer)

```java
static void mergeSort(int[] a) {
    int[] buf = new int[a.length];               // allocate once, reuse
    mergeSort(a, buf, 0, a.length);
}
private static void mergeSort(int[] a, int[] buf, int lo, int hi) {   // sorts a[lo, hi)
    if (hi - lo < 2) return;
    int mid = (lo + hi) >>> 1;
    mergeSort(a, buf, lo, mid);
    mergeSort(a, buf, mid, hi);
    if (a[mid - 1] <= a[mid]) return;           // already in order: skip merge (adaptive trick)
    int i = lo, j = mid, k = lo;
    while (i < mid && j < hi) buf[k++] = a[i] <= a[j] ? a[i++] : a[j++];   // <= keeps it STABLE
    while (i < mid) buf[k++] = a[i++];
    while (j < hi) buf[k++] = a[j++];
    System.arraycopy(buf, lo, a, lo, hi - lo);
}
```
Recurrence T(n) = 2T(n/2) + O(n) → O(n log n) always. Uses:
- **Linked lists** — merge sort needs no random access and O(1) extra space for lists (LC 148 Sort List).
- **External sorting** — data bigger than RAM: sort chunks that fit, write runs to disk, k-way merge with a heap.
- **Counting inversions** (LC 493 Reverse Pairs, "count of smaller numbers after self"): count during the merge step.

## Quick sort (partitioning)

```java
static void quickSort(int[] a) { shuffle(a); quickSort(a, 0, a.length - 1); }

private static void quickSort(int[] a, int lo, int hi) {
    while (lo < hi) {
        int p = partition(a, lo, hi);
        // recurse into the smaller side, loop on the larger → O(log n) stack even in bad cases
        if (p - lo < hi - p) { quickSort(a, lo, p - 1); lo = p + 1; }
        else { quickSort(a, p + 1, hi); hi = p - 1; }
    }
}

// Lomuto partition: pivot = last element; everything < pivot moves left.
private static int partition(int[] a, int lo, int hi) {
    int pivot = a[hi], i = lo;
    for (int j = lo; j < hi; j++) if (a[j] < pivot) swap(a, i++, j);
    swap(a, i, hi);
    return i;                                   // pivot's final index
}

static void shuffle(int[] a) {                  // Fisher–Yates: defeats adversarial/sorted inputs
    java.util.Random r = new java.util.Random();
    for (int i = a.length - 1; i > 0; i--) swap(a, i, r.nextInt(i + 1));
}
```
- **Worst case O(n²)** when partitions are maximally unbalanced (sorted input with first/last pivot). Fix with random pivot or median-of-three.
- **Hoare partition** does fewer swaps than Lomuto.
- **Many duplicates?** Use **3-way partitioning** (Dutch national flag): `< pivot | == pivot | > pivot` — becomes linear for all-equal arrays.

```java
// 3-way quicksort (Dijkstra) — great with duplicates; same idea solves LC 75 Sort Colors
private static void quick3(int[] a, int lo, int hi) {
    if (lo >= hi) return;
    int lt = lo, gt = hi, i = lo + 1, v = a[lo];
    while (i <= gt) {
        if (a[i] < v) swap(a, lt++, i++);
        else if (a[i] > v) swap(a, i, gt--);
        else i++;
    }
    quick3(a, lo, lt - 1); quick3(a, gt + 1, hi);
}
```

### Quickselect — k-th smallest in O(n) average
Partition, then recurse into only the side containing index k (LC 215). Average O(n), worst O(n²) (median-of-medians gives guaranteed O(n), rarely implemented).

## Heap sort

```java
static void heapSort(int[] a) {
    int n = a.length;
    for (int i = n / 2 - 1; i >= 0; i--) siftDown(a, i, n);      // build max-heap in O(n)
    for (int end = n - 1; end > 0; end--) {
        swap(a, 0, end);                                         // max to its final position
        siftDown(a, 0, end);
    }
}
private static void siftDown(int[] a, int i, int size) {
    while (true) {
        int l = 2 * i + 1, r = l + 1, big = i;
        if (l < size && a[l] > a[big]) big = l;
        if (r < size && a[r] > a[big]) big = r;
        if (big == i) return;
        swap(a, i, big); i = big;
    }
}
```
Why building a heap is O(n), not O(n log n): most nodes are near the bottom and sift down only a little; the sum of heights is O(n).

## Linear-time (non-comparison) sorts

```java
// Counting sort for values in [0, k] — stable version (needed inside radix sort)
static int[] countingSort(int[] a, int k) {
    int[] count = new int[k + 1];
    for (int x : a) count[x]++;
    for (int v = 1; v <= k; v++) count[v] += count[v - 1];      // prefix sums → final positions
    int[] out = new int[a.length];
    for (int i = a.length - 1; i >= 0; i--) out[--count[a[i]]] = a[i];   // right-to-left keeps stability
    return out;
}

// LSD radix sort for non-negative ints (base 10 for clarity; base 256 is faster)
static void radixSort(int[] a) {
    int max = java.util.Arrays.stream(a).max().orElse(0);
    int[] out = new int[a.length];
    for (int exp = 1; max / exp > 0; exp *= 10) {
        int[] count = new int[10];
        for (int x : a) count[(x / exp) % 10]++;
        for (int d = 1; d < 10; d++) count[d] += count[d - 1];
        for (int i = a.length - 1; i >= 0; i--) out[--count[(a[i] / exp) % 10]] = a[i];
        System.arraycopy(out, 0, a, 0, a.length);
    }
}

// Bucket sort for doubles in [0, 1)
static void bucketSort(double[] a) {
    int n = a.length;
    List<List<Double>> buckets = new ArrayList<>();
    for (int i = 0; i < n; i++) buckets.add(new ArrayList<>());
    for (double x : a) buckets.get((int) (x * n)).add(x);
    int i = 0;
    for (List<Double> b : buckets) { Collections.sort(b); for (double x : b) a[i++] = x; }
}
```
Interview uses: **bucket sort by frequency** for Top-K Frequent (LC 347) in O(n); counting sort for "sort ages", "H-index" (LC 274); radix for sorting large integer IDs.

## Sorting objects: comparators done right
```java
people.sort(Comparator.comparing(Person::city)
        .thenComparing(Person::age, Comparator.reverseOrder())
        .thenComparing(Person::name));
Arrays.sort(intervals, (x, y) -> Integer.compare(x[0], y[0]));   // never (x, y) -> x[0] - y[0]: overflow!
```
A comparator must be consistent (transitive); otherwise TimSort may throw "Comparison method violates its general contract!".

## Searching algorithms

| Algorithm | Requirement | Time | Notes |
|---|---|---|---|
| Linear search | none | O(n) | Unsorted data, tiny arrays |
| **Binary search** | sorted / monotonic predicate | O(log n) | And all its variants (lower/upper bound, on the answer) |
| Ternary search | unimodal function | O(log n) | Find max/min of a single-peak function |
| Exponential (galloping) search | sorted, unbounded size | O(log i) | Find range by doubling, then binary search (used in TimSort merges) |
| Interpolation search | sorted, uniformly distributed | O(log log n) avg | O(n) worst |
| Jump search | sorted | O(√n) | Rarely used |
| Hashing | — | O(1) avg | Exact match, no order |
| BST / TreeMap | balanced tree | O(log n) | Ordered queries (floor/ceiling) |

```java
// Lower bound: first index with a[i] >= target (a.length if none)
static int lowerBound(int[] a, int target) {
    int lo = 0, hi = a.length;
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (a[mid] < target) lo = mid + 1; else hi = mid;
    }
    return lo;
}
static int upperBound(int[] a, int target) {      // first index with a[i] > target
    int lo = 0, hi = a.length;
    while (lo < hi) {
        int mid = (lo + hi) >>> 1;
        if (a[mid] <= target) lo = mid + 1; else hi = mid;
    }
    return lo;
}
// count of target = upperBound - lowerBound;  Java: Arrays.binarySearch / Collections.binarySearch
```
Binary search on rotated arrays, peaks, 2-D matrices and "on the answer" is covered in the [Linked lists & binary search module](#/topic/dsa/04-linked-lists-binary-search).

## Problems where sorting is the key insight
| Problem | Why sort |
|---|---|
| Merge intervals, meeting rooms, non-overlapping intervals | Sweep in start/end order |
| 3Sum, 4Sum, two-sum on sorted data | Enables two pointers |
| Group anagrams | Sorted string as key |
| Largest number from array (LC 179) | Custom comparator: `(b+a).compareTo(a+b)` |
| Meeting the k closest / k-th element | Quickselect or partial sort |
| Minimum platforms / car fleet | Sort events, then sweep |
| Assign cookies, boats to save people | Greedy after sort |
| Contains duplicate within k | Sorting or TreeSet |

## Quick check questions

<details><summary>Which sorts are stable, and why does stability matter?</summary>

Bubble, insertion, merge, counting, radix, TimSort are stable; selection, shell, quick, heap are not. Stability lets you sort by multiple keys in passes (sort by name, then stably by city → grouped by city, names in order) and keeps equal records in insertion order.
</details>

<details><summary>Why is quicksort usually faster than merge sort and heap sort despite a worse worst case?</summary>

In-place partitioning touches memory sequentially (excellent cache behaviour), has a small constant factor, and needs no auxiliary array; random pivots make the O(n²) case vanishingly unlikely. Heap sort jumps around the array (poor locality); merge sort copies to a buffer.
</details>

<details><summary>Can any comparison sort be faster than O(n log n) in the worst case?</summary>

No. A comparison sort is a decision tree with n! leaves; its height is at least log₂(n!) ≈ n log n. Only non-comparison sorts (counting, radix, bucket) beat it, by exploiting the values' structure.
</details>

## Questions asked at top companies

<details><summary>Implement merge sort / quick sort on a whiteboard and analyse it. <em>· Amazon, Microsoft, Google, TCS, Infosys</em></summary>

Write the code above; state recurrences: merge sort T(n)=2T(n/2)+n → n log n always, O(n) space, stable. Quicksort average n log n, worst n² with bad pivots, O(log n) stack with smaller-side recursion, not stable. Mention randomisation and 3-way partitioning.
</details>

<details><summary>Sort an array of 0s, 1s and 2s in one pass (LC 75). <em>· Microsoft, Amazon, Adobe, Flipkart</em></summary>

Dutch national flag: pointers low/mid/high; 0 → swap with low, low++, mid++; 1 → mid++; 2 → swap with high, high-- (don't advance mid). O(n), O(1).
</details>

<details><summary>Sort a linked list in O(n log n) (LC 148). <em>· Meta, Microsoft, Amazon</em></summary>

Merge sort: split with slow/fast pointers, sort halves recursively, merge. O(log n) stack (bottom-up iterative merge gives O(1) extra space).
</details>

<details><summary>Find the k-th largest element without fully sorting (LC 215). <em>· Meta, Amazon, LinkedIn</em></summary>

Quickselect (average O(n)) or a size-k min-heap (O(n log k)); full sort O(n log n) as a baseline.
</details>

<details><summary>How would you sort 100 GB of data with 4 GB of RAM? <em>· Google, Amazon, Microsoft</em></summary>

External merge sort: read 4 GB chunks, sort each in memory, write sorted runs to disk; then k-way merge all runs using a min-heap with buffered reads/writes. Parallelise chunk sorting; for distributed data use MapReduce/Spark sort (range partitioning + local sort).
</details>

<details><summary>Count inversions in an array. <em>· Google, Goldman Sachs, Flipkart</em></summary>

Modified merge sort: while merging, when an element from the right half is placed before remaining left elements, add (mid − i) inversions. O(n log n). (Or a Fenwick tree over compressed values.)
</details>

<details><summary>Largest number formed by arranging numbers (LC 179). <em>· Amazon, Microsoft</em></summary>

Sort strings with comparator `(a, b) -> (b + a).compareTo(a + b)`; join; handle all-zeros ("0"). O(n log n · L).
</details>

<details><summary>Which sorting algorithm does Java use and why different ones for primitives and objects? <em>· Goldman Sachs, Oracle, Walmart</em></summary>

Primitives: dual-pivot quicksort (fast; stability meaningless for identical primitives). Objects: TimSort (stable, adaptive, guaranteed O(n log n)) because stability matters for objects sorted by keys.
</details>

<details><summary>When is insertion sort the right choice? <em>· Microsoft, Amazon</em></summary>

Small arrays (≈ < 32 elements), nearly sorted data, online sorting (elements arrive one at a time), and as the base case inside hybrid sorts.
</details>

<details><summary>Merge two sorted arrays in place (LC 88). <em>· Meta, Microsoft, Bloomberg</em></summary>

Fill from the back: pointers at the ends of both arrays and at the end of the target; place the larger each time. O(m + n), O(1).
</details>

<details><summary>Sort characters by frequency (LC 451) / top K frequent (LC 347). <em>· Amazon, Google</em></summary>

Count frequencies, then bucket sort by frequency (buckets indexed 0..n) and read from high to low → O(n); or a heap O(n log k).
</details>

<details><summary>Sort a nearly sorted array where each element is at most k away from its position. <em>· Amazon, Flipkart (GFG classic)</em></summary>

Min-heap of size k+1: push first k+1, then repeatedly pop min to the output and push the next element. O(n log k).
</details>

## End-to-end scenarios

<details><summary>Scenario: Your service must return the top 100 products by score from 50 million rows, refreshed every minute. Which algorithm?</summary>

Don't sort 50M rows every minute. Keep a size-100 min-heap while scanning (O(n log 100)), or partial selection; better, maintain the top-100 incrementally as scores change (ordered structure / Redis sorted set), or let the database use an index on score with LIMIT 100.
</details>

<details><summary>Scenario: A CSV export of transactions must be sorted by date, and for equal dates keep the original upload order. What do you use?</summary>

A stable sort by date — Java's `List.sort` (TimSort) or `Collections.sort` with `Comparator.comparing(Txn::date)`; equal dates keep input order automatically. If it doesn't fit in memory: external merge sort with a stable merge (on ties take from the earlier run).
</details>
