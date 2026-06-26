import { describe, it, expect } from 'vitest'
import { evaluateLimit, hashIp } from '../api/_lib/rateLimit.js'

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
