import { Resend } from 'resend'

// Escape user-supplied text before putting it in the HTML email body.
const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ))

// Lazy so process.env is read at call time (works in Vite dev + Vercel).
let _resend
function client() {
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

// Sends the contact-form submission to CONTACT_TO_EMAIL. Uses Resend's shared
// onboarding sender so it works without a verified domain; replyTo is set to
// the visitor so a reply goes straight back to them.
export async function sendContactEmail({ name, email, message }) {
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')
  const html = `
    <div style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1a1a1a;">
      <h2 style="margin: 0 0 12px; font-size: 18px;">New portfolio message</h2>
      <p style="margin: 0 0 4px;"><strong>From:</strong> ${safeName} &lt;${safeEmail}&gt;</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 16px 0;" />
      <p style="margin: 0; white-space: pre-wrap;">${safeMessage}</p>
    </div>`

  return client().emails.send({
    from: 'Portfolio Contact <onboarding@resend.dev>',
    to: process.env.CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `Portfolio message from ${String(name).replace(/[\r\n]/g, ' ')}`,
    html,
  })
}
