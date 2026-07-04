import { redirect } from 'next/navigation'
import { resolveActiveProfile } from '@/lib/tenant-context'

export const dynamic = 'force-dynamic'

export default async function LoyaltyPage() {
  const ctx = await resolveActiveProfile()
  if (!ctx) redirect('/login')

  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <div
        style={{
          borderRadius: 28,
          border: '1px solid rgba(34,34,34,0.08)',
          background: '#FFFFFF',
          padding: '32px 28px',
          boxShadow: '0 16px 40px rgba(17,17,17,0.04)',
          maxWidth: 720,
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#8A8176',
          }}
        >
          Loyalty
        </p>
        <h1
          style={{
            margin: '12px 0 0',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 700,
            letterSpacing: '-0.04em',
            color: '#1C1917',
            fontFamily: 'var(--font-primary)',
          }}
        >
          Presto in arrivo
        </h1>
        <p
          style={{
            margin: '12px 0 0',
            maxWidth: 520,
            fontSize: 15,
            lineHeight: 1.65,
            color: '#6B6257',
          }}
        >
          Stiamo rifinendo la nuova area loyalty per il tuo salone. Torna qui a breve:
          sara pronta molto presto.
        </p>
      </div>
    </section>
  )
}
