import {
  normalizePhone,
  normalizeEmail,
  parseDateOfBirth,
  parseBooleanField,
  parseCsvTags,
} from './client-import-utils.ts'

export type ImportColumn =
  | 'full_name'
  | 'email'
  | 'phone'
  | 'date_of_birth'
  | 'notes'
  | 'tags'
  | 'marketing_consent'
  | 'ignore'

export interface ImportRow {
  [key: string]: string
}

export type DuplicateStrategy = 'skip' | 'merge'
export type ImportStatus = 'completed' | 'partial' | 'failed'

export interface ImportClientsInput {
  source: 'fresha' | 'treatwell' | 'booksy' | 'csv_generic'
  filename?: string
  mapping: Record<string, ImportColumn>
  rows: ImportRow[]
  duplicateStrategy: DuplicateStrategy
}

export interface ImportError {
  rowIndex: number
  field?: string
  message: string
}

export interface ImportClientsResult {
  success: boolean
  status: ImportStatus
  error?: string
  jobId?: string
  imported: number
  merged: number
  skipped: number
  errors: ImportError[]
}

export interface ExistingImportClient {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth?: string | null
  marketing_consent?: boolean | null
  tags?: unknown
}

export interface ClientImportInsert {
  tenant_id: string
  full_name: string
  email: string | null
  phone: string | null
  date_of_birth: string | null
  marketing_consent: boolean
  preferred_contact_channel: string
  tags: string
}

export interface ClientImportUpdate {
  id: string
  patch: {
    full_name?: string
    email?: string | null
    phone?: string | null
    date_of_birth?: string | null
    marketing_consent?: boolean
    tags?: string
  }
}

export interface ClientImportPlan {
  toInsert: ClientImportInsert[]
  toUpdate: ClientImportUpdate[]
  merged: number
  skipped: number
  errors: ImportError[]
}

export interface ClientImportLookupKeys {
  emails: string[]
  phones: string[]
  rawEmails: string[]
  rawPhones: string[]
}

export const CLIENT_IMPORT_FALLBACK_LOOKUP_CHUNK_SIZE = 200

interface ParsedImportRow {
  rowIndex: number
  fullName: string
  email: string | null
  phone: string | null
  dateOfBirth: string | null
  marketingConsent: boolean
  hasMarketingConsent: boolean
  tags: string[]
}

interface NormalizedExistingClient {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  date_of_birth: string | null
  marketing_consent: boolean
  tags: string[]
}

interface UpdateAccumulator {
  current: NormalizedExistingClient
  next: {
    full_name: string
    email: string | null
    phone: string | null
    date_of_birth: string | null
    marketing_consent: boolean
    tags: string[]
  }
}

interface PrepareClientImportOptions {
  tenantId: string
  existingClients: ExistingImportClient[]
  rows: ImportRow[]
  mapping: Record<string, ImportColumn>
  duplicateStrategy: DuplicateStrategy
  fallbackTags?: string[]
  alwaysAddTags?: string[]
}

function parseStoredTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === 'string')
  }

  if (typeof raw === 'string') {
    try {
      const value = JSON.parse(raw)
      return parseStoredTags(value)
    } catch {
      return []
    }
  }

  return []
}

function uniqueTags(tags: string[]): string[] {
  return [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))]
}

function sameStringArray(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false
  return left.every((value, index) => value === right[index])
}

function buildInverseMapping(mapping: Record<string, ImportColumn>): Partial<Record<ImportColumn, string>> {
  const inverseMapping: Partial<Record<ImportColumn, string>> = {}

  for (const [originalColumn, importColumn] of Object.entries(mapping)) {
    if (importColumn !== 'ignore') {
      inverseMapping[importColumn] = originalColumn
    }
  }

  return inverseMapping
}

export function collectImportLookupKeys(
  rows: ImportRow[],
  mapping: Record<string, ImportColumn>,
): ClientImportLookupKeys {
  const inverseMapping = buildInverseMapping(mapping)
  const emails = new Set<string>()
  const phones = new Set<string>()
  const rawEmails = new Set<string>()
  const rawPhones = new Set<string>()

  for (const row of rows) {
    const rawEmail = inverseMapping.email ? row[inverseMapping.email] ?? '' : ''
    const trimmedEmail = rawEmail.trim()
    if (trimmedEmail) {
      rawEmails.add(trimmedEmail)
    }

    const normalizedEmail = rawEmail ? normalizeEmail(rawEmail) : null
    if (normalizedEmail) {
      emails.add(normalizedEmail)
    }

    const rawPhone = inverseMapping.phone ? row[inverseMapping.phone] ?? '' : ''
    const trimmedPhone = rawPhone.trim()
    if (trimmedPhone) {
      rawPhones.add(trimmedPhone)
    }

    const normalizedPhone = rawPhone ? normalizePhone(rawPhone) : null
    if (normalizedPhone) {
      phones.add(normalizedPhone)
    }
  }

  return {
    emails: [...emails],
    phones: [...phones],
    rawEmails: [...rawEmails],
    rawPhones: [...rawPhones],
  }
}

function buildRowTags(
  rawTags: string,
  fallbackTags: string[],
  alwaysAddTags: string[],
): string[] {
  const parsedTags = parseCsvTags(rawTags)
  const tags = parsedTags.length > 0 ? [...parsedTags] : [...fallbackTags]

  for (const tag of alwaysAddTags) {
    if (!tags.includes(tag)) {
      tags.push(tag)
    }
  }

  return uniqueTags(tags)
}

function parseImportRow(
  row: ImportRow,
  rowIndex: number,
  inverseMapping: Partial<Record<ImportColumn, string>>,
  errors: ImportError[],
  fallbackTags: string[],
  alwaysAddTags: string[],
): ParsedImportRow | null {
  const rawName = inverseMapping.full_name ? row[inverseMapping.full_name] ?? '' : ''
  const fullName = rawName.trim()
  if (!fullName) {
    errors.push({ rowIndex, field: 'full_name', message: 'Nome mancante' })
    return null
  }

  const rawEmail = inverseMapping.email ? row[inverseMapping.email] ?? '' : ''
  const email = rawEmail ? normalizeEmail(rawEmail) : null
  if (rawEmail && !email) {
    errors.push({ rowIndex, field: 'email', message: `Email non valida: ${rawEmail}` })
  }

  const rawPhone = inverseMapping.phone ? row[inverseMapping.phone] ?? '' : ''
  const phone = rawPhone ? normalizePhone(rawPhone) : null
  if (rawPhone && !phone) {
    errors.push({ rowIndex, field: 'phone', message: `Telefono non valido: ${rawPhone}` })
  }

  const rawDob = inverseMapping.date_of_birth ? row[inverseMapping.date_of_birth] ?? '' : ''
  const dateOfBirth = rawDob ? parseDateOfBirth(rawDob) : null

  const rawConsent = inverseMapping.marketing_consent
    ? row[inverseMapping.marketing_consent] ?? ''
    : ''
  const hasMarketingConsent = rawConsent.trim().length > 0
  const marketingConsent = hasMarketingConsent ? parseBooleanField(rawConsent) : false

  const rawTags = inverseMapping.tags ? row[inverseMapping.tags] ?? '' : ''
  const tags = buildRowTags(rawTags, fallbackTags, alwaysAddTags)

  return {
    rowIndex,
    fullName,
    email,
    phone,
    dateOfBirth,
    marketingConsent,
    hasMarketingConsent,
    tags,
  }
}

function buildExistingClientMaps(existingClients: ExistingImportClient[]) {
  const clientsById = new Map<string, NormalizedExistingClient>()
  const clientsByEmail = new Map<string, string>()
  const clientsByPhone = new Map<string, string>()

  for (const client of existingClients) {
    const normalizedClient: NormalizedExistingClient = {
      id: client.id,
      full_name: client.full_name,
      email: client.email ? normalizeEmail(client.email) : null,
      phone: client.phone ? normalizePhone(client.phone) : null,
      date_of_birth: client.date_of_birth ?? null,
      marketing_consent: Boolean(client.marketing_consent),
      tags: uniqueTags(parseStoredTags(client.tags)),
    }

    clientsById.set(normalizedClient.id, normalizedClient)
    if (normalizedClient.email) {
      clientsByEmail.set(normalizedClient.email, normalizedClient.id)
    }
    if (normalizedClient.phone) {
      clientsByPhone.set(normalizedClient.phone, normalizedClient.id)
    }
  }

  return {
    clientsById,
    clientsByEmail,
    clientsByPhone,
  }
}

function buildInsertFromRow(tenantId: string, row: ParsedImportRow): ClientImportInsert {
  return {
    tenant_id: tenantId,
    full_name: row.fullName,
    email: row.email,
    phone: row.phone,
    date_of_birth: row.dateOfBirth,
    marketing_consent: row.marketingConsent,
    preferred_contact_channel: 'whatsapp',
    tags: JSON.stringify(row.tags),
  }
}

function mergeIntoInsert(insertRow: ClientImportInsert, row: ParsedImportRow): ClientImportInsert {
  const currentTags = parseStoredTags(insertRow.tags)
  const nextTags = uniqueTags([...currentTags, ...row.tags])

  return {
    ...insertRow,
    full_name: row.fullName || insertRow.full_name,
    email: row.email ?? insertRow.email,
    phone: row.phone ?? insertRow.phone,
    date_of_birth: row.dateOfBirth ?? insertRow.date_of_birth,
    marketing_consent: row.hasMarketingConsent ? row.marketingConsent : insertRow.marketing_consent,
    tags: JSON.stringify(nextTags),
  }
}

function buildUpdateAccumulator(client: NormalizedExistingClient): UpdateAccumulator {
  return {
    current: client,
    next: {
      full_name: client.full_name ?? '',
      email: client.email,
      phone: client.phone,
      date_of_birth: client.date_of_birth,
      marketing_consent: client.marketing_consent,
      tags: [...client.tags],
    },
  }
}

function mergeIntoUpdateAccumulator(accumulator: UpdateAccumulator, row: ParsedImportRow) {
  accumulator.next.full_name = row.fullName || accumulator.next.full_name
  accumulator.next.email = row.email ?? accumulator.next.email
  accumulator.next.phone = row.phone ?? accumulator.next.phone
  accumulator.next.date_of_birth = row.dateOfBirth ?? accumulator.next.date_of_birth
  accumulator.next.tags = uniqueTags([...accumulator.next.tags, ...row.tags])

  if (row.hasMarketingConsent) {
    accumulator.next.marketing_consent = row.marketingConsent
  }
}

function buildUpdatePatch(accumulator: UpdateAccumulator): ClientImportUpdate | null {
  const patch: ClientImportUpdate['patch'] = {}

  if (
    accumulator.next.full_name &&
    accumulator.next.full_name !== (accumulator.current.full_name ?? '')
  ) {
    patch.full_name = accumulator.next.full_name
  }
  if (accumulator.next.email !== accumulator.current.email) {
    patch.email = accumulator.next.email
  }
  if (accumulator.next.phone !== accumulator.current.phone) {
    patch.phone = accumulator.next.phone
  }
  if (accumulator.next.date_of_birth !== accumulator.current.date_of_birth) {
    patch.date_of_birth = accumulator.next.date_of_birth
  }
  if (accumulator.next.marketing_consent !== accumulator.current.marketing_consent) {
    patch.marketing_consent = accumulator.next.marketing_consent
  }
  if (!sameStringArray(accumulator.next.tags, accumulator.current.tags)) {
    patch.tags = JSON.stringify(accumulator.next.tags)
  }

  return Object.keys(patch).length > 0
    ? { id: accumulator.current.id, patch }
    : null
}

function resolveDuplicateTarget(
  row: ParsedImportRow,
  existingByEmail: Map<string, string>,
  existingByPhone: Map<string, string>,
  pendingByEmail: Map<string, number>,
  pendingByPhone: Map<string, number>,
): { kind: 'existing'; id: string } | { kind: 'pending'; index: number } | null | 'conflict' {
  const emailTarget =
    (row.email && existingByEmail.get(row.email))
    ?? (row.email && pendingByEmail.get(row.email) !== undefined ? `pending:${pendingByEmail.get(row.email)}` : null)
  const phoneTarget =
    (row.phone && existingByPhone.get(row.phone))
    ?? (row.phone && pendingByPhone.get(row.phone) !== undefined ? `pending:${pendingByPhone.get(row.phone)}` : null)

  if (!emailTarget && !phoneTarget) {
    return null
  }

  if (emailTarget && phoneTarget && emailTarget !== phoneTarget) {
    return 'conflict'
  }

  const target = emailTarget ?? phoneTarget
  if (!target) {
    return null
  }

  if (typeof target === 'string' && target.startsWith('pending:')) {
    return {
      kind: 'pending',
      index: Number(target.slice('pending:'.length)),
    }
  }

  return {
    kind: 'existing',
    id: String(target),
  }
}

export function prepareClientImportPlan({
  tenantId,
  existingClients,
  rows,
  mapping,
  duplicateStrategy,
  fallbackTags = ['imported'],
  alwaysAddTags = [],
}: PrepareClientImportOptions): ClientImportPlan {
  const inverseMapping = buildInverseMapping(mapping)
  const errors: ImportError[] = []
  const toInsert: ClientImportInsert[] = []
  const pendingByEmail = new Map<string, number>()
  const pendingByPhone = new Map<string, number>()
  const updatesById = new Map<string, UpdateAccumulator>()
  const {
    clientsById,
    clientsByEmail,
    clientsByPhone,
  } = buildExistingClientMaps(existingClients)

  let skipped = 0
  let merged = 0

  for (let index = 0; index < rows.length; index++) {
    const rowIndex = index + 1
    const parsedRow = parseImportRow(
      rows[index],
      rowIndex,
      inverseMapping,
      errors,
      fallbackTags,
      alwaysAddTags,
    )

    if (!parsedRow) {
      continue
    }

    const duplicateTarget = resolveDuplicateTarget(
      parsedRow,
      clientsByEmail,
      clientsByPhone,
      pendingByEmail,
      pendingByPhone,
    )

    if (duplicateTarget === 'conflict') {
      errors.push({
        rowIndex,
        message: 'Email e telefono corrispondono a clienti diversi. Risolvi il duplicato manualmente.',
      })
      continue
    }

    if (!duplicateTarget) {
      const insertRow = buildInsertFromRow(tenantId, parsedRow)
      const insertIndex = toInsert.push(insertRow) - 1

      if (insertRow.email) {
        pendingByEmail.set(insertRow.email, insertIndex)
      }
      if (insertRow.phone) {
        pendingByPhone.set(insertRow.phone, insertIndex)
      }

      continue
    }

    if (duplicateStrategy === 'skip') {
      skipped++
      continue
    }

    merged++

    if (duplicateTarget.kind === 'pending') {
      const mergedInsert = mergeIntoInsert(toInsert[duplicateTarget.index], parsedRow)
      toInsert[duplicateTarget.index] = mergedInsert

      if (mergedInsert.email) {
        pendingByEmail.set(mergedInsert.email, duplicateTarget.index)
      }
      if (mergedInsert.phone) {
        pendingByPhone.set(mergedInsert.phone, duplicateTarget.index)
      }
      continue
    }

    const existingClient = clientsById.get(duplicateTarget.id)
    if (!existingClient) {
      errors.push({
        rowIndex,
        message: 'Cliente duplicato non trovato durante il merge.',
      })
      continue
    }

    const accumulator = updatesById.get(existingClient.id) ?? buildUpdateAccumulator(existingClient)
    mergeIntoUpdateAccumulator(accumulator, parsedRow)
    updatesById.set(existingClient.id, accumulator)
  }

  const toUpdate: ClientImportUpdate[] = []
  for (const accumulator of updatesById.values()) {
    const patch = buildUpdatePatch(accumulator)
    if (patch) {
      toUpdate.push(patch)
    }
  }

  return {
    toInsert,
    toUpdate,
    merged,
    skipped,
    errors,
  }
}

export function computeImportStatus(
  imported: number,
  merged: number,
  skipped: number,
  errorCount: number,
): ImportStatus {
  if (errorCount === 0) {
    return 'completed'
  }

  return imported > 0 || merged > 0 || skipped > 0
    ? 'partial'
    : 'failed'
}

export function buildImportClientsResult(input: {
  imported: number
  merged: number
  skipped: number
  errors: ImportError[]
  jobId?: string
  error?: string
}): ImportClientsResult {
  const status = computeImportStatus(
    input.imported,
    input.merged,
    input.skipped,
    input.errors.length,
  )
  const fallbackError =
    input.error
    ?? (status === 'failed' ? input.errors[0]?.message ?? 'Import fallito' : undefined)

  return {
    success: status !== 'failed',
    status,
    error: fallbackError,
    jobId: input.jobId,
    imported: input.imported,
    merged: input.merged,
    skipped: input.skipped,
    errors: input.errors,
  }
}
