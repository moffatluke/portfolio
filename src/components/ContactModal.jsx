import { useEffect, useRef, useState } from 'react'

export default function ContactModal({ open, onClose }) {
  const dialogRef = useRef(null)
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [done, setDone] = useState(false)

  // Sync the native <dialog> with the `open` prop.
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  // Reset to a fresh form shortly after closing.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => {
        setDone(false)
        setForm({ name: '', email: '', message: '' })
      }, 200)
      return () => clearTimeout(t)
    }
  }, [open])

  const update = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const onSubmit = (e) => {
    e.preventDefault()
    // Task 8 wires this to POST /api/contact (save to Supabase + email via Resend).
    setDone(true)
    setTimeout(onClose, 2200)
  }

  return (
    <dialog
      className="contact-modal"
      ref={dialogRef}
      aria-labelledby="contact-modal-title"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose() }}
    >
      <div className="contact-modal-card">
        <button type="button" className="contact-modal-close" aria-label="Close" onClick={onClose}>×</button>
        {done ? (
          <div className="contact-modal-done">
            <span className="mark" aria-hidden="true">✓</span>
            <h3>Message sent.</h3>
            <p>Thanks for reaching out. I'll reply soon.</p>
          </div>
        ) : (
          <>
            <h3 id="contact-modal-title">Send a message</h3>
            <p className="contact-modal-sub">Tell me about the role or project, I'll reply fast.</p>
            <form className="contact-form" onSubmit={onSubmit}>
              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="name">Name</label>
                  <input id="name" name="name" type="text" placeholder="Jane Smith" value={form.name} onChange={update} required />
                </div>
                <div className="form-field">
                  <label htmlFor="email">Email</label>
                  <input id="email" name="email" type="email" placeholder="jane@company.com" value={form.email} onChange={update} required />
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" rows="5" placeholder="Tell me about the role or project…" value={form.message} onChange={update} required />
              </div>
              <button type="submit" className="form-submit">Send message</button>
            </form>
          </>
        )}
      </div>
    </dialog>
  )
}
