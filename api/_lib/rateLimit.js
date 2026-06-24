// Pure decision: is this request allowed given recent counts?
export function evaluateLimit({ minuteCount, dayCount }, { perMinute, perDay }) {
  if (minuteCount >= perMinute) return { allowed: false, reason: 'minute' }
  if (dayCount >= perDay) return { allowed: false, reason: 'day' }
  return { allowed: true, reason: null }
}

// Counts this IP's recent requests, evaluates, and records when allowed.
export async function checkAndRecord(supabase, ip, { perMinute, perDay }) {
  const now = Date.now()
  const minuteAgo = new Date(now - 60_000).toISOString()
  const dayAgo = new Date(now - 86_400_000).toISOString()

  const minute = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', minuteAgo)

  const day = await supabase
    .from('rate_limits')
    .select('*', { count: 'exact', head: true })
    .eq('ip', ip)
    .gte('created_at', dayAgo)

  const decision = evaluateLimit(
    { minuteCount: minute.count ?? 0, dayCount: day.count ?? 0 },
    { perMinute, perDay }
  )

  if (decision.allowed) {
    await supabase.from('rate_limits').insert({ ip })
  }
  return decision
}
