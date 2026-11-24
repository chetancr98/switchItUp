---
title: Trees & BSTs — Traversals, Recursion Patterns, LCA, Serialization
level: 2
tags: binary tree, bst, dfs, bfs, lca
---
<!-- deepened -->

## Start here: the basics

### What is a tree?
A hierarchy of nodes: one **root**, each node has **children**, nodes without children are **leaves**. Like a folder structure or an org chart. A **binary tree** has at most two children per node (left, right).

```java
class TreeNode { int val; TreeNode left, right; TreeNode(int v) { val = v; } }
//        1
//       / \
//      2   3
//     / \
//    4   5
```

### Traversals — four ways to visit every node
| Traversal | Order | For the tree above |
|---|---|---|
| Preorder | root, left, right | 1 2 4 5 3 |
| Inorder | left, root, right | 4 2 5 1 3 |
| Postorder | left, right, root | 4 5 2 3 1 |
| Level order (BFS) | level by level | 1 2 3 4 5 |

```java
void inorder(TreeNode n) {
    if (n == null) return;      // base case
    inorder(n.left);
    System.out.print(n.val + " ");
    inorder(n.right);
}
int height(TreeNode n) { return n == null ? 0 : 1 + Math.max(height(n.left), height(n.right)); }
```

### Binary Search Tree (BST)
For every node: all values in the left subtree are smaller, all in the right are larger. Search is like binary search: O(height) — O(log n) when balanced. **Inorder traversal of a BST gives sorted order.**

### Thinking recursively about trees
Most tree problems: "solve for left subtree, solve for right subtree, combine at the current node." Trust the recursion.

---

## Traversals — know recursive and iterative

```java
// Inorder iterative (left, root, right) — gives sorted order for a BST
List<Integer> inorder(TreeNode root) {
    List<Integer> out = new ArrayList<>(); Deque<TreeNode> st = new ArrayDeque<>();
    TreeNode cur = root;
    while (cur != null || !st.isEmpty()) {
        while (cur != null) { st.push(cur); cur = cur.left; }
        cur = st.pop(); out.add(cur.val); cur = cur.right;
    }
    return out;
}

// Level order (BFS) — LC 102
List<List<Integer>> levelOrder(TreeNode root) {
    List<List<Integer>> res = new ArrayList<>();
    if (root == null) return res;
    Deque<TreeNode> q = new ArrayDeque<>(List.of(root));
    while (!q.isEmpty()) {
        int size = q.size(); List<Integer> level = new ArrayList<>(size);
        for (int i = 0; i < size; i++) {
            TreeNode n = q.poll(); level.add(n.val);
            if (n.left != null) q.offer(n.left);
            if (n.right != null) q.offer(n.right);
        }
        res.add(level);
    }
    return res;
}
```
BFS variants: zigzag (LC 103), right side view (LC 199: last of each level), averages, connect next pointers (LC 116/117), min depth (BFS stops at first leaf), vertical order (LC 987: BFS with column index + TreeMap).

Morris traversal: O(1) space inorder by temporarily threading right pointers — a "wow" answer for follow-ups.

## The two recursion styles

### 1. Top-down (pass state down)
```java
// Path Sum (LC 112): carry remaining sum
boolean hasPathSum(TreeNode n, int remaining) {
    if (n == null) return false;
    remaining -= n.val;
    if (n.left == null && n.right == null) return remaining == 0;
    return hasPathSum(n.left, remaining) || hasPathSum(n.right, remaining);
}
```

### 2. Bottom-up (return info up; combine) — most tree "hards"
Return from each subtree what the parent needs; update a global answer with what passes *through* the node.

```java
// Diameter (LC 543): longest path between any two nodes
int diameter;
int depth(TreeNode n) {
    if (n == null) return 0;
    int l = depth(n.left), r = depth(n.right);
    diameter = Math.max(diameter, l + r);       // path through n
    return 1 + Math.max(l, r);                  // what the parent can extend
}

// Binary Tree Maximum Path Sum (LC 124)
int best = Integer.MIN_VALUE;
int gain(TreeNode n) {
    if (n == null) return 0;
    int l = Math.max(0, gain(n.left)), r = Math.max(0, gain(n.right));  // drop negative branches
    best = Math.max(best, n.val + l + r);
    return n.val + Math.max(l, r);
}

// Balanced check (LC 110): return height or -1 for unbalanced → O(n)
int h(TreeNode n) {
    if (n == null) return 0;
    int l = h(n.left); if (l < 0) return -1;
    int r = h(n.right); if (r < 0) return -1;
    return Math.abs(l - r) > 1 ? -1 : 1 + Math.max(l, r);
}
```
Same pattern: House Robber III (LC 337 — return pair [rob, skip]), Binary Tree Cameras (LC 968 — return state), Longest Univalue Path, Count Good Nodes (top-down max), Distribute Coins (LC 979 — return excess).

## Lowest Common Ancestor

```java
// Binary tree (LC 236)
TreeNode lca(TreeNode root, TreeNode p, TreeNode q) {
    if (root == null || root == p || root == q) return root;
    TreeNode l = lca(root.left, p, q), r = lca(root.right, p, q);
    if (l != null && r != null) return root;     // p and q in different subtrees
    return l != null ? l : r;
}
// BST (LC 235): walk down — if both < root go left, both > go right, else root.
```
Many queries on a static tree → **binary lifting** O(log n) per query (CP track).

## BST essentials
- Invariant: left subtree < node < right subtree (for **all** descendants, not just children).
- **Validate BST** (LC 98): pass `(min, max)` bounds down (use `long` or nullable bounds), or check inorder is strictly increasing.
- Kth smallest (LC 230): inorder with counter; follow-up with frequent inserts → augment nodes with subtree sizes.
- Insert/delete (LC 450: replace with inorder successor), search O(h).
- Balanced BSTs (AVL, Red-Black) guarantee h = O(log n) — Java's `TreeMap`.
- Convert sorted array to BST (LC 108: middle as root).
- BST iterator (LC 173): controlled iterative inorder, O(h) memory.

## Construction & serialization
- Build from preorder + inorder (LC 105): first preorder element is root; split inorder by root index (HashMap for O(1) lookup) → O(n).
- **Serialize/Deserialize** (LC 297): preorder with null markers.

```java
public String serialize(TreeNode root) {
    StringBuilder sb = new StringBuilder();
    ser(root, sb);
    return sb.toString();
}
private void ser(TreeNode n, StringBuilder sb) {
    if (n == null) { sb.append("#,"); return; }
    sb.append(n.val).append(','); ser(n.left, sb); ser(n.right, sb);
}
public TreeNode deserialize(String data) {
    Deque<String> tokens = new ArrayDeque<>(Arrays.asList(data.split(",")));
    return des(tokens);
}
private TreeNode des(Deque<String> t) {
    String s = t.poll();
    if (s.equals("#")) return null;
    TreeNode n = new TreeNode(Integer.parseInt(s));
    n.left = des(t); n.right = des(t);
    return n;
}
```

## Path sum with prefix sums (LC 437)
Count paths (downward) summing to target: DFS carrying prefix-sum frequency map; add on entry, remove on exit (backtrack). O(n).

## Must-solve list
| Problem | Idea |
|---|---|
| Max Depth (104), Invert (226), Same Tree (100), Symmetric (101) | Basics |
| Level Order (102), Right Side View (199) | BFS |
| Diameter (543), Balanced (110) | Bottom-up |
| Max Path Sum (124) | Bottom-up + global |
| LCA (236, 235) | Classic |
| Validate BST (98), Kth Smallest (230) | BST properties |
| Construct from Pre+In (105) | Recursion + map |
| Serialize/Deserialize (297) | Preorder + nulls |
| Path Sum III (437) | Prefix sums on tree |
| Binary Tree Cameras (968) | State DP on tree |
| All Nodes Distance K (863) | Parent map + BFS |

## Quick check questions

<details><summary>1. What's the space complexity of recursive DFS on a tree?</summary>

O(h) for the call stack: O(log n) for a balanced tree, O(n) for a skewed one. Very deep trees can overflow the Java stack (~10⁴–10⁵ frames) → use iterative traversal.
</details>

<details><summary>2. Why is checking only `left.val < node.val < right.val` wrong for BST validation?</summary>

The BST property applies to entire subtrees: a node deep in the left subtree could still be larger than an ancestor. Pass down min/max bounds or verify the inorder sequence is strictly increasing.
</details>

## Questions asked at top companies

<details><summary>Maximum depth / minimum depth of a binary tree (LC 104/111). <em>· Amazon, Microsoft, Infosys</em></summary>

Max: 1 + max(left, right). Min: careful with one-sided nodes (use BFS and stop at first leaf, or handle null child).
</details>

<details><summary>Level order traversal / zigzag / right side view (LC 102/103/199). <em>· Amazon, Meta, Microsoft</em></summary>

BFS with queue and level size; zigzag alternates add-first/add-last; right view takes last node per level.
</details>

<details><summary>Validate a BST (LC 98). <em>· Amazon, Meta, Bloomberg</em></summary>

Recurse with (min, max) bounds using long/nullable bounds, or inorder strictly increasing.
</details>

<details><summary>Lowest Common Ancestor in a binary tree and in a BST (LC 236/235). <em>· Meta, Amazon, Microsoft, LinkedIn</em></summary>

Binary tree: if root is p or q return it; recurse; if both sides non-null, root is LCA. BST: go left/right while both on one side.
</details>

<details><summary>Diameter of binary tree (LC 543). <em>· Meta, Amazon, Google</em></summary>

Postorder computing heights; update global max with left+right. O(n).
</details>

<details><summary>Binary Tree Maximum Path Sum (LC 124). <em>· Meta, Google, Amazon, Microsoft</em></summary>

Gain(node) = val + max(0, left, right); update global with val + max(0,left) + max(0,right).
</details>

<details><summary>Serialize and deserialize a binary tree (LC 297). <em>· Google, Meta, Amazon, Uber</em></summary>

Preorder with null markers and a token queue; or BFS level order with nulls.
</details>

<details><summary>Construct a tree from preorder and inorder (LC 105). <em>· Amazon, Microsoft, Bloomberg</em></summary>

Root = next preorder value; split inorder using a value→index map; recurse. O(n).
</details>

<details><summary>Kth smallest element in a BST (LC 230). <em>· Amazon, Google, Uber</em></summary>

Inorder traversal with counter (iterative stack stops early). Follow-up for frequent updates: augment nodes with subtree sizes.
</details>

<details><summary>Is the tree symmetric / are two trees identical / invert a tree (LC 101/100/226). <em>· Amazon, Microsoft, Infosys</em></summary>

Mirror recursion comparing left.left with right.right and left.right with right.left; identical compares structurally; invert swaps children recursively.
</details>

<details><summary>Vertical order traversal / top view / bottom view. <em>· Amazon, Flipkart, Walmart (very common in India)</em></summary>

BFS carrying horizontal distance; TreeMap hd → list (vertical); top view keeps first per hd, bottom view keeps last.
</details>

<details><summary>Path Sum II / III (LC 113/437). <em>· Amazon, Meta</em></summary>

II: DFS with path list & backtracking. III: prefix-sum map along the root-to-node path, add/remove on enter/exit. O(n).
</details>

## End-to-end scenarios

<details><summary>Scenario: Given an org chart (employee → manager), answer many queries "who is the lowest common manager of A and B?" efficiently.</summary>

Build the tree; one query: LCA via parent pointers with depth equalisation O(h). Many queries: preprocess binary lifting tables O(n log n), answer each in O(log n); or Euler tour + sparse table for O(1) queries.
</details>

<details><summary>Scenario: Implement autocomplete-like "find all products priced between ₹500 and ₹1,000 in sorted order" with frequent inserts.</summary>

Balanced BST (TreeMap price → list of products); `subMap(500, true, 1000, true)` gives the range in O(log n + k); inserts O(log n). Discuss DB index equivalents (B+ tree range scan).
</details>
