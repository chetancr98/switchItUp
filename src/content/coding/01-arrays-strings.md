---
title: Coding Q&A 1 — Arrays & Strings (20 problems with solutions)
minutes: 300
level: 2
tags: coding, arrays, strings, practice
---
<!-- deepened -->

## How to use this module

1. Read the problem. **Set a 20-minute timer** and solve it on paper or in your IDE.
2. Say your approach and its complexity out loud.
3. Only then expand the solution. Compare approach, edge cases and complexity.
4. Mark the module "Revise later" if more than 3 problems needed the solution; re-solve those in 3 days.

Company tags show where each problem is frequently reported (LeetCode/GFG interview experiences). LC numbers let you submit on LeetCode.

---

### 1. Two Sum — LC 1 · Amazon, Google, Adobe
Given an array and a target, return indices of two numbers that add up to the target.

<details><summary>Solution</summary>

One pass with a HashMap from value to index: before storing `x`, check whether `target − x` was seen.

```java
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        Integer j = seen.get(target - nums[i]);
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);
    }
    return new int[0];
}
```
Time O(n), space O(n). Edge: duplicates like `[3,3]`, target 6 — works because we check before inserting.
</details>

### 2. Reverse words in a string — LC 151 · Microsoft, Amazon, Infosys
`"  the sky   is blue "` → `"blue is sky the"`.

<details><summary>Solution</summary>

```java
public String reverseWords(String s) {
    String[] words = s.trim().split("\\s+");
    StringBuilder sb = new StringBuilder();
    for (int i = words.length - 1; i >= 0; i--) {
        sb.append(words[i]);
        if (i > 0) sb.append(' ');
    }
    return sb.toString();
}
```
O(n). Follow-up (in-place on char array): reverse the whole array, then reverse each word, then clean spaces.
</details>

### 3. Valid anagram — LC 242 · Amazon, Bloomberg, TCS
<details><summary>Solution</summary>

```java
public boolean isAnagram(String s, String t) {
    if (s.length() != t.length()) return false;
    int[] cnt = new int[26];
    for (int i = 0; i < s.length(); i++) { cnt[s.charAt(i) - 'a']++; cnt[t.charAt(i) - 'a']--; }
    for (int c : cnt) if (c != 0) return false;
    return true;
}
```
O(n), O(1). For Unicode use a HashMap.
</details>

### 4. Best time to buy and sell stock — LC 121 · Amazon, Microsoft, Goldman Sachs
<details><summary>Solution</summary>

```java
public int maxProfit(int[] prices) {
    int min = Integer.MAX_VALUE, best = 0;
    for (int p : prices) { min = Math.min(min, p); best = Math.max(best, p - min); }
    return best;
}
```
O(n), O(1).
</details>

### 5. Maximum subarray (Kadane) — LC 53 · Microsoft, Amazon, Walmart
<details><summary>Solution</summary>

```java
public int maxSubArray(int[] a) {
    int cur = a[0], best = a[0];
    for (int i = 1; i < a.length; i++) { cur = Math.max(a[i], cur + a[i]); best = Math.max(best, cur); }
    return best;
}
```
O(n). All-negative arrays return the largest element.
</details>

### 6. Move zeroes to the end — LC 283 · Meta, Microsoft, Paytm
<details><summary>Solution</summary>

```java
public void moveZeroes(int[] a) {
    int w = 0;
    for (int x : a) if (x != 0) a[w++] = x;
    while (w < a.length) a[w++] = 0;
}
```
O(n), in place, keeps relative order.
</details>

### 7. Longest substring without repeating characters — LC 3 · Amazon, Google, Adobe
<details><summary>Solution</summary>

```java
public int lengthOfLongestSubstring(String s) {
    int[] last = new int[128]; Arrays.fill(last, -1);
    int best = 0;
    for (int l = 0, r = 0; r < s.length(); r++) {
        char c = s.charAt(r);
        if (last[c] >= l) l = last[c] + 1;    // jump past the previous occurrence
        last[c] = r;
        best = Math.max(best, r - l + 1);
    }
    return best;
}
```
O(n), O(charset).
</details>

### 8. Product of array except self — LC 238 · Amazon, Meta
<details><summary>Solution</summary>

```java
public int[] productExceptSelf(int[] a) {
    int n = a.length; int[] out = new int[n];
    out[0] = 1;
    for (int i = 1; i < n; i++) out[i] = out[i - 1] * a[i - 1];          // prefix products
    int suffix = 1;
    for (int i = n - 1; i >= 0; i--) { out[i] *= suffix; suffix *= a[i]; } // times suffix products
    return out;
}
```
O(n), O(1) extra (output excluded). No division — handles zeros.
</details>

### 9. Merge intervals — LC 56 · Google, Meta, Amazon
<details><summary>Solution</summary>

```java
public int[][] merge(int[][] iv) {
    Arrays.sort(iv, (a, b) -> Integer.compare(a[0], b[0]));
    List<int[]> out = new ArrayList<>();
    for (int[] cur : iv) {
        if (out.isEmpty() || out.get(out.size() - 1)[1] < cur[0]) out.add(cur);
        else out.get(out.size() - 1)[1] = Math.max(out.get(out.size() - 1)[1], cur[1]);
    }
    return out.toArray(new int[0][]);
}
```
O(n log n).
</details>

### 10. Subarray sum equals K — LC 560 · Meta, Google
<details><summary>Solution</summary>

```java
public int subarraySum(int[] nums, int k) {
    Map<Integer, Integer> cnt = new HashMap<>(Map.of(0, 1));
    int sum = 0, ans = 0;
    for (int x : nums) {
        sum += x;
        ans += cnt.getOrDefault(sum - k, 0);
        cnt.merge(sum, 1, Integer::sum);
    }
    return ans;
}
```
O(n). Works with negative numbers (sliding window would not).
</details>

### 11. 3Sum — LC 15 · Meta, Amazon, Microsoft
<details><summary>Solution</summary>

Sort, fix `i`, two pointers for the rest, skip duplicates (full code in DSA → Arrays). O(n²), O(1) extra beyond output.
</details>

### 12. Container with most water — LC 11 · Amazon, Goldman Sachs
<details><summary>Solution</summary>

```java
public int maxArea(int[] h) {
    int l = 0, r = h.length - 1, best = 0;
    while (l < r) {
        best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++; else r--;
    }
    return best;
}
```
</details>

### 13. Longest palindromic substring — LC 5 · Amazon, Microsoft, Adobe
<details><summary>Solution</summary>

```java
public String longestPalindrome(String s) {
    int start = 0, len = 0;
    for (int c = 0; c < s.length(); c++) {
        for (int[] lr : new int[][]{{c, c}, {c, c + 1}}) {          // odd and even centres
            int l = lr[0], r = lr[1];
            while (l >= 0 && r < s.length() && s.charAt(l) == s.charAt(r)) { l--; r++; }
            if (r - l - 1 > len) { len = r - l - 1; start = l + 1; }
        }
    }
    return s.substring(start, start + len);
}
```
O(n²), O(1).
</details>

### 14. Group anagrams — LC 49 · Amazon, Meta, Uber
<details><summary>Solution</summary>

```java
public List<List<String>> groupAnagrams(String[] strs) {
    Map<String, List<String>> groups = new HashMap<>();
    for (String s : strs) {
        char[] cs = s.toCharArray(); Arrays.sort(cs);
        groups.computeIfAbsent(new String(cs), k -> new ArrayList<>()).add(s);
    }
    return new ArrayList<>(groups.values());
}
```
O(n·k log k).
</details>

### 15. String compression — LC 443 / "aaabbc" → "a3b2c1" · Goldman Sachs, Amazon, TCS
<details><summary>Solution</summary>

```java
public String compress(String s) {
    if (s.isEmpty()) return s;
    StringBuilder sb = new StringBuilder();
    int count = 1;
    for (int i = 1; i <= s.length(); i++) {
        if (i < s.length() && s.charAt(i) == s.charAt(i - 1)) count++;
        else { sb.append(s.charAt(i - 1)).append(count); count = 1; }
    }
    return sb.length() < s.length() ? sb.toString() : s;
}
```
</details>

### 16. Rotate matrix by 90° — LC 48 · Microsoft, Amazon, Apple
<details><summary>Solution</summary>

Transpose, then reverse each row.
```java
public void rotate(int[][] m) {
    int n = m.length;
    for (int i = 0; i < n; i++) for (int j = i + 1; j < n; j++) { int t = m[i][j]; m[i][j] = m[j][i]; m[j][i] = t; }
    for (int[] row : m) for (int l = 0, r = n - 1; l < r; l++, r--) { int t = row[l]; row[l] = row[r]; row[r] = t; }
}
```
O(n²), in place.
</details>

### 17. Spiral matrix — LC 54 · Microsoft, Amazon, Google
<details><summary>Solution</summary>

```java
public List<Integer> spiralOrder(int[][] m) {
    List<Integer> out = new ArrayList<>();
    int top = 0, bottom = m.length - 1, left = 0, right = m[0].length - 1;
    while (top <= bottom && left <= right) {
        for (int j = left; j <= right; j++) out.add(m[top][j]);
        top++;
        for (int i = top; i <= bottom; i++) out.add(m[i][right]);
        right--;
        if (top <= bottom) { for (int j = right; j >= left; j--) out.add(m[bottom][j]); bottom--; }
        if (left <= right) { for (int i = bottom; i >= top; i--) out.add(m[i][left]); left++; }
    }
    return out;
}
```
</details>

### 18. First missing positive — LC 41 · Amazon, Google, Microsoft (hard)
<details><summary>Solution</summary>

Place each value v in index v−1 by swapping (cyclic sort); first index i with `a[i] != i+1` gives the answer.
```java
public int firstMissingPositive(int[] a) {
    int n = a.length;
    for (int i = 0; i < n; i++)
        while (a[i] > 0 && a[i] <= n && a[a[i] - 1] != a[i]) { int t = a[a[i] - 1]; a[a[i] - 1] = a[i]; a[i] = t; }
    for (int i = 0; i < n; i++) if (a[i] != i + 1) return i + 1;
    return n + 1;
}
```
O(n), O(1).
</details>

### 19. Minimum window substring — LC 76 · Meta, Google, Uber (hard)
<details><summary>Solution</summary>

Sliding window with a need-count array and a `missing` counter; record the window while it's valid and shrink from the left (full code in DSA → Arrays). O(|s| + |t|).
</details>

### 20. Trapping rain water — LC 42 · Google, Amazon, Goldman Sachs (hard)
<details><summary>Solution</summary>

```java
public int trap(int[] h) {
    int l = 0, r = h.length - 1, lm = 0, rm = 0, water = 0;
    while (l < r) {
        if (h[l] < h[r]) { lm = Math.max(lm, h[l]); water += lm - h[l++]; }
        else { rm = Math.max(rm, h[r]); water += rm - h[r--]; }
    }
    return water;
}
```
O(n), O(1).
</details>

## End-to-end scenario

<details><summary>Scenario (45-min interview simulation): "Given a list of transactions (id, amount, timestamp), find all pairs of transactions within 60 seconds whose amounts sum to exactly K."</summary>

Clarify: sorted by time? duplicates? n up to? Approach: sort by timestamp; sliding window of the last 60 s maintained with a deque plus a HashMap amount → count (or list of ids); for each new transaction, look up `K − amount` in the map to emit pairs, then add it; evict expired transactions from the deque and decrement the map. O(n log n) for sort + O(n + output). Test: empty list, exactly 60 s apart (inclusive?), negative amounts, many duplicates.
</details>
