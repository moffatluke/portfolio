#!/usr/bin/env node
// Link checker for the portfolio.
//
// Scans src/ for every external URL and every internal absolute link, then
// verifies each one resolves. Runs in CI (see .github/workflows/ci.yml) so a
// dead link fails the build before it ships.
//
// The classic case this catches: a project card that points at a GitHub repo
// which is still PRIVATE. A private repo returns 404 to anonymous visitors, so
// the card looks fine to you (logged in) but is broken for everyone else.
//
// Classification:
//   ok   -> status < 400
//   warn -> host blocks bots but the link is really fine (LinkedIn answers 999,
//           some hosts 403/405 an automated request). Reported, not failed.
//   fail -> 404 / 410 / 5xx / DNS or network error. Fails the build.

import { readFile, readdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SRC = path.join(root, 'src')
const PUBLIC = path.join(root, 'public')

// URLs that are namespaces / local-only and should never be network-checked.
const IGNORE = [/\bw3\.org\b/, /\blocalhost\b/, /\b127\.0\.0\.1\b/, /\bexample\.(com|org)\b/]

// Hosts/status codes where an automated request is refused but the link works
// for real humans in a browser. Treated as "unverified", not "broken".
const WARN_STATUS = new Set([401, 403, 405, 429, 999])

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) portfolio-link-check'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function walk(dir) {
  const out = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(full)))
    else if (/\.(jsx?|tsx?)$/.test(entry.name)) out.push(full)
  }
  return out
}

async function collectLinks() {
  const external = new Map() // url -> Set(files)
  const internal = new Map() // path -> Set(files)
  for (const file of await walk(SRC)) {
    const text = await readFile(file, 'utf8')
    const rel = path.relative(root, file)
    for (const m of text.matchAll(/https?:\/\/[^\s"'`)<>]+/g)) {
      const url = m[0].replace(/[.,)]+$/, '') // trim trailing sentence punctuation
      if (IGNORE.some((re) => re.test(url))) continue
      if (!external.has(url)) external.set(url, new Set())
      external.get(url).add(rel)
    }
    // Internal absolute links like href="/privacy.html" (skip #anchors).
    for (const m of text.matchAll(/href=["'](\/[^"'#][^"']*)["']/g)) {
      const p = m[1]
      if (!internal.has(p)) internal.set(p, new Set())
      internal.get(p).add(rel)
    }
  }
  return { external, internal }
}

async function fetchStatus(url) {
  // Try HEAD first (cheap); fall back to GET when a server rejects HEAD.
  for (const method of ['HEAD', 'GET']) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 20000)
    try {
      const res = await fetch(url, {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: { 'user-agent': UA, accept: '*/*' },
      })
      if (method === 'HEAD' && (res.status === 405 || res.status === 501)) continue
      return res.status
    } catch (err) {
      if (method === 'GET') throw err // HEAD failed; give GET a chance first
    } finally {
      clearTimeout(timer)
    }
  }
  return 0
}

async function checkUrl(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const status = await fetchStatus(url)
      if (status >= 500 && attempt < 3) {
        await sleep(1500 * attempt) // transient server error → back off and retry
        continue
      }
      return { status }
    } catch (err) {
      if (attempt < 3) {
        await sleep(1500 * attempt)
        continue
      }
      return { status: 0, error: err.message || String(err) }
    }
  }
  return { status: 0, error: 'unreachable' }
}

function classify(status) {
  if (status && status < 400) return 'ok'
  if (WARN_STATUS.has(status)) return 'warn'
  return 'fail'
}

// Small concurrency pool so we're polite and fast without hammering hosts.
async function pool(items, size, worker) {
  const results = []
  let i = 0
  const runners = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++
      results[idx] = await worker(items[idx], idx)
    }
  })
  await Promise.all(runners)
  return results
}

async function main() {
  const { external, internal } = await collectLinks()
  const failures = []
  const warnings = []

  // Internal links must map to a file under public/.
  for (const [p, files] of internal) {
    const target = path.join(PUBLIC, p.split(/[?#]/)[0])
    const ok = existsSync(target)
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${p}  (internal)`)
    if (!ok) failures.push({ url: p, reason: `no file at public${p}`, files })
  }

  // External links checked over the network.
  const urls = [...external.keys()].sort()
  await pool(urls, 6, async (url) => {
    const { status, error } = await checkUrl(url)
    const verdict = classify(status)
    const label = verdict === 'ok' ? 'ok  ' : verdict === 'warn' ? 'warn' : 'FAIL'
    console.log(`${label}  ${url}  (${error ? error : status})`)
    if (verdict === 'fail') failures.push({ url, reason: error || `HTTP ${status}`, files: external.get(url) })
    if (verdict === 'warn') warnings.push({ url, status })
  })

  console.log('') // spacer
  if (warnings.length) {
    console.log(`${warnings.length} link(s) could not be auto-verified (bot-blocked); assumed OK.`)
  }
  if (failures.length) {
    console.error(`\n${failures.length} broken link(s):`)
    for (const f of failures) {
      console.error(`  ✗ ${f.url} — ${f.reason}`)
      console.error(`      referenced in: ${[...f.files].join(', ')}`)
    }
    process.exit(1)
  }
  console.log('All links OK.')
}

main().catch((err) => {
  console.error('link check crashed:', err)
  process.exit(1)
})
