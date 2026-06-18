import type { HistoryEntry, ResumeAnalysis, PortfolioAnalysis } from './ats-engine';

const HISTORY_KEY = 'devdebug_history';
const RESUME_KEY  = 'devdebug_resume_analysis';
const PORT_KEY    = 'devdebug_portfolio_analysis';

// ─── History ──────────────────────────────────────────────────────────────────

export function loadHistory(): HistoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch {
    return [];
  }
}

export function saveHistoryEntry(entry: HistoryEntry): void {
  const history = loadHistory();
  history.unshift(entry);
  const trimmed = history.slice(0, 20);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export function clearHistoryStorage(): void {
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(RESUME_KEY);
  localStorage.removeItem(PORT_KEY);
}

// ─── Analysis persistence ─────────────────────────────────────────────────────

export function saveResumeAnalysis(analysis: ResumeAnalysis): void {
  localStorage.setItem(RESUME_KEY, JSON.stringify(analysis));
}

export function loadResumeAnalysis(): ResumeAnalysis | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function savePortfolioAnalysis(analysis: PortfolioAnalysis): void {
  localStorage.setItem(PORT_KEY, JSON.stringify(analysis));
}

export function loadPortfolioAnalysis(): PortfolioAnalysis | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Build history entry ──────────────────────────────────────────────────────

export function buildHistoryEntry(
  type: 'resume' | 'portfolio',
  analysis: ResumeAnalysis | PortfolioAnalysis,
): HistoryEntry {
  const a = analysis as ResumeAnalysis & PortfolioAnalysis;
  return {
    id: Date.now(),
    type,
    timestamp: new Date().toISOString(),
    health: a.health,
    atsTotal: a.atsTotal ?? null,
    bugCount: a.bugs.length,
    url: a.url ?? null,
    errorCount: a.errorCount,
    warnCount: a.warnCount,
  };
}
