---
title: Coding Q&A 3 — Trees & Graphs (16 problems with solutions)
minutes: 240
level: 3
tags: coding, trees, graphs, bfs, dfs, practice
---
<!-- deepened -->

## How to use this module
For trees, first decide: **top-down** (pass info to children) or **bottom-up** (return info to parent)? For graphs: **BFS** for shortest steps, **DFS** for exploring/components, **topological sort** for dependencies, **Dijkstra** for weighted shortest paths.

```java
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
```

---

### 1. Maximum depth — LC 104 · Amazon, LinkedIn
<details><summary>Solution</summary>

```java
public int maxDepth(TreeNode r) { return r == null ? 0 : 1 + Math.max(maxDepth(r.left), maxDepth(r.right)); }
```
</details>

### 2. Invert binary tree — LC 226 · Google, Amazon
<details><summary>Solution</summary>

```java
public TreeNode invertTree(TreeNode r) {
    if (r == null) return null;
    TreeNode t = r.left; r.left = invertTree(r.right); r.right = invertTree(t);
    return r;
}
```
</details>

### 3. Level order traversal — LC 102 · Amazon, Meta, Microsoft
<details><summary>Solution</summary>

```java
public List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> q = new ArrayDeque<>(); q.offer(root);
    while (!q.isEmpty()) {
        List<Integer> level = new ArrayList<>();
        for (int i = q.size(); i > 0; i--) {
            TreeNode n = q.poll(); level.add(n.val);
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add(level);
    }
    return res;
}
```
</details>

### 4. Validate BST — LC 98 · Amazon, Meta, Bloomberg
<details><summary>Solution</summary>

```java
public boolean isValidBST(TreeNode r) { return valid(r, Long.MIN_VALUE, Long.MAX_VALUE); }
private boolean valid(TreeNode n, long lo, long hi) {
    if (n == null) return true;
    if (n.val <= lo || n.val >= hi) return false;
    return valid(n.left, lo, n.val) && valid(n.right, n.val, hi);
}
```
</details>

### 5. Lowest common ancestor — LC 236 · Meta, Amazon, Microsoft
<details><summary>Solution</summary>

```java
public TreeNode lowestCommonAncestor(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode l = lowestCommonAncestor(root.left, p, q), r = lowestCommonAncestor(root.right, p, q);
    return l != null && r != null ? root : (l != null ? l : r);
}
```
</details>

### 6. Diameter of binary tree — LC 543 · Meta, Google
<details><summary>Solution</summary>

```java
private int best;
public int diameterOfBinaryTree(TreeNode root) { best = 0; height(root); return best; }
private int height(TreeNode n) {
    if (n == null) return 0;
    int l = height(n.left), r = height(n.right);
    best = Math.max(best, l + r);
    return 1 + Math.max(l, r);
}
```
</details>

### 7. Binary tree right side view — LC 199 · Meta, Amazon
<details><summary>Solution</summary>

BFS and take the last node of each level; or DFS visiting right child first, adding the first node seen at each new depth.
```java
public List<Integer> rightSideView(TreeNode root) {
    List<Integer> res = new ArrayList<>(); dfs(root, 0, res); return res;
}
private void dfs(TreeNode n, int depth, List<Integer> res) {
    if (n == null) return;
    if (depth == res.size()) res.add(n.val);
    dfs(n.right, depth + 1, res); dfs(n.left, depth + 1, res);
}
```
</details>

### 8. Kth smallest in BST — LC 230 · Amazon, Google
<details><summary>Solution</summary>

```java
public int kthSmallest(TreeNode root, int k) {
    Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode cur = root;
    while (true) {
        while (cur != null) { st.push(cur); cur = cur.left; }
        cur = st.pop();
        if (--k == 0) return cur.val;
        cur = cur.right;
    }
}
```
O(h + k).
</details>

### 9. Serialize and deserialize binary tree — LC 297 · Google, Meta, Amazon (hard)
<details><summary>Solution</summary>

Preorder with `#` for null, split on commas, rebuild recursively from a queue of tokens (full code in DSA → Trees). O(n).
</details>

### 10. Binary tree maximum path sum — LC 124 · Meta, Google (hard)
<details><summary>Solution</summary>

```java
private int max;
public int maxPathSum(TreeNode root) { max = Integer.MIN_VALUE; gain(root); return max; }
private int gain(TreeNode n) {
    if (n == null) return 0;
    int l = Math.max(0, gain(n.left)), r = Math.max(0, gain(n.right));
    max = Math.max(max, n.val + l + r);
    return n.val + Math.max(l, r);
}
```
</details>

### 11. Number of islands — LC 200 · Amazon, Google, Microsoft
<details><summary>Solution</summary>

```java
public int numIslands(char[][] g) {
    int count = 0;
    for (int r = 0; r < g.length; r++)
        for (int c = 0; c < g[0].length; c++)
            if (g[r][c] == '1') { count++; sink(g, r, c); }
    return count;
}
private void sink(char[][] g, int r, int c) {
    if (r < 0 || c < 0 || r >= g.length || c >= g[0].length || g[r][c] != '1') return;
    g[r][c] = '0';
    sink(g, r + 1, c); sink(g, r - 1, c); sink(g, r, c + 1); sink(g, r, c - 1);
}
```
O(R·C). Mention iterative BFS for very large grids (stack depth).
</details>

### 12. Course schedule — LC 207 · Amazon, Google, Uber
<details><summary>Solution</summary>

```java
public boolean canFinish(int n, int[][] pre) {
    List<List<Integer>> g = new ArrayList<>(); int[] indeg = new int[n];
    for (int i = 0; i < n; i++) g.add(new ArrayList<>());
    for (int[] p : pre) { g.get(p[1]).add(p[0]); indeg[p[0]]++; }
    Deque<Integer> q = new ArrayDeque<>();
    for (int i = 0; i < n; i++) if (indeg[i] == 0) q.offer(i);
    int done = 0;
    while (!q.isEmpty()) { int u = q.poll(); done++; for (int v : g.get(u)) if (--indeg[v] == 0) q.offer(v); }
    return done == n;
}
```
</details>

### 13. Rotting oranges — LC 994 · Amazon, Microsoft
<details><summary>Solution</summary>

```java
public int orangesRotting(int[][] g) {
    int R = g.length, C = g[0].length, fresh = 0, minutes = 0;
    Deque<int[]> q = new ArrayDeque<>();
    for (int r = 0; r < R; r++) for (int c = 0; c < C; c++) {
        if (g[r][c] == 2) q.offer(new int[]{r, c}); else if (g[r][c] == 1) fresh++;
    }
    int[][] dirs = {{1,0},{-1,0},{0,1},{0,-1}};
    while (!q.isEmpty() && fresh > 0) {
        for (int i = q.size(); i > 0; i--) {
            int[] cur = q.poll();
            for (int[] d : dirs) {
                int nr = cur[0] + d[0], nc = cur[1] + d[1];
                if (nr >= 0 && nc >= 0 && nr < R && nc < C && g[nr][nc] == 1) { g[nr][nc] = 2; fresh--; q.offer(new int[]{nr, nc}); }
            }
        }
        minutes++;
    }
    return fresh == 0 ? minutes : -1;
}
```
</details>

### 14. Clone graph — LC 133 · Meta, Google
<details><summary>Solution</summary>

```java
public Node cloneGraph(Node node) { return clone(node, new HashMap<>()); }
private Node clone(Node n, Map<Node, Node> seen) {
    if (n == null) return null;
    if (seen.containsKey(n)) return seen.get(n);
    Node c = new Node(n.val); seen.put(n, c);
    for (Node nb : n.neighbors) c.neighbors.add(clone(nb, seen));
    return c;
}
```
</details>

### 15. Network delay time (Dijkstra) — LC 743 · Google, Amazon
<details><summary>Solution</summary>

Min-heap of (node, dist), skip stale entries, relax edges; answer = max dist or −1 (full code in DSA → Graphs). O((V+E) log V).
</details>

### 16. Word ladder — LC 127 · Amazon, Meta (hard)
<details><summary>Solution</summary>

```java
public int ladderLength(String begin, String end, List<String> words) {
    Set<String> dict = new HashSet<>(words);
    if (!dict.contains(end)) return 0;
    Deque<String> q = new ArrayDeque<>(List.of(begin));
    dict.remove(begin);
    for (int steps = 1; !q.isEmpty(); steps++) {
        for (int i = q.size(); i > 0; i--) {
            char[] w = q.poll().toCharArray();
            for (int j = 0; j < w.length; j++) {
                char orig = w[j];
                for (char c = 'a'; c <= 'z'; c++) {
                    w[j] = c;
                    String next = new String(w);
                    if (next.equals(end)) return steps + 1;
                    if (dict.remove(next)) q.offer(next);     // remove = mark visited
                }
                w[j] = orig;
            }
        }
    }
    return 0;
}
```
O(N · L · 26).
</details>

## End-to-end scenario

<details><summary>Scenario: Given flight routes with prices, find the cheapest way from city A to B with at most 2 layovers, and print the route.</summary>

Bellman-Ford limited to K+1 = 3 edges (copy distances each round to avoid using more edges), tracking parent per (round, node) to reconstruct the path; or BFS/Dijkstra over state (city, stops) with a parent map. Discuss unreachable destinations, ties, and when to use plain Dijkstra (no stop limit).
</details>
