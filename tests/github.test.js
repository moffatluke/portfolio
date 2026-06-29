import { describe, it, expect, vi, afterEach } from 'vitest'
import { handleGithub } from '../api/_lib/githubHandler.js'

const day = (date, count = 0, level = 0) => ({ date, count, level })
const stubFetch = (impl) => vi.stubGlobal('fetch', vi.fn(impl))
const ok = (contributions) => async () => ({ ok: true, json: async () => ({ contributions }) })

afterEach(() => vi.unstubAllGlobals())

describe('handleGithub', () => {
  it('returns weeks of exactly 7 days on success', async () => {
    const contributions = Array.from({ length: 40 }, (_, i) =>
      day(`2026-01-${String(i + 1).padStart(2, '0')}`, i % 5, i % 5)
    )
    stubFetch(ok(contributions))
    const res = await handleGithub()
    expect(res.status).toBe(200)
    expect(res.body.username).toBe('moffatluke')
    expect(res.body.weeks.length).toBeGreaterThan(0)
    expect(res.body.weeks.every((w) => w.length === 7)).toBe(true)
  })

  it('pads the first week so day one lands on its real weekday', async () => {
    const start = '2026-01-08' // a Thursday (getUTCDay === 4)
    const contributions = Array.from({ length: 7 }, (_, i) =>
      day(`2026-01-${String(8 + i).padStart(2, '0')}`, 1, 1)
    )
    stubFetch(ok(contributions))
    const res = await handleGithub()
    const firstDow = new Date(start + 'T00:00:00Z').getUTCDay()
    const week0 = res.body.weeks[0]
    expect(week0.slice(0, firstDow).every((c) => c === null)).toBe(true)
    expect(week0[firstDow]).toMatchObject({ date: start })
  })

  it('caps the output at 26 weeks (~6 months)', async () => {
    const contributions = Array.from({ length: 365 }, (_, i) => {
      const d = new Date(Date.UTC(2025, 6, 1) + i * 86_400_000)
      return day(d.toISOString().slice(0, 10), 1, 1)
    })
    stubFetch(ok(contributions))
    const res = await handleGithub()
    expect(res.body.weeks.length).toBeLessThanOrEqual(26)
  })

  it('returns 502 when the upstream API responds with an error', async () => {
    stubFetch(async () => ({ ok: false, json: async () => ({}) }))
    const res = await handleGithub()
    expect(res.status).toBe(502)
  })

  it('returns 502 when the fetch throws', async () => {
    stubFetch(async () => {
      throw new Error('network down')
    })
    const res = await handleGithub()
    expect(res.status).toBe(502)
  })
})
