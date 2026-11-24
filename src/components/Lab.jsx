import { useEffect, useMemo, useRef, useState } from 'react'

/* ============================================================
   AI Lab — small, honest, in-browser models of how LLM systems work.
   Nothing here calls a real model; each demo is a faithful toy of one mechanism.
   ============================================================ */

const EXPERIMENTS = [
  { id: 'sampling', icon: '🎲', title: 'Next-token sampling', blurb: 'Temperature, top-k and top-p, live.' },
  { id: 'tokenizer', icon: '✂️', title: 'Train a tokenizer', blurb: 'Byte-pair encoding, merge by merge.' },
  { id: 'rag', icon: '🔎', title: 'Mini RAG retrieval', blurb: 'Vectors, cosine similarity, prompt assembly.' },
  { id: 'gd', icon: '📉', title: 'Gradient descent', blurb: 'Watch a model learn a line.' },
  { id: 'agent', icon: '🤖', title: 'Agent loop simulator', blurb: 'Step through tool calls message by message.' },
]

export default function Lab() {
  const [active, setActive] = useState(() => {
    try { return localStorage.getItem('switchitup.lab') || 'sampling' } catch { return 'sampling' }
  })
  useEffect(() => { try { localStorage.setItem('switchitup.lab', active) } catch { /* ignore */ } }, [active])
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Home</a> / AI Lab</div>
      <header className="lab-hero">
        <p className="eyebrow">AI Lab</p>
        <h1>See how LLMs and agents actually work</h1>
        <p className="lead">Five hands-on experiments that run in your browser. Each one is a small, honest model of a real mechanism you'll be asked about in AI interviews. Change the inputs and watch what happens.</p>
      </header>
      <div className="lab-tabs">
        {EXPERIMENTS.map((e) => (
          <button key={e.id} className={'lab-tab' + (active === e.id ? ' on' : '')} onClick={() => setActive(e.id)}>
            <span className="lab-tab-icon">{e.icon}</span>
            <span><b>{e.title}</b><small>{e.blurb}</small></span>
          </button>
        ))}
      </div>
      <section className="lab-stage">
        {active === 'sampling' && <Sampling />}
        {active === 'tokenizer' && <Tokenizer />}
        {active === 'rag' && <Rag />}
        {active === 'gd' && <GradientDescent />}
        {active === 'agent' && <AgentLoop />}
      </section>
    </div>
  )
}

function Explain({ what, interview, modules }) {
  return (
    <div className="lab-explain">
      <div><h4>What's happening</h4><p>{what}</p></div>
      <div><h4>Interview angle</h4><p>{interview}</p></div>
      {modules && <p className="small muted">Read more: {modules.map((m, i) => <span key={m.href}>{i > 0 && ' · '}<a href={m.href}>{m.label}</a></span>)}</p>}
    </div>
  )
}

/* ---------------- 1. Sampling ---------------- */
const CANDIDATES = [
  ['Paris', 9.1], ['the', 6.3], ['a', 5.6], ['located', 5.2], ['Lyon', 4.4], ['known', 4.1],
  ['beautiful', 3.6], ['France', 3.1], ['Marseille', 2.7], ['not', 2.2], ['banana', 0.4],
]

function softmax(logits, T) {
  if (T <= 0.001) {                              // greedy: all mass on the max
    const max = Math.max(...logits)
    return logits.map((l) => (l === max ? 1 : 0))
  }
  const scaled = logits.map((l) => l / T)
  const m = Math.max(...scaled)
  const ex = scaled.map((s) => Math.exp(s - m))  // subtract max for numerical stability
  const z = ex.reduce((a, b) => a + b, 0)
  return ex.map((e) => e / z)
}

function filterTopKTopP(probs, k, p) {
  const order = probs.map((pr, i) => [pr, i]).sort((a, b) => b[0] - a[0])
  const keep = new Set()
  let cum = 0
  for (let r = 0; r < order.length; r++) {
    if (r >= k) break
    keep.add(order[r][1])
    cum += order[r][0]
    if (cum >= p) break                          // nucleus: smallest set whose mass reaches p
  }
  const kept = probs.map((pr, i) => (keep.has(i) ? pr : 0))
  const z = kept.reduce((a, b) => a + b, 0) || 1
  return kept.map((x) => x / z)                  // renormalise over survivors
}

function sampleIndex(probs) {
  let r = Math.random(), acc = 0
  for (let i = 0; i < probs.length; i++) { acc += probs[i]; if (r <= acc) return i }
  return probs.length - 1
}

function Sampling() {
  const [T, setT] = useState(1)
  const [k, setK] = useState(CANDIDATES.length)
  const [p, setP] = useState(1)
  const [samples, setSamples] = useState([])
  const raw = useMemo(() => softmax(CANDIDATES.map((c) => c[1]), T), [T])
  const final = useMemo(() => filterTopKTopP(raw, k, p), [raw, k, p])
  const draw = () => setSamples(Array.from({ length: 24 }, () => CANDIDATES[sampleIndex(final)][0]))
  const counts = samples.reduce((m, s) => ({ ...m, [s]: (m[s] || 0) + 1 }), {})

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <div className="lab-prompt">Prompt: <code>The capital of France is</code> <span className="muted">→ next token?</span></div>
        <div className="sliders">
          <label>Temperature <b>{T.toFixed(2)}</b><input type="range" min="0" max="2" step="0.05" value={T} onChange={(e) => setT(+e.target.value)} /></label>
          <label>Top-k <b>{k}</b><input type="range" min="1" max={CANDIDATES.length} step="1" value={k} onChange={(e) => setK(+e.target.value)} /></label>
          <label>Top-p <b>{p.toFixed(2)}</b><input type="range" min="0.05" max="1" step="0.05" value={p} onChange={(e) => setP(+e.target.value)} /></label>
        </div>
        <div className="bars">
          {CANDIDATES.map(([tok, logit], i) => (
            <div key={tok} className={'bar-row' + (final[i] === 0 ? ' cut' : '')}>
              <span className="bar-label">{tok}</span>
              <span className="bar-track"><span className="bar-ghost" style={{ width: raw[i] * 100 + '%' }} /><span className="bar-val" style={{ width: final[i] * 100 + '%' }} /></span>
              <span className="bar-num">{(final[i] * 100).toFixed(1)}%</span>
              <span className="bar-logit muted">logit {logit}</span>
            </div>
          ))}
        </div>
        <div className="lab-actions">
          <button className="btn primary" onClick={draw}>Sample 24 next tokens</button>
          <button className="btn" onClick={() => { setT(0); setK(CANDIDATES.length); setP(1) }}>Greedy (T=0)</button>
          <button className="btn" onClick={() => { setT(1); setK(CANDIDATES.length); setP(1) }}>Reset</button>
        </div>
        {samples.length > 0 && (
          <div className="chips">{Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([t, c]) => <span key={t} className="chip">{t} ×{c}</span>)}</div>
        )}
      </div>
      <Explain
        what="The model outputs a score (logit) for every token in its vocabulary. Softmax turns logits into probabilities; temperature divides logits before softmax — low T sharpens the distribution (near-deterministic), high T flattens it (more random). Top-k keeps only the k most likely tokens; top-p (nucleus) keeps the smallest set whose total probability reaches p. The faint bar is the distribution before filtering."
        interview="‘Why do I get different answers to the same prompt?’ → sampling. ‘How do you make outputs more deterministic?’ → lower temperature / greedy, plus structured outputs; note that even T=0 isn't perfectly deterministic in production due to batching and floating-point effects. Some newer Claude models no longer accept temperature/top_p/top_k at all — reasoning effort and prompting are the levers instead."
        modules={[{ label: 'Transformers & LLMs', href: '#/topic/ai/03-transformers-llms' }]}
      />
    </div>
  )
}

/* ---------------- 2. Tokenizer (toy BPE) ---------------- */
const DEFAULT_TEXT = 'low lower lowest newer newest wider widest slow slower slowest'

function trainBpe(text, numMerges) {
  // Each word becomes a list of symbols with an end-of-word marker so merges can't cross words.
  let words = text.trim().split(/\s+/).filter(Boolean).map((w) => [...w, '·'])
  const merges = []
  for (let m = 0; m < numMerges; m++) {
    const pairs = new Map()
    for (const w of words) for (let i = 0; i < w.length - 1; i++) {
      const key = w[i] + '\u0000' + w[i + 1]
      pairs.set(key, (pairs.get(key) || 0) + 1)
    }
    let best = null, bestCount = 1
    for (const [key, count] of pairs) if (count > bestCount) { best = key; bestCount = count }
    if (!best) break                              // no pair occurs twice — stop
    const [a, b] = best.split('\u0000')
    merges.push({ a, b, merged: a + b, count: bestCount })
    words = words.map((w) => {
      const out = []
      for (let i = 0; i < w.length; i++) {
        if (i < w.length - 1 && w[i] === a && w[i + 1] === b) { out.push(a + b); i++ }
        else out.push(w[i])
      }
      return out
    })
  }
  const vocab = new Set(words.flat())
  return { words, merges, vocab }
}

function Tokenizer() {
  const [text, setText] = useState(DEFAULT_TEXT)
  const [n, setN] = useState(6)
  const { words, merges, vocab } = useMemo(() => trainBpe(text, n), [text, n])
  const tokenCount = words.reduce((s, w) => s + w.length, 0)
  const charCount = text.replace(/\s+/g, '').length
  const hue = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <label className="field">Training text<textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
        <label className="field">Number of merges <b>{n}</b><input type="range" min="0" max="30" value={n} onChange={(e) => setN(+e.target.value)} /></label>
        <div className="stat-line"><span><b>{charCount}</b> characters</span><span>→</span><span><b>{tokenCount}</b> tokens</span><span className="muted">(· marks end of word) · vocab of {vocab.size} symbols</span></div>
        <div className="token-view">
          {words.map((w, wi) => (
            <span key={wi} className="token-word">
              {w.map((t, ti) => <span key={ti} className="token" style={{ background: `hsl(${hue(t)} 70% 50% / .22)`, borderColor: `hsl(${hue(t)} 60% 45% / .5)` }}>{t}</span>)}
            </span>
          ))}
        </div>
        <h4>Merges learned (in order)</h4>
        <ol className="merges">{merges.map((m, i) => <li key={i}><code>{m.a}</code> + <code>{m.b}</code> → <code>{m.merged}</code> <span className="muted">({m.count}×)</span></li>)}</ol>
        {merges.length < n && <p className="small muted">Stopped early: no remaining pair appears more than once.</p>}
      </div>
      <Explain
        what="Byte-pair encoding starts from single characters and repeatedly merges the most frequent adjacent pair into a new symbol. Common fragments (‘low’, ‘est’, ‘er’) become single tokens, so frequent words need few tokens and rare words fall back to pieces. Real tokenizers work on bytes and learn ~100k–200k merges from huge corpora, but the algorithm is the same."
        interview="Why tokens matter: pricing, context-window limits and latency are all counted in tokens, not characters. Different languages and code tokenize differently (non-English text often uses more tokens per word). Spelling/counting-letter mistakes come from the model seeing tokens, not letters. Always count tokens with the provider's token-counting endpoint, not a different vendor's tokenizer."
        modules={[{ label: 'Transformers & LLMs', href: '#/topic/ai/03-transformers-llms' }]}
      />
    </div>
  )
}

/* ---------------- 3. Mini RAG ---------------- */
const DOCS = [
  { id: 'D1', title: 'HashMap', text: 'HashMap stores key value pairs in buckets. The hash code of the key selects the bucket. Java 8 converts long bucket chains into red black trees.' },
  { id: 'D2', title: 'Kafka ordering', text: 'Kafka guarantees message ordering only within a partition. Use the same key for related events so they land in the same partition.' },
  { id: 'D3', title: 'Transactions in Spring', text: 'Spring @Transactional works through a proxy. Calling a transactional method from the same class bypasses the proxy, so no transaction starts.' },
  { id: 'D4', title: 'Circuit breaker', text: 'A circuit breaker stops calling a failing service. After repeated failures it opens and fails fast, then allows trial calls in half open state.' },
  { id: 'D5', title: 'Embeddings', text: 'Embeddings are vectors that represent meaning. Similar texts have vectors that point in similar directions, measured with cosine similarity.' },
  { id: 'D6', title: 'React keys', text: 'React uses keys to match list items between renders. Using the array index as key breaks state when items are inserted or reordered.' },
  { id: 'D7', title: 'Agents', text: 'An AI agent is a model in a loop. It decides which tool to call, reads the tool result, and repeats until the task is done.' },
]
const STOP = new Set('a an the is are of to in and or so it its with when from for on as be by this that then until no same use using into which'.split(' '))
const tokenize = (s) => s.toLowerCase().replace(/[^a-z0-9@ ]/g, ' ').split(/\s+/).filter((w) => w && !STOP.has(w))

function buildIndex(docs) {
  const tokenized = docs.map((d) => tokenize(d.title + ' ' + d.text))
  const df = new Map()
  tokenized.forEach((toks) => new Set(toks).forEach((t) => df.set(t, (df.get(t) || 0) + 1)))
  const idf = (t) => Math.log((docs.length + 1) / ((df.get(t) || 0) + 1)) + 1
  const vec = (toks) => {
    const tf = new Map(); toks.forEach((t) => tf.set(t, (tf.get(t) || 0) + 1))
    const v = new Map(); for (const [t, c] of tf) v.set(t, c * idf(t))
    const norm = Math.sqrt([...v.values()].reduce((s, x) => s + x * x, 0)) || 1
    for (const [t, x] of v) v.set(t, x / norm)   // L2-normalise → dot product = cosine
    return v
  }
  return { vectors: tokenized.map(vec), vec }
}
const dot = (a, b) => { let s = 0; for (const [t, x] of a) s += x * (b.get(t) || 0); return s }

function Rag() {
  const index = useMemo(() => buildIndex(DOCS), [])
  const [q, setQ] = useState('Why does my transaction not start when I call a method in the same class?')
  const [k, setK] = useState(2)
  const qv = useMemo(() => index.vec(tokenize(q)), [q, index])
  const ranked = useMemo(() => DOCS.map((d, i) => ({ ...d, score: dot(qv, index.vectors[i]) })).sort((a, b) => b.score - a.score), [qv, index])
  const top = ranked.slice(0, k).filter((d) => d.score > 0)
  const prompt = `<context>\n${top.map((d) => `<doc id="${d.id}" title="${d.title}">${d.text}</doc>`).join('\n') || '(nothing relevant found)'}\n</context>\n\nAnswer the question using only the context above. Cite doc ids. If the context doesn't contain the answer, say so.\n\nQuestion: ${q}`

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <label className="field">Your question<input value={q} onChange={(e) => setQ(e.target.value)} /></label>
        <div className="lab-actions">
          {['How does Kafka keep events in order?', 'What happens when a downstream service keeps failing?', 'Why is index a bad key in a list?', 'What is an agent?'].map((s) => (
            <button key={s} className="btn small-btn" onClick={() => setQ(s)}>{s}</button>
          ))}
        </div>
        <label className="field">Retrieve top-k <b>{k}</b><input type="range" min="1" max="4" value={k} onChange={(e) => setK(+e.target.value)} /></label>
        <h4>1 · Retrieval — cosine similarity between query and document vectors</h4>
        <div className="bars">
          {ranked.map((d, i) => (
            <div key={d.id} className={'bar-row' + (i < k && d.score > 0 ? '' : ' cut')}>
              <span className="bar-label">{d.id} {d.title}</span>
              <span className="bar-track"><span className="bar-val" style={{ width: Math.max(0, d.score) * 100 + '%' }} /></span>
              <span className="bar-num">{d.score.toFixed(3)}</span>
            </div>
          ))}
        </div>
        <h4>2 · Augmentation — the prompt sent to the LLM</h4>
        <pre className="lab-pre">{prompt}</pre>
        <p className="small muted">3 · Generation: the model answers from this context, grounded and citable.</p>
      </div>
      <Explain
        what="Each document and the query become vectors; retrieval ranks documents by cosine similarity, and the top-k are pasted into the prompt. This demo uses TF-IDF word vectors so it runs offline — it only matches shared words. Production RAG uses neural embedding models, which match meaning (‘transaction doesn't start’ ≈ ‘proxy is bypassed’) even with no shared words, then stores vectors in a vector index (pgvector, OpenSearch, a vector DB)."
        interview="Know the RAG pipeline end to end: chunking (size, overlap, structure-aware), embedding model choice, hybrid search (BM25 + vectors), reranking, top-k, prompt assembly with citations, and evaluation (retrieval recall@k, answer faithfulness). Most RAG failures are retrieval failures — check what was retrieved before blaming the model."
        modules={[{ label: 'Embeddings, vector search & RAG', href: '#/topic/ai/04-embeddings-vector-search-rag' }]}
      />
    </div>
  )
}

/* ---------------- 4. Gradient descent ---------------- */
function makePoints(seed = 7) {
  let s = seed
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  return Array.from({ length: 24 }, (_, i) => { const x = i / 23 * 10; return { x, y: 2 * x + 1 + (rnd() - 0.5) * 6 } })
}

function GradientDescent() {
  const points = useMemo(() => makePoints(), [])
  const [w, setW] = useState(-1)
  const [b, setB] = useState(8)
  const [lr, setLr] = useState(0.01)
  const [history, setHistory] = useState([])
  const [running, setRunning] = useState(false)
  const state = useRef({ w: -1, b: 8 })
  state.current = { w, b }

  const loss = (W, B) => points.reduce((s, p) => s + (W * p.x + B - p.y) ** 2, 0) / points.length
  const step = () => {
    const { w: W, b: B } = state.current
    let gw = 0, gb = 0
    for (const p of points) { const err = W * p.x + B - p.y; gw += 2 * err * p.x; gb += 2 * err }
    gw /= points.length; gb /= points.length
    const nw = W - lr * gw, nb = B - lr * gb
    setW(nw); setB(nb)
    setHistory((h) => [...h.slice(-119), loss(nw, nb)])
  }
  useEffect(() => {
    if (!running) return
    const id = setInterval(step, 60)
    return () => clearInterval(id)
  }, [running, lr])
  const reset = () => { setRunning(false); setW(-1); setB(8); setHistory([]) }

  const X = (x) => 30 + x * 34, Y = (y) => 230 - y * 9
  const L = loss(w, b)
  const diverged = !Number.isFinite(L) || L > 1e6
  const maxH = Math.max(1, ...history.filter(Number.isFinite).slice(0, 5))

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <div className="gd-wrap">
          <svg viewBox="0 0 400 250" className="gd-plot" role="img" aria-label="Data points and fitted line">
            <line x1="30" y1="230" x2="380" y2="230" className="axis" /><line x1="30" y1="10" x2="30" y2="230" className="axis" />
            {points.map((p, i) => <circle key={i} cx={X(p.x)} cy={Y(p.y)} r="3.5" className="pt" />)}
            {!diverged && <line x1={X(0)} y1={Y(b)} x2={X(10)} y2={Y(w * 10 + b)} className="fit" />}
          </svg>
          <svg viewBox="0 0 400 120" className="gd-loss" role="img" aria-label="Loss over steps">
            <text x="6" y="14" className="svg-label">loss</text>
            <polyline className="loss-line" fill="none"
              points={history.map((h, i) => `${10 + i * (380 / 120)},${110 - Math.min(1, (Number.isFinite(h) ? h : maxH) / maxH) * 95}`).join(' ')} />
          </svg>
        </div>
        <div className="stat-line"><span>w = <b>{diverged ? '∞' : w.toFixed(3)}</b></span><span>b = <b>{diverged ? '∞' : b.toFixed(3)}</b></span><span>MSE loss = <b>{diverged ? 'diverged!' : L.toFixed(3)}</b></span><span className="muted">true line: y = 2x + 1</span></div>
        <label className="field">Learning rate <b>{lr}</b>
          <input type="range" min="0" max="5" step="1" value={[0.001, 0.005, 0.01, 0.02, 0.03, 0.05].indexOf(lr)} onChange={(e) => setLr([0.001, 0.005, 0.01, 0.02, 0.03, 0.05][+e.target.value])} />
        </label>
        <div className="lab-actions">
          <button className="btn primary" onClick={() => setRunning((r) => !r)} disabled={diverged}>{running ? 'Pause' : 'Train'}</button>
          <button className="btn" onClick={step} disabled={diverged}>One step</button>
          <button className="btn" onClick={reset}>Reset</button>
        </div>
        {diverged && <p className="warn-text">The learning rate is too large: each step overshoots, and the loss explodes. Reset and pick a smaller rate.</p>}
      </div>
      <Explain
        what="A model y = w·x + b starts with bad weights. Each step computes the loss (mean squared error) and its gradient — the direction that increases loss fastest — and moves w and b a small amount the opposite way. The learning rate is the step size: too small learns slowly, too large overshoots and diverges (try 0.05). Neural networks with billions of weights train with exactly this idea plus backpropagation to compute gradients efficiently."
        interview="Be ready to explain loss functions, gradients, learning rate, overfitting vs underfitting, train/validation/test splits, and why we use mini-batches (stochastic gradient descent). For LLMs: pre-training minimises next-token prediction loss; fine-tuning and RLHF adjust the model further."
        modules={[{ label: 'ML fundamentals', href: '#/topic/ai/01-ml-fundamentals' }, { label: 'Neural networks', href: '#/topic/ai/02-neural-networks-deep-learning' }]}
      />
    </div>
  )
}

/* ---------------- 5. Agent loop simulator ---------------- */
const WEATHER = { pune: { tempC: 24, condition: 'heavy rain', rainChance: 0.9 }, delhi: { tempC: 31, condition: 'haze', rainChance: 0.05 } }
const AGENT_TOOLS = [
  { name: 'get_weather', description: 'Get the current weather for a city.', input_schema: { type: 'object', properties: { city: { type: 'string' } }, required: ['city'] } },
  { name: 'calculator', description: 'Evaluate an arithmetic expression.', input_schema: { type: 'object', properties: { expression: { type: 'string' } }, required: ['expression'] } },
]
function runTool(name, input) {
  if (name === 'get_weather') {
    const w = WEATHER[input.city.toLowerCase()]
    return w ? JSON.stringify(w) : { error: `Unknown city ${input.city}` }
  }
  if (name === 'calculator') {
    if (!/^[\d\s+\-*/().]+$/.test(input.expression)) return { error: 'Only arithmetic is allowed' }
    // eslint-disable-next-line no-new-func
    return String(Function(`"use strict"; return (${input.expression})`)())
  }
  return { error: 'Unknown tool' }
}

// Scripted "model" turns. In a real agent, each assistant turn comes from the LLM API.
const SCRIPT = [
  { thought: 'I need the current weather in Pune before I can advise about an umbrella.', content: [{ type: 'text', text: "I'll check the weather in Pune first." }, { type: 'tool_use', id: 'toolu_01', name: 'get_weather', input: { city: 'Pune' } }] },
  { thought: 'It is 24°C with heavy rain. Now convert 24°C to Fahrenheit with the calculator instead of doing arithmetic in my head.', content: [{ type: 'tool_use', id: 'toolu_02', name: 'calculator', input: { expression: '24 * 9 / 5 + 32' } }] },
  { thought: 'I have everything I need. Answer and stop.', content: [{ type: 'text', text: "It's 24°C (75.2°F) in Pune with heavy rain and a 90% chance of more — definitely carry an umbrella." }] },
]

function AgentLoop() {
  const [messages, setMessages] = useState([{ role: 'user', content: "What's the weather in Pune right now? Should I carry an umbrella? Give the temperature in Fahrenheit too." }])
  const [turn, setTurn] = useState(0)          // index into SCRIPT
  const [phase, setPhase] = useState('model')  // 'model' → call LLM next, 'tools' → run tools next, 'done'
  const [log, setLog] = useState([])
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }, [messages])

  const next = () => {
    if (phase === 'model') {
      const s = SCRIPT[turn]
      const toolUses = s.content.filter((c) => c.type === 'tool_use')
      const stop = toolUses.length ? 'tool_use' : 'end_turn'
      setMessages((m) => [...m, { role: 'assistant', content: s.content }])
      setLog((l) => [...l, { kind: 'model', text: `LLM call #${turn + 1} → stop_reason: "${stop}"`, thought: s.thought }])
      setPhase(stop === 'tool_use' ? 'tools' : 'done')
    } else if (phase === 'tools') {
      const s = SCRIPT[turn]
      const results = s.content.filter((c) => c.type === 'tool_use').map((c) => {
        const out = runTool(c.name, c.input)
        const isErr = typeof out === 'object'
        return { type: 'tool_result', tool_use_id: c.id, content: isErr ? out.error : out, ...(isErr ? { is_error: true } : {}) }
      })
      setMessages((m) => [...m, { role: 'user', content: results }])
      setLog((l) => [...l, { kind: 'tool', text: `Your code ran ${results.length} tool(s) and appended the result(s) as a user message.` }])
      setTurn((t) => t + 1)
      setPhase('model')
    }
  }
  const reset = () => { setMessages((m) => m.slice(0, 1)); setTurn(0); setPhase('model'); setLog([]) }

  return (
    <div className="lab-grid">
      <div className="lab-card">
        <div className="agent-cols">
          <div>
            <h4>The loop</h4>
            <ol className="loop-steps">
              <li className={phase === 'model' ? 'on' : ''}>Send <code>messages</code> + <code>tools</code> to the model</li>
              <li className={phase === 'tools' ? 'on' : ''}>Model returns <code>tool_use</code> → your code runs the tool</li>
              <li className={phase === 'tools' ? 'on' : ''}>Append <code>tool_result</code>, call the model again</li>
              <li className={phase === 'done' ? 'on' : ''}><code>stop_reason: "end_turn"</code> → done</li>
            </ol>
            <div className="lab-actions">
              <button className="btn primary" onClick={next} disabled={phase === 'done'}>{phase === 'model' ? 'Call the model ▶' : phase === 'tools' ? 'Run tool(s) ▶' : 'Finished ✓'}</button>
              <button className="btn" onClick={reset}>Reset</button>
            </div>
            <div className="agent-log">
              {log.map((e, i) => (
                <div key={i} className={'log-' + e.kind}>
                  <b>{e.kind === 'model' ? '🧠' : '🛠️'} {e.text}</b>
                  {e.thought && <p className="muted small">Model's reasoning (illustrative): {e.thought}</p>}
                </div>
              ))}
            </div>
            <details className="tools-def"><summary>Tool definitions sent with every request</summary><pre className="lab-pre">{JSON.stringify(AGENT_TOOLS, null, 2)}</pre></details>
          </div>
          <div>
            <h4><code>messages</code> array ({messages.length})</h4>
            <div className="msg-list">
              {messages.map((m, i) => (
                <div key={i} className={'msg msg-' + m.role + (i === messages.length - 1 ? ' latest' : '')}>
                  <div className="msg-role">{m.role}{Array.isArray(m.content) && m.content.some((c) => c.type === 'tool_result') ? ' (tool results)' : ''}</div>
                  <pre>{typeof m.content === 'string' ? m.content : JSON.stringify(m.content, null, 2)}</pre>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          </div>
        </div>
      </div>
      <Explain
        what="An agent is just a loop. Your code sends the conversation and tool definitions to the model. If the model wants a tool, it replies with a tool_use block and stop_reason ‘tool_use’; your code executes the tool and appends a tool_result (matched by tool_use_id) as a user message, then calls the model again — until stop_reason is ‘end_turn’. The model never runs code itself; your program does. The tools here really run (the calculator evaluates the expression); the model turns are scripted."
        interview="Explain the loop, why tool descriptions matter, how you'd stop runaway loops (max iterations, budgets), handle tool errors (is_error results the model can recover from), keep side-effecting tools safe (allow-lists, human approval), and why the model should use a calculator tool instead of mental arithmetic."
        modules={[{ label: 'What is an agent', href: '#/topic/agents/01-what-is-an-agent' }, { label: 'Build an agent in Python', href: '#/topic/agents/02-build-agent-python-claude' }]}
      />
    </div>
  )
}
