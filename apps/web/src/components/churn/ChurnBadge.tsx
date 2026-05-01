import { CHURN_COLOR, CHURN_LABEL, type ChurnStatus } from '@/lib/churn'

export function ChurnBadge({ status }: { status: ChurnStatus }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '2px 8px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 600,
        background: `${CHURN_COLOR[status]}1a`,
        color: CHURN_COLOR[status],
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: CHURN_COLOR[status],
        }}
      />
      {CHURN_LABEL[status]}
    </span>
  )
}
