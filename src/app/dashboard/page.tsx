'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { generateReportText, downloadText, formatTime } from '@/lib/ats-engine';
import type { ResumeAnalysis, PortfolioAnalysis, Bug, HistoryEntry } from '@/lib/ats-engine';
import {
  loadHistory,
  loadResumeAnalysis,
  loadPortfolioAnalysis,
  clearHistoryStorage,
} from '@/lib/storage';

export default function DashboardPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  const showToast = useCallback((msg: string, type = '') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const loadData = useCallback(() => {
    setHistory(loadHistory());
    setResumeAnalysis(loadResumeAnalysis());
    setPortfolioAnalysis(loadPortfolioAnalysis());
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleClearHistory = () => {
    if (!confirm('Clear all analysis history?')) return;
    clearHistoryStorage();
    setHistory([]);
    setResumeAnalysis(null);
    setPortfolioAnalysis(null);
    showToast('History cleared');
  };

  const handleDownloadFull = () => {
    if (!resumeAnalysis && !portfolioAnalysis) {
      showToast('Run at least one analysis first', 'error');
      return;
    }
    let text = resumeAnalysis ? generateReportText('resume', resumeAnalysis) : '';
    if (portfolioAnalysis) {
      text += (text ? '\n\n\n' : '') + generateReportText('portfolio', portfolioAnalysis);
    }
    downloadText(text, 'devdebug-full-report.txt');
    showToast('Full report downloaded ✓', 'success');
  };

  // ── Derived values ──────────────────────────────────────────────────────────
  const resumeEntry = history.find((h) => h.type === 'resume');
  const portEntry = history.find((h) => h.type === 'portfolio');
  const resumeHealth = resumeEntry?.health ?? 0;
  const portHealth = portEntry?.health ?? 0;
  const hasData = !!(resumeEntry || portEntry);

  const totalErrors =
    (resumeAnalysis?.errorCount ?? 0) + (portfolioAnalysis?.errorCount ?? 0);
  const totalWarnings =
    (resumeAnalysis?.warnCount ?? 0) + (portfolioAnalysis?.warnCount ?? 0);
  const atsScore = resumeAnalysis?.atsTotal ?? 0;

  let readiness = 0;
  if (resumeHealth && portHealth) readiness = Math.round((resumeHealth + portHealth) / 2);
  else if (resumeHealth) readiness = Math.round(resumeHealth * 0.9);
  else if (portHealth) readiness = Math.round(portHealth * 0.9);

  const allBugs: (Bug & { source: 'resume' | 'portfolio' })[] = [
    ...(resumeAnalysis?.bugs ?? []).map((b) => ({ ...b, source: 'resume' as const })),
    ...(portfolioAnalysis?.bugs ?? []).map((b) => ({ ...b, source: 'portfolio' as const })),
  ];
  const topBugs = allBugs.filter(
    (b) => b.severity === 'critical' || b.severity === 'high'
  ).slice(0, 4);

  // Sprint roadmap
  const sprint1 = allBugs.filter((b) => b.severity === 'critical').map((b) => b.fix.split('.')[0]);
  const sprint2 = allBugs.filter((b) => b.severity === 'high').map((b) => b.fix.split('.')[0]);
  const sprint3 = allBugs.filter((b) => b.severity === 'medium').map((b) => b.fix.split('.')[0]);

  const buildStatusContent = !hasData
    ? { dot: 'var(--sage)', label: 'No analyses run yet' }
    : totalErrors > 0
    ? { dot: 'var(--red)', label: `Build failed — ${totalErrors} critical error${totalErrors > 1 ? 's' : ''}` }
    : { dot: 'var(--sage)', label: 'Build successful' };

  return (
    <>
      <Navbar />
      <WorkspaceLayout opacity={0.06} overlayOpacity={0.94} blur="2px">
        <div className="page-inner">
          <div className="page-header">
            <div className="page-title">
              Career dashboard<span className="dim">.status()</span>
            </div>
            <div className="page-sub">
              Your unified developer readiness report — updates automatically from each analysis.
            </div>
          </div>

          {/* ── Readiness Score ── */}
          <div className="dash-score">
            <div className="dash-score-eyebrow">DEVELOPER READINESS SCORE</div>
            <div className="dash-score-num">
              {hasData ? readiness : '—'}<span>/100</span>
            </div>
            <div className="build-status">
              <div className="status-dot" style={{ background: buildStatusContent.dot }} />
              {buildStatusContent.label}
            </div>
          </div>

          {/* ── Metric Cards ── */}
          <div className="cards-grid">
            <div className="metric-card">
              <div className="metric-label">resume_health</div>
              <div className="metric-val">{resumeHealth ? `${resumeHealth}%` : '—%'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">portfolio_health</div>
              <div className="metric-val amber">{portHealth ? `${portHealth}%` : '—%'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">total_errors</div>
              <div className="metric-val red">{hasData ? totalErrors : '—'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">total_warnings</div>
              <div className="metric-val amber">{hasData ? totalWarnings : '—'}</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">ats_score</div>
              <div className="metric-val blue">{atsScore ? `${atsScore}/100` : '—'}</div>
            </div>
          </div>

          {/* ── Top Bugs ── */}
          <div className="section-title">Top career bugs</div>
          {topBugs.length > 0 ? (
            <div className="bug-grid">
              {topBugs.map((b) => (
                <div key={`${b.source}-${b.id}`} className={`bug-card ${b.severity}`}>
                  <div className="bug-header">
                    <span className="bug-id">{b.source.toUpperCase()}</span>
                    <span className="bug-title">{b.title}</span>
                    <span className={`sev-badge ${b.severity}`}>{b.severity.toUpperCase()}</span>
                  </div>
                  <div className="bug-desc">{b.desc}</div>
                  <div className="bug-fix">Fix: {b.fix}</div>
                </div>
              ))}
            </div>
          ) : hasData ? (
            <div className="empty-state">
              <div className="empty-icon">✓</div>
              <div className="empty-title">No critical bugs found</div>
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◎</div>
              <div className="empty-title">No bugs detected yet</div>
              <div className="empty-sub">Run a resume or portfolio analysis first</div>
            </div>
          )}

          {/* ── Patch Roadmap ── */}
          <div className="section-title">Patch roadmap</div>
          {hasData ? (
            <div>
              {sprint1.length > 0 && (
                <div className="patch">
                  <div className="patch-ver">Sprint 1 — this week (critical)</div>
                  {sprint1.map((item, i) => <div key={i} className="patch-item">{item}</div>)}
                </div>
              )}
              {sprint2.length > 0 && (
                <div className="patch">
                  <div className="patch-ver">Sprint 2 — next week (high priority)</div>
                  {sprint2.map((item, i) => <div key={i} className="patch-item">{item}</div>)}
                </div>
              )}
              {sprint3.length > 0 && (
                <div className="patch">
                  <div className="patch-ver">Sprint 3 — before applications (medium)</div>
                  {sprint3.map((item, i) => <div key={i} className="patch-item">{item}</div>)}
                </div>
              )}
              {sprint1.length === 0 && sprint2.length === 0 && sprint3.length === 0 && (
                <div className="empty-state" style={{ padding: 24 }}>
                  <div className="empty-sub">No roadmap items — great shape!</div>
                </div>
              )}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 24 }}>
              <div className="empty-sub">Roadmap generates after analysis</div>
            </div>
          )}

          {/* ── History ── */}
          <div className="section-title">Analysis history</div>
          {history.length > 0 ? (
            <div>
              {history.slice(0, 8).map((h) => (
                <div
                  key={h.id}
                  className="history-item"
                  onClick={() => router.push(`/${h.type}`)}
                >
                  <div className="history-icon">{h.type === 'resume' ? '📄' : '⛰'}</div>
                  <div className="history-meta">
                    <div className="history-type">{h.type.toUpperCase()} ANALYSIS</div>
                    <div className="history-title">
                      {h.url || 'Resume scan'} — {h.bugCount} bugs detected
                    </div>
                  </div>
                  <div className="history-time">{formatTime(h.timestamp)}</div>
                  <div className="history-score">{h.health}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-icon">◷</div>
              <div className="empty-title">No history yet</div>
              <div className="empty-sub">Past analyses will appear here</div>
            </div>
          )}

          {/* ── Actions ── */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button className="btn-primary" style={{ borderRadius: 30 }} onClick={handleDownloadFull}>
              ↓ Download full report PDF
            </button>
            <button
              className="btn-ghost"
              style={{ borderRadius: 30, padding: '13px 24px', fontSize: 14 }}
              onClick={handleClearHistory}
            >
              Clear history
            </button>
          </div>

          {/* ── Coming Soon ── */}
          <div className="section-title" style={{ marginTop: 36 }}>Coming soon</div>
          <div className="feat-grid">
            <div className="feat-card coming">
              <div className="badge-soon">SOON</div>
              <div className="feat-icon">⌥</div>
              <div className="feat-title">GitHub debugger</div>
              <div className="feat-desc">
                Commit frequency, repo quality, README scores, contribution graph analysis.
              </div>
            </div>
            <div className="feat-card coming">
              <div className="badge-soon">SOON</div>
              <div className="feat-icon">◈</div>
              <div className="feat-title">LinkedIn debugger</div>
              <div className="feat-desc">
                Headline optimization, keyword gaps, connection quality, about section scoring.
              </div>
            </div>
          </div>
        </div>
        <Footer />
      </WorkspaceLayout>

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
