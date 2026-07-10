import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTenantBySlug } from '@/lib/tenant'
import { getMarketingUnsubscribePreview } from '@/lib/marketing-unsubscribe'
import { createTenantPaths } from '@/lib/pwa-redirect'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string; status?: string }>
}

type Status = 'revoked' | 'already' | 'invalid' | 'expired'

function SectionCard({
  title,
  body,
  children,
}: {
  title: string
  body: string
  children?: React.ReactNode
}) {
  return (
    <div className="rounded-[20px] border border-neutral-100 bg-white p-5 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
      <h1 className="text-[24px] font-black tracking-tight text-neutral-950">{title}</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-neutral-500">{body}</p>
      {children ? <div className="mt-5">{children}</div> : null}
    </div>
  )
}

function StatusMessage({ status }: { status: Status }) {
  const copy: Record<Status, { title: string; body: string }> = {
    revoked: {
      title: 'Preferenze aggiornate',
      body: 'La tua richiesta è stata registrata. Non riceverai più email promozionali da questo salone, salvo eventuali comunicazioni di servizio strettamente necessarie.',
    },
    already: {
      title: 'Sei già disiscritto',
      body: 'Per questo indirizzo risulta già revocato il consenso alle email promozionali del salone.',
    },
    invalid: {
      title: 'Link non valido',
      body: 'Questo link non è valido oppure non può più essere usato. Se vuoi aggiornare le tue preferenze, contatta direttamente il salone.',
    },
    expired: {
      title: 'Link scaduto',
      body: 'Questo link di gestione preferenze è scaduto. Se vuoi aggiornare le tue preferenze, contatta direttamente il salone.',
    },
  }

  const message = copy[status]
  return <SectionCard title={message.title} body={message.body} />
}

export default async function MarketingPreferencesPage({
  params,
  searchParams,
}: Props) {
  const [{ slug }, resolvedSearchParams] = await Promise.all([params, searchParams])
  const tenant = await getTenantBySlug(slug)
  if (!tenant || tenant.status !== 'active') notFound()

  const tp = await createTenantPaths(slug)
  const status = resolvedSearchParams.status as Status | undefined
  const token = resolvedSearchParams.token?.trim() ?? ''

  if (status === 'revoked' || status === 'already' || status === 'invalid' || status === 'expired') {
    return (
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-xl px-4 pt-4">
          <StatusMessage status={status} />
        </div>
      </main>
    )
  }

  if (!token) {
    return (
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-xl px-4 pt-4">
          <StatusMessage status="invalid" />
        </div>
      </main>
    )
  }

  const db = createAdminClient()
  const preview = await getMarketingUnsubscribePreview(db, {
    tenantId: tenant.tenant_id,
    token,
  })

  if (!preview) {
    return (
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-xl px-4 pt-4">
          <StatusMessage status="expired" />
        </div>
      </main>
    )
  }

  if (preview.state === 'already_unsubscribed') {
    return (
      <main className="min-h-screen bg-white pb-24">
        <div className="mx-auto max-w-xl px-4 pt-4">
          <StatusMessage status="already" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-white pb-24">
      <div className="mx-auto max-w-xl px-4 pt-4">
        <SectionCard
          title={`Gestisci le email di ${tenant.business_name}`}
          body={`Se confermi, ${tenant.business_name} smetterà di inviarti email promozionali e campagne marketing. Questa operazione non blocca le comunicazioni di servizio strettamente necessarie, come promemoria o conferme appuntamento.`}
        >
          <form method="post" action={tp(`/preferenze-marketing/confirm?token=${encodeURIComponent(token)}`)}>
            <input type="hidden" name="confirm" value="1" />
            <button
              type="submit"
              className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white"
            >
              Annulla iscrizione alle email promozionali
            </button>
          </form>
          <div className="mt-3 text-center text-[13px] text-neutral-500">
            <p>
              Se hai un account attivo, puoi anche{' '}
              <Link href={tp('/profilo/preferenze')} className="underline text-neutral-700">
                gestire le preferenze nell&apos;app
              </Link>
              .
            </p>
          </div>
        </SectionCard>
      </div>
    </main>
  )
}
