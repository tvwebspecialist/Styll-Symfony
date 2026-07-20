import { notFound, redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  CLIENT_ERASURE_RETENTION_RULES,
  CLIENT_RIGHTS_MATRIX,
  getAuthenticatedClientContext,
  getErasureConfirmationValue,
  listClientPrivacyRequests,
} from '@/lib/client-privacy-rights'
import { getTenantBySlug } from '@/lib/tenant'
import { createTenantPaths } from '@/lib/pwa-redirect'
import { DataRightsClient } from './_components/DataRightsClient'

interface Props {
  params: Promise<{ slug: string }>
}

function assertNoQueryError(label: string, error: { message: string } | null) {
  if (error) {
    throw new Error(`${label}: ${error.message}`)
  }
}

export default async function ClientDataRightsPage({ params }: Props) {
  const { slug } = await params
  const tenant = await getTenantBySlug(slug)

  if (!tenant || tenant.status !== 'active') {
    notFound()
  }

  const tp = await createTenantPaths(slug)
  const ctx = await getAuthenticatedClientContext(tenant.tenant_id)

  if (!ctx) {
    redirect(tp('/profilo'))
  }

  const db = createAdminClient()
  const [history, clientNotesCountRes, appointmentsCountRes, paymentsCountRes, loyaltyTransactionsCountRes, rewardRedemptionsCountRes, consentEventsCountRes, privacyRequestsCountRes] = await Promise.all([
    listClientPrivacyRequests({
      limit: 10,
      profileId: ctx.user.id,
      tenantId: tenant.tenant_id,
    }),
    db.from('client_notes').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id),
    db.from('appointments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id).is('deleted_at', null),
    db.from('payments').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id),
    db.from('loyalty_transactions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id),
    db.from('reward_redemptions').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id),
    db.from('consent_events').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('client_id', ctx.client.id),
    db.from('client_privacy_requests').select('id', { count: 'exact', head: true }).eq('tenant_id', tenant.tenant_id).eq('profile_id', ctx.user.id),
  ])

  assertNoQueryError('count client notes for rights center', clientNotesCountRes.error)
  assertNoQueryError('count appointments for rights center', appointmentsCountRes.error)
  assertNoQueryError('count payments for rights center', paymentsCountRes.error)
  assertNoQueryError('count loyalty transactions for rights center', loyaltyTransactionsCountRes.error)
  assertNoQueryError('count reward redemptions for rights center', rewardRedemptionsCountRes.error)
  assertNoQueryError('count consent events for rights center', consentEventsCountRes.error)
  assertNoQueryError('count privacy requests for rights center', privacyRequestsCountRes.error)

  const retainedCounts = {
    appointments: appointmentsCountRes.count ?? 0,
    clientRecord: 1,
    consentEvents: consentEventsCountRes.count ?? 0,
    loyalty: (loyaltyTransactionsCountRes.count ?? 0) + (rewardRedemptionsCountRes.count ?? 0),
    payments: paymentsCountRes.count ?? 0,
    privacyRequests: privacyRequestsCountRes.count ?? 0,
  }

  const retainedData = CLIENT_ERASURE_RETENTION_RULES.map((rule) => ({
    ...rule,
    count:
      rule.key === 'appointments'
        ? retainedCounts.appointments
        : rule.key === 'client_record'
          ? retainedCounts.clientRecord
          : rule.key === 'consent_events'
            ? retainedCounts.consentEvents
            : rule.key === 'loyalty'
              ? retainedCounts.loyalty
              : rule.key === 'payments'
                ? retainedCounts.payments
                : retainedCounts.privacyRequests,
  }))

  const confirmationValue = getErasureConfirmationValue({
    clientPhone: ctx.client.phone,
    userEmail: ctx.user.email,
  })

  return (
    <main className="min-h-screen bg-white">
      <div className="mx-auto max-w-xl px-4 pt-4 pb-10">
        <DataRightsClient
          basePath={tp('')}
          confirmationValue={confirmationValue}
          dataRightsRequestPath="/api/pwa/privacy/requests"
          erasurePath="/api/pwa/privacy/erasure"
          exportPath={`/api/pwa/privacy/export?tenantId=${encodeURIComponent(tenant.tenant_id)}`}
          history={history}
          manualReviewNotesCount={clientNotesCountRes.count ?? 0}
          preferencesPath={tp('/profilo/preferenze')}
          privacyPath={tp('/privacy')}
          profileEditPath={tp('/profilo/modifica')}
          requestRightsMatrix={CLIENT_RIGHTS_MATRIX}
          retainedData={retainedData}
          tenantId={tenant.tenant_id}
          tenantName={tenant.business_name}
        />
      </div>
    </main>
  )
}
