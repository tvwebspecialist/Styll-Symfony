import * as Sentry from '@sentry/nextjs'
import SentryTestButton from './SentryTestButton'

export default function SentryTestPage() {
  Sentry.logger.info('Sentry test log — server', { log_source: 'sentry_test' })

  return (
    <div style={{ padding: 40, fontFamily: 'monospace' }}>
      <h1>Sentry Test Page</h1>
      <p>Server log inviato. Controlla Sentry → Logs.</p>
      <SentryTestButton />
    </div>
  )
}
