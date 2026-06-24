import { useEffect, useRef } from 'react'
import lukeHero from '../assets/luke-hero.jpg'

const TAGLINE = 'I build full-stack web apps and AI tools, and ship them.'

export default function Hero() {
  const twRef = useRef(null)
  const cursorRef = useRef(null)

  useEffect(() => {
    const tw = twRef.current
    const cursor = cursorRef.current
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      if (tw) tw.textContent = TAGLINE
      cursor?.classList.add('done')
      return
    }
    let i = 0
    let timer
    const type = () => {
      if (!tw) return
      if (i <= TAGLINE.length) {
        tw.textContent = TAGLINE.slice(0, i)
        i++
        timer = setTimeout(type, 28)
      } else {
        cursor?.classList.add('done')
      }
    }
    timer = setTimeout(type, 700)
    return () => clearTimeout(timer)
  }, [])

  return (
    <section id="home" className="hero">
      <div className="hero-inner">
        <div className="hero-text">
          <h1>
            <span className="word"><span>Luke</span></span>
            <span className="word"><span>Moffat</span></span>
          </h1>
          <p className="tagline">
            <span ref={twRef} />
            <span className="cursor" ref={cursorRef} />
          </p>
          <p className="subtitle">
            CS student at BYU-Idaho. Part of Sandbox, the university's startup accelerator.
          </p>
          <div className="hero-actions">
            <a href="#projects" className="cta-button">View My Work</a>
            <a
              href="https://github.com/moffatluke"
              className="ghost-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub ↗
            </a>
          </div>
        </div>
        <div className="hero-photo">
          <img src={lukeHero} alt="Luke Moffat, smiling, in a white polo by a lake" />
        </div>
      </div>
    </section>
  )
}
