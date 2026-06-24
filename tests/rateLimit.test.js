import { describe, it, expect } from 'vitest'
import { evaluateLimit } from '../api/_lib/rateLimit.js'

const limits = { perMinute: 8, perDay: 40 }

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
