import { createHmac } from 'node:crypto'

// One-way hash of an IP so we never store the raw address. Keyed (HMAC) with a
// server-side secret so the hashes can't be reversed with a lookup table of all
// IPs. Same IP always maps to the same hash, so rate limiting still works.
// `scope` namespaces the hash per endpoint so separate budgets (chat vs contact)
// don't count against each other while sharing one rate_limits table.
export function hashIp(ip, scope = 'global') {
  const pepper = process.env.SUPABASE_SERVICE_ROLE_KEY || 'local-dev-pepper'
  return createHmac('sha256', pepper).update(`${scope}:${String(ip)}`).digest('hex')
}

// Pure decision: is this request allowed given recent counts?
export function evaluateLimit({ minuteCount, dayCount }, { perMinute, perDay }) {
  if (minuteCount >= perMinute) return { allowed: false, reason: 'minute' }
  if (dayCount >= perDay) return { allowed: false, reason: 'day' }
  return { allowed: true, reason: null }
}

// Counts this IP's recent requests, evaluates, and records when allowed.
export async function checkAndRecord(supabase, ip, { perMinute, perDay }, scope = 'global') {
  const ipHash = hashIp(ip, scope)
  const now = Date.now()
  const minuteAgo = new Date(now - 60_000).toISOString()
  const dayAgo = new Date(now - 86_400_000).toISOString()

  const minute = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ipHash)
    .gte('created_at', minuteAgo)

  const day = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ipHash)
    .gte('created_at', dayAgo)

  const decision = evaluateLimit(
    { minuteCount: minute.count ?? 0, dayCount: day.count ?? 0 },
    { perMinute, perDay }
  )

  if (decision.allowed) {
    await supabase.from('rate_limits').insert({ ip: ipHash })
  }
  return decision
}
