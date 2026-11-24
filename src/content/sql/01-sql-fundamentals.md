---
title: SQL Fundamentals — Tables, Keys, CRUD, Filtering & Sorting
level: 1
tags: sql, database, select, keys, crud
---
<!-- deepened -->

## Start here: the basics

### What is a database?
A **database** stores data so it survives restarts and can be searched quickly by many users at once. A **relational database** (PostgreSQL, MySQL, Oracle, SQL Server) stores data in **tables** — like spreadsheets with strict rules.

```
employees
┌────┬─────────┬─────────┬────────┬────────────┐
│ id │ name    │ dept_id │ salary │ joined_on  │
├────┼─────────┼─────────┼────────┼────────────┤
│ 1  │ Riya    │ 10      │ 90000  │ 2021-04-01 │
│ 2  │ Arjun   │ 20      │ 75000  │ 2022-07-15 │
│ 3  │ Kabir   │ 10      │ 120000 │ 2019-01-10 │
│ 4  │ Anita   │ NULL    │ 60000  │ 2024-02-20 │
└────┴─────────┴─────────┴────────┴────────────┘
- each ROW is one employee, each COLUMN is one attribute with a fixed TYPE
```

**SQL** (Structured Query Language) is the language to define, read and change that data. It's **declarative**: you say *what* you want; the database decides *how* to get it.

### The sample schema used in this track
```sql
CREATE TABLE departments (
  id    INT PRIMARY KEY,
  name  VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE employees (
  id         INT PRIMARY KEY,
  name       VARCHAR(100) NOT NULL,
  dept_id    INT REFERENCES departments(id),   -- foreign key
  manager_id INT REFERENCES employees(id),     -- self reference
  salary     NUMERIC(12,2) NOT NULL CHECK (salary > 0),
  joined_on  DATE NOT NULL
);

CREATE TABLE customers (id INT PRIMARY KEY, name TEXT NOT NULL, city TEXT, email TEXT UNIQUE);
CREATE TABLE orders (
  id          BIGINT PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(id),
  amount      NUMERIC(12,2) NOT NULL,
  status      VARCHAR(20) NOT NULL,              -- 'PLACED','PAID','SHIPPED','CANCELLED'
  created_at  TIMESTAMP NOT NULL DEFAULT now()
);
```

### Keys and constraints — the rules that keep data correct
| Concept | Meaning |
|---|---|
| **Primary key** | Uniquely identifies each row; never NULL (`employees.id`) |
| **Foreign key** | A column that must match a primary key in another table (`employees.dept_id → departments.id`) — prevents orphan rows |
| **Unique** | No two rows share the value (`customers.email`) |
| **NOT NULL** | Value required |
| **CHECK** | Custom rule (`salary > 0`) |
| **Default** | Value used when none given |
| **Candidate / composite / surrogate key** | Any column(s) that could be PK / PK made of several columns / an artificial id instead of a natural key (email) |

### CRUD — Create, Read, Update, Delete
```sql
INSERT INTO departments (id, name) VALUES (10, 'Engineering'), (20, 'Sales');

SELECT name, salary FROM employees WHERE dept_id = 10;

UPDATE employees SET salary = salary * 1.10 WHERE id = 2;   -- ALWAYS have a WHERE (or you update every row!)

DELETE FROM employees WHERE id = 4;
```

### SQL command families (a common fresher question)
| Family | Commands | Purpose |
|---|---|---|
| **DDL** (Data Definition) | CREATE, ALTER, DROP, TRUNCATE, RENAME | Structure |
| **DML** (Data Manipulation) | INSERT, UPDATE, DELETE, MERGE | Change data |
| **DQL** (Data Query) | SELECT | Read data |
| **DCL** (Data Control) | GRANT, REVOKE | Permissions |
| **TCL** (Transaction Control) | COMMIT, ROLLBACK, SAVEPOINT | Transactions |

---

## Reading data: SELECT in depth

### Filtering with WHERE
```sql
SELECT * FROM employees
WHERE salary BETWEEN 70000 AND 100000      -- inclusive on both ends
  AND joined_on >= DATE '2021-01-01'
  AND name LIKE 'A%'                       -- starts with A ('%' any chars, '_' one char)
  AND dept_id IN (10, 20);
```

### NULL — the most misunderstood value
`NULL` means **unknown/missing**, not zero or empty string. Any comparison with NULL gives **UNKNOWN**, which `WHERE` treats as false.

```sql
SELECT * FROM employees WHERE dept_id = NULL;   -- ❌ returns nothing, always
SELECT * FROM employees WHERE dept_id IS NULL;  -- ✅ Anita
SELECT COALESCE(dept_id, 0) FROM employees;     -- replace NULL with a default
-- NOT IN trap: if the subquery returns any NULL, NOT IN returns no rows!
SELECT * FROM employees WHERE dept_id NOT IN (SELECT dept_id FROM employees);   -- empty because of Anita's NULL
```

### Sorting, limiting, distinct
```sql
SELECT DISTINCT dept_id FROM employees;                        -- unique values
SELECT name, salary FROM employees ORDER BY salary DESC, name ASC;
SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3;   -- Postgres/MySQL
-- SQL Server: SELECT TOP 3 ... ; Oracle 12c+/standard: FETCH FIRST 3 ROWS ONLY
SELECT * FROM orders ORDER BY created_at DESC LIMIT 20 OFFSET 40;  -- page 3 of 20
```
NULLs sort last in ascending order in Postgres (first in MySQL) — use `NULLS LAST` to be explicit.

### Expressions, CASE and aliases
```sql
SELECT name,
       salary * 12 AS annual_salary,
       CASE WHEN salary >= 100000 THEN 'Senior band'
            WHEN salary >= 75000  THEN 'Mid band'
            ELSE 'Junior band' END AS band,
       EXTRACT(YEAR FROM joined_on) AS joined_year
FROM employees;
```

### Logical order of execution — explains many errors
You **write** `SELECT … FROM … WHERE … GROUP BY … HAVING … ORDER BY … LIMIT`, but the database **evaluates**:

```
1. FROM / JOIN    → which rows exist
2. WHERE          → filter rows
3. GROUP BY       → form groups
4. HAVING         → filter groups
5. SELECT         → compute output columns (aliases created here)
6. DISTINCT
7. ORDER BY       → can use SELECT aliases
8. LIMIT / OFFSET
```
That's why you **can't use a SELECT alias in WHERE** (not created yet) but you **can in ORDER BY**.

### Changing structure safely
```sql
ALTER TABLE employees ADD COLUMN email VARCHAR(150);
ALTER TABLE employees ALTER COLUMN name TYPE VARCHAR(200);    -- Postgres syntax
ALTER TABLE employees ADD CONSTRAINT uq_emp_email UNIQUE (email);
```

### DELETE vs TRUNCATE vs DROP
| | DELETE | TRUNCATE | DROP |
|---|---|---|---|
| Removes | Selected rows (WHERE) | All rows | The table itself |
| Type | DML | DDL | DDL |
| Speed | Row by row, logged | Very fast (deallocates pages) | Fast |
| Rollback | Yes (in a transaction) | Yes in Postgres, implicit commit in MySQL/Oracle | Same as truncate |
| Triggers fire | Yes | No | No |
| Resets identity | No | Yes (usually) | — |

### Data types worth knowing
`INT/BIGINT`, `NUMERIC(p,s)` / `DECIMAL` (exact — use for money), `REAL/DOUBLE` (approximate — never for money), `VARCHAR(n)/TEXT`, `CHAR(n)` (padded), `DATE`, `TIMESTAMP` vs `TIMESTAMPTZ` (store UTC with time zone), `BOOLEAN`, `UUID`, `JSON/JSONB` (Postgres).

## Quick check questions

<details><summary>Why does `WHERE salary > 50000 OR dept_id = NULL` behave unexpectedly?</summary>

`dept_id = NULL` is always UNKNOWN, so that branch never matches. Use `dept_id IS NULL`.
</details>

<details><summary>Can a table have multiple primary keys? Multiple unique keys?</summary>

One primary key (which may span multiple columns — composite). Many unique constraints. Unique columns may allow NULLs (multiple NULLs in most DBs).
</details>

<details><summary>Why can't I use a column alias in WHERE?</summary>

WHERE is evaluated before SELECT, so the alias doesn't exist yet. Repeat the expression, use a subquery/CTE, or filter in HAVING for aggregates.
</details>

## Questions asked at top companies

<details><summary>Difference between primary key and unique key. <em>· TCS, Infosys, Amazon (SDE-1), Deloitte</em></summary>

Primary key: one per table, NOT NULL, identifies rows, usually the clustered index (InnoDB). Unique key: many per table, can allow NULL(s), enforces uniqueness via a secondary index.
</details>

<details><summary>DELETE vs TRUNCATE vs DROP. <em>· Accenture, Wipro, Capgemini, Paytm</em></summary>

See table above: DELETE removes selected rows (logged, triggers, rollbackable); TRUNCATE removes all rows fast, resets identity, no row triggers; DROP removes table definition and data.
</details>

<details><summary>What is a foreign key and what happens on delete of the parent? <em>· Infosys, Cognizant, Walmart</em></summary>

A constraint ensuring values reference an existing parent row. On parent delete: `RESTRICT/NO ACTION` (error), `CASCADE` (delete children), `SET NULL`, `SET DEFAULT`. Choose deliberately — cascade can delete far more than expected.
</details>

<details><summary>What's the difference between WHERE and HAVING? <em>· Amazon, Flipkart, nearly every SQL round</em></summary>

WHERE filters rows before grouping and can't use aggregates; HAVING filters groups after GROUP BY and can use aggregates (`HAVING COUNT(*) > 5`).
</details>

<details><summary>CHAR vs VARCHAR. <em>· TCS, HCL</em></summary>

CHAR(n) is fixed length, padded with spaces; VARCHAR(n) is variable length up to n. Use CHAR for fixed-size codes (country codes), VARCHAR/TEXT otherwise.
</details>

<details><summary>Find all employees whose name starts with 'A' and ends with 'a'. <em>· Infosys, Mphasis</em></summary>

`SELECT * FROM employees WHERE name LIKE 'A%a';` (case-sensitivity depends on collation; Postgres has `ILIKE` for case-insensitive).
</details>

<details><summary>What is the order of execution of a SQL query? <em>· Microsoft, Goldman Sachs, Amazon</em></summary>

FROM/JOIN → WHERE → GROUP BY → HAVING → SELECT → DISTINCT → ORDER BY → LIMIT/OFFSET.
</details>

<details><summary>What does `COUNT(*)` vs `COUNT(column)` vs `COUNT(DISTINCT column)` return? <em>· Flipkart, Swiggy</em></summary>

COUNT(*) counts rows; COUNT(col) counts non-NULL values in col; COUNT(DISTINCT col) counts unique non-NULL values.
</details>

<details><summary>What is a composite key? When would you use one? <em>· Oracle, SAP Labs</em></summary>

A key of multiple columns, e.g., `(order_id, line_no)` for order lines or `(student_id, course_id)` for enrollments (junction tables). Often paired with a surrogate id for ORM convenience.
</details>

<details><summary>Why use NUMERIC/DECIMAL instead of FLOAT for money? <em>· Razorpay, PhonePe, Goldman Sachs</em></summary>

Floating point is binary approximation; 0.1 can't be represented exactly, causing rounding errors in sums. NUMERIC stores exact decimal values (or store integer paise).
</details>

<details><summary>What does `NOT IN` return if the subquery contains NULL? <em>· Amazon, Microsoft (trick question)</em></summary>

No rows, because `x NOT IN (…, NULL)` evaluates to UNKNOWN for every x. Use `NOT EXISTS` instead.
</details>

<details><summary>How do you fetch the 2nd page of results with 20 rows per page? <em>· Paytm, Myntra</em></summary>

`ORDER BY created_at DESC, id DESC LIMIT 20 OFFSET 20`. For deep pages use keyset: `WHERE (created_at, id) < (:lastCreatedAt, :lastId) ORDER BY created_at DESC, id DESC LIMIT 20`.
</details>

## End-to-end scenarios

<details><summary>Scenario: Design tables for a simple college system (students, courses, enrollments with grades) and write 3 queries.</summary>

```sql
CREATE TABLE students (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL);
CREATE TABLE courses  (id SERIAL PRIMARY KEY, code VARCHAR(10) UNIQUE NOT NULL, title TEXT NOT NULL, credits INT CHECK (credits BETWEEN 1 AND 6));
CREATE TABLE enrollments (
  student_id INT REFERENCES students(id) ON DELETE CASCADE,
  course_id  INT REFERENCES courses(id),
  grade      CHAR(2),
  PRIMARY KEY (student_id, course_id));
-- 1. students with no enrollment
SELECT s.* FROM students s WHERE NOT EXISTS (SELECT 1 FROM enrollments e WHERE e.student_id = s.id);
-- 2. number of students per course, most popular first
SELECT c.code, COUNT(e.student_id) AS n FROM courses c LEFT JOIN enrollments e ON e.course_id = c.id GROUP BY c.code ORDER BY n DESC;
-- 3. students who got 'A' in every course they took
SELECT student_id FROM enrollments GROUP BY student_id HAVING BOOL_AND(grade = 'A');   -- or MIN(grade)='A' AND MAX(grade)='A'
```
</details>

<details><summary>Scenario: Someone ran `UPDATE employees SET salary = 0;` in production without WHERE. What now, and how do you prevent it?</summary>

If inside an open transaction: ROLLBACK. Otherwise: restore from point-in-time recovery (PITR) to a scratch DB at the minute before, then copy correct salaries back with an `UPDATE … FROM restored` join; audit tables/CDC can also reconstruct values. Prevention: no direct prod write access (changes via reviewed migrations/scripts), `sql_safe_updates` (MySQL), run ad-hoc writes in a transaction and check affected row counts before COMMIT, least-privilege DB users, backups + PITR tested regularly.
</details>
