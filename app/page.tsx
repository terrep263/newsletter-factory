import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The Newsletter Factory — A Common Ground Press project",
  description:
    "Hyperlocal newsletters that give communities the real news of where they live — plainly, reliably, without the noise.",
};

// Public subscribe link for the flagship newsletter. Replace with the live
// 352 Beat signup URL when ready.
const SUBSCRIBE_URL = "#subscribe";

export default function Landing() {
  return (
    <div className="landing">
      <header className="landing-top">
        <div className="brand">
          <span className="brand-name">The Newsletter Factory</span>
          <span className="brand-sub">A Common Ground Press project</span>
        </div>
        <a className="top-cta" href={SUBSCRIBE_URL}>Subscribe</a>
      </header>

      <section className="hero">
        <p className="hero-kicker">Common Ground Press</p>
        <h1 className="hero-title">Where communities<br />find common ground.</h1>
        <p className="hero-lede">
          The Newsletter Factory builds hyperlocal newsletters that give neighbors
          the real news of where they live — plainly, reliably, without the noise.
        </p>
        <div className="hero-actions">
          <a className="btn-primary" href={SUBSCRIBE_URL}>Read The 352 Beat</a>
          <a className="btn-text" href="#what">What we do →</a>
        </div>
      </section>

      <section className="why">
        <span className="rule-label">The why</span>
        <p className="big-statement">
          Local news is vanishing. Papers are closing, town updates are buried in
          social feeds, and what's left is noise. Communities are losing track of
          their own place — what's being built, what's closing, what's happening
          this weekend.
        </p>
      </section>

      <section id="what" className="provide">
        <span className="rule-label">What we provide</span>
        <h2 className="block-head">Clear newsletters for a place and the people in it.</h2>
        <div className="pillars">
          <div className="pillar">
            <h3>Government &amp; Development</h3>
            <p>The decisions and projects shaping your town — in plain language you can actually follow.</p>
          </div>
          <div className="pillar">
            <h3>Local Business</h3>
            <p>What's opening, what's closing, and the places worth your time and your dollars.</p>
          </div>
          <div className="pillar">
            <h3>Events</h3>
            <p>The festivals, meetings, and gatherings worth showing up for this week.</p>
          </div>
          <div className="pillar">
            <h3>Community</h3>
            <p>The neighbors and stories that make a place feel like one.</p>
          </div>
        </div>
      </section>

      <section className="cgp">
        <span className="rule-label light">Part of Common Ground Press</span>
        <p className="cgp-body">
          Common Ground Press publishes work that meets people where they are and
          tells the truth plainly — from inner work to local life. The Newsletter
          Factory carries that mission into communities: the same commitment to
          clarity, evidence, and respect for the reader, pointed at the place you
          call home.
        </p>
      </section>

      <section className="promise">
        <span className="rule-label">The promise</span>
        <h2 className="block-head">Built for the long haul, not the quick extraction.</h2>
        <p className="promise-body">
          No clickbait, no outrage farming, no selling your attention to the highest
          bidder. Just a steady, trusted signal for your community — the kind of thing
          you'd want to still be reading in ten years.
        </p>
      </section>

      <section id="subscribe" className="flagship">
        <p className="flag-kicker">Now publishing</p>
        <h2 className="flag-title">The 352 Beat</h2>
        <p className="flag-sub">
          Central Florida's hyperlocal newsletter — covering Lake, Marion, Sumter,
          Alachua, Citrus, and Hernando counties.
        </p>
        <a className="btn-primary big" href={SUBSCRIBE_URL}>Subscribe free</a>
      </section>

      <footer className="landing-foot">
        <span>Common Ground Press · an ATLV Solutions project</span>
        <a href="/desk" className="staff">Staff login</a>
      </footer>
    </div>
  );
}
