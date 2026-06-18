// ─── ATS scoring constants ───────────────────────────────────────────────────

export const TECH_KEYWORDS = [
  'python','javascript','typescript','react','angular','vue','node','express',
  'django','flask','fastapi','sql','mysql','postgresql','mongodb','redis',
  'docker','kubernetes','git','github','aws','gcp','azure','linux','rest',
  'api','graphql','html','css','java','c++','go','rust','machine learning',
  'deep learning','tensorflow','pytorch','scikit','pandas','numpy',
];

export const SOFT_KEYWORDS = [
  'leadership','communication','teamwork','problem solving','analytical',
  'collaboration','agile','scrum','sprint','deadline','cross-functional',
];

export const INDUSTRY_KEYWORDS = [
  'ci/cd','devops','microservices','cloud','deployment','testing','unit test',
  'integration','version control','code review','pull request','open source',
];

export const POWER_VERBS = [
  'architected','built','deployed','designed','developed','engineered',
  'implemented','launched','led','optimized','reduced','improved','increased',
  'delivered','shipped','created','automated','scaled','migrated','refactored',
];

export const WEAK_VERBS = [
  'worked on','helped with','assisted','did','made','was responsible',
  'contributed to','involved in','part of','participated',
];

export const SECTIONS = [
  'education','experience','skills','projects','contact','summary',
  'objective','certifications','achievements',
];

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Bug {
  id: number;
  title: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  desc: string;
  fix: string;
  source?: 'resume' | 'portfolio';
}

export interface ResumeAnalysis {
  health: number;
  atsTotal: number;
  kwScore: number;
  structScore: number;
  formatScore: number;
  bulletScore: number;
  readScore: number;
  projScore: number;
  foundTech: string[];
  foundSoft: string[];
  foundIndustry: string[];
  missingTech: string[];
  sectionsFound: string[];
  sectionsMissing: string[];
  bugs: Bug[];
  errorCount: number;
  warnCount: number;
  passedCount: number;
  hasMetrics: string[];
  hasPowerVerbs: string[];
  weakBullets: string[];
  text: string;
}

export interface PortfolioCheck {
  label: string;
  key: string;
  severity: 'error' | 'warning' | 'low';
}

export interface PortfolioAnalysis {
  url: string;
  extractedText: string;
  health: number;
  confidence: number;
  checks: Record<string, boolean>;
  checkList: PortfolioCheck[];
  passedChecks: PortfolioCheck[];
  failedErrors: PortfolioCheck[];
  failedWarnings: PortfolioCheck[];
  bugs: Bug[];
  strengths: string[];
  weaknesses: string[];
  confidenceQuote: string;
  errorCount: number;
  warnCount: number;
  passedCount: number;
}

export interface HistoryEntry {
  id: number;
  type: 'resume' | 'portfolio';
  timestamp: string;
  health: number;
  atsTotal: number | null;
  bugCount: number;
  url: string | null;
  errorCount: number;
  warnCount: number;
}

// ─── Resume Analysis Engine ───────────────────────────────────────────────────

export function analyzeResume(text: string): ResumeAnalysis {
  const lower = text.toLowerCase();
  const lines = text.split('\n').filter(l => l.trim());
  const bullets = lines.filter(l => l.trim().match(/^[-•*►▸▪]|^\d\./));

  const sectionsFound = SECTIONS.filter(s => lower.includes(s));
  const sectionsMissing = SECTIONS.filter(
    s => !lower.includes(s) && !['certifications', 'objective'].includes(s)
  );

  const foundTech = TECH_KEYWORDS.filter(k => lower.includes(k));
  const foundSoft = SOFT_KEYWORDS.filter(k => lower.includes(k));
  const foundIndustry = INDUSTRY_KEYWORDS.filter(k => lower.includes(k));
  const missingTech = TECH_KEYWORDS.filter(k => !lower.includes(k)).slice(0, 8);

  const totalFoundKw = foundTech.length + foundSoft.length + foundIndustry.length;
  const kwScore = Math.min(30, Math.round((totalFoundKw / 20) * 30));

  const structScore = Math.min(
    20,
    sectionsFound.length * 4 + (lower.includes('github') || lower.includes('linkedin') ? 2 : 0)
  );

  const hasEmail = /[\w.-]+@[\w.-]+\.[a-z]{2,}/i.test(text);
  const hasGithub = lower.includes('github');
  const hasLinkedin = lower.includes('linkedin');
  const hasPhone = /\+?[\d\s()-]{10,}/.test(text);
  const formatScore = Math.min(
    15,
    (hasEmail ? 4 : 0) + (hasGithub ? 3 : 0) + (hasLinkedin ? 3 : 0) +
    (hasPhone ? 2 : 0) + (bullets.length > 3 ? 3 : 0)
  );

  const weakBullets = bullets.filter(b =>
    WEAK_VERBS.some(v => b.toLowerCase().includes(v))
  );
  const hasPowerVerbs = bullets.filter(b =>
    POWER_VERBS.some(v => b.toLowerCase().includes(v))
  );
  const hasMetrics = bullets.filter(b =>
    /\d+%|\d+ (user|client|people|feature|project|day|hour|ms|second)/i.test(b)
  );
  const bulletScore = Math.min(
    15,
    Math.max(0, 15 - weakBullets.length * 3 + hasPowerVerbs.length * 2 + hasMetrics.length * 2)
  );

  const avgLen = lines.reduce((a, l) => a + l.length, 0) / (lines.length || 1);
  const readScore = Math.min(10, avgLen < 120 ? 8 : avgLen < 160 ? 6 : 4);

  const hasProjectLinks = lower.includes('github.com') && !!lower.match(/github\.com\/[\w-]+\/[\w-]+/);
  const hasLiveLinks =
    lower.includes('vercel') || lower.includes('netlify') || lower.includes('heroku') ||
    !!lower.match(/https?:\/\/(?!github)/);
  const projectCount = (lower.match(/project/g) || []).length;
  const projScore = Math.min(
    10,
    (hasProjectLinks ? 3 : 0) + (hasLiveLinks ? 2 : 0) +
    Math.min(4, projectCount) + (hasMetrics.length > 0 ? 1 : 0)
  );

  const atsTotal = kwScore + structScore + formatScore + bulletScore + readScore + projScore;
  const health = Math.round(50 + atsTotal * 0.5);

  const bugs: Bug[] = [];
  let bugIdx = 1;

  if (hasMetrics.length === 0)
    bugs.push({
      id: bugIdx++, title: 'No measurable impact in bullets', severity: 'critical',
      desc: 'Every bullet reads like a task list, not an achievement. ATS and recruiters both score impact metrics heavily — zero metrics means zero differentiation.',
      fix: 'Add at least one number per bullet. "Reduced load time by 40%", "served 200+ users", "cut deployment time from 20 min to 3 min".',
    });

  if (weakBullets.length >= 2)
    bugs.push({
      id: bugIdx++, title: 'Weak action verbs detected', severity: 'critical',
      desc: `${weakBullets.length} bullets use passive language like "worked on" or "helped with". These signal junior thinking and score poorly in ATS keyword matching.`,
      fix: 'Replace every passive verb. "Worked on auth system" → "Architected JWT-based auth, reducing login errors by 30%".',
    });

  if (!hasProjectLinks)
    bugs.push({
      id: bugIdx++, title: 'No GitHub project links', severity: 'high',
      desc: 'Projects with no links read as theoretical. Recruiters click GitHub repos to verify your code quality before scheduling interviews.',
      fix: 'Add full GitHub URLs to each project. Format: github.com/username/repo-name.',
    });

  if (!hasLinkedin)
    bugs.push({
      id: bugIdx++, title: 'Missing LinkedIn URL', severity: 'medium',
      desc: 'Recruiters cross-reference LinkedIn before contacting candidates. Missing it adds friction and reduces reply rate.',
      fix: 'Add your custom LinkedIn URL: linkedin.com/in/yourname',
    });

  if (sectionsMissing.includes('summary'))
    bugs.push({
      id: bugIdx++, title: 'No professional summary', severity: 'high',
      desc: 'Recruiters spend 6-7 seconds scanning a resume. A missing summary means they start with raw experience — no narrative, no hook.',
      fix: 'Add a 2-3 line summary: "CS student at [X], specializing in [Y]. Built [Z] with [tech]. Seeking internship in [domain]."',
    });

  if (projScore < 5)
    bugs.push({
      id: bugIdx++, title: 'Projects section underdeveloped', severity: 'high',
      desc: 'Projects are your strongest signal as a student without full-time experience. Thin project descriptions fail ATS and recruiter review alike.',
      fix: 'Each project needs: name, tech stack, 2-3 bullets with impact, GitHub link, and live demo link.',
    });

  if (foundTech.length < 8)
    bugs.push({
      id: bugIdx++, title: 'Low technical keyword density', severity: 'medium',
      desc: `Only ${foundTech.length} technical keywords detected. ATS filters typically require 12-15+ matching keywords to pass the initial screen.`,
      fix: 'Add a dedicated Skills section listing all technologies. Include both tools and concepts (e.g., "REST APIs, CI/CD, Docker, Unit Testing").',
    });

  const errorCount = bugs.filter(b => b.severity === 'critical').length;
  const warnCount = bugs.filter(b => b.severity === 'high').length;
  const passedCount = 12 - errorCount - warnCount;

  return {
    health, atsTotal, kwScore, structScore, formatScore, bulletScore, readScore, projScore,
    foundTech, foundSoft, foundIndustry, missingTech,
    sectionsFound, sectionsMissing,
    bugs, errorCount, warnCount, passedCount,
    hasMetrics, hasPowerVerbs, weakBullets,
    text,
  };
}

// ─── Portfolio Analysis Engine ────────────────────────────────────────────────

export async function analyzePortfolio(url: string): Promise<PortfolioAnalysis> {
  const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
  let html = '';
  let extractedText = '';

  try {
    const res = await fetch(proxyUrl);
    const data = await res.json();
    html = data.contents || '';
    const div = document.createElement('div');
    div.innerHTML = html;
    extractedText = (div.innerText || div.textContent || '')
      .replace(/\s+/g, ' ').trim().substring(0, 3000);
  } catch {
    extractedText = `Portfolio at ${url}`;
  }

  const lower = (html + extractedText).toLowerCase();

  const checks: Record<string, boolean> = {
    about: lower.includes('about') || lower.includes('who i am') || lower.includes('bio'),
    projects: lower.includes('project') || lower.includes('work') || lower.includes('portfolio'),
    contact: lower.includes('contact') || lower.includes('email') || lower.includes('reach'),
    github: lower.includes('github'),
    linkedin: lower.includes('linkedin'),
    resume: lower.includes('resume') || lower.includes('cv') || lower.includes('download'),
    cta: lower.includes('hire') || lower.includes('available') || lower.includes('opportunity') ||
      lower.includes("let's talk") || lower.includes('get in touch'),
    mobile: html.includes('viewport') || html.includes('responsive') || html.includes('meta name="viewport"'),
    metrics: /\d+\+?\s*(user|project|client|star|fork|deploy|download)/i.test(extractedText),
    social: lower.includes('twitter') || lower.includes('instagram') || lower.includes('behance') || lower.includes('dribbble'),
  };

  const checkList: PortfolioCheck[] = [
    { label: 'About section', key: 'about', severity: 'error' },
    { label: 'Projects section', key: 'projects', severity: 'error' },
    { label: 'Contact section', key: 'contact', severity: 'error' },
    { label: 'GitHub link', key: 'github', severity: 'warning' },
    { label: 'LinkedIn link', key: 'linkedin', severity: 'warning' },
    { label: 'Resume download link', key: 'resume', severity: 'warning' },
    { label: 'Call to action', key: 'cta', severity: 'warning' },
    { label: 'Mobile responsive', key: 'mobile', severity: 'warning' },
    { label: 'Project impact metrics', key: 'metrics', severity: 'warning' },
    { label: 'Social links', key: 'social', severity: 'low' },
  ];

  const passedChecks = checkList.filter(c => checks[c.key]);
  const failedErrors = checkList.filter(c => !checks[c.key] && c.severity === 'error');
  const failedWarnings = checkList.filter(c => !checks[c.key] && c.severity === 'warning');

  const completeness = passedChecks.length / checkList.length;
  const credibility = (checks.github ? 20 : 0) + (checks.projects ? 20 : 0) + (checks.metrics ? 15 : 0);
  const contactability = (checks.contact ? 25 : 0) + (checks.linkedin ? 10 : 0) + (checks.resume ? 15 : 0);
  const recruiterReady = (checks.cta ? 10 : 0) + (checks.mobile ? 10 : 0) + (checks.about ? 10 : 0);

  const rawScore = Math.round(
    (completeness * 40) + (credibility / 5.5) + (contactability / 5) + (recruiterReady / 3)
  );
  const health = Math.min(98, Math.max(30, rawScore));
  const confidence = Math.round(health * 0.85);

  const bugs: Bug[] = [];
  let bIdx = 1;
  if (!checks.contact) bugs.push({ id: bIdx++, title: 'Missing contact section', severity: 'critical', desc: 'Recruiters who want to reach you outside job portals have no way to do so. Warm outreach dies here.', fix: 'Add a contact page or section with email, LinkedIn, and a contact form.' });
  if (!checks.resume) bugs.push({ id: bIdx++, title: 'No resume download link', severity: 'high', desc: 'Your portfolio is top of funnel. If recruiters cannot grab your resume in one click, they leave and do not return.', fix: 'Add a "Download Resume" button in your nav and hero section, linking to a PDF.' });
  if (!checks.metrics) bugs.push({ id: bIdx++, title: 'No project impact metrics', severity: 'high', desc: 'Every project says what it is. None say what it achieved. Numbers separate projects from achievements.', fix: 'Add one stat per project — user count, performance gain, stars, uptime, or usage metrics.' });
  if (!checks.cta) bugs.push({ id: bIdx++, title: 'Weak or missing call to action', severity: 'medium', desc: 'No CTA means visitors finish browsing and close the tab. You need to tell them exactly what to do next.', fix: '"Open to internship opportunities — let\'s talk" with a link to your contact form in the hero.' });
  if (!checks.linkedin) bugs.push({ id: bIdx++, title: 'No LinkedIn link', severity: 'medium', desc: 'Recruiters validate candidates on LinkedIn before reaching out. A missing link adds friction.', fix: 'Add your LinkedIn profile URL in the header or footer.' });

  const strengths: string[] = [];
  if (checks.about) strengths.push('About section clearly establishes your identity');
  if (checks.projects) strengths.push('Projects section found — proof of work exists');
  if (checks.github) strengths.push('GitHub linked — code is verifiable');
  if (checks.mobile) strengths.push('Mobile responsive — professional baseline');
  if (checks.social) strengths.push('Social presence adds personality');

  const weaknesses: string[] = [];
  if (!checks.contact) weaknesses.push('No contact section — recruiters cannot reach you');
  if (!checks.metrics) weaknesses.push('Projects lack impact numbers');
  if (!checks.resume) weaknesses.push('No resume download — key friction point');
  if (!checks.cta) weaknesses.push('No clear next step for the recruiter');
  if (!checks.linkedin) weaknesses.push('LinkedIn missing — validation gap');

  const confidenceQuote =
    health >= 80
      ? '"Strong portfolio. Would forward to hiring manager."'
      : health >= 65
      ? '"Good work, but needs a contact section and more project metrics before I\'d reach out."'
      : '"Interesting projects, but I can\'t reach them and there\'s no clear signal they\'re available. Moving on."';

  return {
    url, extractedText, health, confidence, checks, checkList,
    passedChecks, failedErrors, failedWarnings,
    bugs, strengths, weaknesses, confidenceQuote,
    errorCount: failedErrors.length, warnCount: failedWarnings.length,
    passedCount: passedChecks.length,
  };
}

// ─── Report generation ────────────────────────────────────────────────────────

export function generateReportText(
  type: 'resume' | 'portfolio',
  analysis: ResumeAnalysis | PortfolioAnalysis
): string {
  const isResume = type === 'resume';
  const a = analysis as ResumeAnalysis & PortfolioAnalysis;
  const lines = [
    `DevDebug AI — ${isResume ? 'Resume' : 'Portfolio'} Analysis Report`,
    `Generated: ${new Date().toLocaleString()}`,
    '═══════════════════════════════════════',
    '',
    `HEALTH SCORE: ${a.health}/100`,
    isResume ? `ATS SCORE: ${a.atsTotal}/100` : `CONFIDENCE: ${a.confidence}%`,
    '',
    `─── BUGS DETECTED (${a.bugs.length}) ───`,
    ...a.bugs.map(b => `[${b.severity.toUpperCase()}] ${b.title}\n  ${b.desc}\n  Fix: ${b.fix}`),
    '',
    isResume
      ? `─── MISSING KEYWORDS ───\n${(a.missingTech || []).join(', ')}`
      : `─── WEAKNESSES ───\n${(a.weaknesses || []).join('\n')}`,
    '',
    '─── RECOMMENDATIONS ───',
    '1. Address all critical bugs first',
    '2. Fix high-priority issues within one week',
    '3. Handle medium issues before next application cycle',
    '',
    'Built by DevDebug AI — digitalheroesco.com',
  ];
  return lines.join('\n');
}

export function downloadText(text: string, filename: string): void {
  const blob = new Blob([text], { type: 'text/plain' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h ago`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
