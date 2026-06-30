'use client'

import * as React from 'react'
import { Search, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AdminTableColumn<Row> {
  key: string
  header: string
  accessor?: (row: Row) => React.ReactNode
  sortValue?: (row: Row) => string | number | null
  className?: string
  hideOnMobile?: boolean
}

interface AdminTableProps<Row> {
  rows: Row[]
  columns: AdminTableColumn<Row>[]
  rowKey: (row: Row) => string
  searchableText?: (row: Row) => string
  searchPlaceholder?: string
  emptyMessage?: string
  toolbar?: React.ReactNode
  initialSort?: { key: string; direction: 'asc' | 'desc' }
  pageSize?: number
  pageSizeOptions?: number[]
  selectable?: boolean
  bulkActions?: (selected: Row[], clear: () => void) => React.ReactNode
  onRowClick?: (row: Row) => void
}

const DEFAULT_PAGE_SIZE = 25
const DEFAULT_PAGE_OPTIONS = [10, 25, 50, 100]

export function AdminTable<Row>({
  rows,
  columns,
  rowKey,
  searchableText,
  searchPlaceholder = 'Cerca…',
  emptyMessage = 'Nessun risultato.',
  toolbar,
  initialSort,
  pageSize: initialPageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_OPTIONS,
  selectable = false,
  bulkActions,
  onRowClick,
}: AdminTableProps<Row>) {
  const [query, setQuery] = React.useState('')
  const [sort, setSort] = React.useState<{ key: string; direction: 'asc' | 'desc' } | null>(
    initialSort ?? null
  )
  const [page, setPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)
  const [selected, setSelected] = React.useState<Set<string>>(new Set())

  const filtered = React.useMemo(() => {
    if (!query.trim() || !searchableText) return rows
    const q = query.toLowerCase()
    return rows.filter((r) => searchableText(r).toLowerCase().includes(q))
  }, [rows, query, searchableText])

  const sorted = React.useMemo(() => {
    if (!sort) return filtered
    const col = columns.find((c) => c.key === sort.key)
    if (!col?.sortValue) return filtered
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = col.sortValue!(a)
      const bv = col.sortValue!(b)
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (av < bv) return -1 * dir
      if (av > bv) return 1 * dir
      return 0
    })
  }, [filtered, sort, columns])

  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [query, pageSize])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const pageStart = (safePage - 1) * pageSize
  const pageRows = sorted.slice(pageStart, pageStart + pageSize)

  function toggleSort(key: string) {
    const col = columns.find((c) => c.key === key)
    if (!col?.sortValue) return
    setSort((s) =>
      !s || s.key !== key
        ? { key, direction: 'asc' }
        : s.direction === 'asc'
          ? { key, direction: 'desc' }
          : null
    )
  }

  function toggleRow(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }
  function toggleAllOnPage() {
    setSelected((prev) => {
      const next = new Set(prev)
      const ids = pageRows.map(rowKey)
      const allSel = ids.every((id) => next.has(id))
      if (allSel) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  const selectedRows = React.useMemo(
    () => sorted.filter((r) => selected.has(rowKey(r))),
    [sorted, selected, rowKey]
  )
  const clearSelection = React.useCallback(() => setSelected(new Set()), [])

  const colCount = columns.length + (selectable ? 1 : 0)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        {searchableText ? (
          <div className="relative w-full max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="pl-8"
            />
          </div>
        ) : (
          <span />
        )}
        {toolbar}
      </div>

      {selectable && selectedRows.length > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-accent/30 px-3 py-2">
          <div className="text-xs font-medium">
            {selectedRows.length} selezionati
            <button
              type="button"
              onClick={clearSelection}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              (deseleziona)
            </button>
          </div>
          <div className="flex items-center gap-2">
            {bulkActions ? bulkActions(selectedRows, clearSelection) : null}
          </div>
        </div>
      ) : null}

      <div
        className="overflow-hidden rounded-[var(--radius-lg)] border"
        style={{ background: 'var(--admin-surface)', borderColor: 'var(--admin-border)' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ fontFamily: 'var(--font-primary)' }}>
            <thead
              className="sticky top-0 z-10 text-left text-xs uppercase tracking-wide"
              style={{ background: 'var(--admin-surface-2)', color: 'var(--admin-text-subtle)', borderBottom: '1px solid var(--admin-border)' }}
            >
              <tr>
                {selectable ? (
                  <th className="w-8 px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label="Seleziona pagina"
                      checked={
                        pageRows.length > 0 && pageRows.every((r) => selected.has(rowKey(r)))
                      }
                      onChange={toggleAllOnPage}
                    />
                  </th>
                ) : null}
                {columns.map((c) => {
                  const sortable = !!c.sortValue
                  const active = sort?.key === c.key
                  return (
                    <th
                      key={c.key}
                      scope="col"
                      className={cn(
                        'px-3 py-2 font-semibold',
                        sortable && 'cursor-pointer select-none hover:text-foreground',
                        c.hideOnMobile && 'hidden md:table-cell',
                        c.className
                      )}
                      onClick={sortable ? () => toggleSort(c.key) : undefined}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.header}
                        {sortable ? (
                          active ? (
                            sort!.direction === 'asc' ? (
                              <ArrowUp className="h-3 w-3" />
                            ) : (
                              <ArrowDown className="h-3 w-3" />
                            )
                          ) : (
                            <ArrowUpDown className="h-3 w-3 opacity-30" />
                          )
                        ) : null}
                      </span>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={colCount}
                    className="px-3 py-12 text-center text-xs"
                    style={{ color: 'var(--admin-text-subtle)' }}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const id = rowKey(row)
                  const isSel = selected.has(id)
                  return (
                    <tr
                      key={id}
                      className={cn('border-t transition-colors', onRowClick && 'cursor-pointer')}
                      style={{
                        borderColor: 'var(--admin-border)',
                        background: isSel ? 'var(--admin-accent-subtle)' : undefined,
                      }}
                      onMouseEnter={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = 'var(--admin-hover-bg)' }}
                      onMouseLeave={(e) => { if (!isSel) (e.currentTarget as HTMLElement).style.background = '' }}
                      onClick={onRowClick ? () => onRowClick(row) : undefined}
                    >
                      {selectable ? (
                        <td
                          className="w-8 px-3 py-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSel}
                            onChange={() => toggleRow(id)}
                            aria-label="Seleziona riga"
                          />
                        </td>
                      ) : null}
                      {columns.map((c) => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-3 py-2 align-middle',
                            c.hideOnMobile && 'hidden md:table-cell',
                            c.className
                          )}
                        >
                          {c.accessor
                            ? c.accessor(row)
                            : String((row as Record<string, unknown>)[c.key] ?? '—')}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>Per pagina</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="h-7 rounded border border-input bg-transparent px-1 text-xs"
              >
                {pageSizeOptions.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <span className="ml-2">
                {pageStart + 1}–{Math.min(pageStart + pageSize, sorted.length)} di {sorted.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="xs"
                disabled={safePage === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-3 w-3" />
              </Button>
              <span className="px-2 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="xs"
                disabled={safePage === totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
