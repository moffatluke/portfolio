import { serverClient } from './supabase.js'
import { checkAndRecord } from './rateLimit.js'
import { sendContactEmail } from './email.js'

const LIMITS = { perMinute: 3, perDay: 15 }
const MAX = { name: 100, email: 200, message: 2000 }
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Pure validation so it can be unit-tested without a database or network.
// Returns trimmed values on success, or a user-facing error message.
export function validateContact({ name, email, message }) {
  const n = (name || '').trim()
  const e = (email || '').trim()
  const m = (message || '').trim()
  if (!n || !e || !m) return { ok: false, error: 'Please fill in every field.' }
  if (n.length > MAX.name || e.length > MAX.email || m.length > MAX.message)
    return { ok: false, error: 'One of your fields is a little too long.' }
  if (!EMAIL_RE.test(e)) return { ok: false, error: 'That email address looks invalid.' }
  return { ok: true, value: { name: n, email: e, message: m } }
}

// Core contact logic shared by the Vercel function and the Vite dev shim.
// Returns { status, body } so each transport can send it however it likes.
export async function handleContact({ name, email, message, ip }) {
  const check = validateContact({ name, email, message })
  if (!check.ok) return { status: 400, body: { error: check.error } }

  const supabase = serverClient()
  const decision = await checkAndRecord(supabase, ip, LIMITS, 'contact')
  if (!decision.allowed) {
    return { status: 429, body: { error: "You've sent a few messages already — please try again later." } }
  }

  // Save first: the database is the source of truth, so a message is never
  // lost even if the email send fails.
  const { error: dbError } = await supabase.from('messages').insert(check.value)
  if (dbError) {
    console.error('contact db error:', dbError)
    return { status: 500, body: { error: 'Could not save your message. Please try again.' } }
  }

  // Email is best-effort — the submission is already safely stored.
  try {
    await sendContactEmail(check.value)
  } catch (e) {
    console.error('contact email error:', e)
  }

  return { status: 200, body: { ok: true } }
}
