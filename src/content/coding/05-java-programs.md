---
title: Coding Q&A 5 — Classic Java Programs, Streams & Multithreading (20 programs)
minutes: 150
level: 1
tags: coding, java programs, streams, multithreading, practice
---
<!-- deepened -->

## Why this module exists
Many interviews in India (service companies, product companies' first rounds, and Java-specific rounds) ask **"write a program"** questions: string manipulation, Java 8 streams, and small multithreading programs. They test fluency with the language, not algorithms. Write each one in an IDE without help until it takes under 5 minutes.

---

## Part A — Strings & numbers

### 1. Reverse a string without `reverse()` · TCS, Infosys, Accenture
<details><summary>Solution</summary>

```java
static String reverse(String s) {
    char[] c = s.toCharArray();
    for (int i = 0, j = c.length - 1; i < j; i++, j--) { char t = c[i]; c[i] = c[j]; c[j] = t; }
    return new String(c);
}
```
</details>

### 2. Check palindrome (ignore case & non-alphanumerics) · Infosys, Wipro, Amazon
<details><summary>Solution</summary>

```java
static boolean isPalindrome(String s) {
    int l = 0, r = s.length() - 1;
    while (l < r) {
        while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;
        while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;
        if (Character.toLowerCase(s.charAt(l++)) != Character.toLowerCase(s.charAt(r--))) return false;
    }
    return true;
}
```
</details>

### 3. Count occurrences of each character · Capgemini, Cognizant, Paytm
<details><summary>Solution</summary>

```java
Map<Character, Long> freq = s.chars().mapToObj(c -> (char) c)
        .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()));
```
Loop version: `map.merge(c, 1, Integer::sum)` for each char.
</details>

### 4. First non-repeating character · Amazon, Walmart, Goldman Sachs
<details><summary>Solution</summary>

```java
static Character firstUnique(String s) {
    int[] cnt = new int[256];
    for (char c : s.toCharArray()) cnt[c]++;
    for (char c : s.toCharArray()) if (cnt[c] == 1) return c;
    return null;
}
```
</details>

### 5. Swap two numbers without a third variable · TCS, HCL
<details><summary>Solution</summary>

```java
a = a + b; b = a - b; a = a - b;     // risk of overflow
a = a ^ b; b = a ^ b; a = a ^ b;     // XOR version (fails if a and b are the same variable/reference)
```
</details>

### 6. Fibonacci (iterative) and factorial (BigInteger) · TCS, Infosys
<details><summary>Solution</summary>

```java
static long fib(int n) { long a = 0, b = 1; for (int i = 0; i < n; i++) { long t = a + b; a = b; b = t; } return a; }
static BigInteger factorial(int n) { BigInteger r = BigInteger.ONE; for (int i = 2; i <= n; i++) r = r.multiply(BigInteger.valueOf(i)); return r; }
```
</details>

### 7. Check prime / print primes up to N · Wipro, Infosys
<details><summary>Solution</summary>

Trial division up to √n for one number; Sieve of Eratosthenes for all up to N (see CP → Number theory).
</details>

### 8. Armstrong number (153 = 1³+5³+3³) · TCS, Cognizant
<details><summary>Solution</summary>

```java
static boolean isArmstrong(int n) {
    int digits = String.valueOf(n).length(), sum = 0, t = n;
    while (t > 0) { sum += (int) Math.pow(t % 10, digits); t /= 10; }
    return sum == n;
}
```
</details>

### 9. Find duplicates in an array/list · Amazon, Paytm
<details><summary>Solution</summary>

```java
Set<Integer> seen = new HashSet<>();
Set<Integer> dups = list.stream().filter(x -> !seen.add(x)).collect(Collectors.toSet());
```
</details>

### 10. Find missing number in 1..n · Amazon, Microsoft
<details><summary>Solution</summary>

`expected = n(n+1)/2` minus sum of array (use long), or XOR of all indices and values.
</details>

## Part B — Java 8 Streams (most asked in "Java 8 round")

Assume `record Employee(String name, String dept, double salary, int age, String gender) {}`.

### 11. Average salary per department, sorted by average desc · EPAM, Capgemini, Walmart
<details><summary>Solution</summary>

```java
emps.stream()
    .collect(Collectors.groupingBy(Employee::dept, Collectors.averagingDouble(Employee::salary)))
    .entrySet().stream()
    .sorted(Map.Entry.<String, Double>comparingByValue().reversed())
    .forEach(e -> System.out.println(e.getKey() + " " + e.getValue()));
```
</details>

### 12. Highest-paid employee in each department · Amazon, Infosys
<details><summary>Solution</summary>

```java
Map<String, Optional<Employee>> top = emps.stream()
    .collect(Collectors.groupingBy(Employee::dept, Collectors.maxBy(Comparator.comparingDouble(Employee::salary))));
```
</details>

### 13. Count male and female employees · TCS Digital, Accenture
<details><summary>Solution</summary>

```java
Map<String, Long> byGender = emps.stream().collect(Collectors.groupingBy(Employee::gender, Collectors.counting()));
```
</details>

### 14. Names of employees older than 30, sorted, comma-separated · Deloitte, Cognizant
<details><summary>Solution</summary>

```java
String names = emps.stream().filter(e -> e.age() > 30).map(Employee::name).sorted().collect(Collectors.joining(", "));
```
</details>

### 15. Second highest salary / nth highest · Amazon, Walmart
<details><summary>Solution</summary>

```java
Optional<Double> second = emps.stream().map(Employee::salary).distinct()
        .sorted(Comparator.reverseOrder()).skip(1).findFirst();
```
</details>

### 16. Partition employees into salary > 50k and others · Goldman Sachs
<details><summary>Solution</summary>

```java
Map<Boolean, List<Employee>> parts = emps.stream().collect(Collectors.partitioningBy(e -> e.salary() > 50_000));
```
</details>

## Part C — Multithreading programs

### 17. Print odd/even numbers with two threads · Amazon, Microsoft, Oracle
<details><summary>Solution</summary>

See Core Java → Concurrency (wait/notifyAll version). Semaphore version:
```java
Semaphore oddTurn = new Semaphore(1), evenTurn = new Semaphore(0);
int max = 10;
Thread odd = new Thread(() -> { for (int i = 1; i <= max; i += 2) { oddTurn.acquireUninterruptibly(); System.out.println(i); evenTurn.release(); } });
Thread even = new Thread(() -> { for (int i = 2; i <= max; i += 2) { evenTurn.acquireUninterruptibly(); System.out.println(i); oddTurn.release(); } });
odd.start(); even.start();
```
</details>

### 18. Producer–consumer with BlockingQueue · Goldman Sachs, Adobe, Walmart
<details><summary>Solution</summary>

```java
BlockingQueue<Integer> q = new ArrayBlockingQueue<>(5);
Thread producer = new Thread(() -> {
    try { for (int i = 0; i < 20; i++) { q.put(i); System.out.println("produced " + i); } q.put(-1); }   // -1 = poison pill
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
Thread consumer = new Thread(() -> {
    try { while (true) { int v = q.take(); if (v == -1) break; System.out.println("consumed " + v); } }
    catch (InterruptedException e) { Thread.currentThread().interrupt(); }
});
producer.start(); consumer.start();
```
</details>

### 19. Create a deadlock, then fix it · Oracle, Morgan Stanley
<details><summary>Solution</summary>

```java
Object a = new Object(), b = new Object();
new Thread(() -> { synchronized (a) { sleep(100); synchronized (b) { } } }).start();
new Thread(() -> { synchronized (b) { sleep(100); synchronized (a) { } } }).start();   // deadlock
// Fix: both threads lock a then b (consistent ordering), or use tryLock with timeout.
```
</details>

### 20. Run 3 tasks in parallel and combine results with CompletableFuture · Paytm, Swiggy, Uber
<details><summary>Solution</summary>

```java
ExecutorService pool = Executors.newFixedThreadPool(3);
CompletableFuture<String> user = CompletableFuture.supplyAsync(() -> fetchUser(), pool);
CompletableFuture<List<String>> orders = CompletableFuture.supplyAsync(() -> fetchOrders(), pool);
CompletableFuture<Integer> points = CompletableFuture.supplyAsync(() -> fetchPoints(), pool)
        .completeOnTimeout(0, 500, TimeUnit.MILLISECONDS);                    // default if slow
String summary = CompletableFuture.allOf(user, orders, points)
        .thenApply(v -> user.join() + " has " + orders.join().size() + " orders, " + points.join() + " points")
        .join();
pool.shutdown();
```
</details>

## End-to-end scenario

<details><summary>Scenario: Read a 2 GB CSV of transactions and print total amount per merchant, using all CPU cores and bounded memory.</summary>

Stream lines with `Files.lines(path)` (lazy, doesn't load the whole file); parse each line; aggregate with `Collectors.groupingByConcurrent(merchant, summingDouble(amount))` on a parallel stream, or split the file into byte ranges processed by a fixed pool each building a local HashMap and merging at the end (avoids contention). Use `BigDecimal`/long paise for money; handle malformed lines (count and skip); report with sorted output. Memory is bounded by number of merchants, not file size.
</details>
