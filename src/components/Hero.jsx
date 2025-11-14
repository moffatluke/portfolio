import './Hero.css'

function Hero() {
  const scrollToProjects = (e) => {
    e.preventDefault()
    document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section id="home" className="hero">
      <h1>Luke Moffat</h1>
      <p className="tagline">Full-Stack Developer | Game Developer | Security Enthusiast</p>
      <p className="subtitle">Creating robust software solutions from web apps to game engines</p>
      <a href="#projects" className="cta-button" onClick={scrollToProjects}>
        View My Work
      </a>
    </section>
  )
}

export default Hero
