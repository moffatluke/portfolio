import { GoogleGenerativeAI } from '@google/generative-ai'

// Verified working on the Gemini free tier (2026-06). The older
// text-embedding-004 / gemini-2.0-flash are no longer free-tier.
export const EMBEDDING_MODEL = 'gemini-embedding-001'
export const GENERATION_MODEL = 'gemini-2.5-flash'
export const GENERATION_FALLBACK = 'gemini-2.5-flash-lite'
export const EMBEDDING_DIMS = 768

const TRANSIENT = [429, 500, 503]
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Lazy so process.env is read at call time (works in Vite dev + Vercel).
let _client
function client() {
  if (!_client) _client = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  return _client
}

// Retry transient Gemini errors (rate limits, overload, 5xx) with backoff.
async function withRetry(fn, tries = 3) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      if (!TRANSIENT.includes(e?.status) || i === tries - 1) throw e
      await sleep(700 * (i + 1))
    }
  }
  throw lastErr
}

// Returns a 768-dim embedding for the given text. gemini-embedding-001
// defaults to 3072 dims, so we request 768 to match the vector(768) schema.
export async function embed(text) {
  return withRetry(async () => {
    const model = client().getGenerativeModel({ model: EMBEDDING_MODEL })
    const result = await model.embedContent({
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMS,
    })
    return result.embedding.values
  })
}

async function generateWith(modelName, systemPrompt, contents) {
  const model = client().getGenerativeModel({ model: modelName, systemInstruction: systemPrompt })
  const result = await model.generateContent({ contents })
  return result.response.text()
}

// Generates an answer. Retries the primary model on transient errors, then
// falls back to a lighter model if the primary is still overloaded.
export async function generate(systemPrompt, contents) {
  try {
    return await withRetry(() => generateWith(GENERATION_MODEL, systemPrompt, contents))
  } catch (e) {
    if (!TRANSIENT.includes(e?.status)) throw e
    return withRetry(() => generateWith(GENERATION_FALLBACK, systemPrompt, contents), 2)
  }
}
