'use client'

import * as React from 'react'

const VALID_STATUSES = new Set(['revoked', 'already', 'invalid', 'expired'])

function normalizeStatus(value: unknown): 'revoked' | 'already' | 'invalid' | 'expired' {
  if (typeof value === 'string' && VALID_STATUSES.has(value)) {
    return value as 'revoked' | 'already' | 'invalid' | 'expired'
  }

  return 'invalid'
}

export function MarketingUnsubscribeForm({
  actionPath,
  statusPath,
}: {
  actionPath: string
  statusPath: string
}) {
  const [pending, startTransition] = React.useTransition()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    startTransition(async () => {
      try {
        const response = await fetch(actionPath, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
            'x-styll-ajax': '1',
          },
          body: new URLSearchParams({ confirm: '1' }),
        })
        const result = await response.json().catch(() => null) as { status?: string } | null
        const status = normalizeStatus(result?.status)
        window.location.assign(`${statusPath}?status=${encodeURIComponent(status)}`)
      } catch {
        window.location.assign(`${statusPath}?status=invalid`)
      }
    })
  }

  return (
    <form method="post" action={actionPath} onSubmit={handleSubmit}>
      <input type="hidden" name="confirm" value="1" />
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-2xl bg-neutral-900 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70"
      >
        {pending ? 'Aggiornamento preferenze...' : 'Annulla iscrizione alle email promozionali'}
      </button>
    </form>
  )
}
