'use client';

import { useState, useCallback, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { analyzePortfolio, generateReportText, downloadText } from '@/lib/ats-engine';
import type { PortfolioAnalysis } from '@/lib/ats-engine';
import { savePortfolioAnalysis, loadPortfolioAnalysis, saveHistoryEntry, buildHistoryEntry } from '@/lib/storage';

type Stage = 'upload' | 'loading' | 'results';

const LOADING_LINES = [
  'Fetching portfolio URL...',
  'Parsing HTML structure...',
  'Detecting sections & links...',
  'Scoring recruiter signals...',
  'Generating AI feedback...',
];

export default function PortfolioPage() {
  const [stage, setStage] = useState<Stage>('upload');
  const [url, setUrl] = useState('');
  const [analysis, setAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [terminalLines, setTerminalLines] = useState(
    LOADING_LINES.map((text) => ({ text, status: 'idle' as 'idle' | 'active' | 'done' }))
  );
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [portText, setPortText] = useState('');
  const [roastContent, setRoastContent] = useState('');
  const [roastOpen, setRoastOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);

  useEffect(() => {
    const saved = loadPortfolioAnalysis();
    if (saved) {
      setAnalysis(saved);
      setPortText(saved.extractedText.substring(0, 1000));
      setStage('results');
    }
  }, []);

  const showToast = useCallback((msg: string, type = '') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  }, []);

  const runLoadingSequence = useCallback((onDone: () => void) => {
    setTerminalLines(LOADING_LINES.map((text) => ({ text, status: 'idle' })));
    let i = 0;
    const tick = () => {
      setTerminalLines((prev) =>
        prev.map((l, idx) => {
          if (idx < i) return { ...l, status: 'done' };
          if (idx === i) return { ...l, status: 'active' };
          return l;
        })
      );
      i++;
      if (i <= LOADING_LINES.length) setTimeout(tick, 700);
      else setTimeout(onDone, 300);
    };
    tick();
  }, []);

  const runAnalysis = useCallback(async () => {
    if (!url || !url.startsWith('http')) {
      showToast('Enter a valid URL starting with https://', 'error');
      return;
    }
    setStage('loading');
    runLoadingSequence(async () => {
      try {
        const result = await analyzePortfolio(url);
        setAnalysis(result);
        savePortfolioAnalysis(result);
        saveHistoryEntry(buildHistoryEntry('portfolio', result));
        setPortText(result.extractedText.substring(0, 1000));
        setStage('results');
        generateRoast(result.extractedText);
      } catch {
        showToast('Could not fetch portfolio. Make sure CORS is enabled.', 'error');
        setStage('upload');
      }
    });
  }, [url, runLoadingSequence, showToast]);

  const generateRoast = async (text: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'roast',
          userMsg: `Roast this portfolio:\n\n${text.substring(0, 800)}`,
          systemMsg: 'You are DevDebug AI Roast Mode. Write exactly 3 roast lines about this portfolio. Format:\n[ROAST]: Your brutal honest observation in one italic sentence\n[FIX]: Specific actionable fix in one sentence\n\nSeparate each with ---\nBe sharp, specific, and funny but constructive.',
        }),
      });
      const data = await res.json();
      if (data.text) setRoastContent(data.text);
    } catch {
      setRoastContent(
        '[ROAST]: Beautiful website. Shame there\'s no way to actually hire you from it.\n[FIX]: Contact section, resume download link, and a CTA. Three things. This weekend.'
      );
    }
  };

  const getAIFeedback = async () => {
    if (!portText.trim()) { showToast('Add portfolio description first', 'error'); return; }
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'portfolio-feedback',
          userMsg: portText,
          systemMsg: 'You are DevDebug AI, an expert portfolio reviewer for software developer internship roles. Give 6 specific, actionable feedback points. Each starts with "- ". Focus on: missing sections, project impact, recruiter impression, contact accessibility, CTA, branding. Be direct and sharp.',
        }),
      });
      const data = await res.json();
      setAiOutput(data.text || 'AI feedback unavailable.');
    } catch {
      setAiOutput('AI feedback unavailable. Check connection.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownload = () => {
    if (!analysis) { showToast('Run an analysis first', 'error'); return; }
    downloadText(generateReportText('portfolio', analysis), 'devdebug-portfolio-report.txt');
    showToast('Report downloaded ✓', 'success');
  };

  const parseRoastText = (text: string) => {
    const blocks = text.split('---').filter(b => b.trim());
    return blocks.slice(0, 3).map((block, i) => {
      const roastMatch = block.match(/\[ROAST\]:\s*(.+)/);
      const fixMatch = block.match(/\[FIX\]:\s*(.+)/);
      if (!roastMatch) return null;
      return (
        <div key={i} className="roast-line">
          <div className="roast-quote">&ldquo;{roastMatch[1].trim().replace(/^"|"$/g, '')}&rdquo;</div>
          {fixMatch && <div className="roast-fix">Fix: {fixMatch[1].trim()}</div>}
        </div>
      );
    });
  };

  const circleColor = analysis
    ? analysis.health >= 80 ? '#6b8a9c' : analysis.health >= 65 ? '#d99a5b' : '#d6634d'
    : '#6b8a9c';
  const circleOffset = analysis ? 263.9 - (263.9 * analysis.health) / 100 : 63.3;

  return (
    <>
      <Navbar />
      <WorkspaceLayout opacity={0.12} overlayOpacity={0.88} blur="2px">
        <div className="page-inner">
          <div className="page-header">
            <div className="page-title">
              Portfolio debugger<span className="dim">.crawl()</span>
            </div>
            <div className="page-sub">
              Enter your portfolio URL — we fetch the real page and run a full career bug scan.
            </div>
          </div>

          {/* ── UPLOAD ── */}
          {stage === 'upload' && (
            <div style={{ maxWidth: 600, margin: '0 auto 24px' }}>
              <div className="url-input-row">
                <input
                  className="url-input"
                  type="url"
                  placeholder="https://yourportfolio.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runAnalysis()}
                />
                <button
                  className="btn-primary"
                  style={{ borderRadius: 30, whiteSpace: 'nowrap' }}
                  onClick={runAnalysis}
                >
                  Analyze →
                </button>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)' }}>
                Enter your deployed portfolio URL for real analysis
              </div>
            </div>
          )}

          {/* ── LOADING ── */}
          {stage === 'loading' && (
            <div className="loading-screen">
              <div className="spinner" />
              <div className="loading-title">Crawling portfolio</div>
              <div className="loading-sub">Fetching and analyzing your site</div>
              <div className="terminal-lines">
                {terminalLines.map((line, i) => (
                  <div key={i} className={`t-line show${line.status === 'active' ? ' active' : ''}${line.status === 'done' ? ' done' : ''}`}>
                    <span className="t-icon">{line.status === 'done' ? '✓' : '›'}</span>
                    <span className="t-text">{line.text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── RESULTS ── */}
          {stage === 'results' && analysis && (
            <div>
              {/* Health */}
              <div className="health-grid">
                <div className="circle-wrap">
                  <svg width="106" height="106" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
                    <circle
                      cx="50" cy="50" r="42" fill="none"
                      stroke={circleColor} strokeWidth="8"
                      strokeDasharray="263.9"
                      strokeDashoffset={circleOffset}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="circle-score">
                    <span className="score-num">{analysis.health}</span>
                    <span className="score-label">health</span>
                  </div>
                </div>
                <div className="health-meta">
                  <h3>Portfolio health</h3>
                  <div className="stat-row">
                    <div className="stat-chip err">{analysis.errorCount} errors</div>
                    <div className="stat-chip warn">{analysis.warnCount} warnings</div>
                    <div className="stat-chip ok">{analysis.passedCount} passed</div>
                  </div>
                </div>
              </div>

              {/* Section checks */}
              <div className="section-title">Section checks</div>
              <div className="check-list">
                {analysis.checkList.map((c) => {
                  const pass = analysis.checks[c.key];
                  const subText = pass
                    ? (c.key === 'about' ? 'Detected' : c.key === 'mobile' ? 'Passed' : 'Detected')
                    : (c.severity === 'error' ? 'Missing — error' : 'Not found — warning');
                  const subColor = pass
                    ? 'var(--ink-3)'
                    : (c.severity === 'error' ? 'var(--red-light)' : 'var(--amber-light)');
                  return (
                    <div key={c.key} className="check-item">
                      <div className={`check-icon ${pass ? 'pass' : 'fail'}`}>{pass ? '✓' : '✕'}</div>
                      <div className="check-text">{c.label}</div>
                      <div className="check-sub" style={{ color: subColor }}>{subText}</div>
                    </div>
                  );
                })}
              </div>

              {/* Recruiter view */}
              <div className="section-title">What recruiters see</div>
              <div className="rec-grid">
                <div className="rec-card">
                  <h4 className="green">Strengths</h4>
                  {analysis.strengths.length > 0
                    ? analysis.strengths.map((s, i) => <div key={i} className="rec-item">{s}</div>)
                    : <div className="rec-item">No clear strengths detected</div>}
                </div>
                <div className="rec-card">
                  <h4 className="red">Weaknesses</h4>
                  {analysis.weaknesses.length > 0
                    ? analysis.weaknesses.map((w, i) => <div key={i} className="rec-item">{w}</div>)
                    : <div className="rec-item">No major weaknesses found</div>}
                </div>
              </div>

              {/* Confidence */}
              <div className="confidence-bar-wrap">
                <div className="confidence-left">
                  <div className="conf-label">HIRING CONFIDENCE</div>
                  <div className="confidence-val">{analysis.confidence}%</div>
                </div>
                <div className="confidence-quote">{analysis.confidenceQuote}</div>
              </div>

              {/* Bugs */}
              <div className="section-title">Portfolio bugs detected</div>
              <div className="bug-grid">
                {analysis.bugs.map((b) => (
                  <div key={b.id} className={`bug-card ${b.severity}`}>
                    <div className="bug-header">
                      <span className="bug-id">Bug #{String(b.id).padStart(3, '0')}</span>
                      <span className="bug-title">{b.title}</span>
                      <span className={`sev-badge ${b.severity}`}>{b.severity.toUpperCase()}</span>
                    </div>
                    <div className="bug-desc">{b.desc}</div>
                    <div className="bug-fix">Fix: {b.fix}</div>
                  </div>
                ))}
              </div>

              {/* Roast */}
              <div className="roast-section">
                <div className="roast-header" onClick={() => setRoastOpen(!roastOpen)}>
                  <h4>🔥 Roast mode</h4>
                  <span className="roast-toggle">{roastOpen ? 'Collapse ↑' : 'Enable →'}</span>
                </div>
                <div className={`roast-body${roastOpen ? ' open' : ''}`}>
                  {roastContent ? parseRoastText(roastContent) : (
                    <div className="ai-loading-inline">
                      <span>Loading roast</span>
                      <span className="ai-dots"><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Feedback */}
              <div className="section-title">AI portfolio feedback</div>
              <div className="ai-block">
                <div className="ai-block-title">DESCRIBE YOUR PORTFOLIO OR PASTE ABOUT TEXT</div>
                <textarea
                  className="ai-textarea"
                  value={portText}
                  onChange={(e) => setPortText(e.target.value)}
                  placeholder="Portfolio content auto-extracted. Add context about your projects, goals, or target roles..."
                />
                <div className="ai-btn-row">
                  <button className="btn-primary" style={{ borderRadius: 30 }} onClick={getAIFeedback} disabled={aiLoading}>
                    Get AI feedback
                  </button>
                  <button className="btn-ghost" style={{ borderRadius: 30, padding: '13px 24px', fontSize: 14 }} onClick={handleDownload}>
                    ↓ Download report
                  </button>
                </div>
                {aiLoading && (
                  <div className="ai-output show">
                    <div className="ai-loading-inline">
                      <span>Analyzing</span>
                      <span className="ai-dots"><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  </div>
                )}
                {!aiLoading && aiOutput && (
                  <div className="ai-output show">{aiOutput}</div>
                )}
              </div>

              {/* Re-analyze */}
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn-ghost"
                  style={{ borderRadius: 30, padding: '13px 24px', fontSize: 14 }}
                  onClick={() => { setStage('upload'); setAnalysis(null); setUrl(''); setAiOutput(''); setRoastContent(''); }}
                >
                  ← Analyze new portfolio
                </button>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </WorkspaceLayout>

      {toast && <div className={`toast show ${toast.type}`}>{toast.msg}</div>}
    </>
  );
}
