---
title: Performance, Concurrent React, Server Components & Frontend System Design
level: 4
tags: react 18, react 19, performance, ssr, web vitals
---
<!-- deepened -->

## Start here: the basics

### What does "fast" mean for a web page?
Users feel three things:
1. **How quickly content appears** (loading).
2. **How quickly the page reacts** when they click or type (responsiveness).
3. **Whether things jump around** while loading (stability).

Google measures these as **Core Web Vitals**: LCP (loading), INP (responsiveness), CLS (stability).

### Where slowness usually comes from in React apps
| Cause | Symptom | Fix |
|---|---|---|
| Huge JavaScript bundle | Blank screen for seconds | Code splitting (`React.lazy`), remove heavy libraries |
| Too many re-renders | Typing lags | Colocate state, memoization |
| Rendering thousands of rows | Scrolling janky | Virtualization |
| Big images | Slow LCP | Right-sized, lazy-loaded, modern formats |
| Waterfalls of API calls | Spinners one after another | Parallel fetching, prefetching |

### Code splitting in one example
```jsx
const AdminPage = React.lazy(() => import('./AdminPage'));   // loaded only when needed
<Suspense fallback={<Spinner />}><AdminPage /></Suspense>
```

### Client-side vs server-side rendering
- **CSR**: server sends an almost empty HTML + JS; the browser builds the page. Simple, but slower first view.
- **SSR**: server sends ready HTML; the browser "hydrates" it to make it interactive. Faster first view, better SEO.
Frameworks like **Next.js** handle SSR, static generation and React Server Components.

---

## Measure first: Core Web Vitals

| Metric | Measures | Good |
|---|---|---|
| **LCP** (Largest Contentful Paint) | Loading — when the main content appears | ≤ 2.5 s |
| **INP** (Interaction to Next Paint, replaced FID in 2024) | Responsiveness — worst-ish input → next frame | ≤ 200 ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | ≤ 0.1 |
| TTFB, FCP | Server speed, first paint | supporting |

Tools: Lighthouse (lab), CrUX / `web-vitals` lib (field/RUM), Chrome Performance panel, **React DevTools Profiler** ("why did this render?").

## React-level optimisation toolkit

1. **Don't render what you don't need**: colocate state, children-as-props, split contexts, memo where measured.
2. **Virtualise long lists** (`@tanstack/react-virtual`, react-window) — render only visible rows; 10 000 rows → ~30 DOM nodes.
3. **Code splitting**: `const Admin = lazy(() => import('./Admin'))` + `<Suspense fallback>`; route-level splits first.
4. **Concurrent features** for responsiveness (below).
5. **Avoid layout thrashing**: batch DOM reads before writes; animate `transform/opacity` only.
6. **Images**: correct sizes, `srcset`, lazy-load below the fold, modern formats (AVIF/WebP), reserve space (width/height) to avoid CLS; `fetchpriority="high"` on the LCP image.
7. **Bundle**: tree-shaking (ESM), analyse with `rollup-plugin-visualizer`, avoid moment.js/lodash full imports, compress (brotli), HTTP caching with content-hashed filenames (`immutable`).

## Concurrent rendering (React 18)

Rendering can be **interrupted**. Urgent updates (typing) preempt non-urgent ones (re-filtering a big list).

```jsx
function Search({ items }) {
  const [query, setQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState('');

  return (
    <>
      <input value={query} onChange={e => {
        setQuery(e.target.value);                         // urgent: input stays responsive
        startTransition(() => setFilter(e.target.value)); // can be interrupted / abandoned
      }} />
      {isPending && <Spinner />}
      <HeavyList items={items} filter={filter} />
    </>
  );
}

// or, when you don't own the setter:
const deferred = useDeferredValue(query);   // lags behind during heavy renders
<HeavyList filter={deferred} />             // wrap HeavyList in memo so it only re-renders on deferred changes
```
Transitions don't make rendering faster — they keep the UI **responsive** and avoid showing intermediate states. Not a replacement for debounce when each keystroke hits the network.

### Suspense
Declarative loading states: a component "suspends" (throws a promise / uses `use(promise)`) and the nearest `<Suspense fallback>` shows until it resolves. Works with `lazy`, Suspense-enabled data libraries, and Server Components streaming. In a transition, React keeps showing old content instead of falling back to a spinner.

### Error boundaries
Class components with `getDerivedStateFromError` / `componentDidCatch` (or `react-error-boundary`). Catch render/lifecycle errors in the subtree — **not** event handler or async errors.

## Rendering strategies

| Strategy | How | Pros | Cons |
|---|---|---|---|
| CSR (SPA) | Empty HTML + JS bundle renders in browser | Simple hosting, rich interactivity | Slow LCP on weak devices, SEO harder |
| SSR | Server renders HTML per request, client **hydrates** | Fast FCP/LCP, SEO | Server cost, TTFB, hydration cost (page looks ready but isn't interactive) |
| SSG | HTML at build time | Fastest, CDN-cacheable | Stale; rebuilds |
| ISR | SSG + background regeneration | Freshness + CDN speed | Framework-specific |
| Streaming SSR | Send HTML in chunks as Suspense boundaries resolve | Faster TTFB/FCP | Complexity |
| **React Server Components** | Components that run **only on the server**, send a serialized tree (no JS for them) | Zero client JS for static parts, direct DB/API access, smaller bundles | New mental model, framework needed (Next.js App Router) |

**Hydration mismatch**: server HTML differs from the first client render (`Date.now()`, `Math.random()`, `window` checks) → warning/re-render. Selective hydration (React 18) hydrates Suspense boundaries independently and prioritises the one the user interacts with.

### React 19 highlights (2024–2025)
- **Actions**: async functions in transitions; `<form action={fn}>`; `useActionState`, `useFormStatus`, `useOptimistic`.
- `use()` to read promises/context (can be called conditionally).
- `ref` as a prop (no `forwardRef`), `<Context>` as provider, document metadata (`<title>` anywhere), stylesheet/script dedupe, preload APIs.
- **Server Components & Server Actions** stable (via frameworks).
- **React Compiler** v1 — automatic memoisation.

## Frontend system design (asked at FAANG for full-stack roles)

Framework (**RADIO**): **R**equirements → **A**rchitecture (components, data flow) → **D**ata model (client stores, API shapes) → **I**nterface (API contracts between client and server) → **O**ptimisations (perf, a11y, i18n, offline, security).

### Example: design an autocomplete / typeahead
- Debounce input (~200–300 ms); minimum chars; **cancel stale requests** (AbortController) or ignore out-of-order responses.
- **Client cache** keyed by query (LRU, TTL); prefix-reuse (filter cached results for longer queries).
- Server: prefix index (trie / Elasticsearch completion suggester), top-K by popularity, CDN cache for popular prefixes.
- UI: keyboard navigation (↑ ↓ Enter Esc), ARIA combobox pattern (`role="combobox"`, `aria-activedescendant`), highlight matches, handle empty/error/loading states.
- Perf: virtualise if many results; avoid layout shift.

### Example: news feed (infinite scroll)
- Cursor-based pagination API; `IntersectionObserver` sentinel to load more; virtualisation for thousands of posts; normalized cache (posts by id) so a like updates everywhere; optimistic likes; skeletons; image lazy-loading; new-posts banner via SSE/WebSocket instead of auto-inserting (prevents layout jump).

### Other common prompts
Image carousel, Google Docs-like editor (OT/CRDT), chat app (WebSocket, delivery states, offline queue), Kanban board (drag & drop, optimistic reorder with fractional indexing), poll widget, infinite photo grid, data table with sort/filter/pagination.

## Quick check questions

<details><summary>1. A page with a 5 000-row table is janky when typing in the filter box. Fix it.</summary>

Profile first. Then: virtualise rows; memoise rows with stable props; mark the filter update as a transition (`useTransition`/`useDeferredValue`) so typing stays urgent; move filtering to a memoised selector; debounce if it triggers a network request; consider a Web Worker for heavy filtering.
</details>

<details><summary>2. SSR vs RSC — what's the difference?</summary>

SSR renders client components to HTML on the server, then ships all their JS to hydrate. RSC are components that never ship JS — they render on the server to a serialized description merged into the client tree; they can access the backend directly. They're complementary: RSC output can itself be SSR'd to HTML.
</details>

<details><summary>3. What does useTransition do under the hood?</summary>

Updates inside `startTransition` are scheduled in a lower-priority (transition) lane. React renders them concurrently, yielding to the browser; if an urgent update arrives, it interrupts and restarts the transition render. `isPending` is true until the transition commits.
</details>

<details><summary>4. How do you improve LCP for a React SPA?</summary>

SSR/SSG the above-the-fold content, preload the LCP image with `fetchpriority=high`, inline critical CSS, reduce/split JS, CDN with good caching, server response time (TTFB), avoid client-side redirects, font-display swap with preloaded fonts.
</details>

## Questions asked at top companies

<details><summary>How do you optimise a slow React application? <em>· Flipkart, Walmart, Atlassian, Amazon</em></summary>

Measure (Profiler, Lighthouse, Web Vitals), then: reduce re-renders (colocation, memo, stable props, split contexts), virtualize lists, code-split routes, optimize images, avoid waterfalls, debounce expensive handlers, move heavy computation to workers, use transitions for non-urgent updates.
</details>

<details><summary>What are LCP, INP and CLS and how do you improve each? <em>· Google, Myntra</em></summary>

LCP: main content load — SSR/preload LCP image/CDN/smaller JS. INP: interaction latency — less main-thread work, break long tasks, transitions. CLS: layout shift — reserve space for images/ads, avoid inserting content above existing content, font loading strategy.
</details>

<details><summary>What is code splitting and lazy loading? <em>· Paytm, Swiggy</em></summary>

Splitting the bundle into chunks loaded on demand (`import()`, `React.lazy`) so initial load contains only what the first screen needs.
</details>

<details><summary>What is hydration and what causes hydration mismatches? <em>· Microsoft, Atlassian</em></summary>

Attaching React event handlers/state to server-rendered HTML. Mismatches arise when the first client render differs from server HTML (dates, random values, browser-only APIs, locale).
</details>

<details><summary>What are React Server Components? <em>· Meta, Vercel-style questions at startups</em></summary>

Components rendered only on the server that send serialized output (no JS shipped for them), can access backend resources directly, and compose with client components marked `'use client'`.
</details>

<details><summary>What do useTransition and useDeferredValue do? <em>· Atlassian, Microsoft</em></summary>

Mark updates as non-urgent so urgent updates (typing) aren't blocked; React renders transitions interruptibly. useDeferredValue gives a lagging copy of a value to render heavy parts with.
</details>

<details><summary>What is list virtualization? <em>· Swiggy, Zomato, Flipkart</em></summary>

Rendering only items visible in the viewport (+ buffer), positioning them inside a tall container — constant DOM size regardless of list length.
</details>

<details><summary>What is tree shaking? <em>· Walmart, Infosys</em></summary>

Bundlers remove unused exports from ES modules at build time. Requires ESM imports and side-effect-free modules (`sideEffects: false`).
</details>

<details><summary>CSR vs SSR vs SSG — when each? <em>· Myntra, MakeMyTrip</em></summary>

CSR: dashboards behind login. SSR: SEO-critical, personalized pages. SSG/ISR: content that changes rarely (blogs, product listing with revalidation).
</details>

<details><summary>What's new in React 19? <em>· startups & product companies (2025)</em></summary>

Actions (`useActionState`, `useFormStatus`, `useOptimistic`), `use()` for promises/context, ref as a prop, document metadata support, Server Components/Actions stable, React Compiler for automatic memoization.
</details>

## End-to-end scenarios

<details><summary>Scenario: An e-commerce home page has LCP of 5.2 s on mobile. Make a plan to get it under 2.5 s.</summary>

Measure with field data (CrUX) and Lighthouse; identify LCP element (hero image). Serve HTML via SSR/SSG from CDN; preload hero image with `fetchpriority=high`, responsive `srcset`, AVIF/WebP; inline critical CSS; defer non-critical JS (analytics, chat widgets); code-split below-the-fold sections; reduce TTFB with caching; preconnect to image CDN; re-measure after each change.
</details>

<details><summary>Scenario (machine coding, 90 min): Build a data table with sorting, filtering, pagination for 10 000 rows.</summary>

Components: Table, HeaderCell (sort toggle with aria-sort), FilterInput (debounced), Pagination. Derived data via useMemo (filter → sort → slice); state in URL params; virtualization if showing all rows; stable row keys; memoized rows; accessible table semantics; tests for sort/filter logic as pure functions.
</details>
