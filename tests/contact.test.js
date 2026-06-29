import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub the database and email modules so handleContact can be tested end-to-end
// without a network. The factories read from `mocks` at call time, so each test
// can swap in its own fake/spy in beforeEach.
const mocks = vi.hoisted(() => ({ supabase: null, sendContactEmail: null }))
vi.mock('../api/_lib/supabase.js', () => ({ serverClient: () => mocks.supabase }))
vi.mock('../api/_lib/email.js', () => ({ sendContactEmail: (...a) => mocks.sendContactEmail(...a) }))

import { validateContact, handleContact } from '../api/_lib/contactHandler.js'
import { fakeSupabase } from './helpers/fakeSupabase.js'

const valid = { name: 'Jane', email: 'jane@acme.com', message: 'Hello there', ip: '1.2.3.4' }

beforeEach(() => {
  mocks.supabase = fakeSupabase()
  mocks.sendContactEmail = vi.fn().mockResolvedValue(undefined)
})

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

describe('handleContact', () => {
  it('rejects invalid input with 400 and never touches the database or email', async () => {
    const res = await handleContact({ name: '', email: 'nope', message: '', ip: '1.2.3.4' })
    expect(res.status).toBe(400)
    expect(mocks.supabase.tables.messages).toBeUndefined()
    expect(mocks.sendContactEmail).not.toHaveBeenCalled()
  })

  it('saves the message and emails it on success', async () => {
    const res = await handleContact(valid)
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true })
    expect(mocks.supabase.tables.messages).toHaveLength(1)
    expect(mocks.supabase.tables.messages[0]).toMatchObject({
      name: 'Jane',
      email: 'jane@acme.com',
      message: 'Hello there',
    })
    expect(mocks.sendContactEmail).toHaveBeenCalledTimes(1)
  })

  it('rate-limits after the per-minute cap (3/min) and stops saving', async () => {
    for (let i = 0; i < 3; i++) expect((await handleContact(valid)).status).toBe(200)
    const res = await handleContact(valid)
    expect(res.status).toBe(429)
    expect(mocks.supabase.tables.messages).toHaveLength(3) // the 4th was never saved
  })

  it('returns 500 and skips the email when the database save fails', async () => {
    mocks.supabase = fakeSupabase({ failInsert: ['messages'] })
    const res = await handleContact(valid)
    expect(res.status).toBe(500)
    expect(mocks.sendContactEmail).not.toHaveBeenCalled()
  })

  it('still succeeds when the email send fails (best-effort delivery)', async () => {
    mocks.sendContactEmail = vi.fn().mockRejectedValue(new Error('resend down'))
    const res = await handleContact(valid)
    expect(res.status).toBe(200)
    expect(mocks.supabase.tables.messages).toHaveLength(1) // message is stored regardless
  })
})
