---
title: Coding Q&A 7 — JavaScript & React Machine Coding (15 problems with solutions)
minutes: 240
level: 2
tags: coding, javascript, react, polyfills, practice
---
<!-- deepened -->

## Why this module exists
Full-stack and frontend rounds (Flipkart, Atlassian, Microsoft, Swiggy, Uber, CRED, Razorpay) ask you to implement JS utilities and polyfills from scratch, and to build small React components in 60–90 minutes. Practise in a plain `.js` file or a CodeSandbox.

---

## Part A — JavaScript utilities

### 1. debounce · Flipkart, Atlassian, Microsoft
<details><summary>Solution</summary>

```js
function debounce(fn, wait) {
  let timer;
  function debounced(...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), wait);
  }
  debounced.cancel = () => clearTimeout(timer);
  return debounced;
}
```
</details>

### 2. throttle · Flipkart, Uber
<details><summary>Solution</summary>

```js
function throttle(fn, wait) {
  let last = 0, timer = null, lastArgs;
  return function (...args) {
    const now = Date.now(), remaining = wait - (now - last);
    lastArgs = args;
    if (remaining <= 0) { last = now; fn.apply(this, args); }
    else if (!timer) timer = setTimeout(() => { last = Date.now(); timer = null; fn.apply(this, lastArgs); }, remaining);  // trailing call
  };
}
```
</details>

### 3. Promise.all polyfill · Microsoft, Meta, Uber
<details><summary>Solution</summary>

```js
function promiseAll(items) {
  return new Promise((resolve, reject) => {
    const results = []; let pending = items.length;
    if (pending === 0) return resolve([]);
    items.forEach((it, i) => Promise.resolve(it).then(v => {
      results[i] = v;
      if (--pending === 0) resolve(results);
    }, reject));
  });
}
```
</details>

### 4. Function.prototype.bind polyfill · Amazon, Paytm
<details><summary>Solution</summary>

```js
Function.prototype.myBind = function (ctx, ...preset) {
  const fn = this;
  return function (...args) { return fn.apply(ctx, [...preset, ...args]); };
};
```
(Full spec also handles `new` on the bound function.)
</details>

### 5. Deep clone · Walmart, Myntra
<details><summary>Solution</summary>

```js
function deepClone(value, seen = new WeakMap()) {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value);
  if (seen.has(value)) return seen.get(value);                 // handles cycles
  const out = Array.isArray(value) ? [] : {};
  seen.set(value, out);
  for (const key of Reflect.ownKeys(value)) out[key] = deepClone(value[key], seen);
  return out;
}
```
Mention `structuredClone` as the built-in.
</details>

### 6. Flatten a nested array (with depth) · Amazon, Swiggy
<details><summary>Solution</summary>

```js
function flatten(arr, depth = Infinity) {
  return depth < 1 ? arr.slice() : arr.reduce((acc, x) =>
    acc.concat(Array.isArray(x) ? flatten(x, depth - 1) : x), []);
}
```
</details>

### 7. Curry · Microsoft, Atlassian
<details><summary>Solution</summary>

```js
function curry(fn) {
  return function curried(...args) {
    return args.length >= fn.length ? fn.apply(this, args) : (...more) => curried.apply(this, [...args, ...more]);
  };
}
const add3 = curry((a, b, c) => a + b + c);
add3(1)(2)(3); // 6
```
</details>

### 8. Event emitter · Uber, Razorpay
<details><summary>Solution</summary>

```js
class EventEmitter {
  #listeners = new Map();
  on(evt, cb) { (this.#listeners.get(evt) ?? this.#listeners.set(evt, new Set()).get(evt)).add(cb); return () => this.off(evt, cb); }
  off(evt, cb) { this.#listeners.get(evt)?.delete(cb); }
  once(evt, cb) { const off = this.on(evt, (...a) => { off(); cb(...a); }); return off; }
  emit(evt, ...args) { [...(this.#listeners.get(evt) ?? [])].forEach(cb => cb(...args)); }
}
```
</details>

### 9. Memoize with cache key · Meta, Microsoft
<details><summary>Solution</summary>

```js
function memoize(fn, keyFn = (...a) => JSON.stringify(a)) {
  const cache = new Map();
  return function (...args) {
    const k = keyFn(...args);
    if (!cache.has(k)) cache.set(k, fn.apply(this, args));
    return cache.get(k);
  };
}
```
</details>

### 10. Run promises with concurrency limit · Google, Atlassian
<details><summary>Solution</summary>

```js
async function runWithLimit(tasks, limit) {          // tasks: array of () => Promise
  const results = new Array(tasks.length); let next = 0;
  async function worker() {
    while (next < tasks.length) { const i = next++; results[i] = await tasks[i](); }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, worker));
  return results;
}
```
</details>

## Part B — React machine coding

### 11. Counter with undo/redo · Flipkart, CRED
<details><summary>Solution</summary>

```jsx
function reducer(state, action) {
  const { past, present, future } = state;
  switch (action.type) {
    case 'add':  return { past: [...past, present], present: present + action.by, future: [] };
    case 'undo': return past.length ? { past: past.slice(0, -1), present: past.at(-1), future: [present, ...future] } : state;
    case 'redo': return future.length ? { past: [...past, present], present: future[0], future: future.slice(1) } : state;
    default: return state;
  }
}
function Counter() {
  const [s, dispatch] = useReducer(reducer, { past: [], present: 0, future: [] });
  return (<div>
    <h2>{s.present}</h2>
    {[-10, -1, 1, 10].map(by => <button key={by} onClick={() => dispatch({ type: 'add', by })}>{by > 0 ? '+' : ''}{by}</button>)}
    <button disabled={!s.past.length} onClick={() => dispatch({ type: 'undo' })}>Undo</button>
    <button disabled={!s.future.length} onClick={() => dispatch({ type: 'redo' })}>Redo</button>
  </div>);
}
```
</details>

### 12. Debounced search with API and stale-response protection · Swiggy, Microsoft
<details><summary>Solution</summary>

```jsx
function Search() {
  const [q, setQ] = useState(''), [results, setResults] = useState([]), [status, setStatus] = useState('idle');
  const debounced = useDebouncedValue(q, 300);
  useEffect(() => {
    if (debounced.length < 2) { setResults([]); return; }
    const ctrl = new AbortController();
    setStatus('loading');
    fetch(`/api/search?q=${encodeURIComponent(debounced)}`, { signal: ctrl.signal })
      .then(r => r.json()).then(data => { setResults(data); setStatus('done'); })
      .catch(e => { if (e.name !== 'AbortError') setStatus('error'); });
    return () => ctrl.abort();                       // cancels stale requests
  }, [debounced]);
  return (<div>
    <input value={q} onChange={e => setQ(e.target.value)} aria-label="Search" />
    {status === 'loading' && <p>Loading…</p>}
    {status === 'error' && <p>Something went wrong</p>}
    <ul>{results.map(r => <li key={r.id}>{r.name}</li>)}</ul>
  </div>);
}
```
</details>

### 13. Accordion / tabs component · Atlassian, Razorpay
<details><summary>Solution</summary>

State: `openIndex` (single) or `Set` (multiple). Buttons with `aria-expanded` and `aria-controls`, panels with `role="region"`; keyboard support (Enter/Space toggle; arrow keys for tabs with `role="tablist"`/`tab`/`tabpanel`). Keep it controlled-or-uncontrolled via props for reusability.
</details>

### 14. Infinite scroll list · Swiggy, Zomato, Myntra
<details><summary>Solution</summary>

```jsx
function Feed() {
  const [items, setItems] = useState([]), [cursor, setCursor] = useState(null), [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinel = useRef(null);
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    const res = await fetch(`/api/feed?cursor=${cursor ?? ''}`).then(r => r.json());
    setItems(prev => [...prev, ...res.items]); setCursor(res.nextCursor); setHasMore(Boolean(res.nextCursor));
    setLoading(false);
  }, [cursor, hasMore, loading]);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore(); }, { rootMargin: '200px' });
    if (sentinel.current) obs.observe(sentinel.current);
    return () => obs.disconnect();
  }, [loadMore]);
  return (<>
    {items.map(it => <article key={it.id}>{it.title}</article>)}
    <div ref={sentinel} />{loading && <p>Loading…</p>}
  </>);
}
```
</details>

### 15. Star rating component · Microsoft, Flipkart
<details><summary>Solution</summary>

```jsx
function StarRating({ value, onChange, max = 5 }) {
  const [hover, setHover] = useState(0);
  return (
    <div role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(n => (
        <button key={n} role="radio" aria-checked={value === n} aria-label={`${n} star`}
          onMouseEnter={() => setHover(n)} onClick={() => onChange(n)}
          style={{ color: n <= (hover || value) ? 'gold' : 'gray', background: 'none', border: 'none', fontSize: 24 }}>★</button>
      ))}
    </div>
  );
}
```
</details>

## End-to-end scenario

<details><summary>Scenario (90-min machine coding): Build a Kanban board with columns (Todo, In Progress, Done), add/edit/delete cards, drag cards between columns, persisted in localStorage.</summary>

State: `{ columns: {todo: [ids], doing: [], done: []}, cards: {id: {title, desc}} }` (normalized) in useReducer; actions add/edit/delete/move; persist with a `useLocalStorage`-style effect (try/catch, versioned key). Drag and drop with the HTML5 DnD API (`draggable`, `onDragStart` sets card id, `onDrop` dispatches move with target column and index) or keyboard alternative (move left/right buttons) for accessibility. Components: Board → Column → Card, CardEditor modal. Memoize Card. Test the reducer as pure functions.
</details>
