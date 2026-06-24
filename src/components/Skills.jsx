const CATEGORIES = [
  { title: 'Languages', skills: ['Python', 'TypeScript', 'JavaScript', 'C#', 'SQL', 'HTML/CSS'] },
  { title: 'Web & Backend', skills: ['React', 'Django', 'Flask', 'Node.js', 'REST APIs', 'Google Firestore'] },
  { title: 'AI & Tooling', skills: ['LLM API Integration', 'MCP Servers', 'Claude AI', 'Prompt Engineering', 'Obsidian Plugin API'] },
  { title: 'Data & Databases', skills: ['SQLite', 'Database Design', 'Polars', 'Data Analysis'] },
]

export default function Skills() {
  return (
    <section id="skills">
      <h2 className="reveal">What I work with</h2>
      <dl className="skills-list">
        {CATEGORIES.map((cat) => (
          <div key={cat.title} className="skills-row reveal">
            <dt>{cat.title}</dt>
            <dd>{cat.skills.join(' · ')}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
