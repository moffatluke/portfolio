import { handleGithub } from './_lib/githubHandler.js'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }
  try {
    const { status, body } = await handleGithub()
    // Cache at the edge for 6h (serve stale up to a day) so we don't hammer the
    // upstream API on every page view.
    if (status === 200) {
      res.setHeader('Cache-Control', 's-maxage=21600, stale-while-revalidate=86400')
    }
    return res.status(status).json(body)
  } catch (err) {
    console.error('github error:', err)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}
