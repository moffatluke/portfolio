import ConstellationBg from './components/ConstellationBg'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import About from './components/About'
import Skills from './components/Skills'
import Projects from './components/Projects'
import Contact from './components/Contact'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useScrollReveal } from './hooks/useScrollReveal'

function App() {
  useScrollReveal()

  return (
    <>
      <ConstellationBg />
      <Navbar />
      <main>
        <Hero />
        <About />
        <Skills />
        <Projects />
        <Contact />
      </main>
      <footer className="footer">
        <p>© 2026 Luke Moffat</p>
        <p>
          <a href="/privacy.html">Privacy</a>
          <span aria-hidden="true" style={{ margin: '0 0.6rem', opacity: 0.5 }}>·</span>
          <a href="https://github.com/moffatluke" target="_blank" rel="noopener noreferrer">
            github.com/moffatluke
          </a>
        </p>
      </footer>
      <Analytics />
      <SpeedInsights />
    </>
  )
}

export default App
