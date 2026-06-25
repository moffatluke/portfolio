import { serverClient } from './supabase.js'
import { embed, generate } from './gemini.js'
import { retrieve } from './retrieval.js'
import { checkAndRecord } from './rateLimit.js'
import { buildSystemPrompt, buildContents } from './prompt.js'

const MAX_MESSAGE_LEN = 1000
const MATCH_COUNT = 8
const LIMITS = { perMinute: 8, perDay: 40 }

// Core RAG logic shared by the Vercel function and the Vite dev shim.
// Returns { status, body } so each transport can send it however it likes.
export async function handleChat({ message, history, ip }) {
  if (typeof message !== 'string' || !message.trim()) {
    return { status: 400, body: { error: 'message is required' } }
  }
  if (message.length > MAX_MESSAGE_LEN) {
    return { status: 400, body: { error: 'message too long' } }
  }

  const supabase = serverClient()

  const decision = await checkAndRecord(supabase, ip || 'unknown', LIMITS)
  if (!decision.allowed) {
    return {
      status: 429,
      body: {
        error:
          'You’ve reached the chat limit for now. Please use the "Send a message" button to reach Luke directly.',
      },
    }
  }

  const queryEmbedding = await embed(message)
  const chunks = await retrieve(supabase, queryEmbedding, MATCH_COUNT)
  const systemPrompt = buildSystemPrompt(chunks)
  const contents = buildContents(history, message)
  const answer = await generate(systemPrompt, contents)

  return { status: 200, body: { answer } }
}
