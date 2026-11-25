import { useEffect, useRef, useState } from 'react'
import { getProfiles, saveProfiles } from '../lib/progress'

const COLORS = ['#6366f1', '#db2777', '#0d9488', '#ea580c', '#7c3aed', '#0284c7']
const initials = (name) => name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'

// Profile switcher: separate progress, notes, study time and preferences per person on one device.
export function Profiles() {
  const [open, setOpen] = useState(false)
  const [profiles, setProfiles] = useState(getProfiles)
  const [name, setName] = useState('')
  const ref = useRef(null)
  const active = profiles.list.find((p) => p.id === profiles.active) || profiles.list[0]

  useEffect(() => {
    if (!open) return
    const f = (e) => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', f)
    return () => document.removeEventListener('mousedown', f)
  }, [open])

  const switchTo = (id) => {
    if (id === profiles.active) return setOpen(false)
    saveProfiles({ ...profiles, active: id })
    location.reload()                       // progress stores are module-level; a reload loads the new profile cleanly
  }
  const add = () => {
    const n = name.trim()
    if (!n) return
    const id = 'p' + Date.now().toString(36)
    const next = { active: id, list: [...profiles.list, { id, name: n, color: COLORS[profiles.list.length % COLORS.length] }] }
    saveProfiles(next)
    location.reload()
  }
  const remove = (id) => {
    if (id === 'me' || !confirm('Remove this profile? Its progress stays in this browser but will be hidden.')) return
    const next = { active: profiles.active === id ? 'me' : profiles.active, list: profiles.list.filter((p) => p.id !== id) }
    saveProfiles(next); setProfiles(next)
    if (profiles.active === id) location.reload()
  }

  return (
    <div className="settings" ref={ref}>
      <button className="profile-chip" onClick={() => setOpen((o) => !o)} title="Switch learner profile">
        <span className="avatar" style={{ background: active.color }}>{initials(active.name)}</span>
        <span className="pname">{active.name}</span>
      </button>
      {open && (
        <div className="popover">
          <div className="pop-row"><span><b>Learner profiles</b></span></div>
          <p className="muted small" style={{ margin: '0 0 6px' }}>Each person gets their own progress, notes, streak and path on this device.</p>
          <div className="profile-list">
            {profiles.list.map((p) => (
              <div key={p.id} className={'profile-row' + (p.id === profiles.active ? ' on' : '')} role="button" tabIndex={0}
                onClick={() => switchTo(p.id)} onKeyDown={(e) => e.key === 'Enter' && switchTo(p.id)}>
                <span className="avatar" style={{ background: p.color }}>{initials(p.name)}</span>
                <span>{p.name}{p.id === profiles.active ? ' · active' : ''}</span>
                {p.id !== 'me' && <button className="linkbtn small" onClick={(e) => { e.stopPropagation(); remove(p.id) }}>remove</button>}
              </div>
            ))}
          </div>
          <div className="profile-add">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Add a profile, e.g. Priya" onKeyDown={(e) => e.key === 'Enter' && add()} />
            <button className="btn primary" onClick={add}>Add</button>
          </div>
        </div>
      )}
    </div>
  )
}
