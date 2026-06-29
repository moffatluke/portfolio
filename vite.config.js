import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { pathToFileURL } from 'node:url'

const CHAT_HANDLER_URL = pathToFileURL(path.resolve(__dirname, 'api/_lib/chatHandler.js')).href
const CONTACT_HANDLER_URL = pathToFileURL(path.resolve(__dirname, 'api/_lib/contactHandler.js')).href
const GITHUB_HANDLER_URL = pathToFileURL(path.resolve(__dirname, 'api/_lib/githubHandler.js')).href

// Dev-only: serve the POST /api endpoints locally using the same handlers
// Vercel uses, so they work in `npm run dev` without needing `vercel dev`.
function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const route = (req.url || '').split('?')[0]
        const send = (status, body) => {
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        }
        // GET /api/github (read-only, no body)
        if (req.method === 'GET' && route === '/api/github') {
          try {
            const { handleGithub } = await import(GITHUB_HANDLER_URL)
            const { status, body } = await handleGithub()
            return send(status, body)
          } catch (err) {
            console.error('dev /api/github error:', err)
            return send(500, { error: 'Something went wrong.' })
          }
        }
        if (req.method !== 'POST' || (route !== '/api/chat' && route !== '/api/contact')) return next()
        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const payload = JSON.parse(raw || '{}')
          const ip = String(
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
          ).split(',')[0]
          let result
          if (route === '/api/chat') {
            const { handleChat } = await import(CHAT_HANDLER_URL)
            result = await handleChat({ message: payload.message, history: payload.history, ip })
          } else {
            const { handleContact } = await import(CONTACT_HANDLER_URL)
            result = await handleContact({ ...payload, ip })
          }
          send(result.status, result.body)
        } catch (err) {
          console.error(`dev ${route} error:`, err)
          send(500, { error: 'Something went wrong.' })
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  // Load .env.local (and friends) into process.env so the dev API shim can
  // read the server-side keys. These are NOT VITE_-prefixed, so they never
  // reach the client bundle.
  const env = loadEnv(mode, process.cwd(), '')
  for (const k of ['GEMINI_API_KEY', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'RESEND_API_KEY', 'CONTACT_TO_EMAIL']) {
    if (env[k] && !process.env[k]) process.env[k] = env[k]
  }

  return {
    plugins: [react(), devApiPlugin()],
  }
})
