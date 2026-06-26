import { describe, it, expect } from 'vitest'
import { validateContact } from '../api/_lib/contactHandler.js'

describe('validateContact', () => {
  it('accepts a well-formed submission and trims values', () => {
    const r = validateContact({ name: '  Jane  ', email: ' jane@acme.com ', message: ' Hello ' })
    expect(r.ok).toBe(true)
    expect(r.value).toEqual({ name: 'Jane', email: 'jane@acme.com', message: 'Hello' })
  })

  it('rejects missing fields', () => {
    expect(validateContact({ name: '', email: 'a@b.co', message: 'hi' }).ok).toBe(false)
    expect(validateContact({ name: 'A', email: '', message: 'hi' }).ok).toBe(false)
    expect(validateContact({ name: 'A', email: 'a@b.co', message: '   ' }).ok).toBe(false)
  })

  it('rejects an invalid email', () => {
    expect(validateContact({ name: 'A', email: 'not-an-email', message: 'hi' }).ok).toBe(false)
    expect(validateContact({ name: 'A', email: 'a@b', message: 'hi' }).ok).toBe(false)
  })

  it('rejects fields that are too long', () => {
    expect(validateContact({ name: 'x'.repeat(101), email: 'a@b.co', message: 'hi' }).ok).toBe(false)
    expect(validateContact({ name: 'A', email: 'a@b.co', message: 'x'.repeat(2001) }).ok).toBe(false)
  })
})
