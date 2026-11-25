// Lightweight confetti burst made of DOM elements + CSS animations (no dependencies).
const COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#e11d48', '#c026d3']

export function celebrate(e) {
  if (typeof window === 'undefined') return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return
  const x = e?.clientX ?? window.innerWidth / 2
  const y = e?.clientY ?? window.innerHeight / 3
  const layer = document.createElement('div')
  layer.className = 'confetti-layer'
  for (let i = 0; i < 36; i++) {
    const piece = document.createElement('i')
    const angle = Math.random() * Math.PI * 2
    const dist = 60 + Math.random() * 140
    piece.style.left = x + 'px'
    piece.style.top = y + 'px'
    piece.style.background = COLORS[i % COLORS.length]
    piece.style.setProperty('--dx', Math.cos(angle) * dist + 'px')
    piece.style.setProperty('--dy', Math.sin(angle) * dist - 80 + 'px')
    piece.style.setProperty('--rot', Math.random() * 720 - 360 + 'deg')
    piece.style.animationDelay = Math.random() * 60 + 'ms'
    layer.appendChild(piece)
  }
  document.body.appendChild(layer)
  setTimeout(() => layer.remove(), 1400)
}
