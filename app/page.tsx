import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Newsletter Factory — A Common Ground Press project",
  description:
    "Hyperlocal newsletters that give communities the real news of where they live — plainly, reliably, without the noise.",
};

// Public subscribe link for the flagship newsletter.
const SUBSCRIBE_URL = "https://the352beat.com";

export default function Landing() {
  return (
    <div className="w-landing">
      <nav className="w-nav">
        <div className="w-wrap w-nav-inner">
          <div className="w-brand">
            <span className="w-brand-name">The Newsletter Factory</span>
            <span className="w-brand-sub">A Common Ground Press project</span>
          </div>
          <div className="w-nav-links">
            <a href="#what">What we do</a>
            <a href="#cgp">Common Ground Press</a>
            <a className="w-pill w-pill-lime" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">Subscribe</a>
          </div>
        </div>
      </nav>

      <header className="w-hero">
        <div className="w-wrap">
          <span className="w-eyebrow">Hyperlocal news · Central Florida</span>
          <h1 className="w-hero-title">
            Where communities find <span className="w-hl">common ground</span>.
          </h1>
          <p className="w-lede">
            The Newsletter Factory builds hyperlocal newsletters that give neighbors
            the real news of where they live — plainly, reliably, without the noise.
          </p>
          <div className="w-hero-cta">
            <a className="w-pill w-pill-lime w-lg" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">Read The 352 Beat</a>
            <a className="w-pill w-pill-ghost w-lg" href="#what">What we do</a>
          </div>
        </div>
      </header>

      <section className="w-why">
        <div className="w-wrap">
          <span className="w-label">The why</span>
          <p className="w-statement">
            Local news is vanishing. Papers are closing, town updates are buried in
            social feeds, and what's left is noise. Communities are losing track of
            their own place — what's being built, what's closing, what's happening
            this weekend.
          </p>
        </div>
      </section>

      <section id="what" className="w-provide">
        <div className="w-wrap">
          <span className="w-label">What we provide</span>
          <h2 className="w-h2">Clear newsletters for a place and the people in it.</h2>
          <div className="w-cards">
            <article className="w-card">
              <span className="w-num">01</span>
              <h3>Government &amp; Development</h3>
              <p>The decisions and projects shaping your town — in plain language you can actually follow.</p>
            </article>
            <article className="w-card">
              <span className="w-num">02</span>
              <h3>Local Business</h3>
              <p>What's opening, what's closing, and the places worth your time and your dollars.</p>
            </article>
            <article className="w-card">
              <span className="w-num">03</span>
              <h3>Events</h3>
              <p>The festivals, meetings, and gatherings worth showing up for this week.</p>
            </article>
            <article className="w-card">
              <span className="w-num">04</span>
              <h3>Community</h3>
              <p>The neighbors and stories that make a place feel like one.</p>
            </article>
          </div>
        </div>
      </section>

      <section id="cgp" className="w-cgp">
        <div className="w-wrap">
          <span className="w-label w-label-dark">Part of Common Ground Press</span>
          <p className="w-cgp-body">
            Common Ground Press publishes work that meets people where they are and
            tells the truth plainly — from inner work to local life. The Newsletter
            Factory carries that mission into communities: the same commitment to
            clarity, evidence, and respect for the reader, pointed at the place you
            call home.
          </p>
        </div>
      </section>

      <section className="w-promise">
        <div className="w-wrap">
          <span className="w-label">The promise</span>
          <h2 className="w-h2">Built for the long haul, not the quick extraction.</h2>
          <p className="w-promise-body">
            No clickbait, no outrage farming, no selling your attention to the highest
            bidder. Just a steady, trusted signal for your community — the kind of thing
            you'd want to still be reading in ten years.
          </p>
        </div>
      </section>

      <section id="subscribe" className="w-flag">
        <div className="w-wrap w-flag-inner">
          <span className="w-eyebrow w-eyebrow-dark">Now publishing</span>
          <h2 className="w-flag-title">The 352 Beat</h2>
          <p className="w-flag-sub">
            Central Florida's hyperlocal newsletter — covering Lake, Marion, Sumter,
            Alachua, Citrus, and Hernando counties.
          </p>
          <a className="w-pill w-pill-dark w-lg" href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">Subscribe free</a>
        </div>
      </section>

      <footer className="w-foot">
        <div className="w-wrap w-foot-inner">
          <span>Common Ground Press · an ATLV Solutions project</span>
          <a href="/desk">Staff login</a>
        </div>
      </footer>
    </div>
  );
}
