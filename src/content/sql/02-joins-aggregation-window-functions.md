---
title: Joins, GROUP BY, Subqueries, CTEs & Window Functions
level: 2
tags: sql, joins, group by, window functions, cte
---
<!-- deepened -->

## Start here: the basics

### Why joins?
Good database design splits data into separate tables to avoid duplication (an employee row stores `dept_id`, not the department name). To answer "show each employee with their department name", you **join** tables on matching columns.

```
employees                      departments
id name   dept_id              id  name
1  Riya   10        ─────►     10  Engineering
2  Arjun  20        ─────►     20  Sales
3  Kabir  10                   30  Marketing   (no employees)
4  Anita  NULL      (no dept)
```

### The join types — visually
| Join | Returns | Result for the data above |
|---|---|---|
| `INNER JOIN` | Only matching pairs | Riya-Eng, Arjun-Sales, Kabir-Eng |
| `LEFT JOIN` | All left rows + matches (NULLs if none) | + Anita-NULL |
| `RIGHT JOIN` | All right rows + matches | + NULL-Marketing |
| `FULL OUTER JOIN` | Everything from both | + Anita-NULL + NULL-Marketing |
| `CROSS JOIN` | Every combination (m × n) | 4 × 3 = 12 rows |
| **Self join** | A table joined with itself | Employee with their manager |

```sql
SELECT e.name, d.name AS dept
FROM employees e
LEFT JOIN departments d ON d.id = e.dept_id;     -- e and d are table aliases
```

### Aggregation in one minute
Aggregate functions squash many rows into one value: `COUNT, SUM, AVG, MIN, MAX`. `GROUP BY` makes one output row per group.

```sql
SELECT dept_id, COUNT(*) AS headcount, AVG(salary) AS avg_salary
FROM employees
GROUP BY dept_id
HAVING COUNT(*) >= 2;      -- filter groups (WHERE can't see aggregates)
```
Rule: every column in SELECT must be either inside an aggregate or listed in GROUP BY.

### Subqueries in one minute
A query inside a query:
```sql
SELECT name FROM employees WHERE salary > (SELECT AVG(salary) FROM employees);   -- earns above company average
```

---

## Joins in depth

### Self join — employees and their managers
```sql
SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;    -- LEFT so the CEO (no manager) still appears
```

### Finding rows with no match (anti-join) — 3 ways
```sql
-- departments with no employees
SELECT d.* FROM departments d LEFT JOIN employees e ON e.dept_id = d.id WHERE e.id IS NULL;
SELECT d.* FROM departments d WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
SELECT d.* FROM departments d WHERE d.id NOT IN (SELECT dept_id FROM employees WHERE dept_id IS NOT NULL);  -- guard NULLs!
```
`NOT EXISTS` is the safest and usually optimised into an anti-join.

### The classic LEFT JOIN mistake
```sql
-- ❌ turns into an INNER JOIN: the WHERE removes rows where o is NULL
SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'PAID';
-- ✅ put the filter on the right table in the ON clause
SELECT c.name, o.id FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'PAID';
```

### Join fan-out (double counting)
Joining a customer to 3 orders and 2 addresses gives 6 rows; `SUM(amount)` is now wrong. Aggregate each side first (subquery/CTE), then join.

### How databases execute joins
- **Nested loop** — for each outer row, look up inner rows (great with an index on the inner join column, small outer side).
- **Hash join** — build a hash table on the smaller input, probe with the larger (equality joins, large unsorted inputs).
- **Merge join** — both inputs sorted on the key, walk them together.
The optimizer chooses; `EXPLAIN` shows which.

## GROUP BY in depth

```sql
-- revenue per customer per month, only customers with > ₹10,000 that month
SELECT customer_id,
       DATE_TRUNC('month', created_at) AS month,
       SUM(amount) FILTER (WHERE status <> 'CANCELLED') AS revenue,      -- Postgres conditional aggregate
       COUNT(*)    FILTER (WHERE status = 'CANCELLED')  AS cancelled
FROM orders
GROUP BY customer_id, DATE_TRUNC('month', created_at)
HAVING SUM(amount) FILTER (WHERE status <> 'CANCELLED') > 10000
ORDER BY month, revenue DESC;
```
Portable conditional aggregation: `SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END)`. That trick also **pivots** rows into columns.

`GROUP BY ROLLUP(a, b)` / `CUBE` / `GROUPING SETS` add subtotal rows — used in reporting.

## Subqueries and CTEs

| Kind | Example | Note |
|---|---|---|
| Scalar | `(SELECT AVG(salary) FROM employees)` | Returns one value |
| IN / EXISTS | `WHERE EXISTS (SELECT 1 …)` | EXISTS stops at first match |
| Correlated | `WHERE salary > (SELECT AVG(salary) FROM employees x WHERE x.dept_id = e.dept_id)` | Re-evaluated per outer row (optimizer often rewrites it) |
| Derived table | `FROM (SELECT …) t` | Must be aliased |

**CTE (`WITH`)** — name a subquery for readability and reuse:
```sql
WITH dept_avg AS (
  SELECT dept_id, AVG(salary) AS avg_sal FROM employees GROUP BY dept_id
)
SELECT e.name, e.salary, d.avg_sal
FROM employees e JOIN dept_avg d ON d.dept_id = e.dept_id
WHERE e.salary > d.avg_sal;                         -- employees earning above their department average
```

**Recursive CTE** — hierarchies (org chart, category trees):
```sql
WITH RECURSIVE chain AS (
  SELECT id, name, manager_id, 1 AS level FROM employees WHERE manager_id IS NULL   -- anchor: the CEO
  UNION ALL
  SELECT e.id, e.name, e.manager_id, c.level + 1
  FROM employees e JOIN chain c ON e.manager_id = c.id                             -- recursive step
)
SELECT * FROM chain ORDER BY level;
```

### UNION vs UNION ALL
`UNION` removes duplicates (extra sort/hash); `UNION ALL` keeps all rows and is faster. Use UNION ALL unless you need dedupe. `INTERSECT` and `EXCEPT` (MINUS in Oracle) also exist.

## Window functions — the most important "advanced SQL" topic

A window function computes a value **across related rows without collapsing them** (unlike GROUP BY).

```sql
SELECT name, dept_id, salary,
       AVG(salary)  OVER (PARTITION BY dept_id)                         AS dept_avg,
       RANK()       OVER (PARTITION BY dept_id ORDER BY salary DESC)    AS rnk_in_dept,
       SUM(salary)  OVER (ORDER BY joined_on)                           AS running_payroll,
       LAG(salary)  OVER (PARTITION BY dept_id ORDER BY joined_on)      AS prev_joiner_salary
FROM employees;
```
- `PARTITION BY` = the groups (like GROUP BY but rows are kept).
- `ORDER BY` inside OVER = order within each partition (needed for ranking, running totals, LAG/LEAD).
- Frame: `ROWS BETWEEN 6 PRECEDING AND CURRENT ROW` → 7-day moving average.

### Ranking functions — know the difference
Salaries 100, 90, 90, 80:

| Function | Result | Use |
|---|---|---|
| `ROW_NUMBER()` | 1, 2, 3, 4 | Exactly one row per rank (dedupe, top-1 per group) |
| `RANK()` | 1, 2, 2, 4 | Ties share rank, gaps after |
| `DENSE_RANK()` | 1, 2, 2, 3 | Ties share rank, no gaps — "Nth highest distinct salary" |
| `NTILE(4)` | quartiles | Bucketing |

### Top-N per group (asked constantly)
```sql
WITH ranked AS (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS r
  FROM employees e
)
SELECT * FROM ranked WHERE r <= 3;            -- top 3 salaries in each department
```
You can't filter on a window function in WHERE (it's computed after WHERE) — hence the CTE.

### LAG / LEAD — compare with previous/next row
```sql
-- day-over-day revenue change
WITH daily AS (SELECT created_at::date AS d, SUM(amount) AS revenue FROM orders GROUP BY 1)
SELECT d, revenue, revenue - LAG(revenue) OVER (ORDER BY d) AS change FROM daily;
```

### Gaps and islands (hard, FAANG-favourite)
Find consecutive login streaks: for each user, `login_date - ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date)` is constant within a streak → group by it.
```sql
WITH d AS (
  SELECT DISTINCT user_id, login_date FROM logins
), g AS (
  SELECT user_id, login_date,
         login_date - (ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY login_date))::int AS grp
  FROM d
)
SELECT user_id, MIN(login_date) AS start_date, MAX(login_date) AS end_date, COUNT(*) AS days
FROM g GROUP BY user_id, grp HAVING COUNT(*) >= 3;     -- streaks of 3+ days
```

## Quick check questions

<details><summary>Why can't you use `WHERE RANK() OVER (...) = 1`?</summary>

Window functions are evaluated after WHERE/GROUP BY/HAVING (during SELECT). Compute them in a subquery/CTE and filter outside (or use QUALIFY in Snowflake/BigQuery/DuckDB).
</details>

<details><summary>What's the difference between `COUNT(*)` after a LEFT JOIN and `COUNT(o.id)`?</summary>

COUNT(*) counts the row even when the right side is NULL (gives 1 for customers without orders); COUNT(o.id) ignores NULLs (gives 0). Use COUNT(right_table.id) to count matches.
</details>

## Questions asked at top companies

<details><summary>Find the second (or Nth) highest salary. <em>· Amazon, Microsoft, TCS, Infosys — the most asked SQL question</em></summary>

```sql
SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1;      -- N=2
-- window version (handles ties, NULL if not exists via outer query)
SELECT MAX(salary) FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) r FROM employees) t WHERE r = 2;
-- classic without LIMIT
SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);
```
</details>

<details><summary>Highest-paid employee in each department. <em>· Amazon, Flipkart, Walmart, Goldman Sachs</em></summary>

```sql
SELECT dept_id, name, salary FROM (
  SELECT e.*, RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) r FROM employees e) t
WHERE r = 1;
```
(RANK keeps ties; ROW_NUMBER picks exactly one.)
</details>

<details><summary>Employees who earn more than their managers. <em>· Microsoft, Adobe, LeetCode 181</em></summary>

```sql
SELECT e.name FROM employees e JOIN employees m ON e.manager_id = m.id WHERE e.salary > m.salary;
```
</details>

<details><summary>Find duplicate emails / delete duplicates keeping the lowest id. <em>· Amazon, Paytm, Infosys</em></summary>

```sql
SELECT email, COUNT(*) FROM customers GROUP BY email HAVING COUNT(*) > 1;
DELETE FROM customers c USING customers d WHERE c.email = d.email AND c.id > d.id;          -- Postgres
-- portable
DELETE FROM customers WHERE id NOT IN (SELECT MIN(id) FROM customers GROUP BY email);
```
</details>

<details><summary>Customers who never placed an order. <em>· Amazon, Swiggy, LeetCode 183</em></summary>

`SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);`
</details>

<details><summary>Running total and 7-day moving average of daily revenue. <em>· Uber, Swiggy, Meta (data roles)</em></summary>

```sql
WITH daily AS (SELECT created_at::date d, SUM(amount) rev FROM orders GROUP BY 1)
SELECT d, rev,
       SUM(rev) OVER (ORDER BY d) AS running_total,
       AVG(rev) OVER (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW) AS ma7
FROM daily;
```
</details>

<details><summary>Difference between RANK, DENSE_RANK and ROW_NUMBER. <em>· Goldman Sachs, Walmart, Deloitte</em></summary>

See ranking table: ROW_NUMBER unique sequential; RANK ties share with gaps; DENSE_RANK ties share without gaps.
</details>

<details><summary>Department-wise count including departments with zero employees. <em>· Infosys, Cognizant, Flipkart</em></summary>

`SELECT d.name, COUNT(e.id) FROM departments d LEFT JOIN employees e ON e.dept_id = d.id GROUP BY d.name;`
</details>

<details><summary>Find users who logged in on 3 consecutive days. <em>· Meta, Amazon, LeetCode 180-style</em></summary>

Gaps-and-islands with ROW_NUMBER (above), or `LEAD(login_date, 2) OVER (PARTITION BY user_id ORDER BY login_date) = login_date + 2` on distinct dates.
</details>

<details><summary>Month-over-month growth percentage. <em>· Swiggy, Zomato, PhonePe</em></summary>

```sql
WITH m AS (SELECT DATE_TRUNC('month', created_at) mon, SUM(amount) rev FROM orders GROUP BY 1)
SELECT mon, rev, ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY mon)) / NULLIF(LAG(rev) OVER (ORDER BY mon), 0), 2) AS growth_pct
FROM m;
```
`NULLIF` avoids division by zero.
</details>

<details><summary>Pivot: count orders per status as columns. <em>· Amazon, Walmart</em></summary>

```sql
SELECT customer_id,
       COUNT(*) FILTER (WHERE status='PAID')      AS paid,
       COUNT(*) FILTER (WHERE status='CANCELLED') AS cancelled
FROM orders GROUP BY customer_id;
-- portable: SUM(CASE WHEN status='PAID' THEN 1 ELSE 0 END)
```
</details>

<details><summary>Print the org hierarchy under a manager. <em>· Oracle, SAP Labs</em></summary>

Recursive CTE starting from the manager and joining employees whose `manager_id` is in the previous level (shown above). Oracle also supports `CONNECT BY PRIOR`.
</details>

<details><summary>Inner join vs EXISTS vs IN — which is faster? <em>· Goldman Sachs, Morgan Stanley</em></summary>

Modern optimizers often produce identical semi-join plans. Semantics differ: JOIN can duplicate outer rows when multiple matches exist; EXISTS/IN don't. NOT IN is NULL-unsafe; NOT EXISTS is safe. Check EXPLAIN.
</details>

<details><summary>What is a correlated subquery and how can it hurt performance? <em>· Microsoft, Oracle</em></summary>

A subquery referencing outer columns, logically executed per outer row. Without decorrelation by the optimizer or indexes, it becomes O(n·m). Rewrite with JOIN + GROUP BY or window functions.
</details>

## End-to-end scenarios

<details><summary>Scenario: Product manager asks for a retention report — for each signup month, what % of users ordered again in each of the next 3 months (cohort analysis).</summary>

```sql
WITH first_order AS (
  SELECT customer_id, DATE_TRUNC('month', MIN(created_at)) AS cohort FROM orders GROUP BY customer_id
), activity AS (
  SELECT DISTINCT o.customer_id, f.cohort,
         (EXTRACT(YEAR FROM DATE_TRUNC('month', o.created_at)) * 12 + EXTRACT(MONTH FROM DATE_TRUNC('month', o.created_at)))
       - (EXTRACT(YEAR FROM f.cohort) * 12 + EXTRACT(MONTH FROM f.cohort)) AS month_no
  FROM orders o JOIN first_order f ON f.customer_id = o.customer_id
)
SELECT cohort,
       COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 0) AS users,
       ROUND(100.0 * COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 1) / COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 0), 1) AS m1,
       ROUND(100.0 * COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 2) / COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 0), 1) AS m2,
       ROUND(100.0 * COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 3) / COUNT(DISTINCT customer_id) FILTER (WHERE month_no = 0), 1) AS m3
FROM activity GROUP BY cohort ORDER BY cohort;
```
Mention running it on a read replica/warehouse, not the OLTP primary.
</details>

<details><summary>Scenario: A dashboard query joining orders, customers and order_items shows revenue 3× higher than finance's number. Debug it.</summary>

Join fan-out: each order joins multiple items, so `SUM(orders.amount)` repeats per item. Also check cancelled/refunded statuses, time zones in date bucketing, and duplicate rows from a many-to-many join. Fix: aggregate items per order first (CTE), then join; or sum line totals instead of order totals; reconcile on a single day with finance.
</details>
