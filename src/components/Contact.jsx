import { useState } from 'react'
import AiChat from './AiChat'
import ContactModal from './ContactModal'

export default function Contact() {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <section id="contact">
      <div className="contact-layout">
        <div className="contact">
          <h2 className="reveal">Let's build something.</h2>
          <p className="contact-lede reveal">
            Open to internships, part-time roles, and interesting projects. Send me a
            message and I'll get back to you fast.
          </p>
          <div className="contact-cta reveal">
            <button type="button" className="form-submit" onClick={() => setModalOpen(true)}>
              Send a message
            </button>
          </div>
          <div className="contact-links reveal">
            <a href="https://github.com/moffatluke" target="_blank" rel="noopener noreferrer">GitHub ↗</a>
            <a href="https://www.linkedin.com/in/luke-moffat-465379262" target="_blank" rel="noopener noreferrer">LinkedIn ↗</a>
          </div>
        </div>

        <AiChat />
      </div>

      <ContactModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </section>
  )
}
