---
title: JavaScript Under the Hood — Event Loop, Closures, this, Prototypes, Promises
level: 1
tags: javascript, event loop, closures, promises
---
<!-- deepened -->

## Start here: the basics

### JavaScript in one paragraph
JavaScript is the language of the browser (and, with Node.js, of servers too). It's **dynamically typed** (a variable can hold any type), **single-threaded** (one call stack), and treats **functions as values** you can pass around.

### Variables and types
```js
let count = 0;            // can be reassigned
const name = 'Riya';      // can't be reassigned (but objects inside can change)
var old = 1;              // legacy — avoid (function-scoped, hoisting surprises)

typeof 42          // 'number'   (one number type, 64-bit floating point)
typeof 'hi'        // 'string'
typeof true        // 'boolean'
typeof undefined   // 'undefined' (declared, no value)
typeof null        // 'object'   (a historic bug — null means "intentionally empty")
typeof {}          // 'object'
typeof []          // 'object'   → use Array.isArray([])
typeof (() => 1)   // 'function'
```

### Functions three ways
```js
function add(a, b) { return a + b; }        // declaration (hoisted)
const sub = function (a, b) { return a - b; };
const mul = (a, b) => a * b;                 // arrow function (no own `this`)
```

### Objects and arrays — everyday operations
```js
const user = { name: 'Riya', city: 'Pune' };
const { name, city } = user;                  // destructuring
const updated = { ...user, city: 'Delhi' };  // copy with change (spread) — doesn't mutate user

const nums = [3, 1, 4, 1, 5];
nums.map(n => n * 2);              // [6,2,8,2,10]
nums.filter(n => n > 2);           // [3,4,5]
nums.reduce((sum, n) => sum + n, 0); // 14
nums.find(n => n > 3);             // 4
nums.includes(5);                  // true
```

### Why "asynchronous" matters
Fetching data takes time. If JavaScript waited (blocked), the whole page would freeze. Instead it **starts** the work, keeps running other code, and runs a **callback** later when the result arrives.

```js
console.log('A');
setTimeout(() => console.log('B'), 1000);   // schedule for later
console.log('C');
// prints A, C, then B after 1 second
```

### Promises and async/await
A **Promise** is an object representing a value that will arrive later (or an error).
```js
fetch('/api/products')                       // returns a Promise
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// Same thing, easier to read:
async function load() {
  try {
    const res = await fetch('/api/products');   // pauses this function only, not the page
    const data = await res.json();
    console.log(data);
  } catch (err) { console.error(err); }
}
```

### `==` vs `===`
Always use `===` (no type conversion). `'5' == 5` is `true`; `'5' === 5` is `false`.

---

## The event loop (the #1 JS interview topic)

JS runs your code on **one thread** with a **call stack**. Async work is handed to the host (browser Web APIs / Node's libuv) and its callbacks are queued.

```
 ┌──────────── Call stack ────────────┐
 │ runs until empty                   │
 └───────────────┬────────────────────┘
                 │ when stack empty:
                 ▼
  1. Drain the ENTIRE microtask queue   (Promise.then/catch/finally, queueMicrotask,
                                         MutationObserver, await continuations)
  2. (browser) render if needed: requestAnimationFrame callbacks → style → layout → paint
  3. Take ONE macrotask                 (setTimeout, setInterval, I/O, UI events, MessageChannel)
  4. go to 1
```

```js
console.log('1');
setTimeout(() => console.log('2'), 0);
Promise.resolve().then(() => console.log('3')).then(() => console.log('4'));
queueMicrotask(() => console.log('5'));
(async () => { console.log('6'); await null; console.log('7'); })();
console.log('8');
// 1 6 8 3 5 7 4 2
```
Why: sync first (1, 6, 8). Microtasks in FIFO: `3`, `5`, `7` (await continuation), then `4` (queued when 3 ran). Then the macrotask `2`.

Consequences:
- A long synchronous loop **freezes the UI** (no rendering, no input) — chunk work, use Web Workers, or `scheduler.yield()`.
- Recursive microtasks can **starve rendering** forever; recursive `setTimeout` can't.
- `setTimeout(fn, 0)` is ≥ ~4 ms after nesting depth 5 (browser clamping).
- **Node** has phases (timers → pending → poll → check (`setImmediate`) → close) and `process.nextTick` runs before promise microtasks.

## Scope, hoisting, TDZ

```js
console.log(a); // undefined — var is hoisted and initialised to undefined
var a = 1;

console.log(b); // ReferenceError — let/const hoisted but in Temporal Dead Zone
let b = 2;

f();            // works — function declarations fully hoisted
function f() {}
```
`var` is function-scoped; `let/const` block-scoped. `const` prevents reassignment, not mutation.

The loop classic:
```js
for (var i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 3 3 3 — one shared i
for (let i = 0; i < 3; i++) setTimeout(() => console.log(i));  // 0 1 2 — new binding per iteration
```

## Closures

A function plus the lexical environment it was created in. The function keeps references (not copies) to outer variables alive.

```js
function counter() {
  let count = 0;                         // private state
  return { inc: () => ++count, get: () => count };
}

function once(fn) {
  let done = false, result;
  return (...args) => done ? result : (done = true, result = fn(...args));
}

function debounce(fn, ms) {               // asked constantly in frontend rounds
  let t;
  return function (...args) {
    clearTimeout(t);
    t = setTimeout(() => fn.apply(this, args), ms);
  };
}

function throttle(fn, ms) {
  let last = 0;
  return function (...args) {
    const now = Date.now();
    if (now - last >= ms) { last = now; fn.apply(this, args); }
  };
}

function memoize(fn) {
  const cache = new Map();
  return (arg) => cache.has(arg) ? cache.get(arg) : (cache.set(arg, fn(arg)), cache.get(arg));
}
```
**Stale closures** in React (a `useEffect` capturing old state) are just closures — see Hooks module.

## `this` — four binding rules (in precedence order)

1. **`new`** → the new object.
2. **Explicit** `call/apply/bind` → the given object (`bind` is permanent).
3. **Implicit** `obj.method()` → `obj`.
4. **Default** → `undefined` in strict mode / modules, `globalThis` in sloppy mode.

**Arrow functions** have no own `this` — they use the enclosing lexical `this` (and can't be rebound or `new`ed).

```js
const user = {
  name: 'Asha',
  regular() { return this.name; },
  arrow: () => this?.name,               // `this` of the module scope → undefined
  later() { setTimeout(function () { console.log(this.name); }); },     // undefined — lost
  later2() { setTimeout(() => console.log(this.name)); },               // 'Asha'
};
const f = user.regular; f();             // undefined — implicit binding lost
```

## Prototypes & classes

Every object has an internal `[[Prototype]]` link. Property lookup walks the chain until `null`.

```js
class Animal { speak() { return `${this.name} makes a sound`; } constructor(n) { this.name = n; } }
class Dog extends Animal { speak() { return super.speak() + ' (woof)'; } }

const d = new Dog('Rex');
Object.getPrototypeOf(d) === Dog.prototype;              // true
Object.getPrototypeOf(Dog.prototype) === Animal.prototype; // true
```
`class` is syntax over prototypes. Methods live on `prototype` (shared), fields declared in the class body live on each instance. `new F()`: create object linked to `F.prototype` → run F with `this` = obj → return obj unless F returns an object.

## Promises & async/await

States: pending → fulfilled | rejected (settled once, immutable).

```js
Promise.all([a, b])         // all fulfil → array; first rejection rejects (others keep running!)
Promise.allSettled([a, b])  // always fulfils with [{status, value|reason}]
Promise.race([a, timeout])  // first to settle
Promise.any([a, b])         // first to FULFIL; AggregateError if all reject
```

Implement-it questions:
```js
function promiseAll(promises) {
  return new Promise((resolve, reject) => {
    const results = []; let remaining = promises.length;
    if (remaining === 0) return resolve(results);
    promises.forEach((p, i) => {
      Promise.resolve(p).then(v => {
        results[i] = v;                         // keep order
        if (--remaining === 0) resolve(results);
      }, reject);
    });
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function retry(fn, attempts = 3, base = 200) {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) { if (i >= attempts - 1) throw e; await sleep(base * 2 ** i + Math.random() * 100); }
  }
}

// Run async tasks with a concurrency limit (very common at FAANG frontend rounds)
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length); let next = 0;
  async function worker() { while (next < items.length) { const i = next++; results[i] = await fn(items[i], i); } }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```

**Sequential vs parallel await:**
```js
const a = await getA(); const b = await getB();             // sequential: tA + tB
const [a, b] = await Promise.all([getA(), getB()]);         // parallel: max(tA, tB)
```
`forEach` doesn't await async callbacks — use `for...of` (sequential) or `Promise.all(map)` (parallel).

**Cancellation**: `AbortController` → `fetch(url, { signal })`; abort on unmount / new search to avoid race conditions where an older response overwrites a newer one.

## Equality, coercion, types

- `===` strict (no coercion). `==` coerces: `0 == ''` true, `null == undefined` true, `NaN == NaN` false. Use `Object.is` for `NaN`/`-0`.
- Primitives: string, number, bigint, boolean, undefined, symbol, null (`typeof null === 'object'` — historic bug).
- Objects compared by **reference** — the foundation of React's change detection.
- Copying: spread / `Object.assign` are **shallow**; `structuredClone` is deep (no functions).

## Modern JS you should write fluently
Destructuring with defaults, rest/spread, optional chaining `?.`, nullish coalescing `??` (vs `||` which treats `0`/`''` as falsy), `Array.prototype.at/flatMap/findLast/toSorted/toReversed` (non-mutating), `Object.groupBy`, `Map`/`Set`/`WeakMap`, ES modules (static, live bindings, tree-shakable) vs CommonJS.

## Memory leaks in the browser
Forgotten timers/intervals, event listeners on `window` not removed, closures holding large objects, detached DOM nodes referenced from JS, unbounded caches/maps (use `WeakMap` keyed by objects). Find them with Chrome DevTools heap snapshots (compare, look for "Detached").

## Quick check questions

<details><summary>1. What's the output order of setTimeout, Promise.then and a synchronous log?</summary>

Synchronous first, then all microtasks (promise callbacks), then the next macrotask (setTimeout). Microtasks always drain fully between macrotasks.
</details>

<details><summary>2. Implement debounce. When would you use debounce vs throttle?</summary>

See code above. Debounce: fire once after activity stops (search-as-you-type, resize end, autosave). Throttle: fire at most every N ms during activity (scroll position, mousemove, analytics).
</details>

<details><summary>3. Why does `const` not make an object immutable?</summary>

`const` makes the binding immutable — you can't reassign the variable — but the object it references can still be mutated. Use `Object.freeze` (shallow) or immutable update patterns.
</details>

<details><summary>4. Explain how `await` works in terms of the event loop.</summary>

`await x` converts x to a promise and suspends the async function; the rest of the function is scheduled as a microtask continuation when the promise settles. The call stack unwinds back to the caller immediately — `await` never blocks the thread.
</details>

<details><summary>5. How would you prevent an older fetch response from overwriting a newer one in a search box?</summary>

Abort the previous request with AbortController when a new query starts; or track a request id / the latest query and ignore stale responses; or use a library (React Query keys per query) that handles it.
</details>

## Questions asked at top companies

<details><summary>Explain the event loop, call stack, microtask and macrotask queues. <em>· Google, Microsoft, Flipkart, Atlassian</em></summary>

Synchronous code runs on the call stack. Async callbacks wait in queues. When the stack empties, all microtasks (promise callbacks, queueMicrotask) run, then the browser may render, then one macrotask (setTimeout, events, I/O) runs, and the cycle repeats.
</details>

<details><summary>What is a closure? Give a practical use. <em>· Amazon, Microsoft, Uber, Swiggy</em></summary>

A function that remembers variables from the scope where it was created, even after that scope finished. Uses: private state (counters), function factories, debounce/throttle, memoization, React hooks.
</details>

<details><summary>var vs let vs const and hoisting / TDZ. <em>· Walmart, Paytm, Infosys</em></summary>

var: function-scoped, hoisted with `undefined`, redeclarable. let/const: block-scoped, hoisted but in the temporal dead zone until declared (ReferenceError if used early). const can't be reassigned.
</details>

<details><summary>Implement debounce and throttle. <em>· Google, Flipkart, Myntra, Atlassian (very frequent)</em></summary>

See the closure section above. Debounce delays until inactivity; throttle limits to one call per interval. Follow-ups: leading/trailing options, cancel method, preserving `this`/arguments.
</details>

<details><summary>Implement Promise.all (and Promise.allSettled). <em>· Microsoft, Uber, Meta</em></summary>

Return a new Promise; track results by index and a remaining counter; resolve when counter hits 0; reject on first rejection (all) or record `{status, value/reason}` for each (allSettled). Handle empty input and non-promise values via `Promise.resolve`.
</details>

<details><summary>How does `this` work? What do call, apply and bind do? <em>· Amazon, Adobe, Paytm</em></summary>

Determined by call site: `new` > explicit (call/apply/bind) > implicit (`obj.fn()`) > default (undefined in strict). call(thisArg, ...args) and apply(thisArg, argsArray) invoke immediately; bind returns a new permanently bound function. Arrow functions take `this` lexically.
</details>

<details><summary>Explain prototypal inheritance. <em>· Microsoft, Salesforce</em></summary>

Objects link to a prototype object; property lookups walk the chain. Constructor functions' `prototype` becomes instances' `[[Prototype]]`. `class` is syntax over this mechanism.
</details>

<details><summary>Output-prediction: `for (var i=0;i<3;i++) setTimeout(()=>console.log(i))`. <em>· Flipkart, Swiggy, Zomato</em></summary>

Prints 3,3,3 — one shared `var i`, callbacks run after the loop. With `let` it prints 0,1,2 (new binding per iteration).
</details>

<details><summary>Deep copy vs shallow copy in JS. <em>· Walmart, Myntra</em></summary>

Spread/Object.assign copy only the top level (nested objects shared). Deep copy: `structuredClone(obj)` (handles dates, maps, cycles; not functions), or a recursive function; `JSON.parse(JSON.stringify())` loses dates/undefined/functions.
</details>

<details><summary>What is event delegation and event bubbling? <em>· Amazon, Flipkart</em></summary>

Events bubble from target up through ancestors. Delegation attaches one listener on a parent and uses `event.target` to handle children — fewer listeners, works for dynamically added elements. `stopPropagation` stops bubbling.
</details>

<details><summary>Implement a polyfill for `Array.prototype.map`. <em>· Microsoft, Flipkart, Paytm</em></summary>

```js
Array.prototype.myMap = function (cb, thisArg) {
  const out = new Array(this.length);
  for (let i = 0; i < this.length; i++) if (i in this) out[i] = cb.call(thisArg, this[i], i, this);
  return out;
};
```
</details>

## End-to-end scenarios

<details><summary>Scenario: Build a search box that calls an API as the user types, without flooding the server or showing stale results.</summary>

Debounce input (~300 ms) and require ≥ 2 chars; keep an AbortController per request and abort the previous one when a new query starts; ignore responses whose query isn't the latest; cache results per query in a Map (LRU); show loading/empty/error states; keyboard navigation and ARIA combobox for accessibility.
</details>

<details><summary>Scenario: Fetch 200 product images' metadata from an API that allows at most 5 concurrent requests, with retries.</summary>

Use a concurrency-limited pool (`mapLimit` with 5 workers pulling from a shared index), wrap each fetch in retry with exponential backoff + jitter for 429/5xx only, respect `Retry-After`, collect results by index, use `Promise.allSettled` semantics to report partial failures, and make it cancellable via AbortController.
</details>
