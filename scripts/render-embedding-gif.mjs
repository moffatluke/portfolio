// Renders the knowledge-base embeddings as a rotating 3D GIF for the README.
//
// Pulls every chunk's 768-D embedding from Supabase, projects it to 3D with
// PCA, then software-rasterizes a spinning point cloud and encodes it as a GIF.
// Run: node --env-file=.env.local scripts/render-embedding-gif.mjs
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import gifenc from 'gifenc'
const { GIFEncoder, quantize, applyPalette } = gifenc

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'assets', 'embeddings-3d.gif')

// Source -> RGB. Matches the colors used in the chat visualization.
const COLORS = {
  'bio.md': [55, 138, 221],
  'education.md': [29, 158, 117],
  'experience.md': [127, 119, 221],
  'faq.md': [136, 135, 128],
  'projects.md': [216, 90, 48],
  'sandbox.md': [186, 117, 23],
  'skills.md': [212, 83, 126],
}
const BG = [13, 17, 23]

async function loadVectors() {
  const sb = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await sb.from('documents').select('metadata, embedding').order('id')
  if (error) throw error
  return data.map((r) => ({
    source: r.metadata?.source || '?',
    vec: typeof r.embedding === 'string' ? JSON.parse(r.embedding) : r.embedding,
  }))
}

// PCA via the Gram matrix: top-3 eigenvectors give the 3D sample coordinates.
function pca3(rows) {
  const n = rows.length
  const d = rows[0].vec.length
  const mean = new Array(d).fill(0)
  for (const r of rows) for (let j = 0; j < d; j++) mean[j] += r.vec[j]
  for (let j = 0; j < d; j++) mean[j] /= n
  const X = rows.map((r) => r.vec.map((v, j) => v - mean[j]))
  const G = Array.from({ length: n }, () => new Array(n).fill(0))
  for (let i = 0; i < n; i++)
    for (let k = i; k < n; k++) {
      let s = 0
      for (let j = 0; j < d; j++) s += X[i][j] * X[k][j]
      G[i][k] = s; G[k][i] = s
    }
  const topEig = (M, iters = 600) => {
    let v = new Array(n).fill(0).map(() => Math.random() - 0.5)
    let lambda = 0
    for (let t = 0; t < iters; t++) {
      const w = new Array(n).fill(0)
      for (let i = 0; i < n; i++) { let s = 0; for (let k = 0; k < n; k++) s += M[i][k] * v[k]; w[i] = s }
      const norm = Math.sqrt(w.reduce((a, b) => a + b * b, 0)) || 1
      for (let i = 0; i < n; i++) w[i] /= norm
      v = w; lambda = norm
    }
    return { vec: v, val: lambda }
  }
  const deflate = (M, e) => M.map((row, i) => row.map((val, k) => val - e.val * e.vec[i] * e.vec[k]))
  const e1 = topEig(G)
  const e2 = topEig(deflate(G, e1))
  const e3 = topEig(deflate(deflate(G, e1), e2))
  const c = (e) => e.vec.map((u) => u * Math.sqrt(e.val))
  const xs = c(e1), ys = c(e2), zs = c(e3)
  return rows.map((r, i) => ({ x: xs[i], y: ys[i], z: zs[i], source: r.source }))
}

const W = 600, H = 440, CX = W / 2, CY = H / 2, R = 150, FOCAL = 2.6, PITCH = -0.35
const FRAMES = 48, DELAY = 55

function project(p, yaw, k) {
  const x = p.x * k, y = p.y * k, z = p.z * k
  const x1 = x * Math.cos(yaw) + z * Math.sin(yaw)
  const z1 = -x * Math.sin(yaw) + z * Math.cos(yaw)
  const y2 = y * Math.cos(PITCH) - z1 * Math.sin(PITCH)
  const z2 = y * Math.sin(PITCH) + z1 * Math.cos(PITCH)
  const persp = FOCAL / (FOCAL - z2)
  return { sx: CX + x1 * persp * R, sy: CY - y2 * persp * R, persp, z: z2 }
}

function renderFrame(points, yaw, k) {
  const buf = new Uint8ClampedArray(W * H * 4)
  for (let i = 0; i < W * H; i++) { buf[i * 4] = BG[0]; buf[i * 4 + 1] = BG[1]; buf[i * 4 + 2] = BG[2]; buf[i * 4 + 3] = 255 }
  const drawn = points.map((p) => ({ ...project(p, yaw, k), c: COLORS[p.source] })).sort((a, b) => a.z - b.z)
  for (const d of drawn) {
    const r = 7 * d.persp
    const a = Math.max(0.4, Math.min(1, 0.45 + 0.55 * ((d.persp - 0.6) / 1.2)))
    const x0 = Math.max(0, Math.floor(d.sx - r - 1)), x1 = Math.min(W - 1, Math.ceil(d.sx + r + 1))
    const y0 = Math.max(0, Math.floor(d.sy - r - 1)), y1 = Math.min(H - 1, Math.ceil(d.sy + r + 1))
    for (let py = y0; py <= y1; py++) {
      for (let px = x0; px <= x1; px++) {
        const dist = Math.hypot(px + 0.5 - d.sx, py + 0.5 - d.sy)
        const cov = Math.max(0, Math.min(1, r + 0.5 - dist))
        if (cov <= 0) continue
        const sa = a * cov
        const idx = (py * W + px) * 4
        buf[idx] = d.c[0] * sa + buf[idx] * (1 - sa)
        buf[idx + 1] = d.c[1] * sa + buf[idx + 1] * (1 - sa)
        buf[idx + 2] = d.c[2] * sa + buf[idx + 2] * (1 - sa)
      }
    }
  }
  return buf
}

async function main() {
  const rows = await loadVectors()
  const pts = pca3(rows)
  let maxAbs = 0
  for (const p of pts) maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y), Math.abs(p.z))
  const k = 0.9 / maxAbs

  const gif = GIFEncoder()
  let palette = null
  for (let f = 0; f < FRAMES; f++) {
    const yaw = 0.6 + (f / FRAMES) * Math.PI * 2
    const rgba = renderFrame(pts, yaw, k)
    if (!palette) palette = quantize(rgba, 256)
    const index = applyPalette(rgba, palette)
    gif.writeFrame(index, W, H, { palette, delay: DELAY, repeat: 0 })
  }
  gif.finish()

  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, gif.bytes())
  console.log(`Wrote ${OUT} (${(gif.bytes().length / 1024).toFixed(0)} KB, ${FRAMES} frames)`)
}

main().catch((e) => { console.error(e); process.exit(1) })
