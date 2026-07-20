import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: '#f8fafc',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#ffffff',
          border: '1px solid #e5e7eb',
          borderRadius: '24px',
          padding: '32px',
          boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
        }}
      >
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, letterSpacing: '0.08em', color: '#6b7280' }}>
          403
        </p>
        <h1 style={{ margin: '12px 0 8px', fontSize: '32px', fontWeight: 800, color: '#111827' }}>
          Accesso negato
        </h1>
        <p style={{ margin: 0, fontSize: '15px', lineHeight: 1.6, color: '#4b5563' }}>
          Non hai i permessi necessari per accedere a questa area.
        </p>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            marginTop: '24px',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '44px',
            padding: '0 16px',
            borderRadius: '999px',
            background: '#111827',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            textDecoration: 'none',
          }}
        >
          Torna alla dashboard
        </Link>
      </div>
    </main>
  )
}
