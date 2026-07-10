import Link from 'next/link'
import { buildPathWithTrialIntent, TRIAL_INTENT } from '@/lib/trial-intent'
import { PUBLIC_DPA_SECTION_ID } from '@/lib/legal/public-b2b'

export const dynamic = 'force-static'

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  primary: '#1A1A2E',
  accent: '#E94560',
  accentLight: 'rgba(233,69,96,0.12)',
  dark: '#0F0F1E',
  white: '#FFFFFF',
  lightBg: '#F8F8FC',
  textMuted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
}

const TRIAL_REGISTER_HREF = buildPathWithTrialIntent('/register', TRIAL_INTENT)

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div className="landing-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, letterSpacing: '-0.02em' }}>Styll</div>
        <div className="nav-links" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <a href="#pricing" style={{ fontSize: 14, color: C.textMuted, textDecoration: 'none', fontWeight: 500 }}>Prezzi</a>
          <Link href="/login" style={{ fontSize: 14, color: C.textMuted, textDecoration: 'none', fontWeight: 500 }}>Accedi</Link>
          <Link
            href={TRIAL_REGISTER_HREF}
            style={{ fontSize: 14, fontWeight: 700, color: C.white, textDecoration: 'none', background: C.primary, borderRadius: 8, padding: '8px 18px', whiteSpace: 'nowrap' }}
          >
            Prova gratis
          </Link>
        </div>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ background: C.primary, padding: '80px 24px 100px', overflow: 'hidden', position: 'relative' }}>
      <div style={{ position: 'absolute', top: -200, right: -100, width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div className="landing-container">
        <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }}>
          {/* Text */}
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)', borderRadius: 999, padding: '6px 14px', marginBottom: 28 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.accent, display: 'inline-block' }} />
              <span style={{ fontSize: 13, color: C.accent, fontWeight: 600 }}>Retention is King</span>
            </div>
            <h1 className="hero-h1" style={{ fontSize: 52, fontWeight: 800, color: C.white, lineHeight: 1.1, margin: '0 0 24px', letterSpacing: '-0.03em' }}>
              Il tuo negozio.<br />
              Il tuo brand.<br />
              <span style={{ color: C.accent }}>I tuoi clienti che tornano.</span>
            </h1>
            <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 40px', maxWidth: 460 }}>
              Non ti portiamo clienti. Ti aiutiamo a non perderli. Prenotazioni, loyalty e churn detection per barbieri indipendenti.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href={TRIAL_REGISTER_HREF} style={{ fontSize: 16, fontWeight: 700, color: C.white, textDecoration: 'none', background: C.accent, borderRadius: 12, padding: '14px 28px', display: 'inline-block' }}>
                Prova gratis 14 giorni
              </Link>
              <a href="#come-funziona" style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.75)', textDecoration: 'none', borderRadius: 12, padding: '14px 28px', display: 'inline-block', border: '1px solid rgba(255,255,255,0.2)' }}>
                Scopri come funziona ↓
              </a>
            </div>
            <div style={{ marginTop: 36, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex' }}>
                {['M', 'A', 'S', 'F'].map((initial, i) => (
                  <div key={i} style={{ width: 32, height: 32, borderRadius: '50%', background: ['#7C3AED', '#059669', '#D97706', '#2563EB'][i], border: '2px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: C.white, marginLeft: i > 0 ? -8 : 0, position: 'relative', zIndex: 4 - i }}>
                    {initial}
                  </div>
                ))}
              </div>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>
                <strong style={{ color: C.white }}>+137</strong> barbieri usano Styll ogni settimana
              </span>
            </div>
          </div>

          {/* Dashboard mockup */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
              {[C.accent, '#EF9F27', '#10B981'].map((c) => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c }} />
              ))}
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', marginLeft: 8 }}>Styll Dashboard</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Oggi', value: '8', sub: 'appuntamenti' },
                { label: 'Revenue', value: '€340', sub: 'settimana' },
                { label: 'Retention', value: '89%', sub: 'clienti fedeli' },
              ].map((k) => (
                <div key={k.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: '14px 12px' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>{k.label}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{k.sub}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16 }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 12, fontWeight: 600, letterSpacing: '0.06em' }}>CALENDARIO OGGI</div>
              {[
                { time: '10:00', name: 'Marco B.', service: 'Taglio + Barba', color: C.accent },
                { time: '11:30', name: 'Luigi R.', service: 'Taglio', color: '#7C3AED' },
                { time: '13:00', name: '—', service: 'Slot libero', color: '#374151' },
                { time: '14:30', name: 'Federico M.', service: 'Colorazione', color: C.success },
              ].map((a) => (
                <div key={a.time} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', width: 38, flexShrink: 0 }}>{a.time}</div>
                  <div style={{ flex: 1, background: a.name === '—' ? 'rgba(255,255,255,0.04)' : `${a.color}1A`, border: `1px solid ${a.name === '—' ? 'rgba(255,255,255,0.08)' : a.color + '55'}`, borderRadius: 8, padding: '6px 10px' }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: a.name === '—' ? 'rgba(255,255,255,0.25)' : C.white }}>{a.name}</div>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>{a.service}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── About ────────────────────────────────────────────────────────────────────
function About() {
  return (
    <section style={{ background: C.white, padding: '96px 24px' }}>
      <div className="landing-container" style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Chi siamo</p>
        <h2 style={{ fontSize: 40, fontWeight: 800, color: C.primary, lineHeight: 1.15, margin: '0 0 24px', letterSpacing: '-0.02em' }}>
          Styll non è un gestionale.<br />È la tua retention.
        </h2>
        <p style={{ fontSize: 18, color: C.textMuted, lineHeight: 1.8, margin: '0 0 40px' }}>
          Barbieri indipendenti e piccoli salon da tutta Italia scelgono Styll per gestire prenotazioni, fidelizzare i clienti e recuperare quelli a rischio di abbandono — tutto da un&apos;unica piattaforma.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, textAlign: 'left' }}>
          {[
            'Non sei su una piattaforma condivisa: il tuo brand, i tuoi clienti, il tuo spazio.',
            'I tuoi dati sono tuoi — export sempre gratis, nessun vendor lock-in.',
            'Gamification reale: streak, badge e livelli che i clienti amano davvero.',
          ].map((text, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </div>
              <span style={{ fontSize: 16, color: C.primary, lineHeight: 1.6 }}>{text}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Feature Cards ────────────────────────────────────────────────────────────
function FeatureCards() {
  const cards = [
    {
      icon: '📱',
      title: 'La TUA app brandizzata',
      description: 'Niente piattaforme esterne. I tuoi clienti vedono il tuo logo, i tuoi colori, il tuo brand — non il nostro.',
      badge: 'White-label completo',
      badgeColor: '#7C3AED',
    },
    {
      icon: '🔄',
      title: 'Retention is King',
      description: 'Silent churn detector, win-back automatico e loyalty gamificata. Sappi chi sta per andarsene prima che sia tardi.',
      badge: 'Blue Ocean',
      badgeColor: C.accent,
    },
    {
      icon: '💰',
      title: 'Prezzo trasparente',
      description: 'Un piano. Un prezzo. Zero costi nascosti. Export dei dati sempre gratis. Cambia idea quando vuoi.',
      badge: 'No vendor lock-in',
      badgeColor: C.success,
    },
  ]

  return (
    <section style={{ background: C.lightBg, padding: '96px 24px' }}>
      <div className="landing-container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Perché Styll</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>Costruito per barbieri, non per agenzie</h2>
        </div>
        <div className="cards-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {cards.map((card) => (
            <div key={card.title} style={{ background: C.white, borderRadius: 20, border: `1px solid ${C.border}`, padding: 32, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 40 }}>{card.icon}</div>
              <div>
                <h3 style={{ fontSize: 20, fontWeight: 700, color: C.primary, margin: '0 0 8px' }}>{card.title}</h3>
                <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>{card.description}</p>
              </div>
              <div style={{ marginTop: 'auto' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: card.badgeColor, background: `${card.badgeColor}14`, padding: '4px 12px', borderRadius: 999 }}>
                  {card.badge}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: '137K+', label: 'Barbieri in Italia', sub: 'Il tuo mercato' },
    { value: '48%', label: 'Engagement in più', sub: 'Con gamification' },
    { value: '89%', label: 'Retention rate', sub: 'Clienti che tornano' },
    { value: '3', label: 'Piani disponibili', sub: 'Starter, Growth, Pro' },
  ]

  return (
    <section style={{ background: C.primary, padding: '96px 24px' }}>
      <div className="landing-container">
        <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {stats.map((s, i) => (
            <div key={s.label} style={{ textAlign: 'center', padding: '40px 24px', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
              <div style={{ fontSize: 52, fontWeight: 900, color: C.white, lineHeight: 1, marginBottom: 8, letterSpacing: '-0.03em' }}>{s.value}</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'rgba(255,255,255,0.85)', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>{s.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { num: '01', title: 'Setup in 8 minuti', desc: 'Registra il tuo salone, configura i servizi e il team. Nessuna formazione richiesta.' },
    { num: '02', title: 'I clienti prenotano', desc: 'Via app brandizzata, link diretto o QR code. Nessuna chiamata, nessun WhatsApp.' },
    { num: '03', title: 'Gamification attiva', desc: 'I clienti guadagnano punti, badge e streak. Tornano perché vogliono, non perché devono.' },
    { num: '04', title: 'Retention sale', desc: 'Il churn detector identifica chi sta per andarsene. Recuperali con win-back automatici.' },
  ]

  return (
    <section id="come-funziona" style={{ background: C.white, padding: '96px 24px' }}>
      <div className="landing-container">
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Come funziona</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>Da zero a salone organizzato in un pomeriggio</h2>
        </div>
        <div className="steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {steps.map((step) => (
            <div key={step.num} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: C.accent, fontVariantNumeric: 'tabular-nums' }}>{step.num}</div>
              <div style={{ width: 48, height: 2, background: C.primary, borderRadius: 1 }} />
              <h3 style={{ fontSize: 18, fontWeight: 700, color: C.primary, margin: 0 }}>{step.title}</h3>
              <p style={{ fontSize: 15, color: C.textMuted, lineHeight: 1.7, margin: 0 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Feature mockups ─────────────────────────────────────────────────────────

function CalendarMockup() {
  const appts = [
    { time: '09:00', name: 'Marco B.', service: 'Taglio + Barba', status: 'confirmed', color: '#E94560' },
    { time: '10:30', name: 'Luigi R.', service: 'Taglio', status: 'confirmed', color: '#7C3AED' },
    { time: '12:00', name: '—', service: 'Slot libero', status: 'free', color: '#e5e7eb' },
    { time: '14:00', name: 'Federico M.', service: 'Colorazione', status: 'confirmed', color: '#059669' },
    { time: '15:30', name: 'Stefano P.', service: 'Taglio + Barba', status: 'confirmed', color: '#D97706' },
  ]
  return (
    <div style={{ background: '#ffffff', borderRadius: 20, border: `1px solid ${C.border}`, padding: 24, minHeight: 320 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 11, color: C.textMuted, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Mercoledì 11 Giugno</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>Calendario</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['#E94560', '#10B981', '#F59E0B'].map(c => (
            <div key={c} style={{ width: 8, height: 8, borderRadius: '50%', background: c }} />
          ))}
        </div>
      </div>
      {/* Timeline */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {appts.map((a) => (
          <div key={a.time} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 11, color: C.textMuted, width: 38, flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>{a.time}</div>
            <div style={{
              flex: 1,
              borderRadius: 8,
              padding: '8px 12px',
              background: a.status === 'free' ? '#f9fafb' : `${a.color}12`,
              border: `1px solid ${a.status === 'free' ? '#e5e7eb' : a.color + '30'}`,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: a.status === 'free' ? C.textMuted : C.primary }}>{a.name}</div>
              <div style={{ fontSize: 10, color: C.textMuted, marginTop: 1 }}>{a.service}</div>
            </div>
            {a.status === 'confirmed' && (
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, flexShrink: 0 }} />
            )}
          </div>
        ))}
      </div>
      {/* Footer stat */}
      <div style={{ marginTop: 14, padding: '10px 12px', background: '#f8fafc', borderRadius: 10, display: 'flex', justifyContent: 'space-between' }}>
        {[{ v: '4', l: 'Confermati' }, { v: '€360', l: 'Revenue' }, { v: '0', l: 'No-show' }].map(s => (
          <div key={s.l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{s.v}</div>
            <div style={{ fontSize: 9, color: C.textMuted, marginTop: 1 }}>{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function LoyaltyMockup() {
  return (
    <div style={{ background: C.primary, borderRadius: 20, padding: 24, minHeight: 320, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Luca E.</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#ffffff' }}>La tua loyalty</div>
        </div>
        <div style={{ background: '#fef9c3', borderRadius: 100, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#a16207' }}>Gold Member</div>
      </div>
      {/* Points */}
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Punti disponibili</div>
        <div style={{ fontSize: 36, fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>1.240</div>
        <div style={{ marginTop: 10, height: 4, background: 'rgba(255,255,255,0.12)', borderRadius: 99 }}>
          <div style={{ height: '100%', width: '82%', background: 'linear-gradient(90deg, #E94560, #7C3AED)', borderRadius: 99 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Gold</span>
          <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)' }}>Platinum a 1.500 pt</span>
        </div>
      </div>
      {/* Streak */}
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 28 }}>🔥</div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#ffffff' }}>7 visite consecutive</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>Streak record: 12 · Continua così!</div>
        </div>
      </div>
      {/* Badges */}
      <div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, marginBottom: 8 }}>BADGE SBLOCCATI</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { icon: '🏆', label: 'VIP' },
            { icon: '⚡', label: 'Early' },
            { icon: '💎', label: 'Fedele' },
            { icon: '🎯', label: 'Streak' },
          ].map(b => (
            <div key={b.label} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 4px', textAlign: 'center' }}>
              <div style={{ fontSize: 18 }}>{b.icon}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>{b.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ChurnMockup() {
  const clients = [
    { name: 'Roberto V.', days: 48, avg: 28, risk: 'alto', color: '#EF4444' },
    { name: 'Andrea M.', days: 35, avg: 25, risk: 'medio', color: '#F59E0B' },
    { name: 'Carlo F.', days: 29, avg: 28, risk: 'attenzione', color: '#F97316' },
  ]
  return (
    <div style={{ background: '#ffffff', borderRadius: 20, border: `1px solid ${C.border}`, padding: 24, minHeight: 320 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FFF1F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>Silent Churn Detector</div>
          <div style={{ fontSize: 11, color: C.textMuted }}>3 clienti a rischio — agisci ora</div>
        </div>
      </div>
      {/* Client risk cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {clients.map(c => (
          <div key={c.name} style={{ borderRadius: 12, border: `1px solid ${c.color}25`, background: `${c.color}07`, padding: '12px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `${c.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: c.color }}>
                  {c.name.split(' ').map(w => w[0]).join('')}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{c.name}</span>
              </div>
              <span style={{ fontSize: 10, fontWeight: 700, color: c.color, background: `${c.color}15`, borderRadius: 100, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {c.risk}
              </span>
            </div>
            <div style={{ fontSize: 11, color: C.textMuted }}>
              Assente da <strong style={{ color: c.color }}>{c.days} giorni</strong> · media {c.avg}gg
            </div>
            <div style={{ marginTop: 8 }}>
              <button style={{ fontSize: 11, fontWeight: 700, color: c.color, background: `${c.color}15`, border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                Invia messaggio win-back →
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Detailed Features (zig-zag) ─────────────────────────────────────────────
function DetailedFeatures() {
  const features = [
    {
      tag: 'Gestione',
      title: 'Gestisci tutto in un posto',
      items: ['Calendario con vista giorno, settimana e mese', 'CRM clienti con storico e note', 'Team multi-sede con permessi granulari'],
      mockup: <CalendarMockup />,
    },
    {
      tag: 'Loyalty',
      title: 'Gamification che funziona davvero',
      items: ['Streak settimanali con counter visibile ai clienti', 'Badge collezionabili per traguardi raggiunti', 'Tier VIP con benefit reali (sconti, priorità)'],
      mockup: <LoyaltyMockup />,
    },
    {
      tag: 'Retention',
      title: 'Sappi chi stai perdendo',
      items: ['Silent churn detector: riconosce pattern di abbandono', 'Win-back automatici via SMS/email al momento giusto', "Alert 'A rischio' con 30 giorni di anticipo"],
      mockup: <ChurnMockup />,
    },
  ]

  return (
    <section style={{ background: C.lightBg, padding: '96px 24px' }}>
      <div className="landing-container" style={{ display: 'flex', flexDirection: 'column', gap: 96 }}>
        {features.map((f, i) => (
          <div key={f.tag} className="feature-zigzag" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center', direction: i % 2 === 1 ? 'rtl' : 'ltr' }}>
            {/* Mockup */}
            <div style={{ direction: 'ltr' }}>{f.mockup}</div>
            {/* Text */}
            <div style={{ direction: 'ltr' }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>{f.tag}</p>
              <h3 style={{ fontSize: 30, fontWeight: 800, color: C.primary, margin: '0 0 20px', letterSpacing: '-0.02em' }}>{f.title}</h3>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {f.items.map((item) => (
                  <li key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <div style={{ width: 20, height: 20, borderRadius: '50%', background: C.primary, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    <span style={{ fontSize: 15, color: C.primary, lineHeight: 1.6 }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const testimonials = [
    { name: 'Marco F.', title: 'Barber Shop Milano', quote: 'Non perdo più tempo su WhatsApp. I clienti prenotano da soli e io vedo tutto sul calendario.', initials: 'MF', bg: '#7C3AED' },
    { name: 'Sara B.', title: 'Salone Torino', quote: 'La gamification ha cambiato tutto. I clienti mi chiedono quanto mancano al livello successivo!', initials: 'SB', bg: C.accent },
    { name: 'Luca M.', title: 'Barber Studio Roma', quote: 'Il churn detector mi ha avvisato di 3 clienti che non tornavano. Li ho recuperati tutti e 3.', initials: 'LM', bg: C.success },
  ]

  return (
    <section style={{ background: C.white, padding: '96px 24px' }}>
      <div className="landing-container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Testimonianze</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: C.primary, margin: 0, letterSpacing: '-0.02em' }}>Cosa dicono i barbieri</h2>
        </div>
        <div className="cards-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
          {testimonials.map((t) => (
            <div key={t.name} style={{ background: C.lightBg, borderRadius: 20, border: `1px solid ${C.border}`, padding: 32, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <p style={{ fontSize: 18, fontWeight: 500, color: C.primary, lineHeight: 1.6, margin: 0, fontStyle: 'italic' }}>
                &ldquo;{t.quote}&rdquo;
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 'auto' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: C.white, flexShrink: 0 }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{t.name}</div>
                  <div style={{ fontSize: 13, color: C.textMuted }}>{t.title}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const plans = [
    {
      name: 'Starter',
      price: '€19',
      sub: 'Per barbieri singoli',
      features: ['Prenotazioni online', 'CRM clienti', 'Loyalty base', 'Churn detector', 'App brandizzata'],
      highlight: false,
      cta: 'Prova gratis',
    },
    {
      name: 'Growth',
      price: '€49',
      sub: 'Per chi ha capito la retention',
      features: ['Tutto Starter +', 'Gamification completa', 'Multi-staff', 'Win-back automatici', 'Statistiche avanzate'],
      highlight: true,
      badge: 'Più popolare',
      cta: 'Prova gratis',
    },
    {
      name: 'Pro',
      price: '€99',
      sub: 'Per il salone che scala',
      features: ['Tutto Growth +', 'AI Business Coach', 'No-show prediction', 'Multi-sede illimitato', 'Supporto prioritario'],
      highlight: false,
      cta: 'Prova gratis',
    },
  ]

  return (
    <section id="pricing" style={{ background: C.lightBg, padding: '96px 24px' }}>
      <div className="landing-container">
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: C.accent, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>Prezzi</p>
          <h2 style={{ fontSize: 38, fontWeight: 800, color: C.primary, margin: '0 0 16px', letterSpacing: '-0.02em' }}>Un prezzo. Zero sorprese.</h2>
          <p style={{ fontSize: 16, color: C.textMuted, margin: 0 }}>14 giorni gratis su tutti i piani. Nessuna carta di credito richiesta.</p>
        </div>
        <div className="cards-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, alignItems: 'start' }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? C.primary : C.white,
                borderRadius: 24,
                border: plan.highlight ? 'none' : `1px solid ${C.border}`,
                padding: 32,
                display: 'flex',
                flexDirection: 'column',
                gap: 24,
                position: 'relative',
                transform: plan.highlight ? 'scale(1.04)' : 'none',
                boxShadow: plan.highlight ? '0 24px 64px rgba(26,26,46,0.25)' : 'none',
              }}
            >
              {plan.badge && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.accent, color: C.white, fontSize: 12, fontWeight: 700, padding: '4px 16px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                  {plan.badge}
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: plan.highlight ? C.white : C.primary, marginBottom: 4 }}>{plan.name}</div>
                <div style={{ fontSize: 13, color: plan.highlight ? 'rgba(255,255,255,0.6)' : C.textMuted }}>{plan.sub}</div>
              </div>
              <div>
                <span style={{ fontSize: 48, fontWeight: 900, color: plan.highlight ? C.white : C.primary, letterSpacing: '-0.03em' }}>{plan.price}</span>
                <span style={{ fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.5)' : C.textMuted }}>/mese</span>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: plan.highlight ? 'rgba(255,255,255,0.85)' : C.primary }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: plan.highlight ? 'rgba(255,255,255,0.15)' : '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke={plan.highlight ? C.white : C.success} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    </div>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={TRIAL_REGISTER_HREF}
                style={{
                  display: 'block',
                  textAlign: 'center',
                  padding: '14px',
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  textDecoration: 'none',
                  background: plan.highlight ? C.accent : 'transparent',
                  color: plan.highlight ? C.white : C.primary,
                  border: plan.highlight ? 'none' : `2px solid ${C.primary}`,
                }}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section style={{ background: C.primary, padding: '100px 24px', textAlign: 'center' }}>
      <div className="landing-container" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h2 style={{ fontSize: 44, fontWeight: 800, color: C.white, lineHeight: 1.15, margin: '0 0 20px', letterSpacing: '-0.03em' }}>
          Inizia oggi.<br />
          <span style={{ color: C.accent }}>Gratis per 14 giorni.</span>
        </h2>
        <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.65)', margin: '0 0 40px', lineHeight: 1.6 }}>
          Nessuna carta di credito. Nessun contratto. Cancelli quando vuoi.
        </p>
        <Link
          href={TRIAL_REGISTER_HREF}
          style={{ display: 'inline-block', fontSize: 18, fontWeight: 700, color: C.white, textDecoration: 'none', background: C.accent, borderRadius: 14, padding: '16px 40px' }}
        >
          Prova Styll gratis →
        </Link>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ background: C.dark, padding: '56px 24px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="landing-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 40 }}>
        <div style={{ maxWidth: 300 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 12 }}>Styll</div>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 1.7, margin: 0 }}>
            La piattaforma all-in-one per barbieri e parrucchieri. Prenotazioni, loyalty e retention.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Prodotto</div>
            {['Funzionalità', 'Prezzi', 'Changelog'].map((l) => (
              <div key={l} style={{ marginBottom: 10 }}>
                <a href="#" style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{l}</a>
              </div>
            ))}
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16 }}>Legale</div>
            {([
              { label: 'Privacy Policy', href: '/privacy' },
              { label: 'Termini di servizio', href: '/termini' },
              { label: 'Accordo trattamento dati (DPA)', href: `/termini#${PUBLIC_DPA_SECTION_ID}` },
              { label: 'Cookie Policy', href: '/cookie' },
              { label: 'Sub-responsabili', href: '/sub-processor' },
            ] as const).map(({ label, href }) => (
              <div key={label} style={{ marginBottom: 10 }}>
                <Link href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{label}</Link>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="landing-container" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 40, paddingTop: 24 }}>
        <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', margin: 0 }}>
          © {new Date().getFullYear()} Styll. Tutti i diritti riservati.
        </p>
      </div>
    </footer>
  )
}

// ─── Responsive Styles ────────────────────────────────────────────────────────
const responsiveCSS = `
  .landing-container { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
  .hero-h1 { font-size: 52px; }
  .hero-grid, .feature-zigzag { grid-template-columns: 1fr 1fr; }
  .cards-grid-3 { grid-template-columns: repeat(3, 1fr); }
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
  .steps-grid { grid-template-columns: repeat(4, 1fr); }
  .nav-links { display: flex; }

  @media (max-width: 1024px) {
    .cards-grid-3 { grid-template-columns: repeat(2, 1fr); }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .steps-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 768px) {
    .hero-h1 { font-size: 34px !important; }
    .hero-grid { grid-template-columns: 1fr !important; gap: 48px !important; }
    .feature-zigzag { grid-template-columns: 1fr !important; direction: ltr !important; gap: 32px !important; }
    .cards-grid-3 { grid-template-columns: 1fr !important; }
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .steps-grid { grid-template-columns: 1fr !important; }
    .nav-links a:not(:last-child) { display: none; }
  }

  @media (max-width: 480px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
  }
`

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: responsiveCSS }} />
      <main style={{ fontFamily: 'var(--font-primary, "Outfit", system-ui, sans-serif)' }}>
        <Nav />
        <Hero />
        <About />
        <FeatureCards />
        <Stats />
        <HowItWorks />
        <DetailedFeatures />
        <Testimonials />
        <Pricing />
        <FinalCTA />
        <Footer />
      </main>
    </>
  )
}
