import { useCallback, useEffect, useState } from 'react'

/* ---------------- learner profiles ----------------
   Each profile keeps its own progress & preferences in this browser.
   The original single-user data stays under the 'me' profile (unchanged keys). */
const PROFILES_KEY = 'switchitup.profiles.v1'
const defaultProfiles = () => ({ active: 'me', list: [{ id: 'me', name: 'Me', color: '#6366f1' }] })

export function getProfiles() {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILES_KEY))
    return p?.list?.length ? p : defaultProfiles()
  } catch {
    return defaultProfiles()
  }
}
export function saveProfiles(p) {
  try { localStorage.setItem(PROFILES_KEY, JSON.stringify(p)) } catch { /* storage unavailable */ }
}
const ACTIVE = getProfiles().active
const suffix = ACTIVE === 'me' ? '' : '.' + ACTIVE

const KEY = 'switchitup.progress.v1' + suffix

const empty = () => ({ done: {}, bookmarks: {}, notes: {}, revise: {}, log: {}, pomo: {}, last: null, startDate: null })

/** Local calendar date as YYYY-MM-DD */
export const dayKey = (d = new Date()) => {
  const z = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

function load() {
  try {
    return { ...empty(), ...(JSON.parse(localStorage.getItem(KEY)) || {}) }
  } catch {
    return empty()
  }
}

let state = load()
const listeners = new Set()

function commit(next) {
  state = next
  try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* storage unavailable */ }
  listeners.forEach((l) => l(state))
}

export function useProgress() {
  const [s, setS] = useState(state)
  useEffect(() => {
    listeners.add(setS)
    return () => listeners.delete(setS)
  }, [])

  const toggle = useCallback((bucket, id) => {
    const b = { ...state[bucket] }
    if (b[id]) delete b[id]
    else b[id] = new Date().toISOString()
    commit({ ...state, [bucket]: b })
  }, [])

  const setNote = useCallback((id, text) => {
    const notes = { ...state.notes }
    if (text) notes[id] = text
    else delete notes[id]
    commit({ ...state, notes })
  }, [])

  const addSeconds = useCallback((n) => {
    const k = dayKey()
    commit({ ...state, log: { ...state.log, [k]: (state.log[k] || 0) + n } })
  }, [])

  const addPomo = useCallback(() => {
    const k = dayKey()
    commit({ ...state, pomo: { ...state.pomo, [k]: (state.pomo[k] || 0) + 1 } })
  }, [])

  const setLast = useCallback((id) => { if (state.last !== id) commit({ ...state, last: id }) }, [])
  const setStartDate = useCallback((d) => commit({ ...state, startDate: d }), [])

  const exportData = () => JSON.stringify(state, null, 2)
  const importData = (json) => commit({ ...empty(), ...JSON.parse(json) })
  const reset = () => commit(empty())

  return { ...s, toggle, setNote, addSeconds, addPomo, setLast, setStartDate, exportData, importData, reset }
}

/** Consecutive days (ending today or yesterday) with ≥ 5 minutes of study or a completed module. */
export function streak(p) {
  const active = new Set(Object.entries(p.log).filter(([, s]) => s >= 300).map(([d]) => d))
  Object.values(p.done).forEach((iso) => active.add(dayKey(new Date(iso))))
  let n = 0
  const d = new Date()
  if (!active.has(dayKey(d))) d.setDate(d.getDate() - 1)
  while (active.has(dayKey(d))) { n++; d.setDate(d.getDate() - 1) }
  return n
}

/* ---------------- reading preferences ---------------- */
const PKEY = 'switchitup.prefs.v1' + suffix
const defaultPrefs = { theme: 'auto', font: 'serif', size: 18, width: 'normal', path: 'all' }
let prefs = (() => { try { return { ...defaultPrefs, ...JSON.parse(localStorage.getItem(PKEY)) } } catch { return defaultPrefs } })()
const prefListeners = new Set()

export function usePrefs() {
  const [p, setP] = useState(prefs)
  useEffect(() => { prefListeners.add(setP); return () => prefListeners.delete(setP) }, [])
  const set = useCallback((patch) => {
    prefs = { ...prefs, ...patch }
    try { localStorage.setItem(PKEY, JSON.stringify(prefs)) } catch { /* ignore */ }
    prefListeners.forEach((l) => l(prefs))
  }, [])
  return [p, set]
}
