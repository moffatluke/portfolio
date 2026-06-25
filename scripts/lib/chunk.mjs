// Split markdown into section-tagged chunks no larger than maxChars.
//
// Each chunk's content is prefixed with a contextual header ("<Doc Title> —
// <Section>") before it gets embedded. Without this, a chunk like the body of
// "## Startup Idea Validator" never contains the words "project" or its own
// name, so it scores poorly against a question like "list his projects". The
// header injects that topical context into both the embedding and the text the
// model sees. (This is the standard "contextual chunk header" RAG technique.)
export function chunkMarkdown(markdown, source, { maxChars = 800 } = {}) {
  const lines = markdown.split('\n')
  const sections = []
  let docTitle = ''
  let current = { section: 'intro', body: [] }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.*)$/)
    if (heading) {
      const level = heading[1].length
      const text = heading[2].trim()
      if (level === 1 && !docTitle) docTitle = text
      if (current.body.join('\n').trim()) sections.push(current)
      current = { section: text, body: [] }
    } else {
      current.body.push(line)
    }
  }
  if (current.body.join('\n').trim()) sections.push(current)

  // Build the "<Doc Title> — <Section>" prefix, skipping empty/duplicate parts.
  const headerFor = (section) => {
    const parts = []
    if (docTitle) parts.push(docTitle)
    if (section && section !== 'intro' && section !== docTitle) parts.push(section)
    return parts.join(' — ')
  }

  const chunks = []
  for (const { section, body } of sections) {
    const header = headerFor(section)
    const withHeader = (text) => (header ? `${header}\n\n${text}` : text)
    const paragraphs = body
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)

    let buffer = ''
    const flush = () => {
      if (buffer.trim()) {
        chunks.push({ content: withHeader(buffer.trim()), metadata: { source, section } })
      }
      buffer = ''
    }

    for (const para of paragraphs) {
      if (para.length > maxChars) {
        flush()
        chunks.push({ content: withHeader(para), metadata: { source, section } })
        continue
      }
      if ((buffer + '\n\n' + para).trim().length > maxChars) flush()
      buffer = buffer ? buffer + '\n\n' + para : para
    }
    flush()
  }
  return chunks
}
