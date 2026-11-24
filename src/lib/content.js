// Loads every markdown file under src/content at build time.
// Path convention: src/content/<trackId>/<NN>-<slug>.md   (NN controls order inside a track)
// Frontmatter (between --- lines): title, level (1-5), minutes (optional), tags (comma separated, optional)

const files = import.meta.glob('../content/**/*.md', { query: '?raw', import: 'default', eager: true })

function parse(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  const meta = {}
  if (m) {
    for (const line of m[1].split(/\r?\n/)) {
      const i = line.indexOf(':')
      if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim()
    }
  }
  return { meta, body: m ? raw.slice(m[0].length) : raw }
}

const all = Object.entries(files).map(([path, raw]) => {
  const [, track, file] = path.match(/content\/([^/]+)\/(.+)\.md$/)
  const { meta, body } = parse(raw)
  const words = body.split(/\s+/).length
  return {
    id: `${track}/${file}`,
    track,
    file,
    title: meta.title || file,
    level: Number(meta.level || 1),
    minutes: Number(meta.minutes) || Math.max(10, Math.round((words / 180) * 1.6)),
    tags: (meta.tags || '').split(',').map((s) => s.trim()).filter(Boolean),
    body,
    words,
  }
})

all.sort((a, b) => (a.track === b.track ? a.file.localeCompare(b.file) : a.track.localeCompare(b.track)))

export const pages = Object.fromEntries(all.filter((t) => t.track === '_pages').map((t) => [t.file, t]))
export const topics = all.filter((t) => t.track !== '_pages')
export const topicById = Object.fromEntries(topics.map((t) => [t.id, t]))

export function topicsOfTrack(trackId) {
  return topics.filter((t) => t.track === trackId)
}

export function topicsOfLevel(level) {
  return topics.filter((t) => t.level === level)
}

export function search(q) {
  const needle = q.trim().toLowerCase()
  if (needle.length < 2) return []
  const out = []
  for (const t of topics) {
    const inTitle = t.title.toLowerCase().includes(needle)
    const idx = t.body.toLowerCase().indexOf(needle)
    if (!inTitle && idx < 0) continue
    let snippet = ''
    if (idx >= 0) {
      const s = Math.max(0, idx - 80)
      snippet = (s > 0 ? '…' : '') + t.body.slice(s, idx + needle.length + 120).replace(/[#*`>|]/g, '').replace(/\s+/g, ' ') + '…'
    }
    let count = 0
    let p = t.body.toLowerCase().indexOf(needle)
    while (p >= 0 && count < 99) { count++; p = t.body.toLowerCase().indexOf(needle, p + 1) }
    out.push({ topic: t, snippet, score: (inTitle ? 100 : 0) + count })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 40)
}
