'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      {/* ─── Fonts (Anton + Inter via @next/font would need extra setup;
           use <link> via Next.js head injection approach instead) ─── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Anton&family=Inter:wght@300;400&display=swap');

        .nf-root {
          min-height: 100vh;
          background: #F5F0EB;
          color: #222222;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px 24px 60px;
          gap: 24px;
          overflow-x: hidden;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        /* ─── Nav ─────────────────────── */
        .nf-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          padding: 28px 48px;
          display: flex;
          align-items: center;
          gap: 40px;
          z-index: 10;
        }
        .nf-nav a {
          font-family: 'Courier New', Courier, monospace;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #222222;
          text-decoration: none;
          opacity: 0.55;
          transition: opacity 200ms ease;
        }
        .nf-nav a:hover { opacity: 1; }

        /* ─── Hero row ────────────────── */
        .nf-hero {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 100vw;
          overflow: hidden;
        }
        .nf-four {
          font-family: 'Anton', sans-serif;
          font-size: 40vw;
          line-height: 0.82;
          color: #222222;
          user-select: none;
          flex-shrink: 0;
        }
        .nf-four-left  { animation: nf-slide-left  0.6s ease-out both; }
        .nf-four-right { animation: nf-slide-right 0.6s ease-out both; }

        /* ─── 3D image ────────────────── */
        .nf-img {
          width: 26vw;
          height: 26vw;
          object-fit: contain;
          flex-shrink: 0;
          margin-top: -2vw;
          animation: nf-levitate 3s ease-in-out infinite;
        }

        /* ─── Caption ─────────────────── */
        .nf-caption {
          text-align: center;
          animation: nf-fade-up 0.55s ease-out 0.4s both;
        }
        .nf-caption-main {
          font-size: clamp(18px, 2.2vw, 26px);
          font-weight: 400;
          letter-spacing: -0.01em;
          margin-bottom: 8px;
        }
        .nf-caption-sub {
          font-size: clamp(13px, 1.3vw, 17px);
          font-weight: 300;
          font-style: italic;
          opacity: 0.55;
        }

        /* ─── CTA ─────────────────────── */
        .nf-cta {
          animation: nf-fade-up 0.55s ease-out 0.55s both;
          margin-top: 8px;
        }
        .nf-cta a {
          display: inline-block;
          padding: 13px 32px;
          border: 1px solid #222222;
          color: #222222;
          background: transparent;
          text-decoration: none;
          font-family: 'Courier New', Courier, monospace;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          transition: background 240ms ease, color 240ms ease;
          cursor: pointer;
        }
        .nf-cta a:hover {
          background: #222222;
          color: #F5F0EB;
        }

        /* ─── Keyframes ───────────────── */
        @keyframes nf-slide-left {
          from { opacity: 0; transform: translateX(-48px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes nf-slide-right {
          from { opacity: 0; transform: translateX(48px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes nf-fade-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes nf-levitate {
          0%, 100% { transform: translateY(0);    }
          50%       { transform: translateY(-8px); }
        }

        /* ─── Mobile ──────────────────── */
        @media (max-width: 600px) {
          .nf-nav { padding: 18px 20px; gap: 18px; }
          .nf-nav a { font-size: 8px; letter-spacing: 0.15em; }
          .nf-four { font-size: 36vw; }
          .nf-img  { width: 24vw; height: 24vw; }
          .nf-cta a { padding: 11px 24px; font-size: 10px; }
        }
      `}</style>

      {/* ─── Nav ───────────────────────────────────────────── */}
      <nav className="nf-nav">
        <Link href="/">01/Home</Link>
        <Link href="/dashboard">02/Dashboard</Link>
        <Link href="/contatti">03/Contatti</Link>
      </nav>

      {/* ─── Main ──────────────────────────────────────────── */}
      <main className="nf-root">

        {/* 404 typographic hero */}
        <div className="nf-hero">
          <span className="nf-four nf-four-left">4</span>

          {/*
            Sostituisci src con il path della tua immagine 3D (PNG/WebP con sfondo trasparente).
            Esempio: src="/img/face3d.png"
          */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nf-img"
            src="/img/face3d.png"
            alt=""
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
              const span = document.createElement('span')
              span.textContent = '😢'
              span.style.cssText =
                'font-size:22vw;line-height:1;display:inline-block;flex-shrink:0;margin-top:-1vw;animation:nf-levitate 3s ease-in-out infinite'
              el.parentNode?.insertBefore(span, el)
            }}
          />

          <span className="nf-four nf-four-right">4</span>
        </div>

        {/* Caption */}
        <div className="nf-caption">
          <p className="nf-caption-main">Pagina non trovata.</p>
          <p className="nf-caption-sub">Torna a casa, barbiere.</p>
        </div>

        {/* CTA */}
        <div className="nf-cta">
          <Link href="/dashboard">← Torna alla dashboard</Link>
        </div>

      </main>
    </>
  )
}
