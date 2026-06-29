// An inline link styled in the page's accent (not default blue) that reveals a
// small preview card on hover/focus showing where it goes. The word itself is
// the link — the card is an enhancement, so a single click (or tap) navigates.
export default function PreviewLink({ href, label, sub, children }) {
  let host = href
  try {
    host = new URL(href).host.replace(/^www\./, '')
  } catch {
    /* leave href as-is if it isn't a full URL */
  }

  return (
    <span className="plink-wrap">
      <a className="plink" href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
      <span className="plink-card" aria-hidden="true">
        <span className="plink-card-title">{label}</span>
        {sub && <span className="plink-card-sub">{sub}</span>}
        <span className="plink-card-url">{host} ↗</span>
      </span>
    </span>
  )
}
