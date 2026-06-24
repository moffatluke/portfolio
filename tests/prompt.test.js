import { describe, it, expect } from 'vitest'
import { buildSystemPrompt, buildContents } from '../api/_lib/prompt.js'

describe('buildSystemPrompt', () => {
  it('embeds the retrieved context', () => {
    expect(buildSystemPrompt([{ content: 'Luke attends BYU-Idaho.' }])).toContain('BYU-Idaho')
  })
  it('instructs the model to stay within context', () => {
    expect(buildSystemPrompt([]).toLowerCase()).toContain('context')
  })
})

describe('buildContents', () => {
  it('appends the question last as a user turn', () => {
    expect(buildContents([], 'Hi').at(-1)).toEqual({ role: 'user', parts: [{ text: 'Hi' }] })
  })
  it('maps assistant role to model', () => {
    expect(buildContents([{ role: 'assistant', content: 'Hello' }], 'Q')[0].role).toBe('model')
  })
  it('caps history to the last 6 messages', () => {
    const hist = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: `m${i}` }))
    expect(buildContents(hist, 'Q')).toHaveLength(7) // 6 history + question
  })
})
