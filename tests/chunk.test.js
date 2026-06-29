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

  it('prepends a "<doc title> — <section>" contextual header to each chunk', () => {
    const edu = chunkMarkdown(md, 'bio.md').find((c) => c.metadata.section === 'Education')
    expect(edu.content.startsWith('Bio — Education')).toBe(true)
    expect(edu.content).toContain('BYU-Idaho')
  })

  it('keeps each chunk body (excluding the header) within maxChars', () => {
    const para = 'word '.repeat(60).trim() // ~299 chars
    const long = `# Doc\n\n## Long\n${para}\n\n${para}\n\n${para}`
    const chunks = chunkMarkdown(long, 'x.md', { maxChars: 350 })
    const prefix = 'Doc — Long\n\n'
    expect(chunks.length).toBeGreaterThan(1)
    for (const c of chunks) {
      expect(c.content.startsWith(prefix)).toBe(true)
      expect(c.content.slice(prefix.length).length).toBeLessThanOrEqual(350)
    }
  })

  it('produces no empty chunks', () => {
    const chunks = chunkMarkdown(md, 'bio.md')
    expect(chunks.every((c) => c.content.trim().length > 0)).toBe(true)
  })
})
