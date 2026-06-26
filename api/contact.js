import { handleContact } from './_lib/contactHandler.js'

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for']
  return (Array.isArray(fwd) ? fwd[0] : fwd || '').split(',')[0].trim() || 'unknown'
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { name, email, message } = req.body || {}
    const { status, body } = await handleContact({ name, email, message, ip: clientIp(req) })
    return res.status(status).json(body)
  } catch (err) {
    console.error('contact error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
