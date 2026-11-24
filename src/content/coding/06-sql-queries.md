---
title: Coding Q&A 6 — SQL Query Practice (25 queries with answers)
minutes: 180
level: 2
tags: coding, sql, practice, queries
---
<!-- deepened -->

## Practice schema
Same schema as the SQL track. Try each query against a local Postgres (`docker run -e POSTGRES_PASSWORD=pw -p 5432:5432 postgres:16`) or an online SQL playground before expanding the answer.

```sql
departments(id, name)
employees(id, name, dept_id, manager_id, salary, joined_on)
customers(id, name, city, email)
orders(id, customer_id, amount, status, created_at)
order_items(order_id, product_id, qty, unit_price)
products(id, name, category, price)
logins(user_id, login_date)
```

---

## Level 1 — basics

### 1. Employees earning more than 80,000, highest first · TCS, Infosys
<details><summary>Answer</summary>

```sql
SELECT name, salary FROM employees WHERE salary > 80000 ORDER BY salary DESC;
```
</details>

### 2. Number of employees per department · Accenture, Cognizant
<details><summary>Answer</summary>

```sql
SELECT dept_id, COUNT(*) AS headcount FROM employees GROUP BY dept_id;
```
</details>

### 3. Departments with more than 5 employees · Infosys, Wipro, Amazon
<details><summary>Answer</summary>

```sql
SELECT dept_id, COUNT(*) FROM employees GROUP BY dept_id HAVING COUNT(*) > 5;
```
</details>

### 4. Employees who joined in 2024 · TCS
<details><summary>Answer</summary>

```sql
SELECT * FROM employees WHERE joined_on >= DATE '2024-01-01' AND joined_on < DATE '2025-01-01';  -- index friendly
```
</details>

### 5. Customers from Pune or Mumbai whose email is missing · Capgemini
<details><summary>Answer</summary>

```sql
SELECT * FROM customers WHERE city IN ('Pune', 'Mumbai') AND email IS NULL;
```
</details>

## Level 2 — joins & aggregation

### 6. Employee name with department name (include employees without dept) · Amazon, Paytm
<details><summary>Answer</summary>

```sql
SELECT e.name, d.name AS dept FROM employees e LEFT JOIN departments d ON d.id = e.dept_id;
```
</details>

### 7. Employees who earn more than their manager — LC 181 · Microsoft, Amazon
<details><summary>Answer</summary>

```sql
SELECT e.name FROM employees e JOIN employees m ON m.id = e.manager_id WHERE e.salary > m.salary;
```
</details>

### 8. Customers who never ordered — LC 183 · Amazon, Swiggy
<details><summary>Answer</summary>

```sql
SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o WHERE o.customer_id = c.id);
```
</details>

### 9. Total revenue per customer, top 5 · Flipkart, Myntra
<details><summary>Answer</summary>

```sql
SELECT c.id, c.name, SUM(o.amount) AS revenue
FROM customers c JOIN orders o ON o.customer_id = c.id
WHERE o.status <> 'CANCELLED'
GROUP BY c.id, c.name
ORDER BY revenue DESC
LIMIT 5;
```
</details>

### 10. Duplicate emails — LC 182 · Amazon, Infosys
<details><summary>Answer</summary>

```sql
SELECT email FROM customers GROUP BY email HAVING COUNT(*) > 1;
```
</details>

### 11. Delete duplicate emails keeping smallest id — LC 196 · Amazon, Paytm
<details><summary>Answer</summary>

```sql
DELETE FROM customers c USING customers d WHERE c.email = d.email AND c.id > d.id;   -- Postgres
-- MySQL: DELETE c FROM customers c JOIN customers d ON c.email = d.email AND c.id > d.id;
```
</details>

### 12. Departments with no employees · Cognizant, Walmart
<details><summary>Answer</summary>

```sql
SELECT d.name FROM departments d LEFT JOIN employees e ON e.dept_id = d.id WHERE e.id IS NULL;
```
</details>

### 13. Best-selling product per category by quantity · Amazon, Flipkart
<details><summary>Answer</summary>

```sql
WITH sales AS (
  SELECT p.category, p.name, SUM(oi.qty) AS units
  FROM order_items oi JOIN products p ON p.id = oi.product_id
  GROUP BY p.category, p.name
)
SELECT category, name, units FROM (
  SELECT s.*, RANK() OVER (PARTITION BY category ORDER BY units DESC) r FROM sales s) t
WHERE r = 1;
```
</details>

## Level 3 — window functions & tricky ones

### 14. Second highest salary — LC 176 · Amazon, Microsoft, TCS
<details><summary>Answer</summary>

```sql
SELECT (SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 1) AS second_highest;  -- NULL if absent
```
</details>

### 15. Nth highest salary (function) — LC 177 · Amazon
<details><summary>Answer</summary>

```sql
SELECT salary FROM (SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) r FROM employees) t WHERE r = :n LIMIT 1;
```
</details>

### 16. Top 3 salaries in each department — LC 185 · Amazon, Meta
<details><summary>Answer</summary>

```sql
SELECT dept_id, name, salary FROM (
  SELECT e.*, DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) r FROM employees e) t
WHERE r <= 3;
```
</details>

### 17. Rank scores without gaps — LC 178 · Microsoft, Amazon
<details><summary>Answer</summary>

```sql
SELECT score, DENSE_RANK() OVER (ORDER BY score DESC) AS rank FROM scores;
```
</details>

### 18. Running total of orders per customer by date · Uber, Swiggy
<details><summary>Answer</summary>

```sql
SELECT customer_id, created_at, amount,
       SUM(amount) OVER (PARTITION BY customer_id ORDER BY created_at ROWS UNBOUNDED PRECEDING) AS running_total
FROM orders;
```
</details>

### 19. Each employee's salary vs department average · Goldman Sachs, Walmart
<details><summary>Answer</summary>

```sql
SELECT name, dept_id, salary, ROUND(AVG(salary) OVER (PARTITION BY dept_id), 2) AS dept_avg,
       salary - AVG(salary) OVER (PARTITION BY dept_id) AS diff
FROM employees;
```
</details>

### 20. Consecutive numbers appearing 3 times — LC 180 · Amazon, Meta
<details><summary>Answer</summary>

```sql
SELECT DISTINCT num FROM (
  SELECT num, LAG(num) OVER (ORDER BY id) p1, LAG(num, 2) OVER (ORDER BY id) p2 FROM logs) t
WHERE num = p1 AND num = p2;
```
</details>

### 21. Users who logged in 3+ consecutive days · Meta, Amazon
<details><summary>Answer</summary>

Gaps-and-islands: `login_date − ROW_NUMBER()` constant per streak (full query in SQL → Joins & window functions).
</details>

### 22. Day-over-day revenue change and growth % · Swiggy, Zomato, PhonePe
<details><summary>Answer</summary>

```sql
WITH d AS (SELECT created_at::date AS day, SUM(amount) rev FROM orders WHERE status <> 'CANCELLED' GROUP BY 1)
SELECT day, rev, rev - LAG(rev) OVER (ORDER BY day) AS change,
       ROUND(100.0 * (rev - LAG(rev) OVER (ORDER BY day)) / NULLIF(LAG(rev) OVER (ORDER BY day), 0), 2) AS pct
FROM d ORDER BY day;
```
</details>

### 23. Customers whose first order was cancelled · Amazon, Flipkart
<details><summary>Answer</summary>

```sql
SELECT customer_id FROM (
  SELECT customer_id, status, ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY created_at) rn FROM orders) t
WHERE rn = 1 AND status = 'CANCELLED';
```
</details>

### 24. Median salary per department · Google, Uber
<details><summary>Answer</summary>

```sql
SELECT dept_id, PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY salary) AS median FROM employees GROUP BY dept_id;   -- Postgres
```
Portable: ROW_NUMBER and COUNT per partition, pick middle row(s) and average.
</details>

### 25. Org chart: all reports (direct and indirect) of manager 7 · Oracle, SAP Labs
<details><summary>Answer</summary>

```sql
WITH RECURSIVE reports AS (
  SELECT id, name, manager_id FROM employees WHERE manager_id = 7
  UNION ALL
  SELECT e.id, e.name, e.manager_id FROM employees e JOIN reports r ON e.manager_id = r.id
)
SELECT * FROM reports;
```
</details>

## End-to-end scenario

<details><summary>Scenario (data round): "Find customers whose spending dropped by more than 50% this month compared to their 3-month average before it." Write the query.</summary>

```sql
WITH monthly AS (
  SELECT customer_id, DATE_TRUNC('month', created_at) AS mon, SUM(amount) AS spend
  FROM orders WHERE status <> 'CANCELLED' GROUP BY 1, 2
), w AS (
  SELECT customer_id, mon, spend,
         AVG(spend) OVER (PARTITION BY customer_id ORDER BY mon ROWS BETWEEN 3 PRECEDING AND 1 PRECEDING) AS prev3_avg
  FROM monthly
)
SELECT customer_id, spend, prev3_avg
FROM w
WHERE mon = DATE_TRUNC('month', CURRENT_DATE) AND prev3_avg IS NOT NULL AND spend < 0.5 * prev3_avg;
```
Edge: months with zero orders are missing rows — generate a calendar (generate_series) and LEFT JOIN to treat them as 0 if required; customers with no orders this month need that too.
</details>
