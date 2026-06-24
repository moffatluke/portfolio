import { useEffect, useRef } from 'react'

// Interactive constellation background. A fixed grid of nodes that breathes
// on slow Lissajous paths, brightens around the cursor, and ripples on clicks.
// Ported from the Claude Design prototype; honors prefers-reduced-motion.
export default function ConstellationBg() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const reduceMo = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, nodes = [], spacing = 116
    let scrollGlow = 0
    let pulses = [] // click ripples: { x, y, start, dur }
    let raf = 0
    const t0 = performance.now()

    const theme = () => {
      const cs = getComputedStyle(document.documentElement)
      const hue = parseFloat(cs.getPropertyValue('--accent-h')) || 262
      const dark = document.documentElement.getAttribute('data-theme') === 'dark'
      return { hue, dark }
    }
    const idx = (c, r) => r * cols + c

    function build() {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      W = window.innerWidth; H = window.innerHeight
      canvas.width = Math.floor(W * dpr); canvas.height = Math.floor(H * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      spacing = W < 640 ? 88 : 116
      cols = Math.ceil(W / spacing) + 1
      rows = Math.ceil(H / spacing) + 1
      nodes = []
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const hx = c * spacing, hy = r * spacing
          nodes.push({ hx, hy, x: hx, y: hy })
        }
      }
    }

    function frame(now) {
      const t = (now - t0) / 1000
      const { hue, dark } = theme()
      scrollGlow *= 0.92
      if (pulses.length) pulses = pulses.filter((p) => (t - p.start) < p.dur)
      ctx.clearRect(0, 0, W, H)

      for (const n of nodes) { n.x = n.hx; n.y = n.hy }

      const L = dark ? 78 : 46, C = dark ? 0.17 : 0.22
      const lineMax = dark ? 0.6 : 0.5

      const centers = [
        { x: W * (0.5 + 0.42 * Math.sin(t * 0.11)),        y: H * (0.5 + 0.38 * Math.cos(t * 0.09 + 1.3)) },
        { x: W * (0.5 + 0.40 * Math.sin(t * 0.075 + 2.1)), y: H * (0.5 + 0.34 * Math.cos(t * 0.13 + 0.4)) },
      ]
      const breath = 0.5 + 0.5 * Math.sin(t * 0.55)
      const baseR = W < 640 ? 150 : 230
      const R = baseR * (0.7 + 0.6 * breath)
      const intensity = 0.55 + 0.45 * breath

      const infl = (x, y) => {
        let best = 0
        for (const ct of centers) {
          const d = Math.hypot(x - ct.x, y - ct.y)
          if (d >= R) continue
          const u = 1 - d / R, s = u * u * (3 - 2 * u)
          if (s > best) best = s
        }
        let v = best * intensity
        for (const p of pulses) {
          const age = t - p.start
          const ring = age * 620
          const d = Math.hypot(x - p.x, y - p.y)
          const band = 120
          const near = Math.max(0, 1 - Math.abs(d - ring) / band)
          const life = Math.max(0, 1 - age / p.dur)
          v += near * near * life * 1.15
        }
        return Math.min(1.4, v)
      }

      ctx.lineWidth = 1.1
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const a = nodes[idx(c, r)], neigh = []
          if (c + 1 < cols) neigh.push(nodes[idx(c + 1, r)])
          if (r + 1 < rows) neigh.push(nodes[idx(c, r + 1)])
          for (const b of neigh) {
            const ia = infl(a.x, a.y), ib = infl(b.x, b.y)
            if (ia < 0.02 && ib < 0.02) continue
            const aa = (ia * ia * lineMax).toFixed(3)
            const ab = (ib * ib * lineMax).toFixed(3)
            const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
            g.addColorStop(0, `oklch(${L}% ${C} ${hue} / ${aa})`)
            g.addColorStop(1, `oklch(${L}% ${C} ${hue} / ${ab})`)
            ctx.strokeStyle = g
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
          }
        }
      }
      for (const n of nodes) {
        const p = infl(n.x, n.y)
        const a = (dark ? 0.13 : 0.1) + scrollGlow + p * p * (dark ? 0.6 : 0.55)
        const rad = 1.0 + p * p * 3.4
        ctx.fillStyle = `oklch(${L}% ${C} ${hue} / ${a.toFixed(3)})`
        ctx.beginPath(); ctx.arc(n.x, n.y, rad, 0, Math.PI * 2); ctx.fill()
      }
      raf = reduceMo ? 0 : requestAnimationFrame(frame)
    }

    const onPointerDown = (e) => {
      const hit = e.target.closest('a, button, .cta-button, .ghost-link, .form-submit, .ai-chip, [role="button"]')
      if (!hit) return
      const now = (performance.now() - t0) / 1000
      pulses.push({ x: e.clientX, y: e.clientY, start: now, dur: 1.5 })
      if (pulses.length > 6) pulses.shift()
      if (reduceMo) frame(performance.now())
    }
    const onScroll = () => { scrollGlow = Math.min(0.16, scrollGlow + 0.05) }
    let rt
    const onResize = () => {
      clearTimeout(rt)
      rt = setTimeout(() => { build(); if (reduceMo) frame(performance.now()) }, 150)
    }

    window.addEventListener('pointerdown', onPointerDown, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)

    build()
    if (reduceMo) frame(performance.now())
    else raf = requestAnimationFrame(frame)

    return () => {
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(rt)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return <canvas id="bg-net" ref={canvasRef} aria-hidden="true" />
}
