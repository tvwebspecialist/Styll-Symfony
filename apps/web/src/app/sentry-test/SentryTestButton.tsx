'use client'

export default function SentryTestButton() {
  return (
    <button
      onClick={() => {
        throw new Error('Sentry test error — client button')
      }}
    >
      Trigger client error
    </button>
  )
}
