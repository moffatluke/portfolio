import { useEffect, useRef, useState } from 'react'

const INTRO = "Hi, I'm Luke's AI. Ask me anything about his projects, skills, or what he's looking for, and I'll answer on his behalf."
const SUGGESTIONS = ["What's he best at?", 'Is he open to internships?', 'Tell me about a project']

export default function AiChat() {
  const [messages, setMessages] = useState([{ role: 'bot', text: INTRO }])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [showSuggest, setShowSuggest] = useState(true)
  const threadRef = useRef(null)

  useEffect(() => {
    const el = threadRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  const ask = async (question) => {
    const q = question.trim()
    if (busy || !q) return
    setBusy(true)
    setInput('')
    setShowSuggest(false)
    const history = messages.map((m) => ({
      role: m.role === 'bot' ? 'assistant' : 'user',
      content: m.text,
    }))
    setMessages((m) => [...m, { role: 'user', text: q }])
    let answer
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: q, history }),
      })
      const data = await res.json()
      answer = res.ok ? data.answer : data.error || 'Something went wrong.'
    } catch {
      answer = "Hmm, I couldn't reach Luke's AI right now. Try the \"Send a message\" button instead."
    }
    setMessages((m) => [...m, { role: 'bot', text: answer }])
    setBusy(false)
  }

  const onSubmit = (e) => {
    e.preventDefault()
    ask(input)
  }

  return (
    <div className="ai-chat reveal" id="ai-chat">
      <div className="ai-chat-head">
        <div className="ai-chat-avatar" aria-hidden="true">LM</div>
        <div className="ai-chat-id">
          <p className="ai-chat-name">Ask my AI</p>
          <p className="ai-chat-status"><span className="ai-dot" />Trained on Luke's work &amp; experience</p>
        </div>
      </div>

      <div className="ai-chat-thread" ref={threadRef} aria-live="polite">
        {messages.map((m, i) => (
          <div key={i} className={`ai-msg ai-msg-${m.role}`}>
            <p>{m.text}</p>
          </div>
        ))}
        {busy && (
          <div className="ai-msg ai-msg-bot ai-msg-typing">
            <span /><span /><span />
          </div>
        )}
      </div>

      {showSuggest && (
        <div className="ai-chat-suggest">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="ai-chip" onClick={() => ask(s)}>{s}</button>
          ))}
        </div>
      )}

      <form className="ai-chat-input" onSubmit={onSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          autoComplete="off"
          placeholder="Ask about Luke…"
          aria-label="Ask Luke's AI a question"
        />
        <button type="submit" className="ai-chat-send" aria-label="Send" disabled={busy}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
      </form>
    </div>
  )
}
