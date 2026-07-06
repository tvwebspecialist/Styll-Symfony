'use client'

/**
 * Generic import wizard — usable both from the tenant dashboard and from
 * the superadmin concierge panel.
 *
 * Props:
 *   onClose            — called when the user closes/cancels
 *   onSubmit           — server action to call on step-3 confirmation;
 *                        receives ImportClientsInput, returns ImportClientsResult
 *   banner             — optional ReactNode shown at the top of Step 1 (e.g. admin warning)
 *   successExtraActions — optional ReactNode shown below "Chiudi" in Step 4 (e.g. "Open tenant")
 */

import * as React from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import Papa from 'papaparse'
import type { ImportColumn, ImportRow, ImportClientsInput, ImportClientsResult } from '@/lib/actions/clienti'

// ─── Constants ────────────────────────────────────────────────

export const IMPORT_COLUMN_LABELS: Record<ImportColumn, string> = {
  full_name:          'Nome completo',
  email:              'Email',
  phone:              'Telefono',
  date_of_birth:      'Data di nascita',
  notes:              'Note',
  tags:               'Tag',
  marketing_consent:  'Consenso marketing',
  ignore:             'Ignora',
}

export const AUTO_MAP: Record<string, ImportColumn> = {
  'name':              'full_name',
  'full name':         'full_name',
  'client name':       'full_name',
  'first name':        'full_name',
  'nome':              'full_name',
  'cognome':           'full_name',
  'nome completo':     'full_name',
  'cliente':           'full_name',
  'email':             'email',
  'e-mail':            'email',
  'mail':              'email',
  'phone':             'phone',
  'mobile':            'phone',
  'tel':               'phone',
  'telefono':          'phone',
  'cellulare':         'phone',
  'mobile number':     'phone',
  'phone number':      'phone',
  'birthday':          'date_of_birth',
  'dob':               'date_of_birth',
  'date of birth':     'date_of_birth',
  'data di nascita':   'date_of_birth',
  'data nascita':      'date_of_birth',
  'notes':             'notes',
  'note':              'notes',
  'comments':          'notes',
  'tags':              'tags',
  'labels':            'tags',
  'marketing':         'marketing_consent',
  'newsletter':        'marketing_consent',
  'consent':           'marketing_consent',
  'marketing consent': 'marketing_consent',
}

type Source = 'fresha' | 'treatwell' | 'booksy' | 'csv_generic'

// ─── Shared styles ─────────────────────────────────────────────

const btnBase: React.CSSProperties = {
  padding:      '10px 18px',
  borderRadius: 10,
  fontSize:     14,
  fontWeight:   500,
  cursor:       'pointer',
  border:       'none',
  transition:   'background 120ms ease',
}

const inputStyle: React.CSSProperties = {
  width:        '100%',
  padding:      '9px 12px',
  borderRadius: 10,
  border:       '1px solid #E9E9E9',
  fontSize:     14,
  color:        '#222222',
  background:   '#FFFFFF',
  outline:      'none',
  boxSizing:    'border-box',
}

// ─── Step Dots ──────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width:        i + 1 === current ? 20 : 8,
            height:       8,
            borderRadius: 100,
            background:   i + 1 === current ? '#1A1A1A' : i + 1 < current ? '#B0B0B0' : '#E9E9E9',
            transition:   'all 200ms ease',
          }}
        />
      ))}
    </div>
  )
}

// ─── Step 1 — Upload ────────────────────────────────────────────

function Step1Upload({
  source,
  setSource,
  banner,
  onParsed,
}: {
  source: Source
  setSource: (s: Source) => void
  banner?: React.ReactNode
  onParsed: (headers: string[], rows: ImportRow[], filename: string) => void
}) {
  const [dragging, setDragging] = React.useState(false)
  const [file, setFile] = React.useState<File | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const fileRef = React.useRef<HTMLInputElement>(null)

  const SOURCES: { key: Source; label: string }[] = [
    { key: 'fresha',      label: 'Fresha' },
    { key: 'treatwell',   label: 'Treatwell' },
    { key: 'booksy',      label: 'Booksy' },
    { key: 'csv_generic', label: 'Altro CSV' },
  ]

  function handleFile(f: File) {
    setError(null)
    if (f.size > 10 * 1024 * 1024) { setError('File troppo grande (max 10 MB)'); return }
    if (!/\.(csv|txt)$/i.test(f.name)) { setError('Formato non supportato. Usa .csv o .txt'); return }
    setFile(f)
    Papa.parse(f, {
      header: true,
      skipEmptyLines: true,
      encoding: 'UTF-8',
      complete: (results) => {
        const rows = results.data as ImportRow[]
        if (rows.length > 10_000) { setError('Il file supera il limite di 10.000 righe'); setFile(null); return }
        if (rows.length === 0) { setError('Il file non contiene righe da importare'); setFile(null); return }
        onParsed(results.meta.fields ?? [], rows, f.name)
      },
      error: () => { setError('Errore durante la lettura del file'); setFile(null) },
    })
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragging(false)
    const f = e.dataTransfer.files[0]; if (f) handleFile(f)
  }

  function formatBytes(b: number) {
    if (b < 1024) return `${b} B`
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
    return `${(b / 1024 / 1024).toFixed(1)} MB`
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {banner}

      {/* Source preset buttons */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#222222' }}>
          Sorgente del file
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSource(s.key)}
              style={{
                padding: '7px 14px', borderRadius: 8,
                border: `1px solid ${source === s.key ? '#1A1A1A' : '#E9E9E9'}`,
                background: source === s.key ? '#1A1A1A' : '#FFFFFF',
                color: source === s.key ? '#FFFFFF' : '#222222',
                fontSize: 13, fontWeight: 500, cursor: 'pointer',
              }}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Drop zone */}
      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 12, padding: '40px 24px',
          borderRadius: 16,
          border: `2px dashed ${dragging ? '#1A1A1A' : error ? '#EF4444' : '#E9E9E9'}`,
          background: dragging ? '#F9F9F9' : '#FAFAFA', cursor: 'pointer',
          transition: 'all 150ms ease',
        }}
      >
        <input
          ref={fileRef} type="file" accept=".csv,.txt" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
        />
        {file ? (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Image src="/img/Churn_green.png" alt="File caricato" width={28} height={28} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222222' }}>{file.name}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B0B0B0' }}>{formatBytes(file.size)}</p>
            </div>
          </>
        ) : (
          <>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#F0F0F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#B0B0B0" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#222222' }}>Trascina il file qui</p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B0B0B0' }}>
                oppure <span style={{ color: '#1A1A1A', textDecoration: 'underline' }}>sfoglia</span> — .csv o .txt, max 10 MB, max 10.000 righe
              </p>
            </div>
          </>
        )}
      </label>

      {error && (
        <p style={{ margin: 0, fontSize: 13, color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6 }}>
          <XCircle size={14} /> {error}
        </p>
      )}

      <p style={{ margin: 0, fontSize: 12, color: '#B0B0B0', textAlign: 'center' }}>
        Non sai come esportare i tuoi clienti?{' '}
        <a href="/dashboard/clienti/import-help" target="_blank" rel="noreferrer"
          style={{ color: '#1A1A1A', textDecoration: 'underline' }}>
          Guarda la guida
        </a>
      </p>
    </div>
  )
}

// ─── Step 2 — Mapping ───────────────────────────────────────────

function Step2Mapping({
  headers, rows, mapping, setMapping, duplicateStrategy, setDuplicateStrategy,
}: {
  headers: string[]
  rows: ImportRow[]
  mapping: Record<string, ImportColumn>
  setMapping: React.Dispatch<React.SetStateAction<Record<string, ImportColumn>>>
  duplicateStrategy: 'skip' | 'merge'
  setDuplicateStrategy: (s: 'skip' | 'merge') => void
}) {
  const COLUMN_OPTIONS: ImportColumn[] = [
    'full_name', 'email', 'phone', 'date_of_birth',
    'notes', 'tags', 'marketing_consent', 'ignore',
  ]
  const previewRows = rows.slice(0, 5)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#222222' }}>
          Associa le colonne del file ai campi Styll
        </p>
        <div style={{ border: '1px solid #F0F0F0', borderRadius: 12, overflow: 'hidden' }}>
          {headers.map((h, i) => (
            <div key={h} style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
              background: i % 2 === 0 ? '#FAFAFA' : '#FFFFFF',
              borderBottom: i < headers.length - 1 ? '1px solid #F0F0F0' : 'none',
            }}>
              <span style={{
                flex: 1, fontSize: 13, color: '#444444', fontWeight: 500,
                minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{h}</span>
              <span style={{ fontSize: 12, color: '#D0D0D0' }}>→</span>
              <select
                value={mapping[h] ?? 'ignore'}
                onChange={(e) => setMapping((m) => ({ ...m, [h]: e.target.value as ImportColumn }))}
                style={{ ...inputStyle, width: 180, flexShrink: 0, fontSize: 13, padding: '7px 10px', cursor: 'pointer' }}
              >
                {COLUMN_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{IMPORT_COLUMN_LABELS[opt]}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#222222' }}>
          Anteprima (prime {previewRows.length} righe)
        </p>
        <div style={{ overflowX: 'auto', borderRadius: 10, border: '1px solid #F0F0F0' }}>
          <table style={{ borderCollapse: 'collapse', fontSize: 12, width: '100%', minWidth: headers.length * 120 }}>
            <thead>
              <tr style={{ background: '#F9F9F9' }}>
                {headers.map((h) => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600, color: '#888888', borderBottom: '1px solid #F0F0F0', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, ri) => (
                <tr key={ri}>
                  {headers.map((h) => (
                    <td key={h} style={{ padding: '7px 12px', color: '#444444', borderBottom: ri < previewRows.length - 1 ? '1px solid #F9F9F9' : 'none', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row[h] ?? ''}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Duplicate strategy */}
      <div>
        <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: '#222222' }}>Gestione duplicati</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(
            [
              { val: 'skip' as const, label: 'Salta i duplicati', sub: 'I clienti già presenti (per email o telefono) vengono ignorati', disabled: false },
              { val: 'merge' as const, label: 'Unisci i duplicati', sub: 'Aggiorna il cliente esistente con i campi non vuoti del CSV e unisce i tag', disabled: false },
            ]
          ).map(({ val, label, sub, disabled }) => (
            <label key={val} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 14px',
              borderRadius: 10,
              border: `1px solid ${!disabled && duplicateStrategy === val ? '#1A1A1A' : '#E9E9E9'}`,
              background: disabled ? '#FAFAFA' : '#FFFFFF',
              cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.6 : 1,
            }}>
              <input type="radio" name="dupStrategy" value={val} checked={duplicateStrategy === val}
                disabled={disabled} onChange={() => setDuplicateStrategy(val)}
                style={{ marginTop: 2, cursor: disabled ? 'not-allowed' : 'pointer' }}
              />
              <div>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#222222' }}>
                  {label}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#B0B0B0' }}>{sub}</p>
              </div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Step 3 — Preview ───────────────────────────────────────────

interface PreviewStats {
  total: number; valid: number; skippedPreview: number
  previewErrors: Array<{ rowIndex: number; field?: string; message: string }>
}

function computePreviewStats(rows: ImportRow[], mapping: Record<string, ImportColumn>): PreviewStats {
  const inv: Partial<Record<ImportColumn, string>> = {}
  for (const [orig, styll] of Object.entries(mapping)) {
    if (styll !== 'ignore') inv[styll] = orig
  }
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const errs: PreviewStats['previewErrors'] = []
  let valid = 0; let skipped = 0
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]; const rowNum = i + 1
    const rawName = inv.full_name ? row[inv.full_name] ?? '' : ''
    if (!rawName.trim()) { errs.push({ rowIndex: rowNum, field: 'full_name', message: 'Nome mancante' }); skipped++; continue }
    const rawEmail = inv.email ? row[inv.email] ?? '' : ''
    if (rawEmail && !EMAIL_RE.test(rawEmail.trim().toLowerCase())) {
      errs.push({ rowIndex: rowNum, field: 'email', message: `Email non valida: ${rawEmail}` })
    }
    valid++
  }
  return { total: rows.length, valid, skippedPreview: skipped, previewErrors: errs }
}

function Step3Preview({ rows, mapping, filename }: { rows: ImportRow[]; mapping: Record<string, ImportColumn>; filename: string }) {
  const [showAllErrors, setShowAllErrors] = React.useState(false)
  const stats = React.useMemo(() => computePreviewStats(rows, mapping), [rows, mapping])
  const { total, valid, skippedPreview, previewErrors } = stats
  const visibleErrors = showAllErrors ? previewErrors : previewErrors.slice(0, 20)
  const hasName = Object.values(mapping).includes('full_name')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {!hasName && (
        <div style={{ padding: '12px 16px', borderRadius: 10, background: '#FEF9C3', border: '1px solid #FDE68A' }}>
          <p style={{ margin: 0, fontSize: 13, color: '#854D0E', fontWeight: 600 }}>
            ⚠️ Devi mappare almeno una colonna su "Nome completo" prima di procedere.
          </p>
        </div>
      )}
      <div style={{ display: 'flex', gap: 12 }}>
        {[
          { label: 'Righe nel file', value: total, color: '#222222', bg: '#F9F9F9' },
          { label: "Pronte all'import", value: valid, color: '#16A34A', bg: '#F0FDF4' },
          { label: 'Verranno saltate', value: skippedPreview, color: '#DC2626', bg: '#FFF1F2' },
        ].map((s) => (
          <div key={s.label} style={{ flex: 1, padding: '16px 14px', borderRadius: 12, background: s.bg, border: '1px solid #F0F0F0', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: s.color, lineHeight: 1 }}>{s.value}</p>
            <p style={{ margin: '6px 0 0', fontSize: 12, color: '#888888' }}>{s.label}</p>
          </div>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#888888' }}>
        File: <strong style={{ color: '#222222' }}>{filename}</strong>
      </p>
      {previewErrors.length > 0 && (
        <div>
          <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: '#DC2626' }}>
            {previewErrors.length} {previewErrors.length === 1 ? 'problema trovato' : 'problemi trovati'}
          </p>
          <div style={{ border: '1px solid #FEE2E2', borderRadius: 10, overflow: 'hidden', maxHeight: 220, overflowY: 'auto' }}>
            {visibleErrors.map((err, i) => (
              <div key={i} style={{ padding: '8px 14px', borderBottom: i < visibleErrors.length - 1 ? '1px solid #FEE2E2' : 'none', background: i % 2 === 0 ? '#FFFAFAFA' : '#FFFFFF', fontSize: 12, color: '#DC2626' }}>
                <span style={{ color: '#888888', marginRight: 6 }}>Riga {err.rowIndex}</span>
                {err.field && <span style={{ color: '#B0B0B0', marginRight: 6 }}>({err.field})</span>}
                {err.message}
              </div>
            ))}
          </div>
          {previewErrors.length > 20 && (
            <button type="button" onClick={() => setShowAllErrors((v) => !v)} style={{ marginTop: 8, fontSize: 12, color: '#888888', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              {showAllErrors ? <><ChevronUp size={14} /> Mostra meno</> : <><ChevronDown size={14} /> + {previewErrors.length - 20} altri</>}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Step 4 — Result ────────────────────────────────────────────

function Step4Result({
  result, onClose, successExtraActions,
}: {
  result: ImportClientsResult
  onClose: () => void
  successExtraActions?: React.ReactNode
}) {
  const [errorsOpen, setErrorsOpen] = React.useState(false)
  const isSuccess = result.status === 'completed'
  const isPartial = result.status === 'partial'
  const isFailed  = result.status === 'failed'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '8px 0' }}>
      <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: isSuccess ? '#F0FDF4' : isPartial ? '#FEF9C3' : '#FFF1F2' }}>
        {isSuccess && <CheckCircle size={36} color="#16A34A" />}
        {isPartial && <AlertTriangle size={36} color="#D97706" />}
        {isFailed  && <XCircle size={36} color="#DC2626" />}
      </div>
      <div style={{ textAlign: 'center' }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#222222' }}>
          {isSuccess ? 'Import completato!' : isPartial ? 'Import completato con avvisi' : 'Import fallito'}
        </p>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: '#B0B0B0' }}>
          {isSuccess
            ? 'Import completato: nuovi clienti, duplicati uniti o righe duplicate saltate correttamente.'
            : isPartial
              ? 'Alcune righe sono state elaborate correttamente, altre hanno avuto problemi.'
              : 'Nessun cliente è stato importato o aggiornato.'}
        </p>
      </div>
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 8, padding: '16px 20px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #F0F0F0' }}>
        {[
          { emoji: '✅', label: `${result.imported} ${result.imported === 1 ? 'cliente importato' : 'clienti importati'}`, color: '#16A34A', show: result.imported > 0 },
          { emoji: '🔄', label: `${result.merged} ${result.merged === 1 ? 'duplicato unito' : 'duplicati uniti'}`, color: '#2563EB', show: result.merged > 0 },
          { emoji: '⏭️', label: `${result.skipped} saltati (duplicati)`, color: '#888888', show: result.skipped > 0 },
          { emoji: '⚠️', label: `${result.errors.length} ${result.errors.length === 1 ? 'errore' : 'errori'}`, color: '#D97706', show: result.errors.length > 0 },
        ].filter((s) => s.show).map((s) => (
          <p key={s.label} style={{ margin: 0, fontSize: 14, fontWeight: 500, color: s.color }}>{s.emoji} {s.label}</p>
        ))}
        {result.imported === 0 && result.merged === 0 && result.skipped === 0 && result.errors.length === 0 && (
          <p style={{ margin: 0, fontSize: 14, color: '#B0B0B0' }}>Nessuna operazione eseguita.</p>
        )}
      </div>
      {result.errors.length > 0 && (
        <div style={{ width: '100%' }}>
          <button type="button" onClick={() => setErrorsOpen((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 10, border: '1px solid #FEE2E2', background: '#FFF1F2', fontSize: 13, fontWeight: 600, color: '#DC2626', cursor: 'pointer' }}>
            <span>Dettaglio errori ({result.errors.length})</span>
            {errorsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {errorsOpen && (
            <div style={{ border: '1px solid #FEE2E2', borderTop: 'none', borderRadius: '0 0 10px 10px', maxHeight: 180, overflowY: 'auto' }}>
              {result.errors.map((err, i) => (
                <div key={i} style={{ padding: '7px 14px', borderBottom: i < result.errors.length - 1 ? '1px solid #FEE2E2' : 'none', fontSize: 12, color: '#DC2626', background: i % 2 === 0 ? '#FFFAFA' : '#FFFFFF' }}>
                  <span style={{ color: '#888888', marginRight: 6 }}>Riga {err.rowIndex}</span>
                  {err.field && <span style={{ color: '#B0B0B0', marginRight: 6 }}>({err.field})</span>}
                  {err.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, width: '100%' }}>
        <button type="button" onClick={onClose} style={{ ...btnBase, background: '#1A1A1A', color: '#FFFFFF', fontWeight: 600, paddingLeft: 32, paddingRight: 32 }}>
          Chiudi
        </button>
        {successExtraActions}
      </div>
    </div>
  )
}

// ─── Main Wizard Component ──────────────────────────────────────

export interface ImportWizardProps {
  onClose: () => void
  onSubmit: (input: ImportClientsInput) => Promise<ImportClientsResult>
  /** Optional banner shown at the top of Step 1 */
  banner?: React.ReactNode
  /** Optional extra actions shown below "Chiudi" in Step 4 */
  successExtraActions?: React.ReactNode
}

export function ImportWizard({ onClose, onSubmit, banner, successExtraActions }: ImportWizardProps) {
  const router = useRouter()
  const [step,     setStep]     = React.useState<1 | 2 | 3 | 4>(1)
  const [source,   setSource]   = React.useState<Source>('csv_generic')
  const [headers,  setHeaders]  = React.useState<string[]>([])
  const [rows,     setRows]     = React.useState<ImportRow[]>([])
  const [filename, setFilename] = React.useState('')
  const [mapping,  setMapping]  = React.useState<Record<string, ImportColumn>>({})
  const [duplicateStrategy, setDuplicateStrategy] = React.useState<'skip' | 'merge'>('skip')
  const [submitting, setSubmitting] = React.useState(false)
  const [result, setResult] = React.useState<ImportClientsResult | null>(null)

  React.useEffect(() => {
    function handleEsc(e: KeyboardEvent) {
      if (e.key === 'Escape' && step !== 4) onClose()
    }
    document.addEventListener('keydown', handleEsc)
    return () => document.removeEventListener('keydown', handleEsc)
  }, [onClose, step])

  function handleParsed(h: string[], r: ImportRow[], fname: string) {
    const auto: Record<string, ImportColumn> = {}
    h.forEach((col) => { auto[col] = AUTO_MAP[col.toLowerCase().trim()] ?? 'ignore' })
    setHeaders(h); setRows(r); setFilename(fname); setMapping(auto); setStep(2)
  }

  async function handleSubmit() {
    setSubmitting(true)
    try {
      const res = await onSubmit({ source, filename, mapping, rows, duplicateStrategy })
      setResult(res)
      setStep(4)
      if (res.success) {
        const summary = [
          res.imported > 0 ? `✅ ${res.imported} importati` : null,
          res.merged > 0 ? `🔄 ${res.merged} uniti` : null,
          res.skipped > 0 ? `⏭️ ${res.skipped} saltati` : null,
        ].filter(Boolean).join(' · ')
        toast.success(summary || 'Import completato')
      } else {
        toast.error(res.error ?? 'Import fallito')
      }
    } catch {
      toast.error("Errore imprevisto durante l'import")
    } finally {
      setSubmitting(false)
    }
  }

  function handleClose() {
    if (result && (result.imported > 0 || result.merged > 0)) router.refresh()
    onClose()
  }

  const STEP_TITLES = ['Carica file', 'Mappa colonne', 'Anteprima', 'Risultato']
  const canGoNext =
    step === 2 ? Object.values(mapping).includes('full_name') :
    step === 3 ? true :
    false

  return (
    <div
      className="styll-modal-overlay"
      onClick={(e) => { if (e.target === e.currentTarget && step !== 4) onClose() }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.50)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        className="styll-modal-popup"
        onClick={(e) => e.stopPropagation()}
        style={{ background: '#FFFFFF', borderRadius: 20, width: '100%', maxWidth: 640, maxHeight: '90vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 24px 60px rgba(0,0,0,0.18)' }}
      >
        <div className="styll-modal-drag-handle" aria-hidden="true" />
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 16px', borderBottom: '1px solid #F0F0F0', flexShrink: 0 }}>
          <div>
            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#222222' }}>Importa clienti</p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#B0B0B0' }}>
              Step {step} di 4 — {STEP_TITLES[step - 1]}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <StepDots current={step} total={4} />
            {step !== 4 && (
              <button type="button" onClick={onClose} style={{ width: 32, height: 32, borderRadius: '50%', border: '1px solid #F0F0F0', background: '#FAFAFA', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#888888" />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {step === 1 && <Step1Upload source={source} setSource={setSource} banner={banner} onParsed={handleParsed} />}
          {step === 2 && <Step2Mapping headers={headers} rows={rows} mapping={mapping} setMapping={setMapping} duplicateStrategy={duplicateStrategy} setDuplicateStrategy={setDuplicateStrategy} />}
          {step === 3 && <Step3Preview rows={rows} mapping={mapping} filename={filename} />}
          {step === 4 && result && <Step4Result result={result} onClose={handleClose} successExtraActions={successExtraActions} />}
        </div>

        {/* Footer */}
        {step !== 4 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderTop: '1px solid #F0F0F0', flexShrink: 0, background: '#FFFFFF' }}>
            <button type="button" onClick={() => step > 1 ? setStep((s) => (s - 1) as 1 | 2 | 3 | 4) : onClose()} style={{ ...btnBase, background: '#FFFFFF', border: '1px solid #E9E9E9', color: '#222222' }}>
              {step === 1 ? 'Annulla' : 'Indietro'}
            </button>
            {step !== 1 && (
              <button type="button" disabled={!canGoNext || submitting} onClick={() => step === 3 ? handleSubmit() : setStep((s) => (s + 1) as 1 | 2 | 3 | 4)}
                style={{ ...btnBase, background: !canGoNext || submitting ? '#B0B0B0' : '#1A1A1A', color: '#FFFFFF', fontWeight: 600, cursor: !canGoNext || submitting ? 'not-allowed' : 'pointer' }}>
                {submitting ? 'Importando...' : step === 3 ? 'Conferma import' : 'Avanti'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
