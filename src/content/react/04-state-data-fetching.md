---
title: State Management & Data Fetching — Local, Global, Server State
level: 3
tags: redux, react query, zustand, state
---
<!-- deepened -->

## Start here: the basics

### "State" means data that changes and affects the UI
Ask two questions about each piece of data: **who needs it?** and **where does it come from?**

| Data | Who needs it | Where it lives |
|---|---|---|
| Is this dropdown open? | One component | `useState` in that component |
| Logged-in user, theme | Whole app | Context or a small store |
| Products from the API | Many screens | A **server-state cache** (React Query) |
| Current filter / page | Shareable via link | The **URL** (`?category=shoes&page=2`) |
| Form fields being typed | The form | Form library (React Hook Form) |

### Lifting state up
When two siblings need the same data, move the state to their common parent and pass it down:
```jsx
function Parent() {
  const [query, setQuery] = useState('');
  return (<>
    <SearchInput value={query} onChange={setQuery} />
    <Results query={query} />
  </>);
}
```

### Context — avoid passing props through 5 levels
```jsx
const ThemeContext = createContext('light');
function App() { return <ThemeContext.Provider value="dark"><Page /></ThemeContext.Provider>; }
function Button() { const theme = useContext(ThemeContext); return <button className={theme}>OK</button>; }
```

### Redux in one minute
One central **store** holds app state. Components **dispatch actions** (`{type: 'cart/added', payload: item}`); pure **reducer** functions compute the new state; components **select** the parts they need. Redux Toolkit removes the boilerplate.

### React Query in one minute
```jsx
const { data, isLoading, error } = useQuery({
  queryKey: ['products', category],
  queryFn: () => fetch(`/api/products?category=${category}`).then(r => r.json()),
});
```
It caches responses, removes duplicate requests, refetches in the background, and handles loading/error states — server data handled for you.

---

## Classify state first (this is the senior answer)

| Kind | Examples | Tool |
|---|---|---|
| **Local UI state** | open/closed, input value | `useState` / `useReducer` |
| **Shared client state** | theme, auth user, cart (before checkout), wizard steps | Context (low-frequency) / Zustand / Redux Toolkit |
| **Server state** (cache of remote data) | products, orders, user profile | **TanStack Query** / SWR / RTK Query / framework loaders |
| **URL state** | filters, pagination, selected tab | Router search params — shareable, back-button friendly |
| **Form state** | values, touched, errors | React Hook Form + Zod |

Most "we need Redux" apps actually needed a **server-state cache**. Server state has problems client state doesn't: caching, deduping, background refetch, staleness, pagination, optimistic updates, retries, garbage collection.

## TanStack Query (React Query)

```jsx
const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: 2 } } });

function useOrders(status) {
  return useQuery({
    queryKey: ['orders', { status }],                 // cache key — include every input
    queryFn: ({ signal }) => api.get('/orders', { params: { status }, signal }).then(r => r.data),
    placeholderData: keepPreviousData,                // smooth pagination
  });
}

function useCancelOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => api.post(`/orders/${id}/cancel`),
    onMutate: async (id) => {                         // optimistic update
      await qc.cancelQueries({ queryKey: ['orders'] });
      const prev = qc.getQueriesData({ queryKey: ['orders'] });
      qc.setQueriesData({ queryKey: ['orders'] }, (old) => old?.map(o => o.id === id ? { ...o, status: 'CANCELLED' } : o));
      return { prev };
    },
    onError: (_e, _id, ctx) => ctx.prev.forEach(([key, data]) => qc.setQueryData(key, data)),  // rollback
    onSettled: () => qc.invalidateQueries({ queryKey: ['orders'] }),                          // refetch truth
  });
}
```

Key concepts:
- **staleTime** (how long data is fresh — no refetch) vs **gcTime** (how long unused data stays in cache).
- **Stale-while-revalidate**: show cached data instantly, refetch in background (on mount, window focus, reconnect).
- **Deduping**: 10 components with the same key → 1 request.
- Infinite queries for cursor pagination; prefetching on hover; Suspense mode.

## Redux Toolkit — when you do need a global store

Redux model: **single store**, state changed only by **dispatching actions** to **pure reducers**; components **select** slices. Value: predictable, debuggable (time-travel), middleware, great for complex client-side domain state (editors, trading UIs, offline-first).

```js
const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: {} },
  reducers: {
    added(state, { payload }) {                       // Immer: "mutate" a draft safely
      const it = state.items[payload.sku] ??= { ...payload, qty: 0 };
      it.qty += 1;
    },
    removed(state, { payload: sku }) { delete state.items[sku]; },
  },
});

const selectTotal = createSelector(                  // memoised selector (Reselect)
  (s) => s.cart.items,
  (items) => Object.values(items).reduce((t, i) => t + i.price * i.qty, 0),
);
const total = useSelector(selectTotal);              // re-renders only if the selected value changes
```
- `useSelector` compares with `===` → selectors returning new arrays/objects every time cause re-renders → memoise with `createSelector`.
- Async: `createAsyncThunk`, or better **RTK Query** for server state.
- Middleware pipeline: `action → middleware chain (thunk, logger, listener) → reducer → new state → subscribers`.

### Zustand / Jotai — lighter alternatives
```js
const useCart = create((set) => ({
  items: [], add: (i) => set((s) => ({ items: [...s.items, i] })),
}));
const count = useCart((s) => s.items.length);   // selector-based subscription
```

### Context vs Redux/Zustand
Context is a **dependency-injection mechanism**, not a state manager: no selectors, every consumer re-renders on value change. Fine for theme/auth/locale (rare updates). Use a store for frequently updated shared state.

## Forms
- **React Hook Form** (uncontrolled + refs → minimal re-renders) + **Zod** schema → share validation types with TypeScript (`z.infer`).
- Validate on the server too, always. Map server ProblemDetail field errors back onto form fields.

## API layer patterns
- One typed client module (axios/fetch wrapper) with base URL, auth header injection, **401 → refresh token → retry once** interceptor (with a shared in-flight refresh promise so 10 concurrent 401s trigger one refresh).
- Generate TypeScript types from the backend's **OpenAPI** spec (openapi-typescript / orval) → frontend & Spring backend contracts stay in sync.
- Error boundaries for render errors; query `error` states for fetch errors; toast for mutations.

## TypeScript for React (expected at senior level)
```ts
type ButtonProps = React.ComponentPropsWithoutRef<'button'> & { variant?: 'primary' | 'ghost' };
type ApiResult<T> = { status: 'success'; data: T } | { status: 'error'; error: string };   // discriminated union
function assertNever(x: never): never { throw new Error(String(x)); }                     // exhaustiveness
type Props<T> = { items: T[]; render: (item: T) => React.ReactNode };                     // generic component
```

## Quick check questions

<details><summary>1. When would you choose Redux over React Query, and could you use both?</summary>

React Query for server state (caching, sync with backend). Redux (or Zustand) for complex client-only state shared across distant components (editor documents, multi-step flows, offline queues). They coexist well — keep server data out of Redux unless you use RTK Query.
</details>

<details><summary>2. Why does my component re-render on every store update even though its data didn't change?</summary>

The selector returns a new reference each time (e.g., `state.items.filter(...)` or `{a, b}`), failing `===`. Memoise with `createSelector`, select primitives, or use `shallowEqual`.
</details>

<details><summary>3. Implement optimistic UI for "like" with rollback.</summary>

On click: snapshot current cache, update cache to liked & count+1, fire mutation; on error restore snapshot and show a toast; on settle invalidate/refetch to reconcile with server truth. Disable double-submit or make the endpoint idempotent (PUT like state rather than POST toggle).
</details>

<details><summary>4. Where should filter/sort/page state live in a product listing page?</summary>

In the URL search params — shareable, bookmarkable, survives refresh, works with back/forward. Derive the query key from them so React Query caches each combination.
</details>

## Questions asked at top companies

<details><summary>When would you use Redux vs Context vs React Query? <em>· Flipkart, Walmart, Atlassian, Swiggy</em></summary>

Context: low-frequency global values (theme, auth). React Query: server data caching/sync. Redux/Zustand: complex, frequently updated client state shared widely (editors, multi-step workflows), with devtools and middleware.
</details>

<details><summary>Explain the Redux data flow. <em>· Infosys, Paytm, Accenture</em></summary>

UI dispatches an action → middleware (thunks/logging) → reducer computes new state immutably → store notifies subscribers → `useSelector` re-renders components whose selected value changed.
</details>

<details><summary>What is a reducer and why must it be pure? <em>· Walmart, Myntra</em></summary>

`(state, action) => newState`. Purity (no side effects, no mutation, deterministic) enables predictable state, time-travel debugging, and safe re-execution.
</details>

<details><summary>What are thunks / middleware in Redux? <em>· Paytm, Infosys</em></summary>

Middleware intercepts dispatched actions. Thunk middleware lets you dispatch functions that perform async work and dispatch real actions later (`createAsyncThunk`). Others: listener middleware, saga, logger.
</details>

<details><summary>How does React Query decide when to refetch? <em>· Atlassian, Razorpay</em></summary>

Data is fresh until `staleTime`; stale data refetches on mount, window focus, reconnect, or interval; unused data removed after `gcTime`; `invalidateQueries` forces refetch.
</details>

<details><summary>How do you implement optimistic updates? <em>· Meta, Swiggy</em></summary>

Update the cache immediately, keep a snapshot, send the request; on error roll back to the snapshot; on settle refetch/invalidate to reconcile.
</details>

<details><summary>How do you avoid unnecessary re-renders with useSelector? <em>· Flipkart, Uber</em></summary>

Select minimal primitive values, use memoized selectors (`createSelector`), `shallowEqual` for object results, normalize state.
</details>

<details><summary>How do you handle forms with validation at scale? <em>· Myntra, CRED</em></summary>

React Hook Form (uncontrolled, minimal renders) + Zod/Yup schema, field-level errors, server-side error mapping, disabled submit while pending, accessibility (labels, aria-invalid).
</details>

<details><summary>How do you handle authentication state and token refresh in a React app? <em>· Paytm, PhonePe</em></summary>

Auth context with user info; access token in memory; axios/fetch interceptor attaches it; on 401 perform a single shared refresh request (queue concurrent requests), retry once, log out on refresh failure; protect routes with a guard component.
</details>

<details><summary>What is normalized state and why use it? <em>· Meta, Atlassian</em></summary>

Store entities by id in lookup tables (`{byId, allIds}`) instead of nested copies; updates happen in one place, avoiding inconsistencies and expensive deep updates (`createEntityAdapter`).
</details>

## End-to-end scenarios

<details><summary>Scenario: Build a shopping cart that works across pages, survives refresh, and syncs with the server when the user logs in.</summary>

Cart slice in Redux/Zustand with items normalized by SKU; persist to localStorage for guests (versioned schema); on login, merge local cart with server cart via an API (server resolves conflicts, returns canonical cart) and switch to React Query for server-backed cart; optimistic add/remove with rollback; totals computed by selectors; idempotent API calls.
</details>

<details><summary>Scenario: A dashboard shows data from 6 APIs; it's slow and flickers with spinners. Improve UX and performance.</summary>

Fire queries in parallel (React Query, not chained effects); use Suspense boundaries per widget with skeletons; `staleTime` to avoid refetch flicker; `placeholderData`/keepPreviousData when filters change; prefetch on hover/route; aggregate APIs in a BFF if round trips dominate; cache per widget; show partial data with error states per widget instead of failing the whole page.
</details>
