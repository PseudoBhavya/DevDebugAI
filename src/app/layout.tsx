import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'DevDebug AI — Debug your career before recruiters do',
  description:
    'Analyze your resume and portfolio, identify critical weaknesses, get AI-powered fixes, and ship yourself to your next internship or job.',
  keywords: ['resume analyzer', 'ATS score', 'career debug', 'portfolio review', 'internship', 'job search'],
  authors: [{ name: 'Bhavya Pandey' }],
  openGraph: {
    title: 'DevDebug AI — Debug your career before recruiters do',
    description: 'Find career bugs. Get recruiter feedback. Improve before you apply.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,ital,wght@9..144,0,300;9..144,0,400;9..144,0,500;9..144,0,600;9..144,1,400;9..144,1,500&family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        {/* PDF.js for client-side PDF parsing */}
        <script
          src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"
          async
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
