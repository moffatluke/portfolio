import { describe, it, expect } from 'vitest'
import { evaluateLimit, hashIp, checkAndRecord } from '../api/_lib/rateLimit.js'
import { fakeSupabase } from './helpers/fakeSupabase.js'

const limits = { perMinute: 8, perDay: 40 }

describe('hashIp', () => {
  it('never returns the raw IP', () => {
    expect(hashIp('203.0.113.7')).not.toContain('203.0.113.7')
  })
  it('is deterministic for the same IP', () => {
    expect(hashIp('203.0.113.7')).toBe(hashIp('203.0.113.7'))
  })
  it('differs for different IPs', () => {
    expect(hashIp('203.0.113.7')).not.toBe(hashIp('203.0.113.8'))
  })
  it('namespaces the same IP per scope so endpoints get separate budgets', () => {
    expect(hashIp('203.0.113.7', 'chat')).not.toBe(hashIp('203.0.113.7', 'contact'))
  })
})

describe('evaluateLimit', () => {
  it('allows when under both limits', () => {
    expect(evaluateLimit({ minuteCount: 2, dayCount: 5 }, limits)).toEqual({ allowed: true, reason: null })
  })
  it('blocks on the minute limit', () => {
    expect(evaluateLimit({ minuteCount: 8, dayCount: 10 }, limits)).toEqual({ allowed: false, reason: 'minute' })
  })
  it('blocks on the day limit', () => {
    expect(evaluateLimit({ minuteCount: 1, dayCount: 40 }, limits)).toEqual({ allowed: false, reason: 'day' })
  })
})

describe('checkAndRecord', () => {
  it('allows a request under the limit and records it', async () => {
    const db = fakeSupabase()
    const decision = await checkAndRecord(db, '1.1.1.1', { perMinute: 8, perDay: 40 }, 'chat')
    expect(decision).toEqual({ allowed: true, reason: null })
    expect(db.tables.rate_limits).toHaveLength(1)
  })

  it('blocks once the per-minute cap is reached and stops recording', async () => {
    const db = fakeSupabase()
    const limit = { perMinute: 3, perDay: 100 }
    for (let i = 0; i < 3; i++) {
      expect((await checkAndRecord(db, '1.1.1.1', limit, 'chat')).allowed).toBe(true)
    }
    const blocked = await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    expect(blocked).toEqual({ allowed: false, reason: 'minute' })
    expect(db.tables.rate_limits).toHaveLength(3) // the blocked request is not recorded
  })

  it('blocks on the per-day cap even when under the per-minute cap', async () => {
    const db = fakeSupabase()
    const limit = { perMinute: 100, perDay: 2 }
    await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    const blocked = await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    expect(blocked).toEqual({ allowed: false, reason: 'day' })
  })

  it('counts each IP independently', async () => {
    const db = fakeSupabase()
    const limit = { perMinute: 1, perDay: 10 }
    expect((await checkAndRecord(db, '1.1.1.1', limit, 'chat')).allowed).toBe(true)
    expect((await checkAndRecord(db, '1.1.1.1', limit, 'chat')).allowed).toBe(false) // same IP, now over
    expect((await checkAndRecord(db, '2.2.2.2', limit, 'chat')).allowed).toBe(true) // different IP, fresh budget
  })

  it('keeps scopes isolated so chat traffic never blocks the contact form', async () => {
    const db = fakeSupabase()
    const limit = { perMinute: 2, perDay: 10 }
    // Fill the chat budget for this IP.
    await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    await checkAndRecord(db, '1.1.1.1', limit, 'chat')
    expect((await checkAndRecord(db, '1.1.1.1', limit, 'chat')).allowed).toBe(false) // chat is now capped

    // The same IP can still reach the contact endpoint — separate budget.
    expect((await checkAndRecord(db, '1.1.1.1', limit, 'contact')).allowed).toBe(true)
  })
})
