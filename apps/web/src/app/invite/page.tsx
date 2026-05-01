import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { InviteClient } from '@/components/invite/InviteClient'

export const dynamic = 'force-dynamic'

export default async function InvitePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const params = await searchParams
  const token = typeof params.token === 'string' ? params.token : null

  if (!token) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f5',
          padding: '20px',
        }}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            maxWidth: '400px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '16px', color: '#333' }}>
            Invito mancante
          </h1>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '24px' }}>
            Il link di invito non è valido o è scaduto.
          </p>
          <a
            href="/"
            style={{
              display: 'inline-block',
              backgroundColor: '#111',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '14px',
            }}
          >
            Torna a Styll
          </a>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If not logged in, redirect to login with a return URL
  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/invite?token=${token}`)}`)
  }

  // User is logged in, show the invitation acceptance page
  return <InviteClient token={token} userId={user.id} userEmail={user.email || ''} />
}
