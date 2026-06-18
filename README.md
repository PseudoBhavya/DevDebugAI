# DevDebug AI 🚀

**Debug your career before recruiters do.**

DevDebug AI is a premium AI-powered platform that helps developers analyze their resumes and portfolios, identify career bugs, improve ATS readiness, and receive actionable recruiter-style feedback before applying for internships or jobs.

---

## ✨ Features

### 📄 Resume Debugger

Upload a resume and receive:

* ATS Score
* Missing Keywords Detection
* Resume Structure Analysis
* Formatting Review
* Bullet Point Quality Analysis
* Readability Insights
* Project Quality Assessment
* AI-Powered Improvement Suggestions

---

### 🌐 Portfolio Debugger

Analyze your portfolio website and receive:

* Portfolio Health Score
* UX & Structure Feedback
* Missing Sections Detection
* Recruiter Perspective Analysis
* Credibility & Trust Signals Review
* Improvement Recommendations

---

### 🐛 Career Bug Detection

DevDebug AI identifies weaknesses as actionable bugs.

Example:

**Bug #1**
Severity: High

Your project descriptions explain what you built but not the impact.

**Suggested Fix**
Add measurable outcomes, user impact, and technical achievements.

---

### 🔥 Roast Mode

Constructive but brutally honest feedback designed to help developers improve faster.

---

### 📊 Career Dashboard

Track your career readiness with:

* Resume Health
* Portfolio Health
* Developer Readiness Score
* Analysis History
* Recommended Improvements

---

## 🛠️ Tech Stack

### Frontend

* Next.js 15 (App Router)
* TypeScript
* Tailwind CSS
* Framer Motion
* shadcn/ui

### AI

* Google Gemini API

### Utilities

* PDF Parsing
* Rule-Based ATS Engine
* Local Storage Persistence

---

## 🏗️ Architecture

```bash
src/
│
├── app/
│   ├── page.tsx
│   ├── resume/
│   ├── portfolio/
│   ├── dashboard/
│   └── api/
│
├── components/
│   ├── HeroSection
│   ├── Navbar
│   ├── Footer
│   ├── WorkspaceLayout
│   └── Feature Components
│
├── lib/
│   ├── ats-engine.ts
│   ├── gemini.ts
│   ├── storage.ts
│   └── utils.ts
│
└── public/
    └── hero-bg.mp4
```

---

## 🎯 ATS Scoring System

DevDebug AI uses a deterministic rule-based ATS engine.

### Scoring Breakdown

| Category         | Points |
| ---------------- | ------ |
| Keywords         | 30     |
| Resume Structure | 20     |
| Formatting       | 15     |
| Bullet Quality   | 15     |
| Readability      | 10     |
| Project Quality  | 10     |

**Total Score: 100**

This provides consistent and explainable ATS scoring instead of relying solely on AI-generated estimates.

---

## 🚀 Getting Started

### Clone Repository

```bash
git clone <repository-url>
cd DevDebugAI
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create:

```bash
.env.local
```

Add:

```env
GEMINI_API_KEY=YOUR_API_KEY
```

### Run Development Server

```bash
npm run dev
```

Open:

```bash
http://localhost:3000
```

---

## 🌟 Future Roadmap

### Coming Soon

* GitHub Repository Analyzer
* LinkedIn Profile Analyzer
* AI Resume Rebuilder
* Cover Letter Generator
* Recruiter Simulation Mode
* Career Progress Tracking

---

## 📷 Screenshots

Add screenshots of:

* Homepage
* Resume Debugger
* Portfolio Debugger
* Dashboard

---

## 👨‍💻 Author

**Bhavya Pandey**

Built as part of the Digital Heroes Developer Trial Task.

---

## 📄 License

This project is intended for educational, portfolio, and demonstration purposes.
