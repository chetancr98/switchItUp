import { LEVELS, trackById, pathById } from '../data/tracks'
import { SYSTEMS_PLAN_WEEKS } from '../data/plan'
import { topicsOfTrack } from '../lib/content'

const SKILLS = [
  { icon: '🐧', name: 'Linux administration', desc: 'Users, permissions, systemd, logs, storage/LVM, packages, SSH, performance tools.' },
  { icon: '🌐', name: 'Networking', desc: 'TCP/IP, subnetting, DNS, DHCP, routing, VLANs, firewalls, VPN, load balancers.' },
  { icon: '🪟', name: 'Windows & Active Directory', desc: 'AD DS, GPO, DNS/DHCP on Windows, PowerShell, Entra ID / Microsoft 365.' },
  { icon: '🗄️', name: 'Virtualization & storage', desc: 'VMware/Hyper-V/KVM, RAID, SAN/NAS, snapshots, backup & disaster recovery.' },
  { icon: '☁️', name: 'Cloud infrastructure', desc: 'AWS/Azure compute, networking, IAM, storage, cost and governance.' },
  { icon: '⚙️', name: 'Scripting & automation', desc: 'Bash, PowerShell, Ansible, Git — automate anything done twice.' },
  { icon: '🛡️', name: 'Security', desc: 'Hardening, patching, least privilege, MFA, certificates, logging and incident response.' },
  { icon: '📈', name: 'Monitoring & ITIL', desc: 'Metrics, alerting, incident/problem/change management, SLAs, documentation.' },
  { icon: '🧩', name: 'Troubleshooting method', desc: 'Structured diagnosis under pressure — the skill every interview tests.' },
]

const ROUNDS = [
  { t: 'Screening / HR', d: 'Background, certifications, notice period, shift/on-call availability, salary expectations.' },
  { t: 'Technical fundamentals', d: 'Rapid-fire: OS, Linux commands, networking (OSI, subnetting, DNS), Windows/AD, virtualization, backups.' },
  { t: 'Scenario & troubleshooting', d: '“A server is slow / a website is down / users can’t log in — walk me through it.” Method matters as much as the answer.' },
  { t: 'Hands-on / practical', d: 'Live terminal or written tasks: write a Bash/PowerShell script, find a process eating CPU, fix a broken service, read a log.' },
  { t: 'Design & architecture (senior)', d: 'Design a highly available setup, a backup/DR plan, an AD/network layout for a new office, or a cloud landing zone.' },
  { t: 'Managerial / behavioral', d: 'Incidents handled, working under pressure, communicating with users and vendors, change management discipline.' },
]

export function SystemsRole({ p, prefs, setPrefs, TopicRow }) {
  const path = pathById.systems
  const tracks = ['linux', 'networking', 'infra', 'itops']
  const all = tracks.flatMap((t) => topicsOfTrack(t))
  const done = all.filter((t) => p.done[t.id]).length
  const isMine = prefs.path === 'systems'

  return (
    <div className="page">
      <div className="crumbs"><a href="#/">Home</a> / Systems Engineer</div>
      <section className="role-hero">
        <span className="role-hero-art" aria-hidden="true">🖥️</span>
        <p className="eyebrow" style={{ color: 'rgba(255,255,255,.8)' }}>Role path</p>
        <h1>Systems Engineer — basics to expert</h1>
        <p>For System Engineer, Systems / Linux / Windows Administrator, Infrastructure Engineer, Cloud Operations and L2/L3 IT support roles. Everything an interviewer for these roles checks — from “what happens when you boot a server?” to designing disaster recovery — with commands, scenarios and real interview questions.</p>
        <p><b>{all.length} core modules</b> · {done} done · 12-week plan · plus shared DevOps, Git, SQL and interview tracks</p>
        <div className="welcome-actions">
          <button className="btn" onClick={() => setPrefs({ path: 'systems' })} disabled={isMine}>{isMine ? '✓ This is my path' : 'Make this my path'}</button>
          <a className="btn ghost" href="#/plan">Open the 12-week plan</a>
        </div>
        <p className="small" style={{ marginTop: 14, color: 'rgba(255,255,255,.8)' }}>Studying with someone else on this device? Use the profile button (top right) so each person has separate progress.</p>
      </section>

      <h2 className="section-title">What interviewers test</h2>
      <div className="skill-map stagger">
        {SKILLS.map((s, i) => <div key={s.name} className="skill" style={{ '--i': i }}><b>{s.icon} {s.name}</b><p>{s.desc}</p></div>)}
      </div>

      <h2 className="section-title">Typical interview rounds</h2>
      <div className="round-list">
        {ROUNDS.map((r, i) => <div key={r.t} className="round"><span className="round-no">{i + 1}</span><div><b>{r.t}</b><p>{r.d}</p></div></div>)}
      </div>

      <h2 className="section-title">Your roadmap</h2>
      {LEVELS.map((L) => {
        const lt = all.filter((t) => t.level === L.n)
        if (!lt.length) return null
        return (
          <section key={L.n} className="panel">
            <div className="panel-head"><h2><span className={`lvl lvl-${L.n}`}>L{L.n} · {L.name}</span></h2><span className="muted small">{lt.filter((t) => p.done[t.id]).length}/{lt.length}</span></div>
            {lt.map((t) => <TopicRow key={t.id} t={t} p={p} showTrack />)}
          </section>
        )
      })}

      <h2 className="section-title">Also on this path</h2>
      <div className="grid stagger">
        {path.tracks.filter((t) => !tracks.includes(t)).map((id, i) => {
          const tr = trackById[id]
          return <a key={id} className="card" href={`#/track/${id}`} style={{ '--c': tr.color, '--i': i }}><div className="card-icon">{tr.icon}</div><h3>{tr.name}</h3><p className="muted small">{tr.desc}</p></a>
        })}
      </div>

      <h2 className="section-title">12-week plan at a glance</h2>
      <div className="weeks">
        {SYSTEMS_PLAN_WEEKS.map((w, i) => (
          <div key={i} className="week"><div className="week-head"><span className="week-no">W{i + 1}</span><div><h3>{w.title}</h3><p className="muted small">{w.focus}</p></div></div></div>
        ))}
      </div>
    </div>
  )
}
