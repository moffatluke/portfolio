import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { pathToFileURL } from 'node:url'

const HANDLER_URL = pathToFileURL(path.resolve(__dirname, 'api/_lib/chatHandler.js')).href

// Dev-only: serve POST /api/chat locally using the same handler Vercel uses,
// so the chat works in `npm run dev` without needing `vercel dev`.
function devApiPlugin() {
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/chat' || req.method !== 'POST') return next()
        try {
          let raw = ''
          for await (const chunk of req) raw += chunk
          const { message, history } = JSON.parse(raw || '{}')
          const ip = String(
            req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'local'
          ).split(',')[0]
          const { handleChat } = await import(HANDLER_URL)
          const { status, body } = await handleChat({ message, history, ip })
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(body))
        } catch (err) {
          console.error('dev /api/chat error:', err)
          res.statusCode = 500
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({ error: 'Something went wrong.' }))
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
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
