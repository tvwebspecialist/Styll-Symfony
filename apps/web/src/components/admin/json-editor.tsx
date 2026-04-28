'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface JsonEditorProps {
  value: unknown
  onChange: (parsed: unknown, raw: string, valid: boolean) => void
  rows?: number
  className?: string
  id?: string
}

export function JsonEditor({ value, onChange, rows = 8, className, id }: JsonEditorProps) {
  const [raw, setRaw] = React.useState<string>(() => {
    try {
      return JSON.stringify(value ?? {}, null, 2)
    } catch {
      return '{}'
    }
  })
  const [error, setError] = React.useState<string | null>(null)

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const next = e.target.value
    setRaw(next)
    if (next.trim() === '') {
      setError(null)
      onChange(null, next, true)
      return
    }
    try {
      const parsed = JSON.parse(next)
      setError(null)
      onChange(parsed, next, true)
    } catch (err) {
      setError((err as Error).message)
      onChange(undefined, next, false)
    }
  }

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <textarea
        id={id}
        value={raw}
        onChange={handleChange}
        rows={rows}
        spellCheck={false}
        className={cn(
          'w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-xs leading-relaxed outline-none transition-colors',
          'focus:border-ring focus:ring-2 focus:ring-ring/40',
          error && 'border-destructive focus:border-destructive focus:ring-destructive/30'
        )}
      />
      {error ? (
        <p className="text-[11px] text-destructive">JSON non valido: {error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">JSON valido.</p>
      )}
    </div>
  )
}
