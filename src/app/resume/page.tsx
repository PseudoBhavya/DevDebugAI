'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import WorkspaceLayout from '@/components/WorkspaceLayout';
import { analyzeResume, generateReportText, downloadText } from '@/lib/ats-engine';
import type { ResumeAnalysis } from '@/lib/ats-engine';
import { saveResumeAnalysis, loadResumeAnalysis, saveHistoryEntry, buildHistoryEntry } from '@/lib/storage';

const DEMO_TEXT = `John Developer
john.dev@gmail.com | github.com/johndev

EDUCATION
B.Tech Computer Science, NIT Bhopal — 2024

SKILLS
Python, JavaScript, React, Node.js, HTML, CSS

EXPERIENCE
Software Intern — StartupXYZ (May 2023 – Aug 2023)
- Worked on the backend API
- Helped with database migration
- Did some frontend work

PROJECTS
Todo App
- Made a todo application using React
- It has add, edit, delete features

Weather App
- Used OpenWeatherMap API
- Shows weather for cities`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfjsLib = any;

async function parsePDF(file: File): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lib: PdfjsLib = (window as unknown as any).pdfjsLib;
  if (!lib) throw new Error('PDF.js not loaded yet — please try again in a moment.');
  if (!lib.GlobalWorkerOptions.workerSrc) {
    lib.GlobalWorkerOptions.workerSrc =
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await lib.getDocument({ data: arrayBuffer }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((item: { str: string }) => item.str).join(' ') + '\n';
  }
  return text.trim();
}

type Stage = 'upload' | 'loading' | 'results';

const LOADING_LINES = [
  'Parsing PDF structure...',
  'Extracting text content...',
  'Running ATS compatibility checks...',
  'Detecting career bugs...',
  'Finding missing keywords...',
  'Generating AI patch notes...',
];

export default function ResumePage() {
  const [stage, setStage] = useState<Stage>('upload');
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [resumeText, setResumeText] = useState('');
  const [terminalLines, setTerminalLines] = useState<{ text: string; status: 'idle' | 'active' | 'done' }[]>(
    LOADING_LINES.map((text) => ({ text, status: 'idle' }))
  );
  const [aiOutput, setAiOutput] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [patchNotes, setPatchNotes] = useState('');
  const [roastContent, setRoastContent] = useState('');
  const [roastOpen, setRoastOpen] = useState(false);
  const [beforeAfter, setBeforeAfter] = useState<{ before: string; after: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: string } | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = loadResumeAnalysis();
    if (saved) {
      setAnalysis(saved);
      setResumeText(saved.text);
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
          return { ...l, status: 'idle' };
        })
      );
      i++;
      if (i <= LOADING_LINES.length) {
        setTimeout(tick, 680);
      } else {
        setTimeout(onDone, 300);
      }
    };
    tick();
  }, []);

  const processResume = useCallback(
    (text: string) => {
      setResumeText(text);
      setStage('loading');
      runLoadingSequence(() => {
        const result = analyzeResume(text);
        setAnalysis(result);
        saveResumeAnalysis(result);
        saveHistoryEntry(buildHistoryEntry('resume', result));
        setStage('results');
        generateAIPatchNotes(text, result);
        generateRoast(text);
      });
    },
    [runLoadingSequence]
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (!file) return;
      if (file.type !== 'application/pdf') {
        showToast('Please upload a PDF file', 'error');
        return;
      }
      try {
        const text = await parsePDF(file);
        processResume(text);
      } catch (err) {
        showToast('Error parsing PDF: ' + (err instanceof Error ? err.message : 'unknown'), 'error');
      }
    },
    [processResume, showToast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const generateAIPatchNotes = async (text: string, a: ResumeAnalysis) => {
    const prompt = `You are DevDebug AI. Based on this resume analysis, generate exactly 3 patch notes in this EXACT format (no other text):\n\nv1.1 — [short category name]\n+ [actionable fix item]\n+ [actionable fix item]\n+ [actionable fix item]\n\nv1.2 — [short category name]\n+ [actionable fix item]\n+ [actionable fix item]\n\nv1.3 — [short category name]\n+ [actionable fix item]\n+ [actionable fix item]\n\nResume summary: ${text.substring(0, 600)}\nIssues detected: ${a.bugs.map((b) => b.title).join(', ')}`;
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'patch-notes',
          userMsg: prompt,
          systemMsg: 'You are DevDebug AI, an expert career advisor for software developer internship roles. Be specific and actionable. Output patch notes only, no preamble.',
        }),
      });
      const data = await res.json();
      if (data.text) setPatchNotes(data.text);
      else setPatchNotes(renderFallbackPatchNotes(a));
    } catch {
      setPatchNotes(renderFallbackPatchNotes(a));
    }
  };

  const generateRoast = async (text: string) => {
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'roast',
          userMsg: `Roast this resume:\n\n${text.substring(0, 800)}`,
          systemMsg: 'You are DevDebug AI Roast Mode. Write exactly 3 roast lines about this resume. Format:\n[ROAST]: Your brutal honest observation in one italic sentence\n[FIX]: Specific actionable fix in one sentence\n\nSeparate each with ---\nBe sharp, specific, and funny but constructive.',
        }),
      });
      const data = await res.json();
      if (data.text) setRoastContent(data.text);
    } catch {
      setRoastContent(
        '[ROAST]: Your resume has more adjectives than achievements. Passionate developer doesn\'t ship code — commits do.\n[FIX]: Remove every self-descriptor that isn\'t backed by a shipped project or metric.\n---\n[ROAST]: Recruiters hire impact, not intentions. Your project section reads like a README with zero stars.\n[FIX]: Add what problem it solved, who uses it, and one number proving it worked.'
      );
    }
  };

  const getAIFeedback = async () => {
    if (!resumeText.trim()) { showToast('Please add resume text first', 'error'); return; }
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'feedback',
          userMsg: resumeText,
          systemMsg: 'You are DevDebug AI, an expert resume reviewer for software developer internship roles. Analyze the resume and give 6 specific, actionable feedback points. Each point must start with "- ". Focus on: ATS optimization, impact metrics, action verbs, keyword gaps, project descriptions, contact info. Be direct, sharp, specific — not generic HR advice.',
        }),
      });
      const data = await res.json();
      setAiOutput(data.text || 'AI feedback unavailable.');
    } catch {
      setAiOutput('AI feedback unavailable. Check your connection and try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const getResumeRewrite = async () => {
    if (!resumeText.trim()) { showToast('Please add resume text first', 'error'); return; }
    setAiLoading(true);
    setAiOutput('');
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'rewrite',
          userMsg: `Rewrite this resume content to be significantly stronger:\n\n${resumeText}`,
          systemMsg: 'You are DevDebug AI Resume Rebuilder. Rewrite the experience and project bullets to be stronger. Use power action verbs, add impact framing with [X%] or [N users] placeholders where metrics should go. Output format:\n\nBEFORE:\n[original bullet]\n\nAFTER:\n[improved bullet]\n\n---\n\nDo this for each experience/project bullet. Keep improvements realistic and specific.',
        }),
      });
      const data = await res.json();
      if (data.text) {
        setBeforeAfter({ before: resumeText.substring(0, 600) + (resumeText.length > 600 ? '...' : ''), after: data.text });
        setAiOutput('✓ Rebuild complete — see Before / After preview below.');
      }
    } catch {
      setAiOutput('Rebuild unavailable. Check your connection.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleDownload = () => {
    if (!analysis) { showToast('Run an analysis first', 'error'); return; }
    downloadText(generateReportText('resume', analysis), 'devdebug-resume-report.txt');
    showToast('Report downloaded ✓', 'success');
  };

  const renderFallbackPatchNotes = (a: ResumeAnalysis) =>
    `v1.1 — bullet quality patch\n+ Replace all weak verbs with power action verbs (architected, shipped, deployed)\n+ Add quantified impact to at least 3 bullets per experience entry\n+ Trim bullets to one line max, two lines for complex achievements\n\nv1.2 — projects module update\n+ Add GitHub repo URL and live demo link to every project\n+ Add tech stack inline: "Tech: React, FastAPI, PostgreSQL, Docker"\n+ Add one measurable outcome per project description\n\nv1.3 — ATS keyword patch\n+ Add missing keywords: ${a.missingTech.slice(0, 4).join(', ')}\n+ Create a dedicated Skills section with tech organized by category`;

  const parsePatchText = (text: string) => {
    const blocks = text.trim().split(/\n(?=v\d+\.\d+)/);
    return blocks.map((block, i) => {
      const lines = block.trim().split('\n').filter(l => l.trim());
      if (!lines.length) return null;
      const ver = lines[0].trim();
      const items = lines.slice(1).filter(l => l.trim().startsWith('+'));
      return (
        <div key={i} className="patch">
          <div className="patch-ver">{ver}</div>
          {items.map((item, j) => (
            <div key={j} className="patch-item">{item.replace(/^\+\s*/, '')}</div>
          ))}
        </div>
      );
    });
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

  const atsData = analysis
    ? [
        { label: 'Keywords', score: analysis.kwScore, max: 30, color: analysis.kwScore >= 24 ? '#7a8a78' : analysis.kwScore >= 18 ? '#d99a5b' : '#d6634d' },
        { label: 'Structure', score: analysis.structScore, max: 20, color: analysis.structScore >= 16 ? '#7a8a78' : '#d99a5b' },
        { label: 'Formatting', score: analysis.formatScore, max: 15, color: analysis.formatScore >= 12 ? '#7a8a78' : '#d99a5b' },
        { label: 'Bullet quality', score: analysis.bulletScore, max: 15, color: analysis.bulletScore >= 10 ? '#7a8a78' : analysis.bulletScore >= 6 ? '#d99a5b' : '#d6634d' },
        { label: 'Readability', score: analysis.readScore, max: 10, color: analysis.readScore >= 8 ? '#7a8a78' : '#d99a5b' },
        { label: 'Projects', score: analysis.projScore, max: 10, color: analysis.projScore >= 7 ? '#7a8a78' : analysis.projScore >= 4 ? '#d99a5b' : '#d6634d' },
      ]
    : [];

  const circleColor = analysis
    ? analysis.health >= 80 ? '#7a8a78' : analysis.health >= 65 ? '#d99a5b' : '#d6634d'
    : '#d99a5b';

  const circleOffset = analysis ? 263.9 - (263.9 * analysis.health) / 100 : 47.5;

  return (
    <>
      <Navbar />
      <WorkspaceLayout opacity={0.12} overlayOpacity={0.88} blur="2px">
        <div className="page-inner">
          <div className="page-header">
            <div className="page-title">
              Resume debugger<span className="dim">.run()</span>
            </div>
            <div className="page-sub">
              Upload your resume PDF — we parse the real content and run full ATS analysis.
            </div>
          </div>

          {/* ── UPLOAD ── */}
          {stage === 'upload' && (
            <div className="upload-wrap">
              <div
                className={`upload-zone${dragging ? ' drag' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
              >
                <div className="upload-icon">📎</div>
                <div className="upload-title">Drop your resume here</div>
                <div className="upload-sub">
                  Supports <span>PDF</span> — drag &amp; drop or click to browse
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
              </div>
              <button
                className="btn-primary"
                style={{ width: '100%', borderRadius: '13px', padding: '13px' }}
                onClick={() => processResume(DEMO_TEXT)}
              >
                Run with demo resume
              </button>
            </div>
          )}

          {/* ── LOADING ── */}
          {stage === 'loading' && (
            <div className="loading-screen">
              <div className="spinner" />
              <div className="loading-title">Analyzing resume</div>
              <div className="loading-sub">Running 6 diagnostic modules</div>
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
                  <h3>Resume health</h3>
                  <div className="stat-row">
                    <div className="stat-chip err">{analysis.errorCount} errors</div>
                    <div className="stat-chip warn">{analysis.warnCount} warnings</div>
                    <div className="stat-chip ok">{analysis.passedCount} passed</div>
                  </div>
                </div>
              </div>

              {/* ATS */}
              <div className="section-title">
                ATS score breakdown —{' '}
                <strong style={{ color: 'var(--amber-light)' }}>{analysis.atsTotal}/100</strong>
              </div>
              <div className="ats-grid">
                {atsData.map((d) => (
                  <div key={d.label} className="ats-item">
                    <div className="ats-label">
                      <span>{d.label}</span>
                      <span className="ats-score" style={{ color: d.color }}>{d.score}/{d.max}</span>
                    </div>
                    <div className="ats-bar">
                      <div className="ats-fill" style={{ width: `${Math.round((d.score / d.max) * 100)}%`, background: d.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Bugs */}
              <div className="section-title">Career bugs detected</div>
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

              {/* Keywords */}
              <div className="section-title">Keyword analysis</div>
              <div className="kw-section">
                <div className="kw-sub" style={{ marginBottom: 8, color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>
                  ✓ Found keywords
                </div>
                <div className="kw-grid">
                  {[...analysis.foundTech, ...analysis.foundSoft.slice(0, 3)].map((k) => (
                    <span key={k} className="kw-badge found">{k}</span>
                  ))}
                </div>
                <div className="kw-sub" style={{ margin: '14px 0 8px', color: 'var(--ink-2)', fontSize: 13, fontWeight: 500 }}>
                  ✕ Missing keywords
                </div>
                <div className="kw-grid">
                  {analysis.missingTech.map((k) => (
                    <span key={k} className="kw-badge missing">{k}</span>
                  ))}
                </div>
              </div>

              {/* Patch Notes */}
              <div className="section-title">AI patch notes</div>
              {patchNotes ? (
                parsePatchText(patchNotes)
              ) : (
                <div className="ai-loading-inline">
                  <span>Generating AI patch notes</span>
                  <span className="ai-dots"><span>.</span><span>.</span><span>.</span></span>
                </div>
              )}

              {/* Roast */}
              <div className="roast-section">
                <div className="roast-header" onClick={() => setRoastOpen(!roastOpen)}>
                  <h4>🔥 Roast mode</h4>
                  <span className="roast-toggle">{roastOpen ? 'Collapse ↑' : 'Enable →'}</span>
                </div>
                <div className={`roast-body${roastOpen ? ' open' : ''}`}>
                  {roastContent ? (
                    parseRoastText(roastContent)
                  ) : (
                    <div className="ai-loading-inline">
                      <span>Loading roast</span>
                      <span className="ai-dots"><span>.</span><span>.</span><span>.</span></span>
                    </div>
                  )}
                </div>
              </div>

              {/* AI Feedback */}
              <div className="section-title">AI resume feedback &amp; rebuilder</div>
              <div className="ai-block">
                <div className="ai-block-title">PASTE RESUME TEXT OR IT WILL USE PARSED CONTENT</div>
                <textarea
                  className="ai-textarea"
                  value={resumeText}
                  onChange={(e) => setResumeText(e.target.value)}
                  placeholder="Resume text auto-filled after PDF parse. You can also paste directly..."
                />
                <div className="ai-btn-row">
                  <button className="btn-primary" style={{ borderRadius: '30px' }} onClick={getAIFeedback} disabled={aiLoading}>
                    Get AI feedback
                  </button>
                  <button className="btn-ghost" style={{ borderRadius: '30px', padding: '13px 24px', fontSize: 14 }} onClick={getResumeRewrite} disabled={aiLoading}>
                    ✦ Rebuild resume
                  </button>
                  <button className="btn-ghost" style={{ borderRadius: '30px', padding: '13px 24px', fontSize: 14 }} onClick={handleDownload}>
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

              {/* Before / After */}
              {beforeAfter && (
                <div>
                  <div className="section-title">Before / After preview</div>
                  <div className="before-after">
                    <div className="ba-card">
                      <div className="ba-label">◦ BEFORE</div>
                      <div className="ba-content">{beforeAfter.before}</div>
                    </div>
                    <div className="ba-card after">
                      <div className="ba-label">✓ AFTER — AI IMPROVED</div>
                      <div className="ba-content">{beforeAfter.after}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <div style={{ marginTop: 24 }}>
                <button
                  className="btn-ghost"
                  style={{ borderRadius: 30, padding: '13px 24px', fontSize: 14 }}
                  onClick={() => { setStage('upload'); setAnalysis(null); setAiOutput(''); setPatchNotes(''); setRoastContent(''); setBeforeAfter(null); }}
                >
                  ← Analyze new resume
                </button>
              </div>
            </div>
          )}
        </div>
        <Footer />
      </WorkspaceLayout>

      {/* Toast */}
      {toast && (
        <div className={`toast show ${toast.type}`}>{toast.msg}</div>
      )}
    </>
  );
}
