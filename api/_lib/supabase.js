import { createClient } from '@supabase/supabase-js'

// Server-side client using the service-role key. Never import this into
// frontend code — the service-role key must stay server-side.
export function serverClient() {
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })
}
