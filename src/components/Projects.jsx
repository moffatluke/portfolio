const PROJECTS = [
  {
    title: 'Startup Idea Validator',
    featured: true,
    description:
      'AI-powered web app that turns a rough startup idea into an investor-style breakdown in seconds: problem validation, market assessment, competitors, key risks, and a clear go/no-go verdict. Input validation with gibberish detection keeps the model honest; analyses persist to a browsable history.',
    technologies: ['Django', 'Python', 'NVIDIA LLM API', 'SQLite'],
    url: 'https://github.com/moffatluke/startup-idea-validator',
  },
  {
    title: 'Cowork Student Toolkit',
    description:
      'MCP server connecting Claude directly to Canvas LMS. Ask what assignments are due, what you’re missing, or what your grades are, with no app-hopping.',
    technologies: ['MCP', 'Node.js', 'Canvas API'],
    url: 'https://github.com/moffatluke/cowork-student-toolkit',
  },
  {
    title: 'Finance Dashboard',
    description:
      'Browser-based CRM with a sales pipeline, transaction ledger, and live summary dashboard, synced to Google Firestore.',
    technologies: ['Flask', 'Python', 'Firestore'],
    url: 'https://github.com/moffatluke/finance-dashboard',
    demo: 'https://finance-dashboard-demo-weld.vercel.app/dashboard.html',
  },
  {
    title: 'Obsidian Dev Tracker',
    description:
      'Custom Obsidian plugin rendering GitHub contribution and Claude Code session heatmaps in the sidebar.',
    technologies: ['TypeScript', 'Obsidian API', 'GitHub API'],
    url: 'https://github.com/moffatluke/obsidian-dev-tracker',
  },
  {
    title: 'Note Taker',
    description:
      'Polished command-line note app with arrow-key navigation, type-to-search, tag filtering, and local JSON storage.',
    technologies: ['TypeScript', 'Node.js', 'CLI'],
    url: 'https://github.com/moffatluke/note-taker',
  },
]

function ProjectCard({ project }) {
  return (
    <article className={`project-card reveal${project.featured ? ' featured' : ''}`}>
      <div className="project-card-head">
        <h3>
          {/* Stretched link: covers the whole card so a click anywhere opens the repo. */}
          <a className="project-card-link" href={project.url} target="_blank" rel="noopener noreferrer">
            {project.title}
          </a>
        </h3>
        <span className="project-card-arrow" aria-hidden="true">↗</span>
      </div>
      <p>{project.description}</p>
      <ul className="tech-tags">
        {project.technologies.map((tech) => (
          <li key={tech}>{tech}</li>
        ))}
      </ul>
      {project.demo && (
        <a className="project-card-demo" href={project.demo} target="_blank" rel="noopener noreferrer">
          Live demo <span aria-hidden="true">↗</span>
        </a>
      )}
    </article>
  )
}

export default function Projects() {
  return (
    <section id="projects">
      <h2 className="reveal">Selected work</h2>
      <div className="projects-grid">
        {PROJECTS.map((project) => (
          <ProjectCard key={project.title} project={project} />
        ))}
      </div>
    </section>
  )
}
