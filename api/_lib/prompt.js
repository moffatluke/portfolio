const HISTORY_LIMIT = 6

export function buildSystemPrompt(chunks) {
  const context = chunks.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
  return `You are the AI assistant on Luke Moffat's portfolio website. You answer visitors' questions about Luke (a software engineering student at BYU-Idaho).

Rules:
- Answer using ONLY the context below. Do not invent facts.
- If the context does not contain the answer, say you don't have that detail and suggest using the "Send a message" button on the site.
- Refer to Luke in the third person. Be concise, friendly, and professional.

Context:
${context || '(no context retrieved)'}`
}

export function buildContents(history, message) {
  const turns = (history || [])
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
  turns.push({ role: 'user', parts: [{ text: message }] })
  return turns
}
