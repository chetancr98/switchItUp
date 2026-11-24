---
title: Graphs — BFS/DFS, Topological Sort, Union-Find, Dijkstra, MST
level: 3
tags: graph, bfs, dfs, dijkstra, union find, topological sort
---
<!-- deepened -->

## Start here: the basics

### What is a graph?
**Nodes** (vertices) connected by **edges**. Cities and roads, users and friendships, web pages and links, tasks and dependencies. Edges can be **directed** (one-way) or **undirected**, **weighted** (distance/cost) or not.

### Storing a graph — adjacency list
```java
// edges: 0-1, 0-2, 1-3
List<List<Integer>> g = new ArrayList<>();
for (int i = 0; i < 4; i++) g.add(new ArrayList<>());
g.get(0).add(1); g.get(1).add(0);
g.get(0).add(2); g.get(2).add(0);
g.get(1).add(3); g.get(3).add(1);
```

### BFS — explore level by level (shortest path when edges have equal weight)
```java
int[] bfsDistances(List<List<Integer>> g, int src) {
    int[] dist = new int[g.size()]; Arrays.fill(dist, -1); dist[src] = 0;
    Deque<Integer> q = new ArrayDeque<>(List.of(src));
    while (!q.isEmpty()) {
        int u = q.poll();
        for (int v : g.get(u)) if (dist[v] == -1) { dist[v] = dist[u] + 1; q.offer(v); }
    }
    return dist;
}
```

### DFS — go deep first (connectivity, cycles, paths)
```java
void dfs(List<List<Integer>> g, int u, boolean[] seen) {
    seen[u] = true;
    for (int v : g.get(u)) if (!seen[v]) dfs(g, v, seen);
}
```

### Grids are graphs too
Each cell is a node connected to up/down/left/right neighbours — "number of islands" is DFS/BFS on a grid.

---

## Representations
```java
// Adjacency list from edge list (undirected)
List<List<Integer>> g = new ArrayList<>();
for (int i = 0; i < n; i++) g.add(new ArrayList<>());
for (int[] e : edges) { g.get(e[0]).add(e[1]); g.get(e[1]).add(e[0]); }

// Weighted: List<List<int[]>> with {to, w}
// Grid as implicit graph:
int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
```
Adjacency list O(V+E) space — default. Matrix O(V²) — dense graphs / Floyd-Warshall.

## DFS — connectivity, components, cycle detection

```java
// Number of Islands (LC 200) — flood fill
int numIslands(char[][] grid) {
    int count = 0;
    for (int r = 0; r < grid.length; r++)
        for (int c = 0; c < grid[0].length; c++)
            if (grid[r][c] == '1') { count++; sink(grid, r, c); }
    return count;
}
void sink(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';                                   // mark visited
    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
}
```
Recursion depth can hit ~10⁶ on big grids → use an explicit stack or BFS in Java.

**Cycle detection**:
- Undirected: DFS with parent; or union-find (edge joining already-connected nodes = cycle).
- Directed: **three colours** — WHITE (unvisited), GRAY (on current path), BLACK (done). Edge to a GRAY node = back edge = cycle.

## BFS — shortest path in unweighted graphs

```java
// Shortest steps in a grid from (sr,sc) to (tr,tc)
int bfs(int[][] grid, int sr, int sc, int tr, int tc) {
    int R = grid.length, C = grid[0].length;
    boolean[][] seen = new boolean[R][C];
    Deque<int[]> q = new ArrayDeque<>();
    q.offer(new int[]{sr, sc}); seen[sr][sc] = true;
    for (int steps = 0; !q.isEmpty(); steps++) {
        for (int size = q.size(); size > 0; size--) {
            int[] cur = q.poll();
            if (cur[0] == tr && cur[1] == tc) return steps;
            for (int[] d : DIRS) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && !seen[nr][nc] && grid[nr][nc] == 0) {
                    seen[nr][nc] = true;                  // mark when ENQUEUING, not when polling
                    q.offer(new int[]{nr, nc});
                }
            }
        }
    }
    return -1;
}
```
- **Multi-source BFS**: enqueue all sources at distance 0 — Rotting Oranges (LC 994), Walls and Gates (LC 286), 01 Matrix (LC 542), Pacific Atlantic (LC 417, BFS from oceans inward).
- **State-space BFS**: node = (position, extra state): Open the Lock (LC 752), Word Ladder (LC 127 — wildcard buckets `h*t`), Shortest path with k obstacle eliminations (LC 1293: state (r,c,k)), Sliding puzzle, keys & doors (bitmask of keys).
- **0-1 BFS**: edge weights 0/1 → deque; push-front for 0, push-back for 1 → O(V+E).
- **Bidirectional BFS**: search from both ends → explores ~2·b^(d/2) instead of b^d nodes.

## Topological sort (DAG ordering, dependency resolution)

```java
// Kahn's algorithm — Course Schedule II (LC 210)
int[] findOrder(int n, int[][] prereq) {
    List<List<Integer>> g = new ArrayList<>(); int[] indeg = new int[n];
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] p : prereq) { g.get(p[1]).add(p[0]); indeg[p[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
    int[] order = new int[n]; int idx = 0;
    while (!q.isEmpty()) {
        int u = q.poll(); order[idx++] = u;
        for (int v : g.get(u)) if (--indeg[v] == 0) q.offer(v);
    }
    return idx == n ? order : new int[0];           // fewer than n → cycle
}
```
DFS alternative: post-order, then reverse. Applications: build systems, task scheduling, **Alien Dictionary** (LC 269 — build edges from first differing char of adjacent words; watch the prefix edge case), parallel courses (longest path in DAG = minimum semesters), DP on DAGs.

## Union-Find (Disjoint Set Union)

```java
class DSU {
    private final int[] parent, size;
    int components;
    DSU(int n) { parent = new int[n]; size = new int[n]; components = n; for (int i = 0; i < n; i++) { parent[i] = i; size[i] = 1; } }
    int find(int x) { while (parent[x] != x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; }  // path halving
    boolean union(int a, int b) {
        int ra = find(a), rb = find(b);
        if (ra == rb) return false;
        if (size[ra] < size[rb]) { int t = ra; ra = rb; rb = t; }     // union by size
        parent[rb] = ra; size[ra] += size[rb]; components--;
        return true;
    }
}
```
Nearly O(1) per op (inverse Ackermann α(n)). Uses: connected components (LC 547, 323), redundant connection (LC 684), accounts merge (LC 721), number of islands II (online, LC 305), **Kruskal's MST**, satisfiability of equality equations (LC 990), percolation, "earliest moment everyone becomes friends" (sort events by time).

## Shortest paths

| Algorithm | Graph | Complexity |
|---|---|---|
| BFS | Unweighted | O(V+E) |
| 0-1 BFS | Weights 0/1 | O(V+E) |
| **Dijkstra** | Non-negative weights | O((V+E) log V) with heap |
| Bellman-Ford | Negative edges, detects negative cycles; "at most K edges" | O(V·E) |
| Floyd-Warshall | All pairs, small V (≤ 400) | O(V³) |
| DAG relaxation in topo order | DAG (even negative) | O(V+E) |
| A* | With admissible heuristic | Problem-dependent |

```java
// Dijkstra — Network Delay Time (LC 743)
int networkDelayTime(int[][] times, int n, int k) {
    List<List<int[]>> g = new ArrayList<>();
    for (int i = 0; i <= n; i++) g.add(new ArrayList<>());
    for (int[] t : times) g.get(t[0]).add(new int[]{t[1], t[2]});
    int[] dist = new int[n + 1]; Arrays.fill(dist, Integer.MAX_VALUE); dist[k] = 0;
    PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[1], b[1]));
    pq.offer(new int[]{k, 0});
    while (!pq.isEmpty()) {
        int[] cur = pq.poll(); int u = cur[0], d = cur[1];
        if (d > dist[u]) continue;                   // stale entry (lazy deletion)
        for (int[] e : g.get(u)) {
            int v = e[0], nd = d + e[1];
            if (nd < dist[v]) { dist[v] = nd; pq.offer(new int[]{v, nd}); }
        }
    }
    int max = 0;
    for (int i = 1; i <= n; i++) { if (dist[i] == Integer.MAX_VALUE) return -1; max = Math.max(max, dist[i]); }
    return max;
}
```
Why Dijkstra fails with negative edges: once a node is popped, it's assumed final; a later negative edge could reduce it.

Variants: **Path with Minimum Effort** (LC 1631 — Dijkstra with max instead of sum, or BS + BFS), **Cheapest Flights Within K Stops** (LC 787 — Bellman-Ford K+1 rounds / BFS by stops), Swim in Rising Water (LC 778), probability max path (LC 1514, max-heap with products).

## Minimum spanning tree
- **Kruskal**: sort edges by weight, add if it connects two components (DSU). O(E log E).
- **Prim**: grow from a node with a min-heap of crossing edges. O(E log V). Better for dense graphs.
- LC 1584 Min Cost to Connect All Points, LC 1135.

## Advanced (know they exist; CP track goes deeper)
Tarjan's **bridges & articulation points** (LC 1192 Critical Connections: `low[v] > disc[u]` → bridge), **strongly connected components** (Kosaraju/Tarjan), bipartite check (BFS 2-colouring, LC 785), Eulerian path (Hierholzer — Reconstruct Itinerary LC 332), max flow (Edmonds-Karp/Dinic), LCA with binary lifting.

## Must-solve list
Number of Islands (200), Clone Graph (133), Rotting Oranges (994), Pacific Atlantic (417), Course Schedule I/II (207/210), Word Ladder (127), Redundant Connection (684), Accounts Merge (721), Network Delay Time (743), Cheapest Flights K Stops (787), Path With Minimum Effort (1631), Min Cost to Connect Points (1584), Is Graph Bipartite (785), Critical Connections (1192), Alien Dictionary (269), Shortest Path with Obstacle Elimination (1293).

## Quick check questions

<details><summary>1. Why mark nodes visited when enqueuing in BFS rather than when dequeuing?</summary>

Otherwise the same node can be enqueued multiple times by different neighbours before it's processed — wasting time/memory (potentially exponential on grids) and, in some problems, producing wrong counts.
</details>

<details><summary>2. How do you detect a cycle in a directed graph?</summary>

DFS with three states; reaching a node that is currently on the recursion stack (GRAY) means a back edge → cycle. Or Kahn's algorithm: if the topological order has fewer than V nodes, a cycle exists.
</details>

<details><summary>3. When would you use union-find instead of BFS/DFS?</summary>

When edges arrive incrementally (online connectivity), when you need to repeatedly ask "are these connected?" while merging, for Kruskal's MST, or for grouping by equivalence (accounts merge). BFS/DFS is better for paths/distances on a static graph.
</details>

## Questions asked at top companies

<details><summary>Number of Islands (LC 200). <em>· Amazon, Google, Microsoft, Meta, Uber</em></summary>

For each unvisited land cell, DFS/BFS to sink the island; count starts. O(R·C).
</details>

<details><summary>Course Schedule I/II — detect cycle / topological order (LC 207/210). <em>· Amazon, Google, Meta, Uber</em></summary>

Kahn's algorithm with in-degrees (fewer than n processed → cycle) or DFS with three colours.
</details>

<details><summary>Clone Graph (LC 133). <em>· Meta, Google, Amazon</em></summary>

DFS/BFS with HashMap original → clone, creating clones on first visit and wiring neighbours.
</details>

<details><summary>Rotting Oranges (LC 994). <em>· Amazon, Microsoft, Flipkart</em></summary>

Multi-source BFS from all rotten oranges; minutes = BFS levels; −1 if any fresh remains.
</details>

<details><summary>Word Ladder (LC 127). <em>· Amazon, Meta, LinkedIn</em></summary>

BFS over words with wildcard pattern map (h*t → words) to find neighbours; bidirectional BFS optimisation.
</details>

<details><summary>Network Delay Time / Dijkstra (LC 743). <em>· Google, Amazon, Uber</em></summary>

Min-heap Dijkstra with lazy deletion; answer = max distance or −1. O((V+E) log V).
</details>

<details><summary>Cheapest Flights Within K Stops (LC 787). <em>· Amazon, Google, Airbnb-style</em></summary>

Bellman-Ford for K+1 rounds using copies of the distance array, or BFS by stops with pruning.
</details>

<details><summary>Number of connected components / Redundant Connection (LC 323/684). <em>· Amazon, Google, LinkedIn</em></summary>

Union-Find; an edge joining already-connected nodes is redundant.
</details>

<details><summary>Is Graph Bipartite (LC 785). <em>· Meta, Amazon</em></summary>

BFS/DFS two-colouring; conflict → not bipartite.
</details>

<details><summary>Accounts Merge (LC 721). <em>· Meta, Google, Microsoft</em></summary>

Union-Find over emails (or graph DFS), then group emails by root and sort.
</details>

<details><summary>Shortest path in a binary matrix / maze (LC 1091). <em>· Amazon, Google, Swiggy</em></summary>

BFS over 8 directions from (0,0), mark visited when enqueuing.
</details>

<details><summary>Critical Connections in a Network (LC 1192). <em>· Amazon, Google</em></summary>

Tarjan's bridge-finding with discovery times and low-links: edge (u,v) is a bridge if low[v] > disc[u].
</details>

## End-to-end scenarios

<details><summary>Scenario: Build a "people you may know" feature — suggest friends-of-friends ranked by mutual friend count.</summary>

BFS to depth 2 from the user over adjacency lists; count how many friends connect to each candidate (HashMap candidate → mutual count), exclude existing friends and self, take top-k with a heap. At scale: precompute offline (Spark) and store suggestions; handle celebrity nodes by sampling.
</details>

<details><summary>Scenario: Given microservice dependencies, compute a safe deployment order and detect circular dependencies.</summary>

Directed graph service → dependency; Kahn's topological sort yields an order (deploy dependencies first); leftover nodes form cycles — report them (DFS to extract the cycle path). Parallel deployment "waves" = BFS levels of Kahn's algorithm.
</details>
