import { GoogleGenerativeAI } from '@google/generative-ai'

// Verified working on the Gemini free tier (2026-06). The older
// text-embedding-004 / gemini-2.0-flash are no longer free-tier.
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const GENERATION_MODEL = 'gemini-2.5-flash'
export const EMBEDDING_DIMS = 768

// Lazy so process.env is read at call time (works in Vite dev + Vercel).
let _client
function client() {
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return _client
}

// Returns a 768-dim embedding for the given text. gemini-embedding-001
// defaults to 3072 dims, so we request 768 to match the vector(768) schema.
export async function embed(text) {
  const model = client().getGenerativeModel({ model: EMBEDDING_MODEL })
  const result = await model.embedContent({
    content: { parts: [{ text }] },
    outputDimensionality: EMBEDDING_DIMS,
  })
  return result.embedding.values
}

// Generates an answer given a system prompt and Gemini-format contents.
export async function generate(systemPrompt, contents) {
  const model = client().getGenerativeModel({
    model: GENERATION_MODEL,
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent({ contents })
  return result.response.text()
}
