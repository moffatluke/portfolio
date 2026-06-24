import { describe, it, expect } from 'vitest'
import { chunkMarkdown } from '../scripts/lib/chunk.mjs'

const md = `# Bio
Luke is a developer.

## Education
He attends BYU-Idaho.

## Skills
SQL and JavaScript.`

describe('chunkMarkdown', () => {
  it('tags chunks with their section heading', () => {
    const sections = chunkMarkdown(md, 'bio.md').map((c) => c.metadata.section)
    expect(sections).toContain('Education')
    expect(sections).toContain('Skills')
  })

  it('sets source on every chunk', () => {
    const chunks = chunkMarkdown(md, 'bio.md')
    expect(chunks.every((c) => c.metadata.source === 'bio.md')).toBe(true)
  })

  it('keeps chunks within maxChars by splitting long sections', () => {
    const para = 'word '.repeat(60).trim() // ~300 chars
    const long = `## Long\n${para}\n\n${para}\n\n${para}`
    const chunks = chunkMarkdown(long, 'x.md', { maxChars: 350 })
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.every((c) => c.content.length <= 350)).toBe(true)
  })

  it('produces no empty chunks', () => {
    const chunks = chunkMarkdown(md, 'bio.md')
    expect(chunks.every((c) => c.content.trim().length > 0)).toBe(true)
  })
})
