import { useEffect, useMemo, useRef, useState } from 'react'

/* ============================================================
   Algorithm Visualizer — every algorithm is run once to RECORD frames,
   then a player animates the frames. Frames: { a, hl: {idx: kind}, done: Set }
   ============================================================ */

const TABS = [
  { id: 'sort', icon: '📊', title: 'Sorting', blurb: '10 algorithms, step by step or racing.' },
  { id: 'search', icon: '🔍', title: 'Binary search', blurb: 'Halve the search space each step.' },
  { id: 'path', icon: '🧭', title: 'Pathfinding', blurb: 'BFS, DFS, Dijkstra and A* on a grid.' },
]

export default function Visualizer() {
  const [tab, setTab] = useState('sort')
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Home</a> / Algorithm Visualizer</div>
      <header className="lab-hero">
        <p className="eyebrow">Algorithm Visualizer</p>
        <h1>Watch algorithms think</h1>
        <p className="lead">Seeing an algorithm move makes its complexity obvious. Pick one, press play, slow it down, step through it — then read the code and the module for the interview details.</p>
      </header>
      <div className="lab-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={'lab-tab' + (tab === t.id ? ' on' : '')} onClick={() => setTab(t.id)}>
            <span className="lab-tab-icon">{t.icon}</span><span><b>{t.title}</b><small>{t.blurb}</small></span>
          </button>
        ))}
      </div>
      {tab === 'sort' && <Sorting />}
      {tab === 'search' && <BinarySearch />}
      {tab === 'path' && <Pathfinding />}
    </div>
  )
}

/* ---------------- recorder helpers ---------------- */
function recorder(input) {
  const a = input.slice()
  const frames = []
  const done = new Set()
  const stats = { cmp: 0, write: 0 }
  const snap = (hl = {}) => frames.push({ a: a.slice(), hl, done: new Set(done), cmp: stats.cmp, write: stats.write })
  const cmp = (i, j) => { stats.cmp++; snap({ [i]: 'cmp', [j]: 'cmp' }); return a[i] - a[j] }
  const swap = (i, j) => { [a[i], a[j]] = [a[j], a[i]]; stats.write += 2; snap({ [i]: 'swap', [j]: 'swap' }) }
  const set = (i, v) => { a[i] = v; stats.write++; snap({ [i]: 'write' }) }
  const finish = () => { for (let i = 0; i < a.length; i++) done.add(i); snap() }
  return { a, frames, done, cmp, swap, set, snap, finish, stats }
}

/* ---------------- sorting algorithms (recorded) ---------------- */
const SORTS = {
  bubble: {
    name: 'Bubble sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true, inPlace: true,
    idea: 'Repeatedly swap adjacent out-of-order pairs; the largest remaining value “bubbles” to the end each pass. Stop early if a pass makes no swaps.',
    code: `for (int end = n - 1; end > 0; end--) {
  boolean swapped = false;
  for (int i = 0; i < end; i++)
    if (a[i] > a[i + 1]) { swap(a, i, i + 1); swapped = true; }
  if (!swapped) break;          // already sorted → O(n) best case
}`,
    run(r) {
      const n = r.a.length
      for (let end = n - 1; end > 0; end--) {
        let swapped = false
        for (let i = 0; i < end; i++) if (r.cmp(i, i + 1) > 0) { r.swap(i, i + 1); swapped = true }
        r.done.add(end)
        if (!swapped) break
      }
    },
  },
  cocktail: {
    name: 'Cocktail shaker sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true, inPlace: true,
    idea: 'Bubble sort in both directions: a forward pass moves the max right, a backward pass moves the min left. Fixes “turtles” (small values near the end) faster.',
    code: `int lo = 0, hi = n - 1;
while (lo < hi) {
  for (int i = lo; i < hi; i++) if (a[i] > a[i+1]) swap(a, i, i+1);
  hi--;
  for (int i = hi; i > lo; i--) if (a[i-1] > a[i]) swap(a, i-1, i);
  lo++;
}`,
    run(r) {
      let lo = 0, hi = r.a.length - 1
      while (lo < hi) {
        let swapped = false
        for (let i = lo; i < hi; i++) if (r.cmp(i, i + 1) > 0) { r.swap(i, i + 1); swapped = true }
        r.done.add(hi); hi--
        for (let i = hi; i > lo; i--) if (r.cmp(i - 1, i) > 0) { r.swap(i - 1, i); swapped = true }
        r.done.add(lo); lo++
        if (!swapped) break
      }
    },
  },
  selection: {
    name: 'Selection sort', best: 'O(n²)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: false, inPlace: true,
    idea: 'Find the minimum of the unsorted part and swap it to the front. Always n²/2 comparisons, but at most n swaps — useful when writes are expensive.',
    code: `for (int i = 0; i < n - 1; i++) {
  int min = i;
  for (int j = i + 1; j < n; j++) if (a[j] < a[min]) min = j;
  swap(a, i, min);
}`,
    run(r) {
      const n = r.a.length
      for (let i = 0; i < n - 1; i++) {
        let min = i
        for (let j = i + 1; j < n; j++) if (r.cmp(j, min) < 0) min = j
        if (min !== i) r.swap(i, min)
        r.done.add(i)
      }
    },
  },
  insertion: {
    name: 'Insertion sort', best: 'O(n)', avg: 'O(n²)', worst: 'O(n²)', space: 'O(1)', stable: true, inPlace: true,
    idea: 'Grow a sorted prefix: take the next element and shift larger ones right until its spot appears. Excellent for small or nearly-sorted arrays — TimSort uses it for small runs.',
    code: `for (int i = 1; i < n; i++) {
  int key = a[i], j = i - 1;
  while (j >= 0 && a[j] > key) { a[j + 1] = a[j]; j--; }
  a[j + 1] = key;
}`,
    run(r) {
      const n = r.a.length
      for (let i = 1; i < n; i++) {
        let j = i
        while (j > 0 && r.cmp(j - 1, j) > 0) { r.swap(j - 1, j); j-- }
      }
    },
  },
  shell: {
    name: 'Shell sort', best: 'O(n log n)', avg: '≈O(n^1.25)', worst: 'O(n²) (gap-dependent)', space: 'O(1)', stable: false, inPlace: true,
    idea: 'Insertion sort over elements a “gap” apart, shrinking the gap to 1. Far-apart elements move early, so the final insertion pass has little to do.',
    code: `for (int gap = n / 2; gap > 0; gap /= 2)
  for (int i = gap; i < n; i++) {
    int x = a[i], j = i;
    while (j >= gap && a[j - gap] > x) { a[j] = a[j - gap]; j -= gap; }
    a[j] = x;
  }`,
    run(r) {
      const n = r.a.length
      for (let gap = Math.floor(n / 2); gap > 0; gap = Math.floor(gap / 2)) {
        for (let i = gap; i < n; i++) {
          let j = i
          while (j >= gap && r.cmp(j - gap, j) > 0) { r.swap(j - gap, j); j -= gap }
        }
      }
    },
  },
  merge: {
    name: 'Merge sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(n)', stable: true, inPlace: false,
    idea: 'Divide in half, sort each half recursively, merge the two sorted halves. Guaranteed O(n log n) and stable — the basis of TimSort (Java’s object sort) and external sorting.',
    code: `void sort(int[] a, int lo, int hi) {       // [lo, hi)
  if (hi - lo < 2) return;
  int mid = (lo + hi) >>> 1;
  sort(a, lo, mid); sort(a, mid, hi);
  merge(a, lo, mid, hi);                    // two-pointer merge via a buffer
}`,
    run(r) {
      const rec = (lo, hi) => {
        if (hi - lo < 2) return
        const mid = (lo + hi) >> 1
        rec(lo, mid); rec(mid, hi)
        const buf = []
        let i = lo, j = mid
        while (i < mid && j < hi) buf.push(r.cmp(i, j) <= 0 ? r.a[i++] : r.a[j++])
        while (i < mid) buf.push(r.a[i++])
        while (j < hi) buf.push(r.a[j++])
        for (let k = 0; k < buf.length; k++) r.set(lo + k, buf[k])
      }
      rec(0, r.a.length)
    },
  },
  quick: {
    name: 'Quick sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n²)', space: 'O(log n)', stable: false, inPlace: true,
    idea: 'Pick a pivot, partition so smaller values go left and larger right, recurse on both sides. Fastest in practice; random/median-of-3 pivots avoid the O(n²) worst case. Java sorts primitives with dual-pivot quicksort.',
    code: `void quick(int[] a, int lo, int hi) {
  if (lo >= hi) return;
  int p = a[hi], i = lo;                     // Lomuto partition
  for (int j = lo; j < hi; j++) if (a[j] < p) swap(a, i++, j);
  swap(a, i, hi);
  quick(a, lo, i - 1); quick(a, i + 1, hi);
}`,
    run(r) {
      const rec = (lo, hi) => {
        if (lo > hi) return
        if (lo === hi) { r.done.add(lo); return }
        const mid = (lo + hi) >> 1
        r.swap(mid, hi)                       // middle element as pivot (avoids sorted-input worst case)
        let i = lo
        for (let j = lo; j < hi; j++) {
          r.stats.cmp++
          r.snap({ [j]: 'cmp', [hi]: 'pivot' })
          if (r.a[j] < r.a[hi]) { if (i !== j) r.swap(i, j); i++ }
        }
        r.swap(i, hi)
        r.done.add(i)
        rec(lo, i - 1); rec(i + 1, hi)
      }
      rec(0, r.a.length - 1)
    },
  },
  heap: {
    name: 'Heap sort', best: 'O(n log n)', avg: 'O(n log n)', worst: 'O(n log n)', space: 'O(1)', stable: false, inPlace: true,
    idea: 'Build a max-heap in O(n), then repeatedly swap the root (max) to the end and sift down. Guaranteed O(n log n) with O(1) extra space — but poor cache locality makes it slower than quicksort in practice.',
    code: `for (int i = n / 2 - 1; i >= 0; i--) siftDown(a, i, n);   // heapify O(n)
for (int end = n - 1; end > 0; end--) {
  swap(a, 0, end);                 // max goes to its final place
  siftDown(a, 0, end);
}`,
    run(r) {
      const n = r.a.length
      const sift = (i, size) => {
        for (;;) {
          const l = 2 * i + 1, rr = l + 1
          let big = i
          if (l < size && r.cmp(l, big) > 0) big = l
          if (rr < size && r.cmp(rr, big) > 0) big = rr
          if (big === i) return
          r.swap(i, big); i = big
        }
      }
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) sift(i, n)
      for (let end = n - 1; end > 0; end--) { r.swap(0, end); r.done.add(end); sift(0, end) }
    },
  },
  counting: {
    name: 'Counting sort', best: 'O(n + k)', avg: 'O(n + k)', worst: 'O(n + k)', space: 'O(n + k)', stable: true, inPlace: false,
    idea: 'No comparisons: count how many times each value occurs (values in a small range 0..k), then write them back in order. Beats the O(n log n) comparison bound when k is small.',
    code: `int[] count = new int[k + 1];
for (int x : a) count[x]++;
int idx = 0;
for (int v = 0; v <= k; v++)
  while (count[v]-- > 0) a[idx++] = v;`,
    run(r) {
      const max = Math.max(...r.a)
      const count = new Array(max + 1).fill(0)
      for (let i = 0; i < r.a.length; i++) { count[r.a[i]]++; r.snap({ [i]: 'cmp' }) }
      let idx = 0
      for (let v = 0; v <= max; v++) while (count[v]-- > 0) { r.set(idx, v); r.done.add(idx); idx++ }
    },
  },
  radix: {
    name: 'Radix sort (LSD)', best: 'O(d·(n + b))', avg: 'O(d·(n + b))', worst: 'O(d·(n + b))', space: 'O(n + b)', stable: true, inPlace: false,
    idea: 'Sort by the last digit, then the next digit, … using a stable counting sort per digit (base b, d digits). Linear time for fixed-width integers or strings.',
    code: `for (int exp = 1; max / exp > 0; exp *= 10) {
  // stable counting sort of a by digit (a[i] / exp) % 10
  countingSortByDigit(a, exp);
}`,
    run(r) {
      const max = Math.max(...r.a)
      for (let exp = 1; Math.floor(max / exp) > 0; exp *= 10) {
        const buckets = Array.from({ length: 10 }, () => [])
        for (let i = 0; i < r.a.length; i++) { buckets[Math.floor(r.a[i] / exp) % 10].push(r.a[i]); r.snap({ [i]: 'cmp' }) }
        const flat = buckets.flat()
        for (let i = 0; i < flat.length; i++) r.set(i, flat[i])
      }
    },
  },
}

function makeArray(n, kind) {
  const base = Array.from({ length: n }, (_, i) => Math.round(((i + 1) / n) * 95) + 3)
  if (kind === 'sorted') return base
  if (kind === 'reversed') return base.reverse()
  if (kind === 'nearly') { const a = base.slice(); for (let k = 0; k < Math.max(2, n / 10); k++) { const i = Math.floor(Math.random() * n), j = Math.min(n - 1, i + 1 + Math.floor(Math.random() * 3)); [a[i], a[j]] = [a[j], a[i]] } return a }
  if (kind === 'few') return Array.from({ length: n }, () => [20, 45, 70, 95][Math.floor(Math.random() * 4)])
  const a = base.slice()
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]] }   // Fisher–Yates
  return a
}

function record(key, input) {
  const r = recorder(input)
  r.snap()
  SORTS[key].run(r)
  r.finish()
  return r.frames
}

function usePlayer(length, speed) {
  const [i, setI] = useState(0)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const perTick = speed > 60 ? Math.ceil(speed / 30) : 1
    const delay = speed > 60 ? 16 : Math.max(16, 1000 / speed)
    const id = setInterval(() => setI((x) => {
      const nx = Math.min(length - 1, x + perTick)
      if (nx >= length - 1) setPlaying(false)
      return nx
    }), delay)
    return () => clearInterval(id)
  }, [playing, speed, length])
  return { i, setI, playing, setPlaying }
}

function Bars({ frame, height = 260, compact }) {
  const max = 100
  return (
    <div className={'viz-bars' + (compact ? ' compact' : '')} style={{ height }}>
      {frame.a.map((v, k) => {
        const kind = frame.hl[k] || (frame.done.has(k) ? 'done' : '')
        return <div key={k} className={'viz-bar ' + kind} style={{ height: `${(v / max) * 100}%` }} />
      })}
    </div>
  )
}

function Sorting() {
  const [algo, setAlgo] = useState('quick')
  const [size, setSize] = useState(40)
  const [kind, setKind] = useState('random')
  const [speed, setSpeed] = useState(40)
  const [mode, setMode] = useState('single')
  const [seed, setSeed] = useState(0)
  const input = useMemo(() => makeArray(size, kind), [size, kind, seed])
  const frames = useMemo(() => record(algo, input), [algo, input])
  const race = useMemo(() => (mode === 'race' ? Object.keys(SORTS).map((k) => ({ k, frames: record(k, input) })) : []), [mode, input])
  const longest = mode === 'race' ? Math.max(...race.map((x) => x.frames.length)) : frames.length
  const { i, setI, playing, setPlaying } = usePlayer(longest, speed)
  useEffect(() => { setI(0); setPlaying(false) }, [algo, input, mode])
  const frame = frames[Math.min(i, frames.length - 1)]
  const info = SORTS[algo]

  return (
    <div className="viz-wrap">
      <div className="viz-controls">
        <div className="segs"><button className={'seg' + (mode === 'single' ? ' on' : '')} onClick={() => setMode('single')}>One algorithm</button><button className={'seg' + (mode === 'race' ? ' on' : '')} onClick={() => setMode('race')}>Race all 10</button></div>
        {mode === 'single' && (
          <select className="viz-select" value={algo} onChange={(e) => setAlgo(e.target.value)}>
            {Object.entries(SORTS).map(([k, s]) => <option key={k} value={k}>{s.name}</option>)}
          </select>
        )}
        <select className="viz-select" value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="random">Random</option><option value="nearly">Nearly sorted</option><option value="reversed">Reversed</option><option value="few">Few unique</option><option value="sorted">Already sorted</option>
        </select>
        <label className="viz-range">Size <b>{size}</b><input type="range" min="8" max="100" value={size} onChange={(e) => setSize(+e.target.value)} /></label>
        <label className="viz-range">Speed <b>{speed}</b><input type="range" min="2" max="400" value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
        <div className="viz-buttons">
          <button className="btn primary" onClick={() => { if (i >= longest - 1) setI(0); setPlaying((p) => !p) }}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <button className="btn" onClick={() => { setPlaying(false); setI((x) => Math.min(longest - 1, x + 1)) }}>Step</button>
          <button className="btn" onClick={() => setSeed((s) => s + 1)}>🔀 New data</button>
        </div>
      </div>

      {mode === 'single' ? (
        <div className="lab-grid">
          <div className="lab-card">
            <Bars frame={frame} />
            <div className="viz-progress"><div style={{ width: `${(i / Math.max(1, frames.length - 1)) * 100}%` }} /></div>
            <div className="stat-line"><span>Step <b>{Math.min(i, frames.length - 1)}</b> / {frames.length - 1}</span><span>Comparisons <b>{frame.cmp}</b></span><span>Writes <b>{frame.write}</b></span></div>
            <div className="viz-legend"><span><i className="cmp" /> comparing</span><span><i className="swap" /> swapping</span><span><i className="write" /> writing</span><span><i className="pivot" /> pivot</span><span><i className="done" /> in final place</span></div>
            <pre className="lab-pre">{info.code}</pre>
          </div>
          <div className="lab-explain">
            <h4>{info.name}</h4>
            <p>{info.idea}</p>
            <table className="viz-table"><tbody>
              <tr><td>Best</td><td>{info.best}</td></tr><tr><td>Average</td><td>{info.avg}</td></tr><tr><td>Worst</td><td>{info.worst}</td></tr>
              <tr><td>Extra space</td><td>{info.space}</td></tr><tr><td>Stable</td><td>{info.stable ? '✅ yes' : '❌ no'}</td></tr><tr><td>In place</td><td>{info.inPlace ? '✅ yes' : '❌ no'}</td></tr>
            </tbody></table>
            <p className="small muted">Try “Nearly sorted” with insertion sort vs selection sort, or “Already sorted” with bubble sort, to see best cases. Full code and interview questions: <a href="#/topic/dsa/00-sorting-searching">Sorting & searching module</a>.</p>
          </div>
        </div>
      ) : (
        <div className="race-grid">
          {race.map(({ k, frames: fs }) => {
            const f = fs[Math.min(i, fs.length - 1)]
            const finished = i >= fs.length - 1
            return (
              <div key={k} className={'race-cell' + (finished ? ' finished' : '')}>
                <div className="race-head"><b>{SORTS[k].name}</b><span className="muted small">{finished ? `✓ ${fs.length - 1} steps` : `${Math.min(i, fs.length - 1)} steps`}</span></div>
                <Bars frame={f} height={110} compact />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ---------------- binary search ---------------- */
function BinarySearch() {
  const arr = useMemo(() => Array.from({ length: 31 }, (_, i) => i * 3 + 2), [])
  const [target, setTarget] = useState(65)
  const steps = useMemo(() => {
    const out = []
    let lo = 0, hi = arr.length - 1
    while (lo <= hi) {
      const mid = (lo + hi) >> 1
      const verdict = arr[mid] === target ? 'found' : arr[mid] < target ? 'go right' : 'go left'
      out.push({ lo, hi, mid, verdict })
      if (verdict === 'found') break
      if (verdict === 'go right') lo = mid + 1; else hi = mid - 1
    }
    if (!out.length || out[out.length - 1].verdict !== 'found') out.push({ lo, hi, mid: -1, verdict: 'not found' })
    return out
  }, [arr, target])
  const [k, setK] = useState(0)
  useEffect(() => setK(0), [target])
  const s = steps[Math.min(k, steps.length - 1)]

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <label className="field">Target value <b>{target}</b><input type="range" min="0" max="100" value={target} onChange={(e) => setTarget(+e.target.value)} /></label>
        <div className="bs-row">
          {arr.map((v, idx) => {
            const out = s.mid === -1 ? true : idx < s.lo || idx > s.hi
            return <div key={idx} className={'bs-cell' + (out ? ' out' : '') + (idx === s.mid ? (s.verdict === 'found' ? ' found' : ' mid') : '')}><span>{v}</span><small>{idx}</small></div>
          })}
        </div>
        <div className="stat-line"><span>Step <b>{k + 1}</b> / {steps.length}</span>{s.mid >= 0 && <span>lo={s.lo} hi={s.hi} mid={s.mid} → a[mid]={arr[s.mid]}</span>}<span className="pill">{s.verdict}</span></div>
        <div className="lab-actions">
          <button className="btn primary" onClick={() => setK((x) => Math.min(steps.length - 1, x + 1))} disabled={k >= steps.length - 1}>Next step ▶</button>
          <button className="btn" onClick={() => setK(0)}>Restart</button>
        </div>
        <pre className="lab-pre">{`int lo = 0, hi = a.length - 1;
while (lo <= hi) {
  int mid = lo + (hi - lo) / 2;      // avoids int overflow
  if (a[mid] == target) return mid;
  if (a[mid] < target) lo = mid + 1;  // discard the left half
  else hi = mid - 1;                  // discard the right half
}
return -1;`}</pre>
      </div>
      <div className="lab-explain">
        <h4>Why it's O(log n)</h4>
        <p>Every comparison throws away half of the remaining candidates. 31 elements need at most 5 steps; a billion need about 30. Requirement: the data must be sorted (or the predicate monotonic).</p>
        <h4>Interview angle</h4>
        <p>The same “halve the space” idea solves “binary search on the answer” problems (min capacity, Koko eating bananas). Know lower-bound/upper-bound variants and the overflow-safe midpoint.</p>
        <p className="small muted">More: <a href="#/topic/dsa/04-linked-lists-binary-search">Binary search module</a></p>
      </div>
    </div>
  )
}

/* ---------------- pathfinding ---------------- */
const ROWS = 19, COLS = 39
const START = [9, 4], END = [9, 34]
const key = (r, c) => r * COLS + c
const DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]]

function emptyGrid() { return new Array(ROWS * COLS).fill(0) }   // 0 open, 1 wall, 2 mud (cost 5)

function solve(grid, algo) {
  const cost = (i) => (grid[i] === 2 ? 5 : 1)
  const s = key(...START), t = key(...END)
  const visited = [], prev = new Map(), seen = new Set([s])
  const h = (i) => Math.abs(Math.floor(i / COLS) - END[0]) + Math.abs((i % COLS) - END[1])
  const neighbours = (i) => {
    const r = Math.floor(i / COLS), c = i % COLS, out = []
    for (const [dr, dc] of DIRS) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS && grid[key(nr, nc)] !== 1) out.push(key(nr, nc)) }
    return out
  }
  if (algo === 'bfs' || algo === 'dfs') {
    const list = [s]
    const seenD = new Set()
    while (list.length) {
      const u = algo === 'bfs' ? list.shift() : list.pop()
      if (algo === 'dfs') { if (seenD.has(u)) continue; seenD.add(u) }
      visited.push(u)
      if (u === t) break
      for (const v of neighbours(u)) {
        if (algo === 'bfs' ? !seen.has(v) : !seenD.has(v)) { if (algo === 'bfs') seen.add(v); if (!prev.has(v) || algo === 'dfs') prev.set(v, u); list.push(v) }
      }
    }
  } else {
    const dist = new Map([[s, 0]])
    const open = [[algo === 'astar' ? h(s) : 0, s]]
    const closed = new Set()
    while (open.length) {
      open.sort((x, y) => x[0] - y[0])                 // simple priority queue (fine for a demo grid)
      const [, u] = open.shift()
      if (closed.has(u)) continue
      closed.add(u); visited.push(u)
      if (u === t) break
      for (const v of neighbours(u)) {
        const nd = dist.get(u) + cost(v)
        if (nd < (dist.get(v) ?? Infinity)) { dist.set(v, nd); prev.set(v, u); open.push([nd + (algo === 'astar' ? h(v) : 0), v]) }
      }
    }
  }
  const path = []
  if (prev.has(t) || s === t) { for (let u = t; u !== undefined && u !== s; u = prev.get(u)) path.unshift(u); path.unshift(s) }
  const pathCost = path.slice(1).reduce((sum, i) => sum + cost(i), 0)
  return { visited, path, pathCost }
}

function makeMaze() {
  const g = new Array(ROWS * COLS).fill(1)
  const carve = (r, c) => {
    g[key(r, c)] = 0
    const dirs = [[0, 2], [2, 0], [0, -2], [-2, 0]].sort(() => Math.random() - 0.5)
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc
      if (nr > 0 && nr < ROWS - 1 && nc > 0 && nc < COLS - 1 && g[key(nr, nc)] === 1) { g[key(r + dr / 2, c + dc / 2)] = 0; carve(nr, nc) }
    }
  }
  carve(1, 1)
  for (let i = 0; i < g.length; i++) if (g[i] === 1 && Math.random() < 0.08) g[i] = 0   // a few loops so algorithms differ
  for (const [r, c] of [START, END]) { g[key(r, c)] = 0; for (const [dr, dc] of DIRS) { const nr = r + dr, nc = c + dc; if (nr >= 0 && nr < ROWS && nc >= 0 && nc < COLS) g[key(nr, nc)] = 0 } }
  return g
}

const PATH_INFO = {
  bfs: { name: 'Breadth-first search', note: 'Explores in rings. Shortest path when every step costs the same — but ignores mud costs.' },
  dfs: { name: 'Depth-first search', note: 'Dives down one branch until stuck. Finds *a* path, usually not the shortest. Great for connectivity and cycles, not distances.' },
  dijkstra: { name: 'Dijkstra', note: 'Expands the cheapest-so-far cell first (priority queue). Optimal with non-negative weights — walks around mud when it is cheaper.' },
  astar: { name: 'A*', note: 'Dijkstra plus a heuristic (Manhattan distance to the goal) that pulls the search toward the target. Same optimal path, far fewer cells explored.' },
}

function Pathfinding() {
  const [grid, setGrid] = useState(() => makeMaze())
  const [algo, setAlgo] = useState('astar')
  const [brush, setBrush] = useState(1)
  const [step, setStep] = useState(-1)
  const [speed, setSpeed] = useState(60)
  const drawing = useRef(false)
  const result = useMemo(() => solve(grid, algo), [grid, algo])
  const total = result.visited.length + result.path.length
  useEffect(() => {
    if (step < 0 || step >= total) return
    const perTick = Math.max(1, Math.round(speed / 20))
    const id = setTimeout(() => setStep((x) => Math.min(total, x + perTick)), 16)
    return () => clearTimeout(id)
  }, [step, total, speed])
  useEffect(() => setStep(-1), [grid, algo])

  const visitedSet = useMemo(() => new Set(result.visited.slice(0, Math.max(0, Math.min(step, result.visited.length)))), [result, step])
  const pathSet = useMemo(() => new Set(step > result.visited.length ? result.path.slice(0, step - result.visited.length) : []), [result, step])
  const paint = (i) => setGrid((g) => {
    if (i === key(...START) || i === key(...END)) return g
    const n = g.slice(); n[i] = g[i] === brush ? 0 : brush; return n
  })

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <div className="viz-controls">
          <select className="viz-select" value={algo} onChange={(e) => setAlgo(e.target.value)}>
            {Object.entries(PATH_INFO).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
          </select>
          <div className="segs"><button className={'seg' + (brush === 1 ? ' on' : '')} onClick={() => setBrush(1)}>🧱 Wall</button><button className={'seg' + (brush === 2 ? ' on' : '')} onClick={() => setBrush(2)}>🟫 Mud (cost 5)</button></div>
          <label className="viz-range">Speed<input type="range" min="10" max="200" value={speed} onChange={(e) => setSpeed(+e.target.value)} /></label>
          <div className="viz-buttons">
            <button className="btn primary" onClick={() => setStep(0)}>▶ Find path</button>
            <button className="btn" onClick={() => setGrid(makeMaze())}>Maze</button>
            <button className="btn" onClick={() => setGrid(emptyGrid())}>Clear</button>
          </div>
        </div>
        <div className="grid-board" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
          onMouseLeave={() => { drawing.current = false }} onMouseUp={() => { drawing.current = false }}>
          {grid.map((cell, i) => {
            const isStart = i === key(...START), isEnd = i === key(...END)
            const cls = isStart ? 'start' : isEnd ? 'end' : pathSet.has(i) ? 'path' : cell === 1 ? 'wall' : visitedSet.has(i) ? (cell === 2 ? 'visited mud' : 'visited') : cell === 2 ? 'mud' : ''
            return <div key={i} className={'gcell ' + cls}
              onMouseDown={() => { drawing.current = true; paint(i) }}
              onMouseEnter={() => { if (drawing.current) paint(i) }} />
          })}
        </div>
        <div className="stat-line">
          <span>Cells explored <b>{Math.min(Math.max(step, 0), result.visited.length)}</b> / {result.visited.length}</span>
          <span>Path length <b>{result.path.length ? result.path.length - 1 : '—'}</b></span>
          <span>Path cost <b>{result.path.length ? result.pathCost : 'no path'}</b></span>
        </div>
        <p className="small muted">Click or drag on the grid to draw walls or mud. 🟢 start · 🔴 goal.</p>
      </div>
      <div className="lab-explain">
        <h4>{PATH_INFO[algo].name}</h4>
        <p>{PATH_INFO[algo].note}</p>
        <h4>Try this</h4>
        <p>Run BFS and A* on the same maze and compare “cells explored”. Then paint a band of mud across the shortest route: BFS walks straight through it (wrong cost), Dijkstra and A* go around when that's cheaper.</p>
        <p className="small muted">Code and interview questions: <a href="#/topic/dsa/07-graphs">Graphs module</a> · <a href="#/topic/dsa/11-algorithms-catalog">Algorithms catalog</a></p>
      </div>
    </div>
  )
}
