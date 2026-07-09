import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import type { TablesInsert } from '@/types'

const DPA_DOCUMENT_RELATIVE_PATHS = [
  '../../docs/legal/dpa-barbieri.md',
  'docs/legal/dpa-barbieri.md',
]

export interface DpaDocumentMetadata {
  publishedAt: string
  version: string
}

type TenantDpaFields = Pick<
  TablesInsert<'tenants'>,
  'dpa_accepted_at' | 'dpa_accepted_by' | 'dpa_version'
>

type TenantDpaDb = Pick<ReturnType<typeof createAdminClient>, 'from'>

export function parseDpaDocumentMetadata(markdown: string): DpaDocumentMetadata {
  const versionMatch = markdown.match(/^\*\*Versione:\*\*\s*(.+)$/m)
  const dateMatch = markdown.match(/^\*\*Data:\*\*\s*(.+)$/m)

  if (!versionMatch?.[1]?.trim()) {
    throw new Error('Versione DPA mancante in docs/legal/dpa-barbieri.md')
  }

  if (!dateMatch?.[1]?.trim()) {
    throw new Error('Data DPA mancante in docs/legal/dpa-barbieri.md')
  }

  return {
    version: versionMatch[1].trim(),
    publishedAt: dateMatch[1].trim(),
  }
}

export const getCurrentDpaDocumentMetadata = cache((): DpaDocumentMetadata => {
  const documentPath = DPA_DOCUMENT_RELATIVE_PATHS
    .map((relativePath) => path.resolve(process.cwd(), relativePath))
    .find((candidatePath) => existsSync(candidatePath))

  if (!documentPath) {
    throw new Error('Impossibile trovare docs/legal/dpa-barbieri.md')
  }

  const markdown = readFileSync(documentPath, 'utf8')
  return parseDpaDocumentMetadata(markdown)
})

function normalizeAcceptedAt(value: Date | string | undefined): string {
  if (!value) return new Date().toISOString()
  return value instanceof Date ? value.toISOString() : value
}

export function buildDpaAcceptanceFields({
  acceptedAt,
  acceptedBy,
  version,
}: {
  acceptedAt?: Date | string
  acceptedBy: string
  version?: string
}): TenantDpaFields {
  const normalizedVersion = (version ?? getCurrentDpaDocumentMetadata().version).trim()

  if (!normalizedVersion) {
    throw new Error('Versione DPA non valida')
  }

  if (!acceptedBy.trim()) {
    throw new Error('acceptedBy obbligatorio per registrare il DPA')
  }

  return {
    dpa_version: normalizedVersion,
    dpa_accepted_at: normalizeAcceptedAt(acceptedAt),
    dpa_accepted_by: acceptedBy,
  }
}

export async function ensureTenantDpaAcceptance(
  db: TenantDpaDb,
  tenantId: string,
  acceptance: TenantDpaFields
): Promise<boolean> {
  const { data, error } = await db
    .from('tenants')
    .update(acceptance)
    .eq('id', tenantId)
    .is('dpa_version', null)
    .is('dpa_accepted_at', null)
    .is('dpa_accepted_by', null)
    .select('id')

  if (error) {
    throw new Error(`Errore registrazione accettazione DPA: ${error.message}`)
  }

  return (data?.length ?? 0) > 0
}
