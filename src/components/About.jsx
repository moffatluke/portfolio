import GithubHeatmap from './GithubHeatmap'
import PreviewLink from './PreviewLink'

export default function About() {
  return (
    <section id="about">
      <div className="about-grid">
        <div className="about-left">
          <h2 className="reveal">Software that's useful, not just impressive.</h2>
          <GithubHeatmap />
        </div>
        <div className="about-body">
          <p className="reveal">
            I'm a CS student at BYU-Idaho building full-stack web apps with Python, Django,
            Flask, TypeScript, and React. I care about clean code and shipping things that
            actually work, not prototypes that only look good in a demo.
          </p>
          <p className="reveal">
            I've gotten really good at working with AI: integrating LLM APIs, building MCP
            servers, and using tools like Claude to move faster and build smarter. AI isn't
            just something I use. It's something I build with and build for.
          </p>
          <p className="reveal">
            I'm part of{' '}
            <PreviewLink href="https://web.sandbox.ing/" label="Sandbox" sub="Student startup accelerator">
              Sandbox
            </PreviewLink>
            , BYU-Idaho's startup accelerator, and I'm always looking for problems worth solving.
          </p>
        </div>
      </div>
    </section>
  )
}
