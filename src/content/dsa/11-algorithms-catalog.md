---
title: The Complete Algorithms Catalog — Checklist + Code for Every Classic
level: 4
tags: algorithms, graph algorithms, string algorithms, checklist, bellman-ford, floyd-warshall, kruskal, prim, scc
minutes: 150
---
<!-- deepened -->

## Start here: the basics

### Why a catalog?
Interview problems are built from a surprisingly small set of algorithms. If you can **recognise** which one a problem needs and **write** it from memory, almost nothing in a coding round is unfamiliar. This module is that set:
1. A **master checklist** — every algorithm, its complexity, the signal that tells you to use it, and where in this app it's implemented.
2. **Code** for the classics not implemented elsewhere in the DSA track.

Use it as your final revision sheet: tick each row only when you can write it without looking.

### How to recognise the algorithm from the problem
| The problem says… | Think |
|---|---|
| "sorted", "find position", "minimum X such that…" | Binary search (on the answer) |
| "shortest path", unweighted grid/graph | BFS |
| "shortest path" with weights ≥ 0 | Dijkstra |
| negative edge weights / "at most K edges" | Bellman-Ford |
| all-pairs distances, n ≤ 400 | Floyd-Warshall |
| "order of tasks", prerequisites, dependencies | Topological sort |
| "connected", "group", "merge accounts", online edges | Union-Find |
| "connect all with minimum cost" | MST (Kruskal / Prim) |
| "number of ways", "min/max cost", choices with overlap | Dynamic programming |
| "all combinations / permutations / subsets" | Backtracking |
| "k largest", "running median", "merge k sorted" | Heap |
| "contiguous subarray/substring" | Sliding window / prefix sums |
| "next greater/smaller" | Monotonic stack |
| "prefix", "autocomplete", "word dictionary" | Trie |
| "range sum/min with updates" | Fenwick / segment tree |
| "pattern in text" | KMP / Z / Rabin-Karp |
<!-- -->

---

## Master checklist

### Searching & sorting
| Algorithm | Complexity | Where |
|---|---|---|
| Linear / binary search, lower & upper bound | O(n) / O(log n) | [Sorting & searching](#/topic/dsa/00-sorting-searching) |
| Binary search on the answer | O(n log range) | [Binary search](#/topic/dsa/04-linked-lists-binary-search) |
| Ternary & exponential search | O(log n) | Sorting & searching |
| Bubble, selection, insertion, shell sort | O(n²) | Sorting & searching · [Visualizer](#/visualizer) |
| Merge, quick (2- and 3-way), heap sort | O(n log n) | Sorting & searching |
| Counting, radix, bucket sort | O(n + k) | Sorting & searching |
| Quickselect | O(n) avg | Sorting & searching / Heaps |
| External merge sort | O(n log n) I/O-aware | Sorting & searching |

### Arrays, strings & sequences
| Algorithm | Complexity | Where |
|---|---|---|
| Two pointers, sliding window | O(n) | [Arrays](#/topic/dsa/02-arrays-two-pointers-sliding-window) |
| Prefix sums, difference arrays, 2-D prefix | O(n) | Arrays |
| Kadane (max subarray) | O(n) | Arrays |
| Boyer–Moore majority vote | O(n), O(1) | Arrays |
| Dutch national flag | O(n) | Sorting & searching |
| Next permutation | O(n) | Arrays |
| Monotonic stack / deque | O(n) | [Stacks & queues](#/topic/dsa/03-hashing-stacks-queues) |
| Fisher–Yates shuffle | O(n) | **below** |
| Reservoir sampling | O(n), O(k) | **below** |
| KMP | O(n + m) | [Advanced structures](#/topic/dsa/10-advanced-structures) |
| Z-function | O(n + m) | **below** |
| Rabin–Karp rolling hash | O(n + m) avg | **below** |
| Manacher (all palindromes) | O(n) | **below** |
| Longest common prefix, anagram/frequency tricks | O(n) | Hashing |

### Linked lists, stacks, trees
| Algorithm | Complexity | Where |
|---|---|---|
| Reverse, merge, middle, k-group reverse | O(n) | [Linked lists](#/topic/dsa/04-linked-lists-binary-search) |
| Floyd cycle detection | O(n), O(1) | Linked lists |
| Tree traversals (recursive, iterative, Morris) | O(n) | [Trees](#/topic/dsa/05-trees-bst) |
| LCA (recursive), binary lifting | O(n) / O(log n) per query | Trees · [CP advanced](#/topic/cp/03-advanced-techniques) |
| Serialize / deserialize, construct from traversals | O(n) | Trees |
| BST insert / delete / validate / kth | O(h) | Trees |

### Graphs
| Algorithm | Complexity | Where |
|---|---|---|
| BFS, multi-source BFS, 0-1 BFS, bidirectional BFS | O(V + E) | [Graphs](#/topic/dsa/07-graphs) · Visualizer |
| DFS, cycle detection (undirected & directed) | O(V + E) | Graphs |
| Topological sort (Kahn's & DFS) | O(V + E) | Graphs · **DFS version below** |
| Bipartite check | O(V + E) | **below** |
| Union-Find (path compression + union by size) | ~O(α(n)) | Graphs |
| Dijkstra | O((V + E) log V) | Graphs · Visualizer |
| **Bellman-Ford** | O(V·E) | **below** |
| **Floyd-Warshall** | O(V³) | **below** |
| **A\*** | ≤ Dijkstra | **below** · Visualizer |
| **Kruskal**, **Prim** (MST) | O(E log E) | **below** |
| **Kosaraju** (strongly connected components) | O(V + E) | **below** |
| **Tarjan bridges & articulation points** | O(V + E) | **below** |
| **Hierholzer** (Eulerian path) | O(E) | **below** |
| **Edmonds-Karp** (max flow / bipartite matching) | O(V·E²) | **below** |
| Flood fill on grids | O(R·C) | Graphs |

### Dynamic programming & backtracking
| Pattern | Where |
|---|---|
| 1-D DP, knapsack (0/1 & unbounded), LIS (n log n), LCS, edit distance, grid DP, interval DP, state machines, tree DP, bitmask DP, digit DP | [DP](#/topic/dsa/08-dynamic-programming) · [CP advanced](#/topic/cp/03-advanced-techniques) |
| Subsets, permutations, combinations, N-Queens, Sudoku, word search | [Backtracking](#/topic/dsa/09-backtracking) |

### Data-structure algorithms
| Algorithm | Where |
|---|---|
| Heap operations, heapify O(n), two-heaps median | [Heaps](#/topic/dsa/06-heaps-intervals-greedy) |
| Trie insert/search/startsWith, binary trie (max XOR) | [Advanced structures](#/topic/dsa/10-advanced-structures) |
| Segment tree (point & lazy range updates), Fenwick tree, sparse table | Advanced structures · CP advanced |
| LRU / LFU cache | Linked lists · Stacks & queues |
| Consistent hashing | [System design: databases](#/topic/system-design/03-databases-at-scale) |

### Math & bits
| Algorithm | Where |
|---|---|
| GCD / LCM / extended Euclid, modular inverse | [Number theory](#/topic/cp/02-number-theory-combinatorics) |
| Fast exponentiation, matrix exponentiation | Number theory |
| Sieve of Eratosthenes, prime factorisation | Number theory |
| nCr with factorials, Catalan numbers, inclusion–exclusion | Number theory |
| Bit tricks (x & (x−1), XOR pairing, submask enumeration) | Advanced structures |

### Greedy & scheduling
| Algorithm | Where |
|---|---|
| Activity selection, interval scheduling, jump game, gas station, Huffman coding | [Greedy](#/topic/dsa/06-heaps-intervals-greedy) |

---

## Graph classics — code

Shared helpers:
```java
// Weighted edge list → adjacency list
static List<List<int[]>> adj(int n, int[][] edges, boolean directed) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] e : edges) { g.get(e[0]).add(new int[]{e[1], e[2]}); if (!directed) g.get(e[1]).add(new int[]{e[0], e[2]}); }
    return g;
}
static final int INF = Integer.MAX_VALUE / 2;     // half of MAX so INF + w doesn't overflow
```

### Bellman-Ford — negative edges, detects negative cycles
```java
// edges: {from, to, weight}. Returns distances, or null if a negative cycle is reachable.
static int[] bellmanFord(int n, int[][] edges, int src) {
    int[] dist = new int[n];
    Arrays.fill(dist, INF);
    dist[src] = 0;
    for (int round = 0; round < n - 1; round++) {           // a shortest path has at most n-1 edges
        boolean changed = false;
        for (int[] e : edges)
            if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) { dist[e[1]] = dist[e[0]] + e[2]; changed = true; }
        if (!changed) break;
    }
    for (int[] e : edges)                                    // one more relaxation succeeds → negative cycle
        if (dist[e[0]] != INF && dist[e[0]] + e[2] < dist[e[1]]) return null;
    return dist;
}
```
"Cheapest flights within K stops" (LC 787) = Bellman-Ford limited to K+1 rounds, relaxing from a **copy** of the previous round's distances so each round adds at most one edge.

### Floyd-Warshall — all pairs shortest paths
```java
static int[][] floydWarshall(int[][] dist) {      // dist[i][j] = weight or INF, dist[i][i] = 0
    int n = dist.length;
    for (int k = 0; k < n; k++)                   // allow k as an intermediate vertex
        for (int i = 0; i < n; i++)
            for (int j = 0; j < n; j++)
                if (dist[i][k] + dist[k][j] < dist[i][j]) dist[i][j] = dist[i][k] + dist[k][j];
    return dist;                                  // dist[i][i] < 0 afterwards ⇒ negative cycle
}
```
O(V³) — fine for V ≤ ~400. Used in LC 1334 (city with fewest reachable neighbours), transitive closure.

### A* — Dijkstra with a heuristic (grids)
```java
static int aStar(int[][] grid, int[] s, int[] t) {        // 0 = open, 1 = wall; returns steps or -1
    int R = grid.length, C = grid[0].length;
    int[][] g = new int[R][C];
    for (int[] row : g) Arrays.fill(row, INF);
    g[s[0]][s[1]] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));   // {f = g + h, r, c}
    pq.offer(new int[]{h(s, t), s[0], s[1]});
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!pq.isEmpty()) {
        int[] cur = pq.poll();
        int r = cur[1], c = cur[2];
        if (r == t[0] && c == t[1]) return g[r][c];
        if (cur[0] > g[r][c] + h(new int[]{r, c}, t)) continue;          // stale entry
        for (int[] d : dirs) {
            int nr = r + d[0], nc = c + d[1];
            if (nr < 0 || nc < 0 || nr >= R || nc >= C || grid[nr][nc] == 1) continue;
            if (g[r][c] + 1 < g[nr][nc]) { g[nr][nc] = g[r][c] + 1; pq.offer(new int[]{g[nr][nc] + h(new int[]{nr, nc}, t), nr, nc}); }
        }
    }
    return -1;
}
static int h(int[] a, int[] b) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }   // Manhattan: admissible on 4-dir grids
```
The heuristic must be **admissible** (never overestimate) for A* to return optimal paths. Watch it explore fewer cells than BFS in the [Visualizer](#/visualizer).

### Minimum spanning tree — Kruskal and Prim
```java
// Kruskal: sort edges, add if it joins two components (Union-Find).
static long kruskal(int n, int[][] edges) {               // {u, v, w}
    Arrays.sort(edges, (a, b) -> Integer.compare(a[2], b[2]));
    int[] parent = new int[n];
    for (int i = 0; i < n; i++) parent[i] = i;
    long total = 0; int used = 0;
    for (int[] e : edges) {
        int ru = find(parent, e[0]), rv = find(parent, e[1]);
        if (ru == rv) continue;                           // would form a cycle
        parent[ru] = rv; total += e[2];
        if (++used == n - 1) break;
    }
    return used == n - 1 ? total : -1;                    // -1: graph not connected
}
static int find(int[] p, int x) { while (p[x] != x) { p[x] = p[p[x]]; x = p[x]; } return x; }

// Prim: grow the tree from vertex 0 with a min-heap of crossing edges.
static long prim(int n, List<List<int[]>> g) {           // g: {to, weight}
    boolean[] in = new boolean[n];
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
    pq.offer(new int[]{0, 0});
    long total = 0; int count = 0;
    while (!pq.isEmpty() && count < n) {
        int[] cur = pq.poll();
        if (in[cur[0]]) continue;
        in[cur[0]] = true; total += cur[1]; count++;
        for (int[] e : g.get(cur[0])) if (!in[e[0]]) pq.offer(new int[]{e[0], e[1]});
    }
    return count == n ? total : -1;
}
```
Kruskal is simpler with an edge list; Prim suits dense graphs/adjacency lists. LC 1584 (connect points), LC 1135.

### Topological sort by DFS + cycle detection
```java
static List<Integer> topoSort(int n, List<List<Integer>> g) {
    int[] state = new int[n];                             // 0 = unvisited, 1 = on stack, 2 = done
    Deque<Integer> order = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (state[i] == 0 && !dfs(i, g, state, order)) return List.of();   // cycle
    return new ArrayList<>(order);
}
static boolean dfs(int u, List<List<Integer>> g, int[] state, Deque<Integer> order) {
    state[u] = 1;
    for (int v : g.get(u)) {
        if (state[v] == 1) return false;                 // back edge → cycle
        if (state[v] == 0 && !dfs(v, g, state, order)) return false;
    }
    state[u] = 2;
    order.push(u);                                       // post-order, reversed via push
    return true;
}
```

### Bipartite check (2-colouring)
```java
static boolean isBipartite(List<List<Integer>> g) {
    int n = g.size(); int[] color = new int[n];          // 0 uncoloured, 1 / -1
    for (int s = 0; s < n; s++) {
        if (color[s] != 0) continue;
        Deque<Integer> q = new ArrayDeque<>(List.of(s)); color[s] = 1;
        while (!q.isEmpty()) {
            int u = q.poll();
            for (int v : g.get(u)) {
                if (color[v] == 0) { color[v] = -color[u]; q.offer(v); }
                else if (color[v] == color[u]) return false;
            }
        }
    }
    return true;
}
```

### Kosaraju — strongly connected components
```java
static int kosaraju(int n, List<List<Integer>> g, int[] comp) {
    boolean[] seen = new boolean[n];
    Deque<Integer> order = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (!seen[i]) fill(i, g, seen, order);        // 1. order by finish time
    List<List<Integer>> rg = new ArrayList<>();
    for (int i = 0; i < n; i++) rg.add(new ArrayList<>());
    for (int u = 0; u < n; u++) for (int v : g.get(u)) rg.get(v).add(u);    // 2. reverse the graph
    Arrays.fill(comp, -1);
    int c = 0;
    while (!order.isEmpty()) {                                              // 3. DFS on reverse graph in decreasing finish time
        int u = order.pop();
        if (comp[u] == -1) assign(u, rg, comp, c++);
    }
    return c;                                                               // number of SCCs
}
static void fill(int u, List<List<Integer>> g, boolean[] seen, Deque<Integer> order) {
    seen[u] = true;
    for (int v : g.get(u)) if (!seen[v]) fill(v, g, seen, order);
    order.push(u);
}
static void assign(int u, List<List<Integer>> rg, int[] comp, int c) {
    comp[u] = c;
    for (int v : rg.get(u)) if (comp[v] == -1) assign(v, rg, comp, c);
}
```
Uses: condensing a graph into a DAG of SCCs, 2-SAT, "can every node reach every other".

### Tarjan — bridges and articulation points
```java
static int timer;
static void bridges(int u, int parent, List<List<Integer>> g, int[] tin, int[] low, List<int[]> out) {
    tin[u] = low[u] = ++timer;
    for (int v : g.get(u)) {
        if (v == parent) continue;
        if (tin[v] != 0) low[u] = Math.min(low[u], tin[v]);                 // back edge
        else {
            bridges(v, u, g, tin, low, out);
            low[u] = Math.min(low[u], low[v]);
            if (low[v] > tin[u]) out.add(new int[]{u, v});                  // v can't reach above u → bridge
            // articulation point (non-root u): low[v] >= tin[u]; root: ≥ 2 DFS children
        }
    }
}
```
LC 1192 Critical Connections. (Multi-edges need edge ids instead of the parent check.)

### Hierholzer — Eulerian path (use every edge once)
```java
// Reconstruct Itinerary (LC 332): lexicographically smallest Euler path from "JFK"
static List<String> itinerary(List<List<String>> tickets) {
    Map<String, PriorityQueue<String>> g = new HashMap<>();
    for (List<String> t : tickets) g.computeIfAbsent(t.get(0), k -> new PriorityQueue<>()).add(t.get(1));
    LinkedList<String> route = new LinkedList<>();
    Deque<String> stack = new ArrayDeque<>(List.of("JFK"));
    while (!stack.isEmpty()) {
        String u = stack.peek();
        PriorityQueue<String> next = g.get(u);
        if (next != null && !next.isEmpty()) stack.push(next.poll());       // keep walking unused edges
        else route.addFirst(stack.pop());                                   // stuck: prepend to answer
    }
    return route;
}
```
An Eulerian path exists iff the graph is connected (over edges) and has 0 or 2 vertices of odd degree (directed: in/out degrees differ by 1 at start and end only).

### Edmonds-Karp — maximum flow (and bipartite matching)
```java
static int maxFlow(int[][] cap, int s, int t) {          // cap: n×n capacities (mutated into residual)
    int n = cap.length, flow = 0;
    int[] parent = new int[n];
    while (true) {
        Arrays.fill(parent, -1); parent[s] = s;
        Deque<Integer> q = new ArrayDeque<>(List.of(s));
        while (!q.isEmpty() && parent[t] == -1) {                           // BFS for an augmenting path
            int u = q.poll();
            for (int v = 0; v < n; v++) if (parent[v] == -1 && cap[u][v] > 0) { parent[v] = u; q.offer(v); }
        }
        if (parent[t] == -1) return flow;                                   // no more augmenting paths
        int push = Integer.MAX_VALUE;
        for (int v = t; v != s; v = parent[v]) push = Math.min(push, cap[parent[v]][v]);
        for (int v = t; v != s; v = parent[v]) { cap[parent[v]][v] -= push; cap[v][parent[v]] += push; }
        flow += push;
    }
}
```
Max-flow = min-cut. Bipartite matching (assign workers to jobs): source → left nodes (cap 1), left → right (cap 1 if compatible), right → sink (cap 1).

## String classics — code

### Z-function
```java
// z[i] = length of the longest substring starting at i that matches a prefix of s
static int[] zFunction(String s) {
    int n = s.length(); int[] z = new int[n];
    for (int i = 1, l = 0, r = 0; i < n; i++) {
        if (i < r) z[i] = Math.min(r - i, z[i - l]);
        while (i + z[i] < n && s.charAt(z[i]) == s.charAt(i + z[i])) z[i]++;
        if (i + z[i] > r) { l = i; r = i + z[i]; }
    }
    return z;
}
// Pattern search: z of (pattern + "$" + text); positions where z == pattern.length() are matches.
```

### Rabin–Karp (rolling hash)
```java
static List<Integer> rabinKarp(String text, String pat) {
    final long MOD = 1_000_000_007L, B = 131;
    int n = text.length(), m = pat.length();
    List<Integer> res = new ArrayList<>();
    if (m > n) return res;
    long hp = 0, ht = 0, pow = 1;
    for (int i = 0; i < m; i++) { hp = (hp * B + pat.charAt(i)) % MOD; ht = (ht * B + text.charAt(i)) % MOD; if (i > 0) pow = pow * B % MOD; }
    for (int i = 0; ; i++) {
        if (hp == ht && text.regionMatches(i, pat, 0, m)) res.add(i);       // verify to rule out collisions
        if (i + m >= n) break;
        ht = (ht - text.charAt(i) * pow % MOD + MOD) % MOD;                  // drop left char
        ht = (ht * B + text.charAt(i + m)) % MOD;                            // add right char
    }
    return res;
}
```

### Manacher — every palindrome in O(n)
```java
static String longestPalindrome(String s) {
    StringBuilder sb = new StringBuilder("^");
    for (char c : s.toCharArray()) sb.append('#').append(c);
    sb.append("#$");                                       // sentinels avoid bounds checks
    char[] t = sb.toString().toCharArray();
    int[] p = new int[t.length];
    int center = 0, right = 0, best = 0, bestCenter = 0;
    for (int i = 1; i < t.length - 1; i++) {
        if (i < right) p[i] = Math.min(right - i, p[2 * center - i]);       // mirror
        while (t[i + p[i] + 1] == t[i - p[i] - 1]) p[i]++;
        if (i + p[i] > right) { center = i; right = i + p[i]; }
        if (p[i] > best) { best = p[i]; bestCenter = i; }
    }
    int start = (bestCenter - best) / 2;
    return s.substring(start, start + best);
}
```

## Randomised classics — code
```java
// Fisher–Yates shuffle: uniform random permutation (LC 384)
static void shuffle(int[] a, Random r) {
    for (int i = a.length - 1; i > 0; i--) { int j = r.nextInt(i + 1); int t = a[i]; a[i] = a[j]; a[j] = t; }
}

// Reservoir sampling: k uniform samples from a stream of unknown length (LC 382, 398)
static int[] reservoir(Iterator<Integer> stream, int k, Random r) {
    int[] res = new int[k]; int i = 0;
    while (stream.hasNext()) {
        int x = stream.next();
        if (i < k) res[i] = x;
        else { int j = r.nextInt(i + 1); if (j < k) res[j] = x; }   // keep with probability k/(i+1)
        i++;
    }
    return res;
}
```
The common shuffle bug: `j = r.nextInt(n)` for every i produces a biased permutation (nⁿ outcomes don't divide evenly into n!).

## Final-week revision protocol
1. Go down every checklist table above; for each row, write the code from memory in a blank file (10 minutes max each).
2. Anything you couldn't write → mark this module "Revise later" and redo those rows in 3 days.
3. Run the [Visualizer](#/visualizer) once for sorting and pathfinding to refresh the intuition.
4. Solve one LeetCode problem per graph algorithm (links at the end).

## Quick check questions

<details><summary>Dijkstra vs Bellman-Ford vs Floyd-Warshall — when each?</summary>

Dijkstra: single source, non-negative weights, O((V+E) log V). Bellman-Ford: negative weights, negative-cycle detection, or a limit on edge count, O(VE). Floyd-Warshall: all pairs on small graphs (V ≤ ~400), O(V³).
</details>

<details><summary>Kruskal vs Prim?</summary>

Kruskal sorts edges and uses Union-Find — great for sparse graphs given as edge lists. Prim grows from a vertex with a heap — natural with adjacency lists and dense graphs. Both give a minimum spanning tree.
</details>

## Questions asked at top companies

<details><summary>Find the shortest path when some edges are negative. <em>· Google, Amazon, Microsoft</em></summary>

Bellman-Ford (V−1 relaxation rounds); an extra successful relaxation reveals a negative cycle. For DAGs, relax in topological order in O(V+E).
</details>

<details><summary>Cheapest Flights Within K Stops (LC 787). <em>· Amazon, Airbnb-style, Google</em></summary>

Bellman-Ford for K+1 rounds using the previous round's distances, or BFS/Dijkstra over (city, stops) states. O(K·E).
</details>

<details><summary>Min Cost to Connect All Points (LC 1584). <em>· Amazon, Microsoft</em></summary>

MST over the complete graph: Prim with O(n²) array version (no heap needed for dense graphs) or Kruskal with sorted O(n²) edges.
</details>

<details><summary>Critical Connections in a Network (LC 1192). <em>· Amazon, Google</em></summary>

Tarjan's bridge algorithm: DFS discovery times and low-links; edge (u, v) is a bridge if low[v] > tin[u]. O(V + E).
</details>

<details><summary>Reconstruct Itinerary (LC 332). <em>· Google, Uber</em></summary>

Hierholzer's algorithm with min-heaps per airport for lexicographic order; post-order prepend gives the path. O(E log E).
</details>

<details><summary>Shuffle an Array (LC 384) — and prove it's uniform. <em>· Google, Meta</em></summary>

Fisher–Yates: at step i pick j uniformly from [0, i]. Each of the n! permutations arises from exactly one sequence of choices (n·(n−1)·…·1 sequences), so each has probability 1/n!.
</details>

<details><summary>Random pick from a linked list of unknown length (LC 382). <em>· Google, Meta</em></summary>

Reservoir sampling with k = 1: keep the i-th element with probability 1/i. One pass, O(1) memory.
</details>

<details><summary>Find all anagram / pattern occurrences fast. <em>· Amazon, Microsoft</em></summary>

Sliding window with count arrays for anagrams (LC 438); KMP, Z-function or Rabin–Karp for exact patterns in O(n + m).
</details>

<details><summary>Assign tasks to workers maximising matches. <em>· Google, Uber</em></summary>

Bipartite matching via max flow (Edmonds-Karp/Dinic) or Hopcroft-Karp; for weighted assignment, the Hungarian algorithm (mention it by name).
</details>

## End-to-end scenarios

<details><summary>Scenario: Design the routing core of a delivery app: shortest drive time from restaurant to customer on a city road graph with 1M intersections.</summary>

Dijkstra with a binary heap is O((V+E) log V) per query — too slow at scale per request. Use A* with a geographic heuristic (straight-line distance / max speed, admissible), bidirectional search, and precomputation techniques (contraction hierarchies) used by real routing engines; cache frequent routes; edge weights from live traffic updated periodically. Mention negative weights don't occur (so Dijkstra-family is valid).
</details>

<details><summary>Scenario: A build system has 5 000 modules with dependencies; detect cycles and compute a parallel build order.</summary>

Directed graph; Kahn's algorithm gives an order and detects cycles (leftover nodes). Group by BFS level (all nodes whose in-degree hits zero together) to build in parallel waves; report cycles with the DFS colouring method (or SCCs via Kosaraju/Tarjan to show each cyclic group).
</details>
