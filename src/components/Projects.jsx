import './Projects.css'

function Projects() {
  const projects = [
    {
      title: 'BYU-I Student App',
      description: 'A mobile application designed to improve campus life for BYU-Idaho students by centralizing essential resources and information.',
      features: [
        'Real-time notifications for campus events',
        'Streamlined access to course schedules',
        'Intuitive mobile-first interface',
        'Backend API for data management'
      ],
      technologies: ['React Native', 'Node.js', 'Express', 'MongoDB']
    },
    {
      title: 'Zelda-Style Adventure Game',
      description: 'A 2D action-adventure game built from scratch with custom game engine components and classic dungeon-crawler mechanics.',
      features: [
        'Custom 2D rendering engine',
        'Physics-based collision detection',
        'Enemy AI with pathfinding',
        'Inventory and puzzle mechanics'
      ],
      technologies: ['C++', 'SDL2', 'Game Engine']
    },
    {
      title: 'Arduino Robotics Builds',
      description: 'Collection of embedded systems projects featuring sensor integration, motor control, and autonomous navigation.',
      features: [
        'Line-following robot with PID control',
        'Obstacle detection systems',
        'Bluetooth-controlled car',
        'Custom circuit design'
      ],
      technologies: ['Arduino', 'C++', 'Sensors', 'Bluetooth']
    },
    {
      title: 'Gym Tracker Database',
      description: 'A comprehensive SQL database application for tracking workout routines, progress metrics, and fitness goals.',
      features: [
        'Normalized database schema',
        'Complex analytics queries',
        'RESTful API integration',
        'Progress visualization'
      ],
      technologies: ['MySQL', 'Node.js', 'Express']
    },
    {
      title: 'OWASP Juice Shop Security Assessment',
      description: 'Comprehensive security testing project identifying and exploiting common web vulnerabilities.',
      features: [
        'OWASP Top 10 vulnerability testing',
        'Manual penetration testing',
        'Detailed vulnerability reports',
        'Remediation recommendations'
      ],
      technologies: ['Burp Suite', 'OWASP ZAP', 'Security Testing']
    }
  ]

  return (
    <section id="projects">
      <h2>Selected Work</h2>
      <div className="projects-grid">
        {projects.map((project) => (
          <div key={project.title} className="project-card">
            <h3>{project.title}</h3>
            <p>{project.description}</p>
            <h4>Key Features:</h4>
            <ul>
              {project.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <div className="tech-tags">
              {project.technologies.map((tech) => (
                <span key={tech} className="tech-tag">{tech}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default Projects
