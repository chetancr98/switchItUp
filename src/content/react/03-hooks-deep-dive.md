---
title: Hooks Deep Dive — useState, useEffect, Memoisation, Refs & Custom Hooks
level: 2
tags: react, hooks, useeffect, memo
---
<!-- deepened -->

## Start here: the basics

### What is a hook?
A **hook** is a special function (name starts with `use`) that lets a function component "hook into" React features like state and side effects.

### useState — remember a value between renders
```jsx
function LikeButton() {
  const [liked, setLiked] = useState(false);   // initial value false
  return <button onClick={() => setLiked(!liked)}>{liked ? '❤️' : '🤍'}</button>;
}
```
Calling `setLiked` schedules a re-render with the new value.

### useEffect — do something *after* render (talk to the outside world)
Fetching data, setting up timers, subscribing to events, updating `document.title`:

```jsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}`)
      .then(r => r.json())
      .then(data => { if (!cancelled) setUser(data); });
    return () => { cancelled = true; };      // cleanup: runs before the next effect / on unmount
  }, [userId]);                               // dependency array: re-run when userId changes

  if (!user) return <p>Loading…</p>;
  return <h2>{user.name}</h2>;
}
```
Dependency array cheat sheet: no array → after every render; `[]` → once after mount; `[a, b]` → when `a` or `b` change.

### useRef — a box that survives renders without causing re-renders
```jsx
function SearchBox() {
  const inputRef = useRef(null);
  return (
    <>
      <input ref={inputRef} />
      <button onClick={() => inputRef.current.focus()}>Focus</button>
    </>
  );
}
```

### useMemo and useCallback — remembering expensive results / functions
```jsx
const sorted = useMemo(() => [...items].sort(byPrice), [items]);   // recompute only when items change
const onSelect = useCallback(id => setSelected(id), []);           // same function object every render
```

### Rules of hooks
1. Call hooks only at the **top level** of a component (not inside if/loops).
2. Call hooks only from **components or custom hooks**.

### Custom hooks — your own reusable logic
```jsx
function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
```

---

## How hooks are stored (why the rules exist)

Each component's fiber has `memoizedState` → a **linked list of hooks in call order**. On re-render React walks the list in the same order: the 1st `useState` call gets slot 1, etc. That's why:
- **Only call hooks at the top level** — never in conditions/loops/after early returns (the order would shift and state would be read from the wrong slot).
- **Only call hooks from components or custom hooks.**

## useState

```js
const [items, setItems] = useState(() => expensiveInitial());   // lazy initializer: runs once
setItems(prev => [...prev, item]);                               // updater: use when next depends on prev
```
- State is a **snapshot** per render. `setX` schedules a re-render; the variable in the current closure never changes.
- Bail-out: setting the same value (`Object.is`) skips the re-render.
- **Never mutate**: `items.push(x); setItems(items)` → same reference → no re-render.
- Don't store **derived** data in state; compute it during render (`const total = items.reduce(...)`). Duplicated state = sync bugs.
- `useReducer` when updates are complex or next state depends on several fields — it also gives a stable `dispatch`.

## useEffect — synchronisation, not lifecycle

> Effects synchronise your component with an **external system** (network, DOM APIs, subscriptions, timers). If no external system is involved, you probably don't need an effect.

```js
useEffect(() => {
  const controller = new AbortController();
  fetch(`/api/users/${id}`, { signal: controller.signal })
    .then(r => r.json()).then(setUser)
    .catch(e => { if (e.name !== 'AbortError') setError(e); });
  return () => controller.abort();           // cleanup: runs before next effect & on unmount
}, [id]);                                    // re-sync whenever id changes
```

Timing: after the browser paints (passive). `useLayoutEffect` runs synchronously after DOM mutation **before** paint — for measuring layout (tooltips positioning) to avoid flicker. `useInsertionEffect` — for CSS-in-JS libs.

### Dependency array semantics
| Deps | Runs |
|---|---|
| none | after every render |
| `[]` | after mount (cleanup on unmount) |
| `[a, b]` | after mount and whenever `a` or `b` changed (`Object.is`) |

Every reactive value used inside must be listed (`eslint-plugin-react-hooks` enforces it). Lying about deps → **stale closures**.

### Stale closure — the classic bug
```js
function Timer() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount(count + 1), 1000);  // ❌ count is always 0 here
    return () => clearInterval(id);
  }, []);
  // ✅ setCount(c => c + 1)  — updater doesn't need `count` in scope
}
```

### "You might not need an effect" — common anti-patterns
| Anti-pattern | Instead |
|---|---|
| Effect that sets derived state from props/state | Compute during render (`useMemo` if expensive) |
| Effect to reset state when a prop changes | `key` prop |
| Effect to handle a user event (POST on submit) | Do it in the event handler |
| Chains of effects setting state that triggers effects | Compute in one handler / reducer |
| Fetching in effects for app data | A data library (React Query/SWR) or framework loaders / Server Components |

StrictMode mounts → unmounts → mounts in dev. If that breaks your code, your effect is missing a cleanup.

## Memoisation: React.memo, useMemo, useCallback

```js
const Row = React.memo(function Row({ item, onSelect }) { ... });  // skip render if props shallow-equal

function List({ items, filter }) {
  const visible = useMemo(() => items.filter(i => i.name.includes(filter)), [items, filter]);
  const onSelect = useCallback(id => setSelected(id), []);            // stable reference
  return visible.map(i => <Row key={i.id} item={i} onSelect={onSelect} />);
}
```
- `React.memo` is useless if you pass a new object/array/function each render — hence `useMemo`/`useCallback` exist mainly to **keep references stable** for memoised children or effect deps.
- Memoisation has a cost (comparison + memory). Use it when: expensive computation, props to a memo'd child, values in dependency arrays. Profile first.
- **Better than memo**: move state down (colocate) so fewer components re-render; pass **children as props** — elements created by the parent of a stateful component don't re-render when that component's state changes:

```jsx
function ScrollTracker({ children }) {       // re-renders on scroll...
  const [y, setY] = useState(0);
  ...
  return <div>{y}{children}</div>;           // ...but `children` is the same element object → not re-rendered
}
<ScrollTracker><ExpensiveTree /></ScrollTracker>
```
- **React Compiler** (React 19 era) auto-inserts memoisation; on compiler-enabled codebases manual memo becomes rare. Mention it.

## useRef

- A mutable box `{ current }` that persists across renders and **doesn't trigger re-renders**.
- Uses: DOM access (`ref={inputRef}` → `inputRef.current.focus()`), storing timers/ids, previous value, latest callback (to avoid stale closures without re-subscribing).
- Don't read/write `ref.current` during render (except lazy init) — it makes render impure.

```js
function useLatest(value) { const r = useRef(value); r.current = value; return r; }   // (assign in layout effect for strictness)
function usePrevious(value) { const r = useRef(); useEffect(() => { r.current = value; }); return r.current; }
```
`forwardRef` is no longer needed in React 19 — `ref` is a normal prop for function components. `useImperativeHandle` exposes a limited API instead of the DOM node.

## useContext

Context passes values deeply without prop drilling. **Every consumer re-renders when the provider's value changes** (by reference) — memo does not stop it.

```jsx
// ❌ new object each render → all consumers re-render on every Provider render
<AuthContext.Provider value={{ user, login, logout }}>
// ✅
const value = useMemo(() => ({ user, login, logout }), [user]);
```
Split contexts by update frequency (state vs dispatch), or use a store with selectors (Zustand/Redux) for frequently changing global state.

## Other hooks
- `useId` — stable unique ids for accessibility attributes (SSR-safe).
- `useSyncExternalStore` — subscribe to external stores safely under concurrent rendering (avoids **tearing**). Libraries use it.
- `useTransition` / `useDeferredValue` — see Performance module.
- React 19: `use(promise | context)`, `useActionState`, `useFormStatus`, `useOptimistic`.

## Custom hooks — extracting reusable stateful logic

```js
function useDebouncedValue(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function useFetch(url) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    if (!url) return;
    const ctrl = new AbortController();
    setState(s => ({ ...s, loading: true }));
    fetch(url, { signal: ctrl.signal })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => setState({ data, error: null, loading: false }))
      .catch(error => { if (error.name !== 'AbortError') setState({ data: null, error, loading: false }); });
    return () => ctrl.abort();
  }, [url]);
  return state;
}

function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue];
}
```
Each component calling a custom hook gets **its own state** — hooks share logic, not state.

## Quick check questions

<details><summary>1. Why can't hooks be called conditionally?</summary>

React identifies each hook by its call index in a per-fiber linked list. A conditional call would shift indices between renders so state would be read from the wrong hook.
</details>

<details><summary>2. Infinite loop: useEffect fetches and sets state; deps include an object created in render. Why and how to fix?</summary>

A new object each render fails the `Object.is` dep check → effect runs → sets state → re-render → new object → effect again. Fix: depend on primitive fields, memoise the object with `useMemo`, or move its creation inside the effect.
</details>

<details><summary>3. When does useCallback actually improve performance?</summary>

Only when the function's identity matters: passed to a `React.memo` child, used in another hook's dependency array, or passed to a subscription that would otherwise resubscribe. Elsewhere it adds overhead without benefit.
</details>

<details><summary>4. Difference between useEffect and useLayoutEffect?</summary>

Both run after commit. `useLayoutEffect` runs synchronously before the browser paints (blocks paint) — use for DOM measurements/mutations that must be visible in the first frame. `useEffect` runs after paint — use for everything else.
</details>

<details><summary>5. Implement a hook that returns the window width and is efficient.</summary>

`useSyncExternalStore(subscribe, () => window.innerWidth)` where `subscribe` adds/removes a (throttled) resize listener. Concurrency-safe and shares one subscription pattern; or useState + useEffect with a resize listener and cleanup.
</details>

## Questions asked at top companies

<details><summary>Explain useEffect's dependency array and cleanup. <em>· Flipkart, Paytm, Walmart, Infosys</em></summary>

The effect runs after render; with deps it re-runs only when a dep changes (Object.is). The returned cleanup runs before the next effect run and on unmount — used to unsubscribe, clear timers, abort fetches.
</details>

<details><summary>useMemo vs useCallback vs React.memo. <em>· Amazon, Swiggy, Atlassian</em></summary>

useMemo caches a computed value; useCallback caches a function reference (= useMemo returning a function); React.memo skips re-rendering a component when props are shallow-equal. They work together to avoid unnecessary renders of memoized children.
</details>

<details><summary>What is a stale closure in hooks? <em>· Uber, Microsoft</em></summary>

A callback/effect captured old state/props because it was created in an earlier render and not re-created (missing deps). Fix with correct deps, functional updates (`setX(x => x+1)`), or a ref holding the latest value.
</details>

<details><summary>useState vs useReducer — when to use which? <em>· Myntra, Razorpay</em></summary>

useState for simple independent values; useReducer when state transitions are complex, related fields change together, or next state depends on previous in many ways — centralises update logic and gives stable `dispatch`.
</details>

<details><summary>useEffect vs useLayoutEffect. <em>· Microsoft, Atlassian</em></summary>

useEffect runs after paint (non-blocking); useLayoutEffect runs after DOM mutation but before paint (synchronously) — for measuring layout/avoiding flicker.
</details>

<details><summary>Why can't hooks be called conditionally? <em>· Amazon, Walmart</em></summary>

React stores hook state by call order; changing order between renders would mismatch state slots.
</details>

<details><summary>Write a custom hook `useFetch` / `useDebounce`. <em>· Flipkart, Swiggy, CRED (machine coding)</em></summary>

See code in this module: state for data/error/loading, effect keyed by URL with AbortController cleanup; `useDebounce` with setTimeout in an effect cleared on value change.
</details>

<details><summary>How does useRef differ from useState? <em>· Paytm, Infosys</em></summary>

Changing `ref.current` doesn't trigger re-render and the update is synchronous; refs hold mutable values (DOM nodes, timers, previous values). State changes trigger re-render and are snapshot per render.
</details>

<details><summary>How do you fetch data on component mount, and what's wrong with doing it in useEffect in larger apps? <em>· Atlassian, Meta</em></summary>

`useEffect(..., [])` with cleanup works, but leads to waterfalls, no caching/deduping, race conditions, no SSR. Prefer React Query/SWR, router loaders, or Server Components.
</details>

<details><summary>What does useContext do and what's its performance pitfall? <em>· Flipkart, Walmart</em></summary>

Reads the nearest Provider's value. Every consumer re-renders when the value reference changes — memoize the value and split contexts.
</details>

## End-to-end scenarios

<details><summary>Scenario: Build an infinite-scroll feed component with hooks.</summary>

`useInfiniteQuery` (or custom state: items, cursor, loading, hasMore); a sentinel div observed with `IntersectionObserver` in a `useEffect` (cleanup disconnects); when visible and not loading, fetch next page with the cursor; dedupe items by id; virtualize long lists; show skeletons and error retry; preserve scroll position on back navigation.
</details>

<details><summary>Scenario: A component re-renders 50 times per keystroke and the page lags. How do you debug and fix?</summary>

React DevTools Profiler with "why did this render": find a context value recreated per render, inline objects/functions passed to memoized children, or state lifted too high. Fix: colocate input state, memoize context value, useCallback/useMemo where identity matters, React.memo heavy children, useDeferredValue/useTransition for expensive filtering, virtualize lists.
</details>
