'use client'

import Link from 'next/link'

export default function NotFound() {
  return (
    <>
      <style>{`
        .nf-root {
          min-height: 100vh;
          background: var(--color-bg, #ffffff);
          color: var(--color-fg, #000000);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px 60px;
          gap: 20px;
          overflow-x: hidden;
          font-family: var(--font-primary, 'Outfit', ui-sans-serif, system-ui, sans-serif);
          -webkit-font-smoothing: antialiased;
        }

        /* ─── Header ──────────────────── */
        .nf-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          padding: 20px 32px;
          display: flex;
          align-items: center;
          z-index: 10;
          border-bottom: 1px solid var(--color-border, #e5e5e5);
          background: var(--color-bg, #ffffff);
        }
        .nf-logo {
          font-family: var(--font-primary, 'Outfit', ui-sans-serif, system-ui, sans-serif);
          font-size: 18px;
          font-weight: 700;
          letter-spacing: -0.03em;
          color: var(--color-fg, #000000);
          text-decoration: none;
        }

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
          font-family: var(--font-primary, 'Outfit', ui-sans-serif, system-ui, sans-serif);
          font-size: 38vw;
          font-weight: 900;
          line-height: 0.85;
          letter-spacing: -0.04em;
          color: #222222;
          user-select: none;
          flex-shrink: 0;
        }
        .nf-four-left  { animation: nf-slide-left  0.5s cubic-bezier(0.16,1,0.3,1) both; }
        .nf-four-right { animation: nf-slide-right 0.5s cubic-bezier(0.16,1,0.3,1) both; }

        /* ─── 3D image ────────────────── */
        .nf-img {
          width: 24vw;
          height: 24vw;
          object-fit: contain;
          flex-shrink: 0;
          margin-top: -2vw;
          animation: nf-levitate 3s ease-in-out infinite;
        }

        /* ─── Caption ─────────────────── */
        .nf-caption {
          text-align: center;
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.25s both;
        }
        .nf-caption-main {
          font-size: clamp(17px, 2vw, 24px);
          font-weight: 600;
          letter-spacing: -0.02em;
          margin-bottom: 6px;
          color: var(--color-fg, #000000);
        }
        .nf-caption-sub {
          font-size: clamp(13px, 1.2vw, 16px);
          font-weight: 400;
          color: var(--color-fg-muted, #a3a3a3);
        }

        /* ─── CTA ─────────────────────── */
        .nf-cta {
          animation: nf-fade-up 0.5s cubic-bezier(0.16,1,0.3,1) 0.35s both;
          margin-top: 4px;
        }
        .nf-cta a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 10px 20px;
          border-radius: 10px;
          background: var(--color-primary, #000000);
          color: var(--color-primary-fg, #ffffff);
          text-decoration: none;
          font-family: var(--font-primary, 'Outfit', ui-sans-serif, system-ui, sans-serif);
          font-size: 14px;
          font-weight: 500;
          letter-spacing: -0.01em;
          transition: opacity 180ms ease;
        }
        .nf-cta a:hover { opacity: 0.82; }

        /* ─── Keyframes ───────────────── */
        @keyframes nf-slide-left {
          from { opacity: 0; transform: translateX(-32px); }
          to   { opacity: 1; transform: translateX(0);     }
        }
        @keyframes nf-slide-right {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0);    }
        }
        @keyframes nf-fade-up {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes nf-levitate {
          0%, 100% { transform: translateY(0);    }
          50%       { transform: translateY(-8px); }
        }

        /* ─── Mobile ──────────────────── */
        @media (max-width: 600px) {
          .nf-header { padding: 16px 20px; }
          .nf-four { font-size: 34vw; }
          .nf-img  { width: 22vw; height: 22vw; }
        }
      `}</style>

      {/* ─── Header ────────────────────────────────────────── */}
      <header className="nf-header">
        <Link href="/" className="nf-logo">Styll</Link>
      </header>

      {/* ─── Main ──────────────────────────────────────────── */}
      <main className="nf-root">

        {/* 404 typographic hero */}
        <div className="nf-hero">
          <span className="nf-four nf-four-left">4</span>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="nf-img"
            src="/img/face3d.png"
            alt=""
            onError={(e) => {
              const el = e.currentTarget
              el.style.display = 'none'
              const span = document.createElement('span')
              span.textContent = '✂️'
              span.style.cssText =
                'font-size:20vw;line-height:1;display:inline-block;flex-shrink:0;margin-top:-1vw;animation:nf-levitate 3s ease-in-out infinite'
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
