import { useEffect, useMemo, useRef } from 'react'
import { marked } from 'marked'
import hljs from 'highlight.js/lib/common'
import dockerfile from 'highlight.js/lib/languages/dockerfile'

hljs.registerLanguage('dockerfile', dockerfile)
marked.setOptions({ gfm: true, breaks: false })

function slugify(s) {
  return s.toLowerCase().replace(/<[^>]+>/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

/** Renders markdown, highlights code, assigns heading ids and reports a TOC upward. */
export default function Markdown({ source, onToc }) {
  const ref = useRef(null)
  const html = useMemo(() => marked.parse(source), [source])

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const seen = {}
    const toc = []
    root.querySelectorAll('h2, h3').forEach((h) => {
      let id = slugify(h.textContent) || 'section'
      seen[id] = (seen[id] || 0) + 1
      if (seen[id] > 1) id += '-' + seen[id]
      h.id = id
      toc.push({ id, text: h.textContent, depth: h.tagName === 'H2' ? 2 : 3 })
    })
    root.querySelectorAll('pre code').forEach((el) => {
      if (el.dataset.highlighted) return
      if (/language-/.test(el.className)) {
        try { hljs.highlightElement(el) } catch { /* unknown language */ }
      } else {
        el.classList.add('plain')
      }
      const pre = el.parentElement
      if (pre.querySelector('.copy-btn')) return
      const btn = document.createElement('button')
      btn.className = 'copy-btn'
      btn.textContent = 'Copy'
      btn.onclick = () => {
        navigator.clipboard?.writeText(el.innerText)
        btn.textContent = 'Copied'
        setTimeout(() => (btn.textContent = 'Copy'), 1200)
      }
      pre.appendChild(btn)
    })
    // markdown isn't parsed inside raw <summary> HTML — render inline `code` there ourselves
    root.querySelectorAll('summary').forEach((s) => {
      if (s.innerHTML.includes('`')) s.innerHTML = s.innerHTML.replace(/`([^`]+)`/g, '<code>$1</code>')
    })
    root.querySelectorAll('a[href^="http"]').forEach((a) => { a.target = '_blank'; a.rel = 'noopener noreferrer' })
    root.querySelectorAll('table').forEach((t) => {
      if (t.parentElement.classList.contains('table-wrap')) return
      const w = document.createElement('div')
      w.className = 'table-wrap'
      t.replaceWith(w)
      w.appendChild(t)
    })
    onToc?.(toc)
  }, [html, onToc])

  return <article ref={ref} className="md" dangerouslySetInnerHTML={{ __html: html }} key={source.length} />
}
