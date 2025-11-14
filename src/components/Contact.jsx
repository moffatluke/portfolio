import './Contact.css'

function Contact() {
  return (
    <section id="contact">
      <div className="contact">
        <h2>Let's Connect</h2>
        <p>
          I'm always interested in new challenges and opportunities. Feel free to get in touch 
          to discuss collaborations, projects, or just to connect.
        </p>
        <div className="contact-links">
          <a href="mailto:your.email@example.com" className="contact-link">Email</a>
          <a href="https://github.com/moffatluke" className="contact-link" target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href="https://linkedin.com/in/yourprofile" className="contact-link" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      </div>
    </section>
  )
}

export default Contact
