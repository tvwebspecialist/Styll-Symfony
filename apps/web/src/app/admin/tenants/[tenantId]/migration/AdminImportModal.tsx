'use client'

import Link from 'next/link'
import { ImportWizard } from '@/components/clienti/import/ImportWizard'
import { importClientsForTenant } from '@/app/admin/actions'

// ─── Concierge banner ──────────────────────────────────────────

function ConciergeWarning({ tenantId }: { tenantId: string }) {
  return (
    <div style={{
      display:      'flex',
      alignItems:   'flex-start',
      gap:          10,
      padding:      '12px 16px',
      borderRadius: 10,
      background:   '#FEF9C3',
      border:       '1px solid #FDE68A',
    }}>
      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
      <div>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#854D0E' }}>
          Modalità concierge
        </p>
        <p style={{ margin: '2px 0 0', fontSize: 12, color: '#92400E' }}>
          Stai importando per conto di un tenant (ID: <code style={{ fontFamily: 'monospace' }}>{tenantId.slice(0, 8)}…</code>).
          L&apos;operazione verrà tracciata nell&apos;audit log.
        </p>
      </div>
    </div>
  )
}

// ─── Modal ──────────────────────────────────────────────────────

export function AdminImportModal({
  tenantId,
  onClose,
}: {
  tenantId: string
  onClose: () => void
}) {
  return (
    <ImportWizard
      onClose={onClose}
      onSubmit={(input) => importClientsForTenant(tenantId, input)}
      banner={<ConciergeWarning tenantId={tenantId} />}
      successExtraActions={
        <Link
          href={`/admin/tenants/${tenantId}/clients`}
          style={{
            display:      'inline-block',
            padding:      '10px 20px',
            borderRadius: 10,
            border:       '1px solid #E9E9E9',
            background:   '#FFFFFF',
            fontSize:     14,
            fontWeight:   500,
            color:        '#222222',
            textDecoration: 'none',
            textAlign:    'center',
          }}
        >
          Apri clienti del tenant →
        </Link>
      }
    />
  )
}
