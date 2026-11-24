import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LEVELS, TRACKS, trackById, PATHS, pathById } from './data/tracks'
import { PLAN_WEEKS, AI_PLAN_WEEKS, PLANS } from './data/plan'
import { RESOURCES, PLATFORMS } from './data/resources'
import Lab from './components/Lab'
import { topics, topicById, topicsOfTrack, topicsOfLevel, pages, search } from './lib/content'
import { useProgress, usePrefs, streak, dayKey } from './lib/progress'
import Markdown from './components/Markdown'

/* ---------------- routing ---------------- */
function useRoute() {
  const get = () => decodeURIComponent((location.hash || '#/').slice(1))
  const [route, setRoute] = useState(get)
  useEffect(() => {
    const f = () => { setRoute(get()); window.scrollTo(0, 0) }
    window.addEventListener('hashchange', f)
    return () => window.removeEventListener('hashchange', f)
  }, [])
  const [path, query = ''] = route.split('?')
  return { parts: path.split('/').filter(Boolean), query: new URLSearchParams(query) }
}
const go = (h) => { location.hash = h }

/* ---------------- prefs → document ---------------- */
function useApplyPrefs(prefs) {
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return
    const f = (e) => setSystemDark(e.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = prefs.theme === 'auto' ? (systemDark ? 'dark' : 'light') : prefs.theme
    root.dataset.font = prefs.font
    root.style.setProperty('--reading-size', prefs.size + 'px')
    root.style.setProperty('--measure', { narrow: '64ch', normal: '74ch', wide: '92ch' }[prefs.width])
  }, [prefs, systemDark])
}

/* ---------------- helpers ---------------- */
const trackIdx = (id) => TRACKS.findIndex((t) => t.id === id)
const ordered = topics.slice().sort((a, b) => a.level - b.level || trackIdx(a.track) - trackIdx(b.track) || a.file.localeCompare(b.file))

function weekOfPlan(startDate) {
  if (!startDate) return null
  const days = Math.floor((new Date(dayKey()) - new Date(startDate)) / 86400000)
  return Math.min(PLAN_WEEKS.length, Math.max(1, Math.floor(days / 7) + 1))
}

function Ring({ value, total, size = 64, stroke = 6, color = 'var(--accent)', children }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = total ? value / total : 0
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform={`rotate(-90 ${size / 2} ${size / 2})`} style={{ transition: 'stroke-dashoffset .5s' }} />
      </svg>
      <div className="ring-label">{children}</div>
    </div>
  )
}

function Bar({ value, total, color }) {
  const pct = total ? Math.round((value / total) * 100) : 0
  return <div className="bar" title={`${value}/${total}`}><div className="bar-fill" style={{ width: pct + '%', background: color }} /></div>
}

function LevelBadge({ n }) {
  return <span className={`lvl lvl-${n}`}>L{n} · {LEVELS[n - 1]?.name}</span>
}

function TopicRow({ t, p, showTrack }) {
  const tr = trackById[t.track]
  return (
    <a className={'topic-row' + (p.done[t.id] ? ' is-done' : '')} href={`#/topic/${t.id}`}>
      <button className={'check' + (p.done[t.id] ? ' on' : '')} aria-label="Mark complete"
        onClick={(e) => { e.preventDefault(); p.toggle('done', t.id) }}>{p.done[t.id] ? '✓' : ''}</button>
      <span className="topic-row-title">{showTrack && <span className="muted">{tr?.icon} </span>}{t.title}</span>
      <span className="topic-row-meta">
        {p.revise[t.id] && <span className="pill warn">revise</span>}
        {p.bookmarks[t.id] && <span className="pill">★</span>}
        <span className="muted">{t.minutes}m</span>
      </span>
    </a>
  )
}

/* ---------------- heatmap ---------------- */
function Heatmap({ log }) {
  const weeks = 18
  const end = new Date()
  const start = new Date(end)
  start.setDate(end.getDate() - (weeks * 7 - 1) - end.getDay())
  const cells = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const k = dayKey(d)
    const m = Math.round((log[k] || 0) / 60)
    const lv = m === 0 ? 0 : m < 20 ? 1 : m < 45 ? 2 : m < 90 ? 3 : 4
    cells.push(<div key={k} className={`hm hm-${lv}`} title={`${k}: ${m} min`} />)
  }
  const total = Object.values(log).reduce((s, v) => s + v, 0)
  return (
    <div className="heatmap-wrap">
      <div className="heatmap">{cells}</div>
      <div className="heatmap-legend muted small">
        <span>{Math.round(total / 3600)}h studied in total</span>
        <span className="hm-scale">less <i className="hm hm-0" /><i className="hm hm-1" /><i className="hm hm-2" /><i className="hm hm-3" /><i className="hm hm-4" /> more</span>
      </div>
    </div>
  )
}

/* ---------------- Resources ---------------- */
const KIND_ICON = { practice: '🏋️', interactive: '🧪', docs: '📘', read: '📖', video: '🎬', course: '🎓' }
function ResourceLink({ r }) {
  return (
    <a className="res" href={r.url} target="_blank" rel="noopener noreferrer">
      <span className="res-icon">{KIND_ICON[r.kind] || '🔗'}</span>
      <span className="res-label">{r.label}</span>
      <span className="res-kind">{r.kind}</span>
    </a>
  )
}
function ResourcesPanel({ id }) {
  const list = RESOURCES[id]
  if (!list?.length) return null
  return (
    <section className="res-panel">
      <h3>Practice & go deeper</h3>
      <p className="muted small">Hands-on platforms and trusted references for this module. Opens in a new tab.</p>
      <div className="res-grid">{list.map((r) => <ResourceLink key={r.url + r.label} r={r} />)}</div>
    </section>
  )
}

function PracticeView() {
  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Home</a> / Practice</div>
      <h1>Practice platforms</h1>
      <p className="lead">Reading builds understanding; doing builds skill. These are the free (or free-tier) places to code, run labs and get feedback. Every module also links its own practice problems at the end.</p>
      <div className="platforms">
        {PLATFORMS.map((g) => (
          <section key={g.area} className="panel">
            <div className="panel-head"><h2>{g.icon} {g.area}</h2></div>
            <div className="res-grid">{g.items.map((r) => <ResourceLink key={r.url + r.label} r={r} />)}</div>
          </section>
        ))}
      </div>
    </div>
  )
}

/* ---------------- Home ---------------- */
function Home({ p, prefs, setPrefs }) {
  const path = pathById[prefs.path] || PATHS[0]
  const inPath = (trackId) => !path.tracks || path.tracks.includes(trackId)
  const pathTopics = topics.filter((t) => inPath(t.track))
  const done = pathTopics.filter((t) => p.done[t.id]).length
  const next = ordered.find((t) => inPath(t.track) && !p.done[t.id])
  const last = p.last && topicById[p.last]
  const resume = last && !p.done[last.id] ? last : next
  const hour = new Date().getHours()
  const greeting = hour < 5 ? 'Burning the midnight oil' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const planWeeks = prefs.path === 'ai' ? AI_PLAN_WEEKS : PLAN_WEEKS
  const rawWeek = weekOfPlan(p.startDate)
  const week = rawWeek ? Math.min(rawWeek, planWeeks.length) : null
  const thisWeek = week ? planWeeks[week - 1] : null
  const todayMin = Math.round((p.log[dayKey()] || 0) / 60)

  return (
    <div className="page">
      <section className="welcome">
        <div className="welcome-main">
          <p className="eyebrow">{greeting}</p>
          <h1>{week ? `Week ${week} — ${thisWeek.title}` : 'Your study desk'}</h1>
          <p className="lead">
            {week ? thisWeek.focus : `Pick a start date to follow the ${planWeeks.length}-week plan for your path, or jump into any module below. Small, daily sessions beat weekend marathons.`}
          </p>
          <div className="welcome-actions">
            {resume && <a className="btn primary" href={`#/topic/${resume.id}`}>{last && resume === last ? 'Continue' : 'Start'}: {resume.title} →</a>}
            {!p.startDate
              ? <button className="btn" onClick={() => p.setStartDate(dayKey())}>Start my {planWeeks.length}-week plan today</button>
              : <a className="btn" href="#/plan">Open study plan</a>}
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <Ring value={done} total={pathTopics.length}><b>{Math.round((done / pathTopics.length) * 100)}%</b></Ring>
            <div><b>{done}/{pathTopics.length}</b><span>{path.id === 'all' ? 'modules done' : `${path.name} modules`}</span></div>
          </div>
          <div className="stat"><div className="stat-icon">🔥</div><div><b>{streak(p)}</b><span>day streak</span></div></div>
          <div className="stat"><div className="stat-icon">⏱️</div><div><b>{todayMin} min</b><span>studied today</span></div></div>
          <div className="stat"><div className="stat-icon">🍅</div><div><b>{p.pomo[dayKey()] || 0}</b><span>focus sessions today</span></div></div>
        </div>
      </section>

      {thisWeek && thisWeek.modules.length > 0 && (
        <section className="panel">
          <div className="panel-head"><h2>This week</h2><span className="muted small">{thisWeek.modules.filter((id) => p.done[id]).length}/{thisWeek.modules.length} done</span></div>
          {thisWeek.modules.filter((id) => topicById[id]).map((id) => <TopicRow key={id} t={topicById[id]} p={p} showTrack />)}
          <p className="muted small hint">Plus every day: 2 DSA problems — one new, one revision.</p>
        </section>
      )}

      <section className="panel">
        <div className="panel-head"><h2>Study activity</h2><span className="muted small">time is counted while you read a module</span></div>
        <Heatmap log={p.log} />
      </section>

      <section className="path-picker">
        <div>
          <h2>Choose your path</h2>
          <p className="muted small">Filters the roadmap, tracks and progress below. Your progress is kept across paths.</p>
        </div>
        <div className="path-options">
          {PATHS.map((pt) => (
            <button key={pt.id} className={'path-opt' + (path.id === pt.id ? ' on' : '')} onClick={() => setPrefs({ path: pt.id })}>
              <span className="path-icon">{pt.icon}</span>
              <span><b>{pt.name}</b><small>{pt.desc}</small></span>
            </button>
          ))}
        </div>
      </section>

      <a className="lab-banner" href="#/lab">
        <span className="lab-banner-icon">🧪</span>
        <span><b>New: AI Lab</b><small>Play with temperature sampling, train a tokenizer, run a mini RAG search, watch gradient descent and step through an agent loop — all in your browser.</small></span>
        <span className="lab-banner-go">Open →</span>
      </a>

      <h2 className="section-title">The roadmap</h2>
      <div className="roadmap">
        {LEVELS.map((L) => {
          const lt = topicsOfLevel(L.n).filter((t) => inPath(t.track))
          const ld = lt.filter((t) => p.done[t.id]).length
          return (
            <section key={L.n} className="level">
              <div className="level-rail"><span className={`level-dot lvl-${L.n}`}>{ld === lt.length && lt.length ? '✓' : L.n}</span></div>
              <div className="level-body">
                <div className="level-head">
                  <div><h3>Level {L.n} · {L.name}</h3><p className="muted">{L.tagline}</p></div>
                  <span className="muted small">{ld}/{lt.length}</span>
                </div>
                <p className="level-goal">{L.goal}</p>
                <Bar value={ld} total={lt.length} color={`var(--l${L.n})`} />
                <div className="level-topics">
                  {TRACKS.filter((tr) => inPath(tr.id)).map((tr) => {
                    const ts = lt.filter((t) => t.track === tr.id)
                    if (!ts.length) return null
                    return (
                      <div key={tr.id} className="level-track">
                        <div className="level-track-name" style={{ color: tr.color }}>{tr.icon} {tr.name}</div>
                        {ts.map((t) => <TopicRow key={t.id} t={t} p={p} />)}
                      </div>
                    )
                  })}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <h2 className="section-title">Tracks</h2>
      <div className="grid">
        {TRACKS.filter((tr) => inPath(tr.id)).map((tr) => {
          const ts = topicsOfTrack(tr.id)
          const d = ts.filter((t) => p.done[t.id]).length
          return (
            <a key={tr.id} className="card" href={`#/track/${tr.id}`} style={{ '--c': tr.color }}>
              <div className="card-top">
                <div className="card-icon">{tr.icon}</div>
                <Ring value={d} total={ts.length} size={42} stroke={4} color={tr.color}><span className="small">{d}/{ts.length}</span></Ring>
              </div>
              <h3>{tr.name}</h3>
              <p className="muted small">{tr.desc}</p>
            </a>
          )
        })}
      </div>
    </div>
  )
}

/* ---------------- Track ---------------- */
function TrackView({ id, p }) {
  const tr = trackById[id]
  if (!tr) return <NotFound />
  const ts = topicsOfTrack(id)
  const d = ts.filter((t) => p.done[t.id]).length
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Home</a> / {tr.name}</div>
      <header className="track-hero" style={{ '--c': tr.color }}>
        <div className="track-hero-icon">{tr.icon}</div>
        <div>
          <h1>{tr.name}</h1>
          <p className="lead">{tr.desc}</p>
          <p className="muted small">{d} of {ts.length} modules complete · about {Math.round(ts.reduce((s, t) => s + t.minutes, 0) / 60)} hours of reading</p>
        </div>
      </header>
      <Bar value={d} total={ts.length} color={tr.color} />
      {LEVELS.map((L) => {
        const lt = ts.filter((t) => t.level === L.n)
        if (!lt.length) return null
        return (
          <section key={L.n} className="track-level">
            <h2><LevelBadge n={L.n} /></h2>
            {lt.map((t) => <TopicRow key={t.id} t={t} p={p} />)}
          </section>
        )
      })}
    </div>
  )
}

/* ---------------- Topic ---------------- */
function useStudyTimer(p, active) {
  const lastActivity = useRef(Date.now())
  useEffect(() => {
    if (!active) return
    const bump = () => { lastActivity.current = Date.now() }
    const evs = ['scroll', 'mousemove', 'keydown', 'click', 'touchstart']
    evs.forEach((e) => window.addEventListener(e, bump, { passive: true }))
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActivity.current < 3 * 60 * 1000) p.addSeconds(15)
    }, 15000)
    return () => { clearInterval(id); evs.forEach((e) => window.removeEventListener(e, bump)) }
  }, [active, p.addSeconds])
}

function ReadingProgress() {
  const [pct, setPct] = useState(0)
  useEffect(() => {
    const f = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      setPct(max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 0)
    }
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return <div className="read-progress" style={{ width: pct + '%' }} />
}

function TopicView({ id, p, focus, setFocus }) {
  const t = topicById[id]
  const [toc, setToc] = useState([])
  const [active, setActive] = useState('')
  const [noteOpen, setNoteOpen] = useState(false)
  useStudyTimer(p, !!t)
  useEffect(() => { if (t) p.setLast(t.id) }, [t?.id])

  useEffect(() => {
    if (!toc.length) return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id) })
    }, { rootMargin: '-80px 0px -70% 0px' })
    toc.forEach((h) => { const el = document.getElementById(h.id); if (el) obs.observe(el) })
    return () => obs.disconnect()
  }, [toc])

  if (!t) return <NotFound />
  const tr = trackById[t.track]
  const siblings = topicsOfTrack(t.track)
  const i = siblings.findIndex((s) => s.id === t.id)
  const prev = siblings[i - 1]
  const next = siblings[i + 1]
  const actions = (
    <div className="topic-actions">
      <button className={'btn ' + (p.done[t.id] ? 'success' : 'primary')} onClick={() => p.toggle('done', t.id)}>
        {p.done[t.id] ? '✓ Completed' : 'Mark complete'}
      </button>
      <button className={'btn' + (p.revise[t.id] ? ' warn' : '')} onClick={() => p.toggle('revise', t.id)}>
        {p.revise[t.id] ? '↻ In revision list' : '↻ Revise later'}
      </button>
      <button className={'btn' + (p.bookmarks[t.id] ? ' on' : '')} onClick={() => p.toggle('bookmarks', t.id)}>
        {p.bookmarks[t.id] ? '★ Bookmarked' : '☆ Bookmark'}
      </button>
      <button className="btn" onClick={() => setNoteOpen((o) => !o)}>✎ Notes{p.notes[t.id] ? ' •' : ''}</button>
    </div>
  )

  return (
    <>
      <ReadingProgress />
      <div className={'topic-layout' + (focus ? ' focus' : '')}>
        <aside className="topic-nav">
          <a className="topic-nav-head" href={`#/track/${tr.id}`} style={{ color: tr.color }}>{tr.icon} {tr.name}</a>
          {siblings.map((s) => (
            <a key={s.id} href={`#/topic/${s.id}`} className={(s.id === t.id ? 'active ' : '') + (p.done[s.id] ? 'done' : '')}>
              <span className={`dot lvl-${s.level}`} />{s.title}
            </a>
          ))}
        </aside>
        <main className="topic-main">
          <div className="crumbs"><a href="#/">Home</a> / <a href={`#/track/${tr.id}`}>{tr.name}</a></div>
          <header className="topic-head">
            <h1>{t.title}</h1>
            <div className="topic-meta">
              <LevelBadge n={t.level} />
              <span className="muted small">~{t.minutes} min read · {t.words.toLocaleString()} words</span>
              <button className="linkbtn small" onClick={() => setFocus((f) => !f)}>{focus ? '⤢ Exit focus' : '⤡ Focus mode'} <kbd>F</kbd></button>
            </div>
            {actions}
            {noteOpen && (
              <textarea className="notes" placeholder="Your notes for this module (saved in this browser)…"
                defaultValue={p.notes[t.id] || ''} onChange={(e) => p.setNote(t.id, e.target.value)} />
            )}
          </header>
          <Markdown source={t.body} onToc={setToc} />
          <ResourcesPanel id={t.id} />
          <div className="end-card">
            <h3>Finished reading?</h3>
            <p className="muted">Answer the interview questions out loud before marking complete. Flag it for revision if anything felt shaky.</p>
            {actions}
          </div>
          <nav className="pager">
            {prev ? <a className="btn" href={`#/topic/${prev.id}`}>← {prev.title}</a> : <span />}
            {next ? <a className="btn primary" href={`#/topic/${next.id}`}>{next.title} →</a> : <a className="btn" href={`#/track/${tr.id}`}>Back to track</a>}
          </nav>
        </main>
        <aside className="toc">
          <div className="toc-title">On this page</div>
          {toc.map((h) => (
            <a key={h.id} href={`#/topic/${t.id}`} className={'d' + h.depth + (active === h.id ? ' active' : '')}
              onClick={(e) => { e.preventDefault(); document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth' }) }}>{h.text}</a>
          ))}
        </aside>
      </div>
    </>
  )
}

/* ---------------- Search / lists / plan / data ---------------- */
function SearchView({ q, p }) {
  const [term, setTerm] = useState(q)
  const results = useMemo(() => search(term), [term])
  return (
    <div className="page narrow">
      <h1>Search</h1>
      <input autoFocus className="search-big" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="e.g. ConcurrentHashMap, saga, Dijkstra, useEffect…" />
      <p className="muted small">{term.length > 1 ? `${results.length} modules match` : 'Type at least 2 characters'}</p>
      {results.map(({ topic, snippet }) => (
        <a key={topic.id} className="result" href={`#/topic/${topic.id}`}>
          <div className="result-title"><b>{trackById[topic.track]?.icon} {topic.title}</b> <LevelBadge n={topic.level} /> {p.done[topic.id] && <span className="pill ok">done</span>}</div>
          {snippet && <div className="muted small">{snippet}</div>}
        </a>
      ))}
    </div>
  )
}

function ListView({ kind, p }) {
  const ids = Object.keys(p[kind]).filter((id) => topicById[id])
  return (
    <div className="page narrow">
      <h1>{kind === 'revise' ? 'Revision list' : 'Bookmarks'}</h1>
      <p className="lead">{kind === 'revise' ? 'Modules you flagged to come back to. Re-read these the week before each interview.' : 'Modules you starred.'}</p>
      {ids.length === 0 && <p className="muted">Nothing here yet.</p>}
      <div className="panel">{ids.map((id) => <TopicRow key={id} t={topicById[id]} p={p} showTrack />)}</div>
    </div>
  )
}

function PlanView({ p, prefs }) {
  const page = pages['study-plan']
  const [planId, setPlanId] = useState(prefs.path === 'ai' ? 'ai' : 'java')
  const plan = PLANS.find((x) => x.id === planId)
  const rawWeek = weekOfPlan(p.startDate)
  const week = rawWeek ? Math.min(rawWeek, plan.weeks.length) : null
  return (
    <div className="page narrow">
      <div className="crumbs"><a href="#/">Home</a> / Study plan</div>
      {page && <Markdown source={page.body} />}
      <h2 className="section-title">Week by week</h2>
      <div className="segs plan-tabs">
        {PLANS.map((x) => <button key={x.id} className={'seg' + (x.id === planId ? ' on' : '')} onClick={() => setPlanId(x.id)}>{x.name}</button>)}
      </div>
      {planId === 'ai' && <p className="muted small">Run the AI plan after the Java plan, or in parallel at about an hour a day once you're past week 8 of the Java plan.</p>}
      {!p.startDate
        ? <p><button className="btn primary" onClick={() => p.setStartDate(dayKey())}>Start the plan today</button> <span className="muted small">— the home page will then show "this week".</span></p>
        : <p className="muted small">Started on {p.startDate} · <button className="linkbtn" onClick={() => p.setStartDate(null)}>reset start date</button></p>}
      <div className="weeks">
        {plan.weeks.map((w, i) => {
          const d = w.modules.filter((id) => p.done[id]).length
          return (
            <section key={i} className={'week' + (week === i + 1 ? ' current' : '')}>
              <div className="week-head">
                <span className="week-no">W{i + 1}</span>
                <div><h3>{w.title}</h3><p className="muted small">{w.focus}</p></div>
                {w.modules.length > 0 && <span className="muted small">{d}/{w.modules.length}</span>}
              </div>
              {w.modules.filter((id) => topicById[id]).map((id) => <TopicRow key={id} t={topicById[id]} p={p} showTrack />)}
            </section>
          )
        })}
      </div>
    </div>
  )
}

function DataView({ p }) {
  const [msg, setMsg] = useState('')
  return (
    <div className="page narrow">
      <h1>Your data</h1>
      <p className="lead">Progress, notes, bookmarks and study time live in this browser's storage. Export them to back up or move to another machine.</p>
      <div className="topic-actions">
        <button className="btn primary" onClick={() => {
          const blob = new Blob([p.exportData()], { type: 'application/json' })
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'switchitup-progress.json'; a.click()
        }}>Export JSON</button>
        <label className="btn">Import JSON
          <input type="file" accept="application/json" hidden onChange={async (e) => {
            const f = e.target.files?.[0]; if (!f) return
            try { p.importData(await f.text()); setMsg('Imported.') } catch { setMsg('That file is not valid progress JSON.') }
          }} />
        </label>
        <button className="btn warn" onClick={() => { if (confirm('Reset all progress, notes, bookmarks and study time?')) { p.reset(); setMsg('Reset.') } }}>Reset everything</button>
      </div>
      {msg && <p>{msg}</p>}
    </div>
  )
}

function NotFound() {
  return <div className="page narrow"><h1>Not found</h1><p><a href="#/">Back home</a></p></div>
}

/* ---------------- Pomodoro ---------------- */
function chime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[660, 880, 990].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain()
      o.frequency.value = f; o.connect(g); g.connect(ctx.destination)
      const t0 = ctx.currentTime + i * 0.22
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.2, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.5)
      o.start(t0); o.stop(t0 + 0.55)
    })
  } catch { /* audio unavailable */ }
}

function Pomodoro({ onFocusDone }) {
  const FOCUS = 25 * 60, BREAK = 5 * 60
  const [mode, setMode] = useState('focus')
  const [remaining, setRemaining] = useState(FOCUS)
  const [running, setRunning] = useState(false)
  const endRef = useRef(0)
  const remRef = useRef(remaining)
  remRef.current = remaining

  useEffect(() => {
    if (!running) return
    endRef.current = Date.now() + remRef.current * 1000
    const id = setInterval(() => {
      const r = Math.max(0, Math.round((endRef.current - Date.now()) / 1000))
      setRemaining(r)
      if (r === 0) {
        chime()
        if (mode === 'focus') onFocusDone()
        const nextMode = mode === 'focus' ? 'break' : 'focus'
        setMode(nextMode); setRemaining(nextMode === 'focus' ? FOCUS : BREAK); setRunning(false)
      }
    }, 500)
    return () => clearInterval(id)
  }, [running, mode])

  useEffect(() => {
    if (running) document.title = `${fmt(remaining)} · ${mode === 'focus' ? 'Focus' : 'Break'} — SwitchItUp`
    else document.title = 'SwitchItUp — Interview Prep'
  }, [remaining, running, mode])

  return (
    <div className={`pomo ${mode}${running ? ' running' : ''}`}>
      <button className="pomo-main" onClick={() => setRunning((r) => !r)} title={running ? 'Pause' : 'Start a 25-minute focus session'}>
        <span>{mode === 'focus' ? '🍅' : '☕'}</span><span className="pomo-time">{fmt(remaining)}</span><span className="pomo-state">{running ? '❚❚' : '▶'}</span>
      </button>
      <button className="pomo-reset" title="Reset" onClick={() => { setRunning(false); setMode('focus'); setRemaining(FOCUS) }}>↺</button>
    </div>
  )
}
const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

/* ---------------- Settings ---------------- */
function Settings({ prefs, setPrefs }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const f = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [open])
  const Opt = ({ k, v, label }) => <button className={'seg' + (prefs[k] === v ? ' on' : '')} onClick={() => setPrefs({ [k]: v })}>{label}</button>
  return (
    <div className="settings" ref={ref}>
      <button className="iconbtn" onClick={() => setOpen((o) => !o)} title="Reading settings">Aa</button>
      {open && (
        <div className="popover">
          <div className="pop-row"><span>Theme</span><div className="segs"><Opt k="theme" v="auto" label="Auto" /><Opt k="theme" v="light" label="Light" /><Opt k="theme" v="sepia" label="Sepia" /><Opt k="theme" v="dark" label="Dark" /></div></div>
          <div className="pop-row"><span>Font</span><div className="segs"><Opt k="font" v="serif" label="Serif" /><Opt k="font" v="sans" label="Sans" /></div></div>
          <div className="pop-row"><span>Size</span><div className="segs">
            <button className="seg" onClick={() => setPrefs({ size: Math.max(15, prefs.size - 1) })}>A−</button>
            <span className="seg-val">{prefs.size}px</span>
            <button className="seg" onClick={() => setPrefs({ size: Math.min(22, prefs.size + 1) })}>A+</button>
          </div></div>
          <div className="pop-row"><span>Width</span><div className="segs"><Opt k="width" v="narrow" label="Narrow" /><Opt k="width" v="normal" label="Normal" /><Opt k="width" v="wide" label="Wide" /></div></div>
          <a className="pop-link" href="#/data" onClick={() => setOpen(false)}>Export / import progress →</a>
        </div>
      )}
    </div>
  )
}

/* ---------------- Shell ---------------- */
export default function App() {
  const { parts, query } = useRoute()
  const p = useProgress()
  const [prefs, setPrefs] = usePrefs()
  const [focus, setFocus] = useState(false)
  const [q, setQ] = useState('')
  useApplyPrefs(prefs)

  useEffect(() => {
    const onKey = (e) => {
      if (/input|textarea/i.test(document.activeElement?.tagName)) return
      if (e.key === '/') { e.preventDefault(); go('#/search') }
      if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && location.hash.startsWith('#/topic/')) setFocus((f) => !f)
      if (e.key === 'Escape') setFocus(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const onFocusDone = useCallback(() => p.addPomo(), [p.addPomo])

  let view
  const [a, ...rest] = parts
  if (!a) view = <Home p={p} prefs={prefs} setPrefs={setPrefs} />
  else if (a === 'track') view = <TrackView id={rest[0]} p={p} />
  else if (a === 'topic') view = <TopicView key={rest.join('/')} id={rest.join('/')} p={p} focus={focus} setFocus={setFocus} />
  else if (a === 'search') view = <SearchView key={query.get('q') || ''} q={query.get('q') || ''} p={p} />
  else if (a === 'revise' || a === 'bookmarks') view = <ListView kind={a} p={p} />
  else if (a === 'plan') view = <PlanView p={p} prefs={prefs} />
  else if (a === 'lab') view = <Lab />
  else if (a === 'practice') view = <PracticeView />
  else if (a === 'data') view = <DataView p={p} />
  else view = <NotFound />

  const inTopic = a === 'topic'
  return (
    <>
      <header className={'topbar' + (focus && inTopic ? ' dim' : '')}>
        <a href="#/" className="brand"><span className="brand-mark">S</span><b>SwitchItUp</b></a>
        <form className="topsearch" onSubmit={(e) => { e.preventDefault(); go('#/search?q=' + encodeURIComponent(q)) }}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search all modules…" />
          <kbd>/</kbd>
        </form>
        <nav className="topnav">
          <a href="#/plan">Plan</a>
          <a href="#/lab">AI Lab</a>
          <a href="#/practice">Practice</a>
          <a href="#/revise">Revise{Object.keys(p.revise).length ? ` (${Object.keys(p.revise).length})` : ''}</a>
          <a href="#/bookmarks" title="Bookmarks">★</a>
        </nav>
        <Pomodoro onFocusDone={onFocusDone} />
        <Settings prefs={prefs} setPrefs={setPrefs} />
      </header>
      {view}
    </>
  )
}
