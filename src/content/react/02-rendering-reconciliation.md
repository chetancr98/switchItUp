---
title: React Rendering Model — Reconciliation, Fiber, Keys & Re-renders
level: 1
tags: react, fiber, reconciliation, virtual dom
---
<!-- deepened -->

## Start here: the basics

### What is React?
A JavaScript library for building user interfaces out of **components** — reusable functions that return what the UI should look like.

```jsx
function Greeting({ name }) {          // a component: a function receiving "props"
  return <h1>Hello, {name}!</h1>;      // JSX: HTML-like syntax inside JS
}

function App() {
  return (
    <div>
      <Greeting name="Riya" />
      <Greeting name="Arjun" />
    </div>
  );
}
```

### JSX is just JavaScript
`<h1 className="title">Hi</h1>` compiles to a function call like `jsx('h1', { className: 'title', children: 'Hi' })` that returns a plain object describing the UI. Rules: one parent element (or `<>…</>` fragment), `className` instead of `class`, `{}` to embed JS expressions, self-close tags (`<img />`).

### Props vs state
- **Props** — inputs passed from parent to child (read-only for the child).
- **State** — data a component owns and can change; changing it makes React **re-render** the component.

```jsx
function Counter() {
  const [count, setCount] = useState(0);          // state
  return <button onClick={() => setCount(count + 1)}>Clicked {count} times</button>;
}
```

### The declarative idea
You don't write "find the button and change its text". You describe **what the UI should be for the current state**, and React figures out the DOM changes. When state changes:
1. React calls your component again → gets a new description.
2. Compares it with the previous one (**reconciliation / diffing**).
3. Updates only the parts of the real DOM that changed.

### Rendering lists — and why keys matter
```jsx
<ul>
  {todos.map(todo => <li key={todo.id}>{todo.text}</li>)}
</ul>
```
The `key` tells React which item is which between renders, so it can move/update rows correctly instead of rebuilding them.

### Conditional rendering
```jsx
{isLoggedIn ? <Dashboard /> : <Login />}
{error && <p className="error">{error}</p>}
```

---

## The mental model in one sentence

**UI = f(state)**. A component is a function that returns a description of UI. React calls it when state changes, diffs the new description against the previous one, and applies the minimal DOM changes.

## Three phases

```
 trigger                 render phase (pure, interruptible)        commit phase (sync)
 ───────                 ─────────────────────────────────         ──────────────────
 setState / props  ──►  call components, build new element tree ──► apply DOM mutations
 initial mount          diff against current Fiber tree             run useLayoutEffect
 context change         mark effects (Placement/Update/Deletion)    browser paints
                                                                    run useEffect (after paint)
```
- **Render ≠ DOM update.** A component can render and produce identical output → no DOM change.
- Render must be **pure**: no side effects, no mutation of props/state. StrictMode **double-invokes** components and effects in dev to surface impurity.

## What triggers a re-render

1. Its **state** changes (`setState` with a value that's not `Object.is`-equal to the current one).
2. Its **parent re-renders** — *all children re-render by default*, regardless of props. (This is the most misunderstood fact.)
3. A **context** it consumes changes.
4. (A custom hook's state changes — same as 1.)

Props changing is **not** itself a trigger; props change *because* the parent re-rendered.

## Reconciliation — the diffing heuristics

A general tree diff is O(n³). React does O(n) using two assumptions:

1. **Different element type → tear down and rebuild** the whole subtree (state lost). `<div>` → `<span>`, or `<Counter>` → `<Timer>`.
2. **Keys identify children across renders** within a list.

```jsx
// Same type at same position → React keeps the instance & state, updates props
{isAdmin ? <Profile user={a} /> : <Profile user={b} />}        // state SHARED between the two!

// Force a reset with a key
<Profile key={userId} user={user} />                            // new key → remount → fresh state
```

### Keys — why index is dangerous
```jsx
{todos.map((t, i) => <TodoRow key={i} todo={t} />)}   // ❌ with insert/delete/reorder
```
Insert at the top: every index shifts. React thinks item 0 got new props (rather than a new item inserted) — **local state and uncontrolled inputs stick to the wrong rows**, and every row re-renders. Use a **stable unique id**. Index is fine only for static lists that never reorder.

Defining a component **inside** another component creates a new type on every render → remount every time → lost state and focus:
```jsx
function Parent() {
  const Child = () => <input />;     // ❌ new function = new type each render
  return <Child />;
}
```

## Fiber architecture

A **Fiber** is a unit of work — one per element — a JS object with: `type`, `key`, `stateNode` (DOM node or instance), `child/sibling/return` pointers (a linked tree, traversable without recursion), `memoizedProps`, `memoizedState` (hooks linked list!), `lanes` (priority), `alternate`.

- **Double buffering**: `current` tree (on screen) and `workInProgress` tree (being built). On commit, they swap (pointer flip).
- **Interruptible rendering**: because work is a loop over fibers (not recursion), React can **yield** to the browser every ~5 ms and resume — the basis of **concurrent rendering**.
- **Lanes**: bitmask priorities. Discrete input (click, typing) = sync lane; transitions (`startTransition`) = lower lanes that can be interrupted and restarted.

## Batching

React 18 **automatically batches** all state updates in the same tick — including inside promises, timeouts and native handlers (React 17 only batched inside React event handlers).

```js
function onClick() {
  setCount(c => c + 1);
  setFlag(f => !f);       // one re-render, not two
}
```
Opt out: `flushSync(() => setX(1))`.

State updates are **not** applied immediately:
```js
setCount(count + 1); setCount(count + 1); setCount(count + 1);   // +1 (same stale `count`)
setCount(c => c + 1); setCount(c => c + 1); setCount(c => c + 1); // +3 (updater queue)
```

## Controlled vs uncontrolled

- **Controlled**: React state is the source of truth; `value` + `onChange`. Easy validation/derived UI; re-render per keystroke.
- **Uncontrolled**: DOM holds state; read via `ref` or `FormData`. Less re-rendering; React Hook Form is built on this.
- Switching `value` between `undefined` and a string flips control mode → warning.

## Virtual DOM — the honest take

"Virtual DOM is faster than DOM" is a myth. The VDOM is overhead; React's value is the **declarative programming model** with *acceptable* performance. Compilers (Svelte, Solid with fine-grained signals) skip the diff entirely. **React Compiler** (stable in 2025) auto-memoizes components/hooks at build time — reducing the need for manual `useMemo/useCallback/memo`.

## Quick check questions

<details><summary>1. Does a child re-render if its props didn't change?</summary>

Yes, by default — whenever the parent renders, all children render. Only `React.memo` (or the React Compiler) skips rendering when props are shallow-equal. Note: re-rendering doesn't mean DOM updates; the diff may find nothing to change.
</details>

<details><summary>2. Why are keys needed and why not use the index?</summary>

Keys let React match children between renders to preserve state/DOM and move rather than recreate. With index keys, insertions/removals/reorders shift identities — state and input values attach to the wrong items and more DOM work happens.
</details>

<details><summary>3. How would you reset a form component's internal state when the selected user changes?</summary>

Give it `key={userId}` — a new key unmounts the old instance and mounts a fresh one. Prefer this over effects that "sync" props into state.
</details>

<details><summary>4. What is Fiber and what did it enable?</summary>

React 16's reimplementation of the reconciler as an incremental, linked-list-of-work-units architecture. It enables pausing/resuming/aborting rendering, priorities (lanes), concurrent features (transitions, Suspense), error boundaries, and returning arrays/fragments.
</details>

<details><summary>5. What's the difference between the render phase and the commit phase?</summary>

Render: React calls components and computes the diff — pure, can be interrupted, can run multiple times. Commit: applies DOM mutations, sets refs, runs layout effects synchronously, then passive effects after paint — never interrupted.
</details>

## Questions asked at top companies

<details><summary>What is the Virtual DOM and how does reconciliation work? <em>· Flipkart, Walmart, Infosys, Microsoft</em></summary>

React keeps a lightweight tree of elements; on update it builds a new tree and diffs it against the previous one with O(n) heuristics (different type → replace subtree; keys match list items), then applies minimal DOM mutations in the commit phase.
</details>

<details><summary>Why are keys important? Why not use the index? <em>· Amazon, Swiggy, Paytm</em></summary>

Keys give list items stable identity; index keys shift when items are inserted/removed/reordered, causing state to attach to wrong items and extra re-renders. Use stable unique IDs.
</details>

<details><summary>What triggers a re-render in React? <em>· Atlassian, Uber, Myntra</em></summary>

State change, parent re-render, consumed context change. Props changing is a consequence of parent re-render. React.memo can skip re-renders when props are shallow-equal.
</details>

<details><summary>Controlled vs uncontrolled components. <em>· Infosys, Accenture, Flipkart</em></summary>

Controlled: input value comes from React state and updates via onChange. Uncontrolled: DOM holds the value; read via ref/FormData. Controlled is easier to validate; uncontrolled re-renders less (React Hook Form).
</details>

<details><summary>Class components vs function components. <em>· TCS, Wipro, Walmart</em></summary>

Class components use lifecycle methods and `this.state`; function components use hooks. Modern React prefers functions (simpler, composable hooks); classes still needed only for error boundaries.
</details>

<details><summary>What is React Fiber? <em>· Microsoft, Atlassian</em></summary>

The reconciler architecture (React 16+) representing work as units in a linked tree so rendering can be paused, prioritised and resumed — enabling concurrent features.
</details>

<details><summary>What is prop drilling and how do you avoid it? <em>· Paytm, Myntra</em></summary>

Passing props through many intermediate components that don't use them. Avoid with composition (children), Context, or a state store.
</details>

<details><summary>What does StrictMode do? <em>· Atlassian, Razorpay</em></summary>

Dev-only checks: double-invokes render and effects (mount→unmount→mount) to surface impure renders and missing cleanups, warns about deprecated APIs. No production effect.
</details>

<details><summary>What are fragments and portals? <em>· Walmart, Adobe</em></summary>

Fragments group children without an extra DOM node. Portals render children into a different DOM node (modals, tooltips) while keeping React tree context and event bubbling.
</details>

<details><summary>Why must state be updated immutably? <em>· Flipkart, Amazon</em></summary>

React compares references (`Object.is`) to decide whether state changed; mutating the existing object keeps the same reference, so React may skip re-rendering, and memoized children/effects see inconsistent data.
</details>

## End-to-end scenarios

<details><summary>Scenario: A todo list loses typed text in input fields when you delete an item at the top. Why and how to fix?</summary>

Keys are array indices; deleting item 0 shifts all indices so React reuses the first DOM input for what's now a different todo (uncontrolled input state sticks to position). Use `key={todo.id}`, and prefer controlled inputs bound to the todo's state.
</details>

<details><summary>Scenario: Build a "product list with filters" page structure. How do you split components and where does state live?</summary>

`ProductPage` (reads filters from URL search params) → `FilterPanel` (controlled inputs, updates URL) → `ProductGrid` (receives products) → `ProductCard` (memoized). Server data via React Query keyed by filters; loading skeletons; pagination/infinite scroll; state colocated: hover/open states local to cards; filters in URL so links are shareable.
</details>
