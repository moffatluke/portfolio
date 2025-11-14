import './Skills.css'

function Skills() {
  const skillCategories = [
    {
      title: 'Languages',
      skills: [
        'JavaScript/TypeScript',
        'Python',
        'C++',
        'C#',
        'SQL',
        'HTML/CSS'
      ]
    },
    {
      title: 'Web Development',
      skills: [
        'React',
        'Node.js',
        'Express',
        'RESTful APIs',
        'Responsive Design'
      ]
    },
    {
      title: 'Game & Systems',
      skills: [
        'Unity',
        'Custom Game Engines',
        'Arduino',
        'Embedded Systems',
        'Robotics'
      ]
    },
    {
      title: 'Database & Security',
      skills: [
        'MySQL/PostgreSQL',
        'Database Design',
        'Penetration Testing',
        'OWASP Top 10',
        'Vulnerability Assessment'
      ]
    }
  ]

  return (
    <section id="skills">
      <h2>Technical Expertise</h2>
      <div className="skills-grid">
        {skillCategories.map((category) => (
          <div key={category.title} className="skill-category">
            <h3>{category.title}</h3>
            <ul>
              {category.skills.map((skill) => (
                <li key={skill}>{skill}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Skills
