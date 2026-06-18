'use client';

import React from 'react';

interface WorkspaceLayoutProps {
  children: React.ReactNode;
  opacity: number;
  overlayOpacity: number;
  blur?: string;
}

export default function WorkspaceLayout({
  children,
  opacity,
  overlayOpacity,
  blur = '2px',
}: WorkspaceLayoutProps) {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      {/* Cinematic background video */}
      <video
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          zIndex: -20,
          opacity: opacity,
          filter: blur ? `blur(${blur})` : 'none',
          pointerEvents: 'none',
        }}
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/hero-bg.mp4" type="video/mp4" />
      </video>

      {/* Heavy dark overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: `rgba(0, 0, 0, ${overlayOpacity})`,
          zIndex: -10,
          pointerEvents: 'none',
        }}
      />

      {/* Main page content wrapper */}
      <div className="page-layout" style={{ position: 'relative', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
}
