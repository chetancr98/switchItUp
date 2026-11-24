---
title: Coding Q&A 2 — Linked Lists, Stacks & Queues (15 problems with solutions)
minutes: 200
level: 2
tags: coding, linked list, stack, queue, practice
---
<!-- deepened -->

## How to use this module
Try each problem for 20 minutes before expanding the solution. Draw pointer diagrams for every linked-list question — interviewers often ask you to.

```java
class ListNode { int val; ListNode next; ListNode(int v) { val = v; } ListNode(int v, ListNode n) { val = v; next = n; } }
```

---

### 1. Reverse a linked list — LC 206 · Amazon, Microsoft, TCS, Infosys
<details><summary>Solution</summary>

```java
public ListNode reverseList(ListNode head) {
    ListNode prev = null;
    while (head != null) { ListNode next = head.next; head.next = prev; prev = head; head = next; }
    return prev;
}
// recursive
public ListNode reverseRec(ListNode head) {
    if (head == null || head.next == null) return head;
    ListNode newHead = reverseRec(head.next);
    head.next.next = head; head.next = null;
    return newHead;
}
```
O(n); iterative O(1) space, recursive O(n) stack.
</details>

### 2. Merge two sorted lists — LC 21 · Amazon, Microsoft, Apple
<details><summary>Solution</summary>

```java
public ListNode mergeTwoLists(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), t = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { t.next = a; a = a.next; } else { t.next = b; b = b.next; }
        t = t.next;
    }
    t.next = (a != null) ? a : b;
    return dummy.next;
}
```
</details>

### 3. Linked list cycle II — LC 142 · Amazon, Microsoft, Goldman Sachs
<details><summary>Solution</summary>

Floyd: slow/fast meet; reset one to head; advance both by one; meeting point = cycle start (full code in DSA → Linked lists). O(n), O(1).
</details>

### 4. Remove Nth node from end — LC 19 · Meta, Amazon, Adobe
<details><summary>Solution</summary>

```java
public ListNode removeNthFromEnd(ListNode head, int n) {
    ListNode dummy = new ListNode(0, head), fast = dummy, slow = dummy;
    for (int i = 0; i <= n; i++) fast = fast.next;          // gap of n+1
    while (fast != null) { fast = fast.next; slow = slow.next; }
    slow.next = slow.next.next;
    return dummy.next;
}
```
One pass; dummy handles removing the head.
</details>

### 5. Palindrome linked list — LC 234 · Amazon, Meta, Microsoft
<details><summary>Solution</summary>

```java
public boolean isPalindrome(ListNode head) {
    ListNode slow = head, fast = head;
    while (fast != null && fast.next != null) { slow = slow.next; fast = fast.next.next; }
    ListNode second = reverseList(slow), p = head, q = second;
    boolean ok = true;
    while (q != null) { if (p.val != q.val) { ok = false; break; } p = p.next; q = q.next; }
    reverseList(second);                                       // restore (good manners)
    return ok;
}
```
O(n), O(1).
</details>

### 6. Add two numbers — LC 2 · Amazon, Microsoft, Bloomberg
<details><summary>Solution</summary>

```java
public ListNode addTwoNumbers(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), t = dummy;
    int carry = 0;
    while (a != null || b != null || carry != 0) {
        int sum = carry + (a != null ? a.val : 0) + (b != null ? b.val : 0);
        t.next = new ListNode(sum % 10); t = t.next; carry = sum / 10;
        if (a != null) a = a.next;
        if (b != null) b = b.next;
    }
    return dummy.next;
}
```
</details>

### 7. Merge k sorted lists — LC 23 · Amazon, Google, Meta
<details><summary>Solution</summary>

```java
public ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>((x, y) -> Integer.compare(x.val, y.val));
    for (ListNode l : lists) if (l != null) pq.offer(l);
    ListNode dummy = new ListNode(0), t = dummy;
    while (!pq.isEmpty()) {
        ListNode n = pq.poll(); t.next = n; t = n;
        if (n.next != null) pq.offer(n.next);
    }
    return dummy.next;
}
```
O(N log k).
</details>

### 8. Copy list with random pointer — LC 138 · Amazon, Meta, Microsoft
<details><summary>Solution</summary>

```java
public Node copyRandomList(Node head) {
    Map<Node, Node> copy = new HashMap<>();
    for (Node p = head; p != null; p = p.next) copy.put(p, new Node(p.val));
    for (Node p = head; p != null; p = p.next) {
        copy.get(p).next = copy.get(p.next);
        copy.get(p).random = copy.get(p.random);
    }
    return copy.get(head);
}
```
O(n) time/space. O(1)-space variant: interleave copies A→A'→B→B', set randoms, then split.
</details>

### 9. LRU cache — LC 146 · Amazon, Microsoft, Google, PhonePe
<details><summary>Solution</summary>

HashMap key → node + doubly linked list with sentinel head/tail; `get` moves node to front; `put` updates or inserts at front and evicts `tail.prev` when over capacity (full code in DSA → Linked lists). All O(1).
</details>

### 10. Valid parentheses — LC 20 · Amazon, Meta, Infosys
<details><summary>Solution</summary>

```java
public boolean isValid(String s) {
    Deque<Character> st = new ArrayDeque<>();
    for (char c : s.toCharArray()) {
        switch (c) {
            case '(' -> st.push(')');
            case '[' -> st.push(']');
            case '{' -> st.push('}');
            default -> { if (st.isEmpty() || st.pop() != c) return false; }
        }
    }
    return st.isEmpty();
}
```
</details>

### 11. Min stack — LC 155 · Amazon, Bloomberg, Microsoft
<details><summary>Solution</summary>

```java
class MinStack {
    private final Deque<int[]> st = new ArrayDeque<>();     // {value, minSoFar}
    public void push(int x) { st.push(new int[]{x, st.isEmpty() ? x : Math.min(x, st.peek()[1])}); }
    public void pop() { st.pop(); }
    public int top() { return st.peek()[0]; }
    public int getMin() { return st.peek()[1]; }
}
```
</details>

### 12. Daily temperatures — LC 739 · Amazon, Google, Meta
<details><summary>Solution</summary>

```java
public int[] dailyTemperatures(int[] t) {
    int[] res = new int[t.length];
    Deque<Integer> st = new ArrayDeque<>();
    for (int i = 0; i < t.length; i++) {
        while (!st.isEmpty() && t[st.peek()] < t[i]) { int j = st.pop(); res[j] = i - j; }
        st.push(i);
    }
    return res;
}
```
O(n).
</details>

### 13. Implement queue using stacks — LC 232 · Microsoft, Amazon
<details><summary>Solution</summary>

```java
class MyQueue {
    private final Deque<Integer> in = new ArrayDeque<>(), out = new ArrayDeque<>();
    public void push(int x) { in.push(x); }
    public int pop() { peek(); return out.pop(); }
    public int peek() { if (out.isEmpty()) while (!in.isEmpty()) out.push(in.pop()); return out.peek(); }
    public boolean empty() { return in.isEmpty() && out.isEmpty(); }
}
```
Amortized O(1).
</details>

### 14. Sliding window maximum — LC 239 · Amazon, Google (hard)
<details><summary>Solution</summary>

Monotonic deque of indices (values decreasing), pop expired from front, pop smaller from back (code in DSA → Stacks & queues). O(n).
</details>

### 15. Largest rectangle in histogram — LC 84 · Google, Amazon (hard)
<details><summary>Solution</summary>

Monotonic increasing stack with sentinel 0 at the end; on each pop compute `height × (i − previousSmallerIndex − 1)` (code in DSA → Stacks & queues). O(n).
</details>

## End-to-end scenario

<details><summary>Scenario: Implement an "undo/redo" feature for a text editor supporting type(text), delete(k), undo(), redo().</summary>

Two stacks of commands (Command pattern): each operation pushes an inverse-able command to `undo` and clears `redo`; `undo` pops from undo, applies inverse, pushes to redo; `redo` re-applies. Store text in a StringBuilder (or rope/gap buffer for large docs). Merge consecutive typing into one command. All operations O(size of change).
</details>
