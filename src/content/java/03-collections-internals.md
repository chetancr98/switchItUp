---
title: Collections Internals — HashMap, ConcurrentHashMap, TreeMap & Friends
level: 1
tags: hashmap, collections, concurrenthashmap
---
<!-- deepened -->

## Start here: the basics

### Why collections exist
An array has a fixed size and few operations. Real programs need to **grow**, **search fast**, **keep things sorted**, **remove duplicates**. The **Java Collections Framework** gives ready-made data structures behind common interfaces.

```
Iterable
  └─ Collection
       ├─ List   — ordered, allows duplicates, index access   → ArrayList, LinkedList
       ├─ Set    — no duplicates                              → HashSet, LinkedHashSet, TreeSet
       └─ Queue  — process in an order (FIFO / priority)       → ArrayDeque, PriorityQueue
Map (separate hierarchy) — key → value pairs                  → HashMap, LinkedHashMap, TreeMap
```

### Picking the right one (beginner cheat sheet)
| I need… | Use |
|---|---|
| A growable list, access by index | `ArrayList` |
| Unique items, fast "contains?" | `HashSet` |
| Unique items in sorted order | `TreeSet` |
| Look up a value by a key | `HashMap` |
| Keys sorted / "nearest key below X" | `TreeMap` |
| Remember insertion order | `LinkedHashMap` / `LinkedHashSet` |
| Stack or queue | `ArrayDeque` |
| Always get the smallest/largest next | `PriorityQueue` |
| Shared between threads | `ConcurrentHashMap`, `CopyOnWriteArrayList`, `BlockingQueue` |

### What is hashing? (the idea behind HashMap)
Imagine 16 lockers numbered 0–15. To store a coat for "Riya", compute a number from the name (its **hash code**), take it modulo 16, and use that locker. To find it later, compute the same number — you go straight to the right locker instead of checking all 16. That's **O(1)** average lookup.

Two names may land in the same locker — a **collision**. Then the locker holds a small list, and we compare names with `equals()` to find the right coat.

```java
Map<String, Integer> marks = new HashMap<>();
marks.put("Riya", 91);
marks.put("Arjun", 84);
marks.get("Riya");                 // 91
marks.getOrDefault("Kabir", 0);    // 0
marks.merge("Riya", 5, Integer::sum); // 96 — add to existing value
for (Map.Entry<String, Integer> e : marks.entrySet()) System.out.println(e.getKey() + " " + e.getValue());
```

### Big-O for the common operations
| | get/contains | add | remove | ordered? |
|---|---|---|---|---|
| ArrayList | O(1) by index, O(n) by value | O(1) amortised at end | O(n) | insertion order |
| LinkedList | O(n) | O(1) at ends | O(1) at ends | insertion order |
| HashSet / HashMap | O(1) average | O(1) average | O(1) average | no order |
| TreeSet / TreeMap | O(log n) | O(log n) | O(log n) | sorted |
| PriorityQueue | peek O(1) | O(log n) | poll O(log n) | heap order |

### Iterating and removing safely
```java
List<Integer> nums = new ArrayList<>(List.of(1, 2, 3, 4));
// for (Integer n : nums) if (n % 2 == 0) nums.remove(n);   // ❌ ConcurrentModificationException
nums.removeIf(n -> n % 2 == 0);                              // ✅
```

### Comparable vs Comparator (sorting your own objects)
- `Comparable` — the object's *natural* order, inside the class (`compareTo`).
- `Comparator` — any order you want, outside the class.
```java
students.sort(Comparator.comparing(Student::marks).reversed().thenComparing(Student::name));
```

---

## HashMap — the single most asked Java internals question

### Structure (Java 8+)

```
table: Node<K,V>[]  (length always a power of two, lazily allocated, default 16)

 index  0   1    2         3 ...
        ∅   ●    ●──►●──►●   ∅          ← bucket = linked list of Node{hash,key,value,next}
                 │
                 └ if a bucket reaches 8 nodes AND table.length >= 64
                   → converted to a red-black tree of TreeNodes (O(log n))
                   (if table < 64, it resizes instead)
                   tree shrinks back to list at <= 6 nodes (hysteresis)
```

### `put(k, v)` step by step

1. `hash = (h = k.hashCode()) ^ (h >>> 16)` — **spread** the high bits into the low bits, because the index uses only the low bits.
2. `index = (n - 1) & hash` — same as `hash % n` when n is a power of two, but a single AND.
3. Empty bucket → place new node.
4. Else walk the bucket: if a node has `hash == h && (key == k || key.equals(k))` → replace value (return old).
5. Else append to tail (Java 8; Java 7 inserted at head — which caused the **infinite loop during concurrent resize** bug).
6. If bucket length ≥ `TREEIFY_THRESHOLD (8)` → treeify (or resize if table < 64).
7. `++size > threshold` (`capacity × loadFactor`, default 16 × 0.75 = 12) → **resize**.

`null` key allowed (one, hashed to bucket 0). `null` values allowed.

### Resize — the elegant part

The table doubles. Because n is a power of two, each node either **stays at index `i`** or **moves to `i + oldCap`** — determined by a single bit: `(hash & oldCap) == 0`. No rehash computation; each bucket splits into a "lo" and "hi" list preserving order.

Resize is O(n) — if you know the size, **presize**: `new HashMap<>(expected / 0.75f + 1)` or Java 19+ `HashMap.newHashMap(expected)`.

### Why treeify, and why 8?

With a good hash and load factor 0.75, bucket sizes follow a Poisson distribution with λ ≈ 0.5; the probability of a bucket with 8 entries is ~0.00000006. So treeification only kicks in for **pathological hashes or hash-flooding attacks** (crafted keys with identical hash). It caps worst case at O(log n) instead of O(n). Tree bins order by hash, then by `Comparable` if the keys implement it, then by a tie-break on identity hash.

### Complexity

| Operation | Average | Worst (Java 8+) |
|---|---|---|
| get / put / remove | O(1) | O(log n) per bucket (treeified) |
| iteration | O(capacity + size) | — |

Iteration cost depends on **capacity**, not only size — a map that once held 1M entries then cleared still iterates 1M+ buckets.

### Classic pitfalls
- Mutable keys (see core language module).
- `ConcurrentModificationException`: structural modification during iteration (fail-fast via `modCount`). Use `iterator.remove()` or `removeIf`.
- Using `HashMap` across threads: lost updates, and in Java 7 infinite loops. Use `ConcurrentHashMap`.

## LinkedHashMap & the LRU cache

`LinkedHashMap` = `HashMap` + a **doubly-linked list** across all entries. Order = insertion order, or **access order** if constructed with `accessOrder=true`. Override `removeEldestEntry` and you have an LRU cache:

```java
class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    LruCache(int capacity) { super(16, 0.75f, true); this.capacity = capacity; }
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > capacity; }
}
```

In interviews you'll usually be asked to build it **without** LinkedHashMap: `HashMap<K, Node>` + your own DLL with sentinel head/tail → O(1) get/put. (Full code in DSA → Linked Lists.)

## TreeMap

- **Red-black tree** — self-balancing BST; height ≤ 2·log₂(n+1). All ops O(log n).
- Keys must be `Comparable` or you pass a `Comparator`. **Equality is decided by `compareTo == 0`, not `equals`** — a comparator inconsistent with equals will "lose" entries.
- `NavigableMap` API is gold in interviews: `floorKey`, `ceilingKey`, `lowerKey`, `higherKey`, `headMap`, `tailMap`, `subMap`, `firstEntry`, `pollFirstEntry`, `descendingMap`.
  - Interval problems, "calendar booking", stock price tracking, sliding window max with duplicates (`TreeMap<Integer,Integer>` as multiset).

## ArrayList vs LinkedList

| | ArrayList | LinkedList |
|---|---|---|
| Backing | `Object[]`, grows by **1.5×** (`old + old>>1`) | Doubly-linked nodes |
| get(i) | O(1) | O(n) |
| add at end | Amortised O(1) | O(1) |
| add/remove middle | O(n) `System.arraycopy` (fast, memmove) | O(n) to find + O(1) to link |
| Memory/element | ~4 bytes ref | ~24-byte node + ref |
| Cache locality | Excellent | Terrible (pointer chasing) |

**Verdict:** ArrayList wins almost always, even for middle inserts at moderate sizes. For queue/deque use `ArrayDeque` (circular array), not LinkedList.

`ArrayList.remove(int)` vs `remove(Object)` overload trap with `List<Integer>`: `list.remove(1)` removes **index 1**; `list.remove(Integer.valueOf(1))` removes the value.

## ArrayDeque, PriorityQueue

- **ArrayDeque**: circular buffer, power-of-two capacity, no nulls. Use for **stack** (`push/pop`) and **queue** (`offer/poll`) — faster than `Stack` (synchronized `Vector`) and `LinkedList`.
- **PriorityQueue**: binary **min-heap** in an array. Children of `i` are `2i+1`, `2i+2`. `offer/poll` O(log n), `peek` O(1), `remove(Object)` O(n), **build from collection O(n)** (heapify). Iteration order is **not** sorted. Max-heap: `new PriorityQueue<>(Comparator.reverseOrder())`.

## HashSet, EnumMap, IdentityHashMap, WeakHashMap

- `HashSet` = `HashMap` with a dummy `PRESENT` value.
- `EnumMap`/`EnumSet` — array/bit-vector indexed by ordinal. Fastest maps for enum keys; use them.
- `IdentityHashMap` — uses `==` and `System.identityHashCode`, linear probing. Used for graph traversal "visited" sets, serialization.
- `WeakHashMap` — keys held by weak references; entry vanishes once key is unreachable. Classic metadata cache. Trap: values that strongly reference their key never get cleared.

## ConcurrentHashMap (Java 8+)

Java 7 used **segments** (16 `ReentrantLock`-ed sub-tables). Java 8 rewrote it:

- Same table-of-bins structure as HashMap (with treeification).
- **Reads are lock-free** — `volatile` reads of the table and node `val`/`next`.
- **Insert into empty bin**: CAS (`compareAndSetObject`) — no lock.
- **Insert into non-empty bin**: `synchronized` on the **first node of that bin** only → lock granularity = one bucket.
- **Size**: `LongAdder`-style striped counters (`baseCount` + `CounterCell[]`) → `size()` is an estimate under concurrency; `mappingCount()` returns long.
- **Resize is cooperative**: threads that try to write during a resize help transfer bins (`ForwardingNode` with hash `MOVED = -1` marks moved bins); readers follow the forwarding node to the new table.
- **No null keys or values** — `get(k) == null` must unambiguously mean "absent" because you can't atomically do `containsKey` + `get`.
- Iterators are **weakly consistent**: never throw CME, reflect some state since creation.

### Atomic compound operations — use them

```java
// WRONG — check-then-act race even on a ConcurrentHashMap
if (!map.containsKey(k)) map.put(k, new ArrayList<>());
map.get(k).add(v);

// RIGHT
map.computeIfAbsent(k, key -> new ArrayList<>()).add(v);  // but the ArrayList itself is not thread-safe!
map.computeIfAbsent(k, key -> new CopyOnWriteArrayList<>()).add(v);

// counters
ConcurrentHashMap<String, LongAdder> freq = new ConcurrentHashMap<>();
freq.computeIfAbsent(word, w -> new LongAdder()).increment();
map.merge(word, 1L, Long::sum);
```

`compute*` functions hold the bin lock while running — keep them **short** and **never** modify the same map inside them (can deadlock / throw `IllegalStateException: Recursive update`).

## Other concurrent collections

| Class | Mechanism | Use when |
|---|---|---|
| `CopyOnWriteArrayList` | Copies array on every write; reads lock-free on a snapshot | Read-mostly lists: listeners, config |
| `ConcurrentSkipListMap` | Lock-free skip list, O(log n), sorted | Concurrent sorted map (concurrent TreeMap) |
| `ConcurrentLinkedQueue` | Michael-Scott lock-free queue | Unbounded non-blocking queue |
| `ArrayBlockingQueue` | One lock, two conditions, bounded | Producer/consumer with back-pressure |
| `LinkedBlockingQueue` | Two locks (put/take), optionally bounded | Higher throughput producer/consumer; default in `Executors.newFixedThreadPool` (**unbounded!**) |
| `SynchronousQueue` | Zero capacity hand-off | `newCachedThreadPool` |
| `DelayQueue`, `PriorityBlockingQueue` | Heap + lock | Scheduling |

`Collections.synchronizedMap` = one mutex around everything; iteration still requires manual `synchronized(map)`.

## Fail-fast vs fail-safe

- **Fail-fast** (`ArrayList`, `HashMap` iterators): check `modCount`, throw `ConcurrentModificationException` — best-effort bug detection, *not* a concurrency guarantee.
- **Fail-safe / weakly consistent** (`ConcurrentHashMap`, `CopyOnWriteArrayList`): iterate over a snapshot or tolerate concurrent changes.

## Comparable vs Comparator

```java
record Employee(String name, int age, double salary) {}
list.sort(Comparator.comparingInt(Employee::age)
        .thenComparing(Employee::salary, Comparator.reverseOrder())
        .thenComparing(Employee::name));
```
**Never** write `(a, b) -> a.x - b.x` for ints that can be large/negative — **overflow** gives wrong order. Use `Integer.compare`.

## Quick check questions

<details><summary>1. Why is HashMap capacity a power of two?</summary>

So `index = hash & (n-1)` replaces modulo, and so resize can split each bucket with one bit check (`hash & oldCap`) — nodes either stay at `i` or move to `i+oldCap`. The cost: only low bits pick the bucket, which is why `hash ^ (hash >>> 16)` spreads high bits down.
</details>

<details><summary>2. What happens if all keys return the same hashCode?</summary>

All go to one bucket. Pre-Java 8: a linked list → O(n) per op (hash-flooding DoS). Java 8+: once the bucket hits 8 (and table ≥ 64) it becomes a red-black tree → O(log n). If keys are `Comparable` the tree uses that ordering for efficient lookup.
</details>

<details><summary>3. How does ConcurrentHashMap achieve thread safety without locking the whole map?</summary>

Lock-free volatile reads; CAS to install the first node in an empty bin; `synchronized` on the head node for non-empty bins (per-bucket lock); striped counters for size; cooperative multi-threaded resize with forwarding nodes. Contention only happens when two writers hit the same bin.
</details>

<details><summary>4. Why doesn't ConcurrentHashMap allow null?</summary>

Ambiguity: in a concurrent map, `get(k) == null` couldn't distinguish "absent" from "mapped to null", and you can't safely follow up with `containsKey` because another thread may change the map in between. Doug Lea disallowed nulls to keep the API unambiguous.
</details>

<details><summary>5. TreeMap with a comparator that compares only by `age` — what goes wrong?</summary>

Two employees with the same age compare as 0 → TreeMap treats them as the **same key**; the second `put` overwrites the first. Comparators used in sorted collections should be consistent with equals (add tie-breakers).
</details>

<details><summary>6. When would you choose CopyOnWriteArrayList?</summary>

Very read-heavy, small lists with rare writes where iteration must never throw or lock — event listener lists, routing tables. Every write copies the whole array (O(n) + garbage), so it's terrible for write-heavy workloads.
</details>

<details><summary>7. Design a thread-safe LRU cache.</summary>

Options: (a) `Collections.synchronizedMap(new LinkedHashMap(..., true))` — simple, single lock (note: even `get` mutates order so needs the lock). (b) `ConcurrentHashMap` + `ConcurrentLinkedDeque` for order (approximate, races on reorder). (c) Production: **Caffeine** — uses ConcurrentHashMap + ring buffers to batch access-order updates + W-TinyLFU admission, giving near-optimal hit rates with lock-free reads. Mention Caffeine; it's what Spring Boot uses for local caching.
</details>

## Questions asked at top companies

<details><summary>Explain the internal working of HashMap (put and get). <em>· Asked at nearly every Java interview: Amazon, Flipkart, Paytm, Walmart, Infosys</em></summary>

Array of buckets (power-of-two size). `put`: compute `hash = h ^ (h >>> 16)`, index = `hash & (n-1)`, empty bucket → new node; else traverse comparing hash and `equals` → replace or append; a bucket with ≥ 8 nodes (and table ≥ 64) becomes a red-black tree; size > capacity × 0.75 → resize to double, nodes split into lo/hi lists. `get`: same index computation, then traverse comparing hash & equals. Average O(1), worst O(log n).
</details>

<details><summary>What happens when two keys have the same hashCode? <em>· Amazon, Oracle, Cognizant</em></summary>

They land in the same bucket (collision). HashMap chains them (linked list, treeified above 8) and distinguishes them with `equals()`. Both entries are stored correctly; only performance degrades.
</details>

<details><summary>Why is the load factor 0.75? What happens if you set it to 1 or 0.5? <em>· Walmart, Goldman Sachs</em></summary>

0.75 balances space vs collision rate (Poisson analysis keeps chains short). 1.0 saves memory but increases collisions and lookup time; 0.5 wastes memory and causes more frequent resizes but fewer collisions.
</details>

<details><summary>HashMap vs Hashtable vs ConcurrentHashMap vs SynchronizedMap. <em>· Amazon, Morgan Stanley, Infosys</em></summary>

HashMap: not thread-safe, allows one null key and null values. Hashtable: legacy, every method synchronized (one lock), no nulls. `Collections.synchronizedMap`: wrapper with one lock; iteration needs manual sync. ConcurrentHashMap: lock-free reads, CAS + per-bin locks for writes, no nulls, weakly consistent iterators, atomic compute/merge — the choice for concurrency.
</details>

<details><summary>Difference between ArrayList and LinkedList — and which would you use for a queue? <em>· TCS, Accenture, Microsoft</em></summary>

ArrayList: contiguous array, O(1) random access, amortised O(1) append, O(n) middle insert, cache friendly. LinkedList: nodes with prev/next, O(n) access, O(1) insert at known node/ends, heavy memory. For a queue use `ArrayDeque` — faster than both.
</details>

<details><summary>What is fail-fast vs fail-safe iterator? <em>· Infosys, Capgemini, Paytm</em></summary>

Fail-fast (ArrayList, HashMap) checks `modCount` and throws `ConcurrentModificationException` on structural modification during iteration. Fail-safe / weakly consistent (CopyOnWriteArrayList iterates a snapshot; ConcurrentHashMap tolerates concurrent changes) never throw.
</details>

<details><summary>How does HashSet ensure uniqueness? <em>· Wipro, HCL, Amazon</em></summary>

It's backed by a HashMap: elements are keys with a dummy value. `add` returns false if `map.put` found an existing equal key. Uniqueness therefore depends on correct `equals`/`hashCode`.
</details>

<details><summary>How does TreeMap work and when would you use it over HashMap? <em>· Uber, Goldman Sachs</em></summary>

Red-black tree keyed by `compareTo`/Comparator; O(log n) ops; keys sorted. Use when you need ordering or navigation (`floorKey`, `ceilingKey`, range views) — e.g., time-series lookups, interval scheduling, leaderboards.
</details>

<details><summary>Implement an LRU cache. <em>· Amazon, Microsoft, Google, Swiggy</em></summary>

`LinkedHashMap` with `accessOrder=true` and `removeEldestEntry`, or HashMap + doubly linked list with sentinels (full code in DSA → Linked Lists). O(1) get/put. Discuss thread-safety and Caffeine for production.
</details>

<details><summary>Why does ConcurrentHashMap not allow null keys/values? <em>· Goldman Sachs, Walmart</em></summary>

A null return from `get` must unambiguously mean "absent"; in a concurrent map you can't follow up with `containsKey` atomically, so nulls would be ambiguous.
</details>

<details><summary>What's the time complexity of HashMap operations in Java 7 vs Java 8 worst case? <em>· Flipkart, PhonePe</em></summary>

Java 7: O(n) worst case (all keys in one linked list). Java 8+: O(log n) once a bin is treeified (≥ 8 nodes, table ≥ 64).
</details>

<details><summary>How would you sort a HashMap by values? <em>· TCS, Amazon (coding round)</em></summary>

```java
map.entrySet().stream()
   .sorted(Map.Entry.<String,Integer>comparingByValue().reversed())
   .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (a, b) -> a, LinkedHashMap::new));
```
A LinkedHashMap preserves the sorted order.
</details>

## End-to-end scenarios

<details><summary>Scenario: An in-memory product cache (`HashMap<Long, Product>`) shared by request threads causes occasional wrong prices and CPU spikes. Diagnose and fix.</summary>

Plain HashMap under concurrent writes → lost updates, corrupted bins, possibly endless loops (Java 7) / inconsistent reads. Fix: `ConcurrentHashMap`, or better a bounded Caffeine cache with TTL and `get(key, loader)` to avoid stampedes. Make `Product` immutable so readers never see half-updated objects. Add metrics (hit rate, evictions) and a size bound to prevent OOM.
</details>

<details><summary>Scenario: You need to show "top 10 trending hashtags in the last 5 minutes" in a single JVM. Choose data structures.</summary>

`ConcurrentHashMap<String, LongAdder>` counts per time bucket (e.g., per 10-second bucket in a ring of 30 buckets) so old buckets expire cleanly; a scheduled task merges current buckets into totals and keeps top-10 with a size-10 min-heap (`PriorityQueue`) — O(n log 10). Discuss approximate alternatives (Count-Min Sketch) when the key space is huge, and Redis sorted sets when multiple instances exist.
</details>
