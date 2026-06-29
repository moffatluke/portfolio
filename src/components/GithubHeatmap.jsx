import { useEffect, useState } from 'react'

export default function GithubHeatmap() {
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/github')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => alive && d.weeks && setData(d))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [])

  return (
    <a
      className="gh-card reveal"
      href="https://github.com/moffatluke"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="View Luke Moffat's GitHub profile"
    >
      <div className="gh-head">
        <span className="gh-title">GitHub activity</span>
        <span className="gh-handle">@moffatluke ↗</span>
      </div>

      {failed ? (
        <p className="gh-msg">Couldn't load activity right now — see it on GitHub.</p>
      ) : (
        <div className={`gh-grid${data ? '' : ' gh-grid-loading'}`} aria-hidden="true">
          {(data ? data.weeks : Array.from({ length: 26 }, () => Array(7).fill(null))).map((week, wi) => (
            <div className="gh-week" key={wi}>
              {week.map((day, di) => (
                <span
                  key={di}
                  className="gh-day"
                  data-level={day ? day.level : 0}
                  title={day ? `${day.count} contribution${day.count === 1 ? '' : 's'} on ${day.date}` : undefined}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {!failed && (
        <div className="gh-foot">
          <span>Last 6 months</span>
          <span className="gh-legend" aria-hidden="true">
            Less
            <span className="gh-day" data-level="0" />
            <span className="gh-day" data-level="1" />
            <span className="gh-day" data-level="2" />
            <span className="gh-day" data-level="3" />
            <span className="gh-day" data-level="4" />
            More
          </span>
        </div>
      )}
    </a>
  )
}
