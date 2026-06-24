// Split markdown into section-tagged chunks no larger than maxChars.
export function chunkMarkdown(markdown, source, { maxChars = 800 } = {}) {
  const lines = markdown.split('\n')
  const sections = []
  let current = { section: 'intro', body: [] }

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.*)$/)
    if (heading) {
      if (current.body.join('\n').trim()) sections.push(current)
      current = { section: heading[1].trim(), body: [] }
    } else {
      current.body.push(line)
    }
  }
  if (current.body.join('\n').trim()) sections.push(current)

  const chunks = []
  for (const { section, body } of sections) {
    const paragraphs = body
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    let buffer = ''
    const flush = () => {
      if (buffer.trim()) {
        chunks.push({ content: buffer.trim(), metadata: { source, section } })
      }
      buffer = ''
    }

    for (const para of paragraphs) {
      if (para.length > maxChars) {
        flush()
        chunks.push({ content: para, metadata: { source, section } })
        continue
      }
      if ((buffer + '\n\n' + para).trim().length > maxChars) flush()
      buffer = buffer ? buffer + '\n\n' + para : para
    }
    flush()
  }
  return chunks
}
