import { useEffect, useRef } from 'react'
import * as THREE from 'three'

/**
 * NeuralGraphBg — a localized 3D "second brain" knowledge graph that sits behind
 * the Ask-my-AI panel. Container-scoped (NOT full-window): it sizes to its parent,
 * reads your CSS accent tokens at runtime (so it tracks --accent-h and dark mode
 * automatically), and honors prefers-reduced-motion.
 *
 * Usage — wrap the AiChat in a relative box and drop this behind it:
 *
 *   <div className="ai-chat-stage">
 *     <NeuralGraphBg />
 *     <AiChat />
 *   </div>
 *
 * Props:
 *   nodeCount  number of nodes (auto-reduced on small screens). Default 90.
 *   speed      drift/rotation speed. Default 0.7.
 *   intensity  overall opacity of the network. Default 1.
 *   className  extra classes on the wrapper.
 */
export default function NeuralGraphBg({ nodeCount = 90, speed = 0.7, intensity = 1, distance = 46, className = '' }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduceMo = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // ---- constants (world units) ----
    const SPACE = 30, LINK = 11, HUB_LINK = 18, HUB_COUNT = 5, MAX_LINKS = 10

    // ---- resolve palette from your CSS tokens ----
    // A hidden probe resolves var() → a color string; a 2D canvas normalizes any
    // CSS color (incl. oklch) to #rrggbb so we always get clean sRGB for WebGL.
    const probe = document.createElement('span')
    probe.style.cssText = 'position:absolute;left:-9999px;opacity:0'
    document.body.appendChild(probe)
    const hexCtx = document.createElement('canvas').getContext('2d', { willReadFrequently: true })
    const resolveVar = (expr) => { probe.style.color = ''; probe.style.color = expr; return getComputedStyle(probe).color }
    // Paint 1px in the resolved color and read the pixel back. This normalizes ANY
    // CSS color (incl. oklch, which modern canvases keep as-is rather than hex) to sRGB.
    const rgb = (expr) => {
      hexCtx.fillStyle = '#000'
      hexCtx.fillStyle = resolveVar(expr)
      hexCtx.fillRect(0, 0, 1, 1)
      const d = hexCtx.getImageData(0, 0, 1, 1).data
      return [d[0] / 255, d[1] / 255, d[2] / 255]
    }
    const isDark = () => document.documentElement.getAttribute('data-theme') === 'dark'
    let palette = { node: [0, 0, 0], hub: [0, 0, 0], line: [0, 0, 0], dark: false }
    const readPalette = () => {
      palette = {
        node: rgb('var(--accent)'),
        hub: rgb('var(--accent-bright)'),
        line: rgb('var(--accent)'),
        dark: isDark(),
      }
    }
    readPalette()

    // ---- three.js scene ----
    const scene = new THREE.Scene()
    let W = mount.clientWidth || 1, H = mount.clientHeight || 1
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 400)
    camera.position.set(0, 0, distance)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2))
    renderer.setSize(W, H)
    renderer.domElement.style.cssText = 'display:block;width:100%;height:100%'
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)

    // blending: additive glow on dark, normal "ink" on light
    const blend = () => (palette.dark ? THREE.AdditiveBlending : THREE.NormalBlending)

    const uScale = { value: H / (2 * Math.tan((camera.fov * Math.PI) / 360)) }
    const nodeMat = new THREE.ShaderMaterial({
      uniforms: { uScale },
      vertexShader: `
        attribute float size; attribute vec3 acolor; attribute float aalpha;
        varying vec3 vC; varying float vA; uniform float uScale;
        void main(){ vC=acolor; vA=aalpha;
          vec4 mv = modelViewMatrix * vec4(position,1.0);
          gl_PointSize = clamp(size * (uScale / -mv.z), 1.0, 120.0);
          gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `
        varying vec3 vC; varying float vA;
        void main(){ float d = length(gl_PointCoord-0.5)*2.0;
          float a = pow(smoothstep(1.0,0.0,d), 1.5);
          gl_FragColor = vec4(vC, a*vA); }`,
      transparent: true, blending: blend(), depthWrite: false, depthTest: false,
    })
    const lineMat = new THREE.ShaderMaterial({
      vertexShader: `attribute vec3 acolor; attribute float aalpha; varying vec3 vC; varying float vA;
        void main(){ vC=acolor; vA=aalpha; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0);} `,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ gl_FragColor = vec4(vC, vA); }`,
      transparent: true, blending: blend(), depthWrite: false, depthTest: false,
    })

    const points = new THREE.Points(new THREE.BufferGeometry(), nodeMat); points.frustumCulled = false
    const lines = new THREE.LineSegments(new THREE.BufferGeometry(), lineMat); lines.frustumCulled = false

    // sparks: little lights that travel along the edges when the graph is "thinking"
    const sparkMat = nodeMat.clone()
    const sparkPoints = new THREE.Points(new THREE.BufferGeometry(), sparkMat); sparkPoints.frustumCulled = false
    const MAXSP = 64
    const spk = {
      list: [], max: MAXSP,
      pos: new Float32Array(MAXSP * 3), col: new Float32Array(MAXSP * 3),
      size: new Float32Array(MAXSP), alpha: new Float32Array(MAXSP),
    }
    const spg = new THREE.BufferGeometry()
    spg.setAttribute('position', new THREE.BufferAttribute(spk.pos, 3))
    spg.setAttribute('acolor', new THREE.BufferAttribute(spk.col, 3))
    spg.setAttribute('size', new THREE.BufferAttribute(spk.size, 1))
    spg.setAttribute('aalpha', new THREE.BufferAttribute(spk.alpha, 1))
    sparkPoints.geometry = spg

    group.add(lines); group.add(points); group.add(sparkPoints)

    // ---- ripples: expanding shells of light that brighten nodes/edges as they pass ----
    const ripples = []
    const spawnRipple = (i, str) => {
      if (!g) return
      ripples.push({ x: g.world[i * 3], y: g.world[i * 3 + 1], z: g.world[i * 3 + 2], age: 0, max: 2.6, speed: SPACE * 0.9, str })
      if (ripples.length > 10) ripples.shift()
    }
    const findNeighbor = (i, exclude) => {
      const ax = g.pos[i * 3], ay = g.pos[i * 3 + 1], az = g.pos[i * 3 + 2]
      let n = 0; const cand = findNeighbor._c || (findNeighbor._c = new Int32Array(32))
      for (let j = 0; j < g.N && n < 32; j++) {
        if (j === i || j === exclude) continue
        const r = (g.isHub[i] || g.isHub[j]) ? HUB_LINK * 1.3 : LINK * 1.5
        const dx = ax - g.pos[j * 3], dy = ay - g.pos[j * 3 + 1], dz = az - g.pos[j * 3 + 2]
        if (dx * dx + dy * dy + dz * dz <= r * r) cand[n++] = j
      }
      return n === 0 ? -1 : cand[(Math.random() * n) | 0]
    }
    const emitSpark = (i) => {
      if (spk.list.length >= spk.max) return
      const j = findNeighbor(i, -1); if (j < 0) return
      spk.list.push({ a: i, b: j, t: 0, speed: 0.7 + Math.random() * 0.7, life: 1 })
    }
    // Fire a pulse from a hub node + a burst of sparks. AiChat dispatches
    // `window.dispatchEvent(new Event('ai-graph-pulse'))` when a message is sent.
    const pulseFromCenter = () => {
      if (!g) return
      // "brain firing": every hub flares a ripple and sprays sparks to its
      // neighbours, plus a scatter of random nodes, so activity cascades across
      // the whole network at once instead of a single pulse.
      const hubs = []
      for (let i = 0; i < g.N; i++) if (g.isHub[i]) hubs.push(i)
      if (!hubs.length) hubs.push(0)
      for (const h of hubs) {
        spawnRipple(h, 1.4)
        for (let s = 0; s < 7; s++) emitSpark(h)
      }
      for (let s = 0; s < 8; s++) emitSpark((Math.random() * g.N) | 0)
    }
    const onPulse = () => { if (reduceMo) return; pulseFromCenter() }
    window.addEventListener('ai-graph-pulse', onPulse)

    // ---- seeded 3D simplex noise (organic, non-looping drift) ----
    const noise = makeNoise()

    // ---- build graph ----
    let g = null
    const smallCount = () => Math.min(nodeCount, W < 480 ? 64 : nodeCount)
    function build() {
      const N = smallCount()
      const base = new Float32Array(N * 3), phase = new Float32Array(N), rate = new Float32Array(N)
      const isHub = new Uint8Array(N), sizeBase = new Float32Array(N)
      let s = 9001; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
      const gold = Math.PI * (3 - Math.sqrt(5))
      for (let i = 0; i < N; i++) {
        const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(Math.max(0, 1 - y * y)), th = gold * i
        const rad = SPACE * (0.45 + 0.55 * Math.cbrt(rnd()))
        base[i * 3] = Math.cos(th) * r * rad + (rnd() - 0.5) * 4
        base[i * 3 + 1] = y * rad * 0.82 + (rnd() - 0.5) * 4
        base[i * 3 + 2] = Math.sin(th) * r * rad + (rnd() - 0.5) * 4
        phase[i] = rnd() * Math.PI * 2; rate[i] = 0.45 + rnd() * 0.9; sizeBase[i] = 1.1 + rnd() * 0.5
      }
      const order = [...Array(N).keys()].sort((a, b) =>
        (base[a * 3] ** 2 + base[a * 3 + 1] ** 2 + base[a * 3 + 2] ** 2) -
        (base[b * 3] ** 2 + base[b * 3 + 1] ** 2 + base[b * 3 + 2] ** 2))
      for (let h = 0; h < Math.min(HUB_COUNT, N); h++) { isHub[order[h]] = 1; sizeBase[order[h]] = 2.4 + rnd() * 0.8 }

      const pos = new Float32Array(N * 3), acolor = new Float32Array(N * 3)
      const asize = new Float32Array(N), aalpha = new Float32Array(N)
      const maxSeg = N * MAX_LINKS
      const lpos = new Float32Array(maxSeg * 6), lcol = new Float32Array(maxSeg * 6), lalpha = new Float32Array(maxSeg * 2)

      points.geometry.dispose()
      const pg = new THREE.BufferGeometry()
      pg.setAttribute('position', new THREE.BufferAttribute(pos, 3))
      pg.setAttribute('acolor', new THREE.BufferAttribute(acolor, 3))
      pg.setAttribute('size', new THREE.BufferAttribute(asize, 1))
      pg.setAttribute('aalpha', new THREE.BufferAttribute(aalpha, 1))
      points.geometry = pg
      lines.geometry.dispose()
      const lg = new THREE.BufferGeometry()
      lg.setAttribute('position', new THREE.BufferAttribute(lpos, 3))
      lg.setAttribute('acolor', new THREE.BufferAttribute(lcol, 3))
      lg.setAttribute('aalpha', new THREE.BufferAttribute(lalpha, 1))
      lg.setDrawRange(0, 0)
      lines.geometry = lg

      g = { N, base, phase, rate, isHub, sizeBase, pos, acolor, asize, aalpha, lpos, lcol, lalpha, maxSeg,
        world: new Float32Array(N * 3), depth: new Float32Array(N), bright: new Float32Array(N) }
    }
    build()

    // ---- camera drift state (pointer interaction removed) ----
    const mouse = { x: 0, y: 0 }, sm = { x: 0, y: 0 }

    // ---- resize (observe the container, not the window) ----
    const ro = new ResizeObserver(() => {
      W = mount.clientWidth || 1; H = mount.clientHeight || 1
      camera.aspect = W / H; camera.updateProjectionMatrix()
      uScale.value = H / (2 * Math.tan((camera.fov * Math.PI) / 360))
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, W < 640 ? 1.5 : 2))
      renderer.setSize(W, H)
      if (smallCount() !== g.N) build()
    })
    ro.observe(mount)

    // re-read palette when the theme flips
    const mo = new MutationObserver(() => { readPalette(); nodeMat.blending = lineMat.blending = blend(); nodeMat.needsUpdate = lineMat.needsUpdate = true })
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    // ---- animation loop ----
    const clock = new THREE.Clock()
    let raf = 0, autoRot = 0
    const v = new THREE.Vector3()
    function frame() {
      raf = requestAnimationFrame(frame)
      const dt = Math.min(clock.getDelta(), 0.05), time = clock.elapsedTime
      const nP = palette.node, hP = palette.hub, lP = palette.line, dark = palette.dark

      // eased parallax + gentle zero-gravity rotation
      sm.x += (mouse.x - sm.x) * 0.04; sm.y += (mouse.y - sm.y) * 0.04
      camera.position.x += (sm.x * 4 - camera.position.x) * 0.04
      camera.position.y += (sm.y * 4 - camera.position.y) * 0.04
      camera.lookAt(0, 0, 0)
      autoRot += dt * 0.04 * speed
      const wob = noise(time * 0.025, 11.7, 0) * 0.1
      group.rotation.y += (autoRot + sm.x * 0.3 - group.rotation.y) * 0.045
      group.rotation.x += (sm.y * -0.24 + wob - group.rotation.x) * 0.045
      group.updateMatrixWorld(true)

      // drift with simplex noise
      const nf = 0.045, ts = 0.08 * speed, amp = 5
      for (let i = 0; i < g.N; i++) {
        const bx = g.base[i * 3], by = g.base[i * 3 + 1], bz = g.base[i * 3 + 2]
        g.pos[i * 3] = bx + amp * noise(bx * nf, by * nf, time * ts)
        g.pos[i * 3 + 1] = by + amp * noise(by * nf + 31.4, bz * nf, time * ts + 5)
        g.pos[i * 3 + 2] = bz + amp * noise(bz * nf + 67.8, bx * nf + 12.2, time * ts + 9)
      }

      // world/depth
      const mw = group.matrixWorld, cam = camera.position
      let dMin = 1e9, dMax = -1e9
      for (let i = 0; i < g.N; i++) {
        v.set(g.pos[i * 3], g.pos[i * 3 + 1], g.pos[i * 3 + 2]).applyMatrix4(mw)
        g.world[i * 3] = v.x; g.world[i * 3 + 1] = v.y; g.world[i * 3 + 2] = v.z
        const d = Math.hypot(v.x - cam.x, v.y - cam.y, v.z - cam.z)
        g.depth[i] = d; if (d < dMin) dMin = d; if (d > dMax) dMax = d
      }
      const dRange = Math.max(1e-3, dMax - dMin)

      // advance ripples
      for (let r = ripples.length - 1; r >= 0; r--) {
        ripples[r].age += dt
        if (ripples[r].age > ripples[r].max) ripples.splice(r, 1)
      }

      // node activity → opacity/size
      for (let i = 0; i < g.N; i++) {
        const pulse = Math.pow(Math.max(0, Math.sin(time * g.rate[i] + g.phase[i])), 6)
        const depthFade = 0.4 + 0.6 * (1 - (g.depth[i] - dMin) / dRange)

        // ripple contribution: bright band expanding from the pulse origin
        let rip = 0
        for (let k = 0; k < ripples.length; k++) {
          const R = ripples[k]
          const wx = g.world[i * 3] - R.x, wy = g.world[i * 3 + 1] - R.y, wz = g.world[i * 3 + 2] - R.z
          const d = Math.sqrt(wx * wx + wy * wy + wz * wz)
          const band = Math.exp(-Math.pow((d - R.age * R.speed) / 5, 2))
          rip = Math.max(rip, band * (1 - R.age / R.max) * R.str)
        }
        // a node lit by the ripple front occasionally fires a spark to a neighbour
        if (rip > 0.55 && Math.random() < 0.05) emitSpark(i)

        const act = pulse * 0.7 + rip * 1.4
        g.bright[i] = 0.4 + act
        const col = g.isHub[i] ? hP : nP
        const glow = dark ? 1.35 : 1
        g.acolor[i * 3] = col[0] * glow; g.acolor[i * 3 + 1] = col[1] * glow; g.acolor[i * 3 + 2] = col[2] * glow
        let alpha = (dark ? 0.5 : 0.34) + act * 0.55
        alpha *= depthFade * intensity * (g.isHub[i] ? 1.15 : 1)
        g.aalpha[i] = Math.min(1, alpha)
        g.asize[i] = g.sizeBase[i] * (1 + pulse * 0.5 + rip * 0.9)
      }

      // travel sparks along edges; they chain node→node like a signal, then fade
      const spd = Math.max(0.4, speed)
      for (let k = spk.list.length - 1; k >= 0; k--) {
        const S = spk.list[k]
        S.t += S.speed * dt * spd
        if (S.t >= 1) {
          const nb = findNeighbor(S.b, S.a)
          if (nb < 0 || Math.random() < 0.3) { spk.list.splice(k, 1); continue }
          S.a = S.b; S.b = nb; S.t = 0; S.life *= 0.8
          if (S.life < 0.15) spk.list.splice(k, 1)
        }
      }
      const spC = dark ? hP : hP // accent-bright reads well on both themes
      const sn = Math.min(spk.list.length, spk.max)
      for (let k = 0; k < spk.max; k++) {
        if (k < sn) {
          const S = spk.list[k], a = S.a, b = S.b
          const e = S.t * S.t * (3 - 2 * S.t)
          spk.pos[k * 3] = g.pos[a * 3] + (g.pos[b * 3] - g.pos[a * 3]) * e
          spk.pos[k * 3 + 1] = g.pos[a * 3 + 1] + (g.pos[b * 3 + 1] - g.pos[a * 3 + 1]) * e
          spk.pos[k * 3 + 2] = g.pos[a * 3 + 2] + (g.pos[b * 3 + 2] - g.pos[a * 3 + 2]) * e
          spk.col[k * 3] = spC[0] * (dark ? 1.5 : 1); spk.col[k * 3 + 1] = spC[1] * (dark ? 1.5 : 1); spk.col[k * 3 + 2] = spC[2] * (dark ? 1.5 : 1)
          const head = Math.sin(S.t * Math.PI)
          spk.size[k] = 1.5 + head * 0.9
          spk.alpha[k] = S.life * (0.45 + head * 0.5) * intensity
        } else { spk.alpha[k] = 0; spk.size[k] = 0 }
      }
      spg.attributes.position.needsUpdate = true; spg.attributes.acolor.needsUpdate = true
      spg.attributes.size.needsUpdate = true; spg.attributes.aalpha.needsUpdate = true

      // edges between nearby nodes (fade in/out with distance)
      let seg = 0; const linkCount = new Uint8Array(g.N), maxSeg = g.maxSeg
      const lineMax = dark ? 0.62 : 0.5
      for (let i = 0; i < g.N && seg < maxSeg; i++) {
        const ri = g.isHub[i] ? HUB_LINK : LINK
        const ax = g.pos[i * 3], ay = g.pos[i * 3 + 1], az = g.pos[i * 3 + 2]
        for (let j = i + 1; j < g.N; j++) {
          if (linkCount[i] >= MAX_LINKS) break
          const r = Math.max(ri, g.isHub[j] ? HUB_LINK : LINK)
          const dx = ax - g.pos[j * 3], dy = ay - g.pos[j * 3 + 1], dz = az - g.pos[j * 3 + 2]
          const d2 = dx * dx + dy * dy + dz * dz
          if (d2 > r * r) continue
          const close = 1 - Math.sqrt(d2) / r
          const avgB = (g.bright[i] + g.bright[j]) * 0.5
          const alpha = Math.min(lineMax, close * (0.12 + avgB * 0.18) * intensity)
          const o = seg * 6, oa = seg * 2
          g.lpos[o] = ax; g.lpos[o + 1] = ay; g.lpos[o + 2] = az
          g.lpos[o + 3] = g.pos[j * 3]; g.lpos[o + 4] = g.pos[j * 3 + 1]; g.lpos[o + 5] = g.pos[j * 3 + 2]
          for (let k = 0; k < 2; k++) { g.lcol[o + k * 3] = lP[0]; g.lcol[o + k * 3 + 1] = lP[1]; g.lcol[o + k * 3 + 2] = lP[2] }
          g.lalpha[oa] = alpha; g.lalpha[oa + 1] = alpha
          seg++; linkCount[i]++; linkCount[j]++
          if (seg >= maxSeg) break
        }
      }

      const pg = points.geometry, lg = lines.geometry
      pg.attributes.position.needsUpdate = true; pg.attributes.acolor.needsUpdate = true
      pg.attributes.size.needsUpdate = true; pg.attributes.aalpha.needsUpdate = true
      lg.setDrawRange(0, seg * 2)
      lg.attributes.position.needsUpdate = true; lg.attributes.acolor.needsUpdate = true; lg.attributes.aalpha.needsUpdate = true

      renderer.render(scene, camera)
    }
    if (reduceMo) { frame(); cancelAnimationFrame(raf); raf = 0 } // one static frame
    else raf = requestAnimationFrame(frame)

    // ---- cleanup: dispose ALL GPU resources ----
    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro.disconnect(); mo.disconnect()
      window.removeEventListener('ai-graph-pulse', onPulse)
      probe.remove()
      points.geometry.dispose(); lines.geometry.dispose(); sparkPoints.geometry.dispose()
      nodeMat.dispose(); lineMat.dispose(); sparkMat.dispose(); renderer.dispose()
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }, [nodeCount, speed, intensity, distance])

  return <div ref={mountRef} className={`neural-graph-bg ${className}`} aria-hidden="true" />
}

// --- seeded 3D simplex noise ---
function makeNoise() {
  const grad = new Float32Array([1,1,0,-1,1,0,1,-1,0,-1,-1,0,1,0,1,-1,0,1,1,0,-1,-1,0,-1,0,1,1,0,-1,1,0,1,-1,0,-1,-1])
  const p = new Uint8Array(256)
  for (let i = 0; i < 256; i++) p[i] = i
  let s = 1337; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647
  for (let i = 255; i > 0; i--) { const n = Math.floor(rnd() * (i + 1)); const t = p[i]; p[i] = p[n]; p[n] = t }
  const perm = new Uint8Array(512), pm = new Uint8Array(512)
  for (let i = 0; i < 512; i++) { perm[i] = p[i & 255]; pm[i] = perm[i] % 12 }
  const F = 1 / 3, G = 1 / 6
  return (x, y, z) => {
    let n0, n1, n2, n3
    const t0s = (x + y + z) * F
    const i = Math.floor(x + t0s), j = Math.floor(y + t0s), k = Math.floor(z + t0s)
    const t = (i + j + k) * G
    const x0 = x - (i - t), y0 = y - (j - t), z0 = z - (k - t)
    let i1, j1, k1, i2, j2, k2
    if (x0 >= y0) {
      if (y0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=1;k2=0 }
      else if (x0 >= z0) { i1=1;j1=0;k1=0;i2=1;j2=0;k2=1 }
      else { i1=0;j1=0;k1=1;i2=1;j2=0;k2=1 }
    } else {
      if (y0 < z0) { i1=0;j1=0;k1=1;i2=0;j2=1;k2=1 }
      else if (x0 < z0) { i1=0;j1=1;k1=0;i2=0;j2=1;k2=1 }
      else { i1=0;j1=1;k1=0;i2=1;j2=1;k2=0 }
    }
    const x1=x0-i1+G, y1=y0-j1+G, z1=z0-k1+G
    const x2=x0-i2+2*G, y2=y0-j2+2*G, z2=z0-k2+2*G
    const x3=x0-1+3*G, y3=y0-1+3*G, z3=z0-1+3*G
    const ii=i&255, jj=j&255, kk=k&255
    let a=0.6-x0*x0-y0*y0-z0*z0; if (a<0) n0=0; else { const gi=pm[ii+perm[jj+perm[kk]]]*3; a*=a; n0=a*a*(grad[gi]*x0+grad[gi+1]*y0+grad[gi+2]*z0) }
    let b=0.6-x1*x1-y1*y1-z1*z1; if (b<0) n1=0; else { const gi=pm[ii+i1+perm[jj+j1+perm[kk+k1]]]*3; b*=b; n1=b*b*(grad[gi]*x1+grad[gi+1]*y1+grad[gi+2]*z1) }
    let c=0.6-x2*x2-y2*y2-z2*z2; if (c<0) n2=0; else { const gi=pm[ii+i2+perm[jj+j2+perm[kk+k2]]]*3; c*=c; n2=c*c*(grad[gi]*x2+grad[gi+1]*y2+grad[gi+2]*z2) }
    let d=0.6-x3*x3-y3*y3-z3*z3; if (d<0) n3=0; else { const gi=pm[ii+1+perm[jj+1+perm[kk+1]]]*3; d*=d; n3=d*d*(grad[gi]*x3+grad[gi+1]*y3+grad[gi+2]*z3) }
    return 32 * (n0 + n1 + n2 + n3)
  }
}
