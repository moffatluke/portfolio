import { useState, useEffect } from 'react'
import './Navbar.css'

function Navbar() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToSection = (e, id) => {
    e.preventDefault()
    const element = document.getElementById(id)
    element?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <ul>
        <li><a href="#home" onClick={(e) => scrollToSection(e, 'home')}>Home</a></li>
        <li><a href="#about" onClick={(e) => scrollToSection(e, 'about')}>About</a></li>
        <li><a href="#skills" onClick={(e) => scrollToSection(e, 'skills')}>Skills</a></li>
        <li><a href="#projects" onClick={(e) => scrollToSection(e, 'projects')}>Projects</a></li>
        <li><a href="#contact" onClick={(e) => scrollToSection(e, 'contact')}>Contact</a></li>
      </ul>
    </nav>
  )
}

export default Navbar
