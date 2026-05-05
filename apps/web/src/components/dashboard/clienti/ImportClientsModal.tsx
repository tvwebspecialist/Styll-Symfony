'use client'

import { importClients } from '@/lib/actions/clienti'
import { ImportWizard } from '@/components/clienti/import/ImportWizard'

export function ImportClientsModal({ onClose }: { onClose: () => void }) {
  return (
    <ImportWizard
      onClose={onClose}
      onSubmit={(input) => importClients(input)}
    />
  )
}
