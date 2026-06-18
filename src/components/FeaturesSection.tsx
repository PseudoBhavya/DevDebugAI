'use client';

import Link from 'next/link';

const FEATURES = [
  {
    icon: '📄',
    title: 'Resume debugger',
    desc: 'Real PDF parsing, ATS scoring engine, career bug detection, AI-powered rewrites via Gemini.',
    href: '/resume',
    coming: false,
  },
  {
    icon: '⛰',
    title: 'Portfolio debugger',
    desc: 'Crawl your live portfolio URL, detect missing sections, recruiter view analysis, AI feedback.',
    href: '/portfolio',
    coming: false,
  },
  {
    icon: '◎',
    title: 'Career dashboard',
    desc: 'Unified readiness score, persistent history, sprint roadmap, PDF report download.',
    href: '/dashboard',
    coming: false,
  },
  {
    icon: '⌥',
    title: 'GitHub debugger',
    desc: 'Commit patterns, repo quality, README analysis, contribution health.',
    href: '#',
    coming: true,
  },
];

export default function FeaturesSection() {
  return (
    <div className="features">
      <div className="features-inner">
        <div className="section-label">Core modules</div>
        <div className="section-heading">Find what's holding you back</div>
        <div className="feat-grid">
          {FEATURES.map((f) =>
            f.coming ? (
              <div key={f.title} className="feat-card coming">
                <div className="badge-soon">SOON</div>
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </div>
            ) : (
              <Link key={f.title} href={f.href} className="feat-card">
                <div className="feat-icon">{f.icon}</div>
                <div className="feat-title">{f.title}</div>
                <div className="feat-desc">{f.desc}</div>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
