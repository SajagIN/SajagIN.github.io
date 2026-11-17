import { useState } from 'react'

export default function App() {
  const [resumeOpen, setResumeOpen] = useState(false)

  return (
    <>
      <a className="skip-link" href="#main">Skip to content</a>
      <div className="desktop">
        <p className="desktop-label">SAJAG / PORTFOLIO</p>
        <main id="main" className="window" tabIndex={-1}>
          <div className="title-bar">
            <div className="title-name"><img className="window-icon" src="./assets/favicon.ico" alt="" /> Sajag Kamthan | Portfolio</div>
            <div className="window-controls" aria-hidden="true"><span>−</span><span>□</span><span>×</span></div>
          </div>
          <nav className="menu" aria-label="Main navigation">
            <a href="#about"><span className="accelerator">A</span>bout</a>
            <a href="#resume"><span className="accelerator">R</span>ésumé</a>
            <a href="#contact"><span className="accelerator">C</span>ontact</a>
            <a href="https://github.com/SajagIN"><span className="accelerator">G</span>itHub</a>
          </nav>
          <div className="address-bar" aria-label="Website address">
            <span className="address-label">Address</span>
            <div className="address-field"><span aria-hidden="true">🌐</span> <span>sajagin.thedev.id</span></div>
          </div>
          <div className="window-body">
            <p className="eyebrow">Welcome</p>
            <div className="layout">
              <section className="panel" id="about" aria-labelledby="name">
                <h1 id="name">Sajag Kamthan</h1>
                <p className="role">Full Stack Developer &amp; Programmer</p>
                <p className="intro">I’m a full stack developer and programmer from India. I build for the web and learn by making things. Take a look around, or say hello.</p>
                <p className="status"><span className="status-dot" aria-hidden="true"></span> More work coming soon</p>
                <div className="link-row"><a href="https://github.com/SajagIN">GitHub ↗</a><a href="https://www.linkedin.com/in/sajagin/">LinkedIn ↗</a><a href="#contact">Get in touch ↓</a></div>
                <section id="resume" aria-labelledby="resume-heading">
                  <h2 className="section-title" id="resume-heading">Résumé</h2>
                  <div className="resume-actions">
                    <button type="button" id="resume-toggle" aria-expanded={resumeOpen} aria-controls="resume-panel" onClick={() => setResumeOpen(open => !open)}>{resumeOpen ? 'Hide résumé' : 'View résumé'}</button>
                    <a className="button" href="./Resume.pdf" download>Download résumé</a>
                  </div>
                  <div className="resume-panel" id="resume-panel" hidden={!resumeOpen}>
                    {resumeOpen && <iframe className="resume-viewer" title="Sajag Kamthan's résumé" src="./Resume.pdf" loading="lazy" />}
                    <p>If the PDF doesn't display, <a href="./Resume.pdf" target="_blank" rel="noopener">open the résumé in a new tab</a>.</p>
                  </div>
                </section>
              </section>
              <section className="panel" id="contact" aria-labelledby="contact-heading">
                <div className="contact-heading"><span className="contact-icon" aria-hidden="true">✉</span><h2 id="contact-heading">Contact me</h2></div>
                <p className="contact-copy">Have an idea? Let’s talk. Email me at <a href="mailto:sajag1403@gmail.com">sajag1403@gmail.com</a>.</p>
                <form action="https://formsubmit.co/sajag1403@gmail.com" method="POST">
                  <p className="form-help">All fields are required.</p>
                  <input type="hidden" name="_captcha" value="false" />
                  <input type="hidden" name="_template" value="table" />
                  <label htmlFor="email">Your email</label>
                  <input type="email" id="email" name="email" autoComplete="email" required placeholder="you@example.com" />
                  <label htmlFor="subject">Subject</label>
                  <input type="text" id="subject" name="subject" required placeholder="What's this about?" />
                  <label htmlFor="message">Message</label>
                  <textarea id="message" name="message" rows={5} required placeholder="Write your message..." />
                  <div className="form-footer"><button type="submit">Send message</button></div>
                </form>
              </section>
            </div>
            <aside className="site-notice" aria-label="Site update"><span className="notice-icon" aria-hidden="true">i</span><p><strong>Site update:</strong> This is a temporary page. I'm rebuilding my portfolio from the ground up, with more about me and my work coming soon.</p></aside>
          </div>
          <div className="status-bar"><span>Ready.</span><span>Made by Sajag</span></div>
        </main>
      </div>
    </>
  )
}
