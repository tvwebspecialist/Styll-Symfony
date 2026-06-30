'use client'

import Link from 'next/link'
import { LogIn, Pencil, Ban, CheckCircle2, AlertTriangle } from 'lucide-react'

export interface TenantCardData {
  id: string
  business_name: string
  slug: string
  status: string
  primary_color: string | null
  logo_url: string | null
  plan_name: string | null
  subscription_status: string | null
  active_staff_count: number
  clients_count?: number
  created_at: string
}

const STATUS_COLOR: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: '#DCFCE7', text: '#16a34a', label: 'Attivo' },
  trial: { bg: '#FEF3C7', text: '#d97706', label: 'Trial' },
  suspended: { bg: '#FEE2E2', text: '#dc2626', label: 'Sospeso' },
  inactive: { bg: '#F3F4F6', text: '#6B7280', label: 'Inattivo' },
}

const PLAN_COLOR: Record<string, { bg: string; text: string }> = {
  pro: { bg: '#EDE9FE', text: '#7C3AED' },
  growth: { bg: '#DCFCE7', text: '#16a34a' },
  starter: { bg: '#F3F4F6', text: '#6B7280' },
}

function planKey(name: string | null): string {
  const n = (name ?? '').toLowerCase()
  if (n.includes('pro')) return 'pro'
  if (n.includes('growth')) return 'growth'
  return 'starter'
}

interface Props {
  tenant: TenantCardData
  onEdit: (id: string) => void
  onToggleStatus: (id: string, activate: boolean) => void
  onImpersonate: (id: string) => void
}

export function TenantCardRow({ tenant, onEdit, onToggleStatus, onImpersonate }: Props) {
  const status = STATUS_COLOR[tenant.status] ?? STATUS_COLOR.inactive
  const plan = tenant.plan_name ? PLAN_COLOR[planKey(tenant.plan_name)] : null

  return (
    <div
      className="flex items-center gap-3 rounded-[var(--radius-lg)] border p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
      style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
    >
      {/* Avatar */}
      {tenant.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={tenant.logo_url}
          alt=""
          className="h-11 w-11 shrink-0 rounded-xl object-cover"
        />
      ) : (
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
          style={{ backgroundColor: tenant.primary_color || '#E94560' }}
        >
          {tenant.business_name.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            href={`/admin/tenants/${tenant.id}`}
            className="truncate text-sm font-semibold hover:underline"
            style={{ color: 'var(--admin-text)' }}
          >
            {tenant.business_name}
          </Link>
          {tenant.active_staff_count === 0 && (
            <span className="flex items-center gap-0.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-600">
              <AlertTriangle size={9} />
              Senza owner
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-mono text-[11px]" style={{ color: 'var(--admin-text-subtle)' }}>
          {tenant.slug}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: status.bg, color: status.text }}
          >
            {status.label}
          </span>
          {plan && tenant.plan_name && (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
              style={{ background: plan.bg, color: plan.text }}
            >
              {tenant.plan_name}
            </span>
          )}
          <span className="text-[10px]" style={{ color: 'var(--admin-text-subtle)' }}>
            {new Date(tenant.created_at).toLocaleDateString('it-IT')}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => onEdit(tenant.id)}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--admin-hover-bg)]"
          aria-label="Modifica"
        >
          <Pencil size={14} style={{ color: 'var(--admin-text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={() => onImpersonate(tenant.id)}
          disabled={tenant.active_staff_count === 0}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--admin-hover-bg)] disabled:opacity-30"
          aria-label="Shadow mode"
        >
          <LogIn size={14} style={{ color: 'var(--admin-text-muted)' }} />
        </button>
        <button
          type="button"
          onClick={() => onToggleStatus(tenant.id, tenant.status !== 'active')}
          className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-[var(--admin-hover-bg)]"
          aria-label={tenant.status === 'active' ? 'Sospendi' : 'Riattiva'}
        >
          {tenant.status === 'active' ? (
            <Ban size={14} className="text-amber-500" />
          ) : (
            <CheckCircle2 size={14} className="text-emerald-500" />
          )}
        </button>
      </div>
    </div>
  )
}
