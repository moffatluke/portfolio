// Fetches a year of GitHub contribution data and groups it into weeks for the
// heatmap. Uses a public, no-auth contributions API so there's no token to
// manage; routing it through our own function keeps the data source swappable.
const USERNAME = process.env.GITHUB_USERNAME || 'moffatluke'
const source = (u) => `https://github-contributions-api.jogruber.de/v4/${u}?y=last`
const WEEKS_SHOWN = 26 // most recent ~6 months

// GitHub's graph is a grid of week-columns (Sun–Sat rows). Pad the first column
// so day one lands on its real weekday, and the last so every week has 7 cells.
function groupIntoWeeks(days) {
  if (!days.length) return []
  const firstDow = new Date(days[0].date + 'T00:00:00Z').getUTCDay()
  const cells = [...Array(firstDow).fill(null), ...days]
  while (cells.length % 7 !== 0) cells.push(null)
  const weeks = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export async function handleGithub() {
  try {
    const res = await fetch(source(USERNAME), { headers: { 'User-Agent': 'portfolio-site' } })
    if (!res.ok) return { status: 502, body: { error: 'Could not load GitHub activity.' } }
    const data = await res.json()
    const days = data.contributions || []
    const weeks = groupIntoWeeks(days).slice(-WEEKS_SHOWN)
    return { status: 200, body: { username: USERNAME, weeks } }
  } catch (e) {
    console.error('github fetch error:', e)
    return { status: 502, body: { error: 'Could not load GitHub activity.' } }
  }
}
