'use client';

import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="hero-video-wrap">
      <video className="hero-video" autoPlay muted loop playsInline>
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>
      <div className="hero-grid" />
      <div className="hero-overlay" />
      <div className="hero-content hero">
        <div className="hero-badge">
          <div className="pulse" />
          Career build status: v2.1.0 active
        </div>
        <h1>
          Debug your <em>career</em>
          <br />
          before recruiters do
        </h1>
        <p>
          Find career bugs.
          <br />
          Get recruiter feedback.
          <br />
          Improve before you apply.
        </p>
        <div className="btn-row">
          <Link href="/resume" className="btn-primary">
            Debug resume
          </Link>
          <Link href="/portfolio" className="btn-ghost">
            Debug portfolio
          </Link>
        </div>
      </div>
    </div>
  );
}
