import { describe, it, expect, vi, beforeEach } from 'vitest'

// Stub the database, Gemini, and retrieval modules so handleChat's wiring can be
// tested without any network calls.
const mocks = vi.hoisted(() => ({ supabase: null, embed: null, retrieve: null, generate: null }))
vi.mock('../api/_lib/supabase.js', () => ({ serverClient: () => mocks.supabase }))
vi.mock('../api/_lib/gemini.js', () => ({
  embed: (...a) => mocks.embed(...a),
  generate: (...a) => mocks.generate(...a),
}))
vi.mock('../api/_lib/retrieval.js', () => ({ retrieve: (...a) => mocks.retrieve(...a) }))

import { handleChat } from '../api/_lib/chatHandler.js'
import { fakeSupabase } from './helpers/fakeSupabase.js'

beforeEach(() => {
  mocks.supabase = fakeSupabase()
  mocks.embed = vi.fn().mockResolvedValue(new Array(768).fill(0))
  mocks.retrieve = vi.fn().mockResolvedValue([{ content: 'Luke studies CS at BYU-Idaho.' }])
  mocks.generate = vi.fn().mockResolvedValue('Luke is a CS student at BYU-Idaho.')
})

describe('handleChat', () => {
  it('rejects an empty message with 400 before calling Gemini', async () => {
    const res = await handleChat({ message: '   ', history: [], ip: '1.2.3.4' })
    expect(res.status).toBe(400)
    expect(mocks.embed).not.toHaveBeenCalled()
  })

  it('rejects an over-long message with 400', async () => {
    const res = await handleChat({ message: 'x'.repeat(1001), history: [], ip: '1.2.3.4' })
    expect(res.status).toBe(400)
    expect(mocks.embed).not.toHaveBeenCalled()
  })

  it('embeds, retrieves, and generates an answer on the happy path', async () => {
    const res = await handleChat({ message: 'Where does Luke study?', history: [], ip: '1.2.3.4' })
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ answer: 'Luke is a CS student at BYU-Idaho.' })
    expect(mocks.embed).toHaveBeenCalledTimes(1)
    expect(mocks.retrieve).toHaveBeenCalledTimes(1)
    expect(mocks.generate).toHaveBeenCalledTimes(1)
  })

  it('rate-limits after the per-minute cap (8/min)', async () => {
    for (let i = 0; i < 8; i++) {
      expect((await handleChat({ message: 'hi', history: [], ip: '9.9.9.9' })).status).toBe(200)
    }
    const res = await handleChat({ message: 'hi', history: [], ip: '9.9.9.9' })
    expect(res.status).toBe(429)
  })
})
