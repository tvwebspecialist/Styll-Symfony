'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Power, Search, AlertTriangle, PackageX } from 'lucide-react'
import { toast } from 'sonner'

import { AdminModal } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { createProduct, updateProduct, toggleProductActive } from './actions'
import type { InventoryEntry } from './actions'

interface Location {
  id: string
  name: string
}

interface InventoryRow {
  location_id: string
  location_name: string
  quantity: number
  low_stock_threshold: number
}

interface Product {
  id: string
  name: string
  brand: string | null
  category: string | null
  price_sell: number
  price_cost: number | null
  sku: string | null
  is_active: boolean
  inventory: InventoryRow[]
}

interface FormState {
  name: string
  brand: string
  category: string
  price_sell: string
  price_cost: string
  sku: string
  is_active: boolean
  inventory: { location_id: string; location_name: string; quantity: string; low_stock_threshold: string }[]
}

function buildEmptyForm(locations: Location[]): FormState {
  return {
    name: '',
    brand: '',
    category: '',
    price_sell: '0',
    price_cost: '',
    sku: '',
    is_active: true,
    inventory: locations.map((l) => ({
      location_id: l.id,
      location_name: l.name,
      quantity: '0',
      low_stock_threshold: '5',
    })),
  }
}

function buildEditForm(product: Product, locations: Location[]): FormState {
  return {
    name: product.name,
    brand: product.brand ?? '',
    category: product.category ?? '',
    price_sell: String(product.price_sell),
    price_cost: product.price_cost != null ? String(product.price_cost) : '',
    sku: product.sku ?? '',
    is_active: product.is_active,
    inventory: locations.map((l) => {
      const row = product.inventory.find((r) => r.location_id === l.id)
      return {
        location_id: l.id,
        location_name: l.name,
        quantity: row ? String(row.quantity) : '0',
        low_stock_threshold: row ? String(row.low_stock_threshold) : '5',
      }
    }),
  }
}

function StockBadge({ quantity, threshold }: { quantity: number; threshold: number }) {
  if (quantity === 0)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
        <PackageX className="h-3 w-3" /> Esaurito
      </span>
    )
  if (quantity <= threshold)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        <AlertTriangle className="h-3 w-3" /> Scorta bassa
      </span>
    )
  return null
}

export function ProductsClient({
  tenantId,
  initial,
  locations,
}: {
  tenantId: string
  initial: Product[]
  locations: Location[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(initial)
  React.useEffect(() => setItems(initial), [initial])

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Product | null>(null)
  const [form, setForm] = React.useState<FormState>(() => buildEmptyForm(locations))
  const [pending, startTransition] = React.useTransition()
  const [query, setQuery] = React.useState('')

  function openNew() {
    setEditing(null)
    setForm(buildEmptyForm(locations))
    setOpen(true)
  }

  function openEdit(p: Product) {
    setEditing(p)
    setForm(buildEditForm(p, locations))
    setOpen(true)
  }

  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function patchInventory(index: number, field: 'quantity' | 'low_stock_threshold', value: string) {
    setForm((f) => {
      const inv = [...f.inventory]
      inv[index] = { ...inv[index], [field]: value }
      return { ...f, inventory: inv }
    })
  }

  function validate(): string | null {
    if (!form.name.trim()) return 'Il nome è obbligatorio.'
    const sell = Number(form.price_sell)
    if (Number.isNaN(sell) || sell < 0) return 'Prezzo di vendita non valido.'
    if (form.price_cost !== '') {
      const cost = Number(form.price_cost)
      if (Number.isNaN(cost) || cost < 0) return 'Prezzo di costo non valido.'
    }
    for (const inv of form.inventory) {
      const q = Number(inv.quantity)
      const t = Number(inv.low_stock_threshold)
      if (Number.isNaN(q) || q < 0) return `Quantità non valida per ${inv.location_name}.`
      if (Number.isNaN(t) || t < 0) return `Soglia non valida per ${inv.location_name}.`
    }
    return null
  }

  function save() {
    const err = validate()
    if (err) { toast.error(err); return }

    const inventory: InventoryEntry[] = form.inventory.map((inv) => ({
      location_id: inv.location_id,
      quantity: Number(inv.quantity),
      low_stock_threshold: Number(inv.low_stock_threshold),
    }))

    const payload = {
      name: form.name.trim(),
      brand: form.brand.trim() || null,
      category: form.category.trim() || null,
      price_sell: Number(form.price_sell),
      price_cost: form.price_cost !== '' ? Number(form.price_cost) : null,
      sku: form.sku.trim() || null,
      is_active: form.is_active,
      inventory,
    }

    startTransition(async () => {
      const res = editing
        ? await updateProduct(tenantId, editing.id, payload)
        : await createProduct(tenantId, payload)

      if (!res.success) { toast.error(res.error ?? 'Errore'); return }
      toast.success(editing ? 'Prodotto aggiornato.' : 'Prodotto creato.')
      setOpen(false)
      router.refresh()
    })
  }

  function doToggle(p: Product) {
    startTransition(async () => {
      const res = await toggleProductActive(tenantId, p.id, !p.is_active)
      if (!res.success) { toast.error(res.error ?? 'Errore'); return }
      router.refresh()
    })
  }

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((p) =>
      `${p.name} ${p.brand ?? ''} ${p.category ?? ''}`.toLowerCase().includes(q)
    )
  }, [items, query])

  const multiLocation = locations.length > 1

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative w-full max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca prodotti…"
              className="pl-8"
            />
          </div>
          <Button onClick={openNew} size="sm">
            <Plus /> Aggiungi prodotto
          </Button>
        </div>

        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-semibold">Nome</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Brand</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Categoria</th>
                  <th className="px-3 py-2 font-semibold">Prezzo vend.</th>
                  <th className="hidden px-3 py-2 font-semibold lg:table-cell">Prezzo costo</th>
                  <th className="px-3 py-2 font-semibold">Stock</th>
                  <th className="px-3 py-2 font-semibold">Stato</th>
                  <th className="w-1 px-3 py-2 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      Nessun prodotto trovato.
                    </td>
                  </tr>
                ) : (
                  filtered.map((p) => {
                    const totalQty = p.inventory.reduce((s, r) => s + r.quantity, 0)
                    const minThreshold = p.inventory.length > 0
                      ? Math.min(...p.inventory.map((r) => r.low_stock_threshold))
                      : 5

                    return (
                      <tr
                        key={p.id}
                        className="border-t transition-colors hover:bg-muted/30"
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="font-medium">{p.name}</div>
                          {p.sku ? <div className="text-[11px] text-muted-foreground">SKU: {p.sku}</div> : null}
                        </td>
                        <td className="hidden px-3 py-2 align-middle text-muted-foreground md:table-cell">
                          {p.brand ?? '—'}
                        </td>
                        <td className="hidden px-3 py-2 align-middle text-muted-foreground md:table-cell">
                          {p.category ?? '—'}
                        </td>
                        <td className="px-3 py-2 align-middle tabular-nums">
                          € {p.price_sell.toFixed(2)}
                        </td>
                        <td className="hidden px-3 py-2 align-middle tabular-nums text-muted-foreground lg:table-cell">
                          {p.price_cost != null ? `€ ${p.price_cost.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <div className="flex flex-col gap-0.5">
                            {multiLocation ? (
                              p.inventory.map((inv) => (
                                <div key={inv.location_id} className="flex items-center gap-1.5 text-xs">
                                  <span className="text-muted-foreground">{inv.location_name}:</span>
                                  <span className={cn('font-medium tabular-nums', inv.quantity === 0 && 'text-red-600', inv.quantity > 0 && inv.quantity <= inv.low_stock_threshold && 'text-amber-600')}>
                                    {inv.quantity}
                                  </span>
                                  {inv.quantity === 0 && <PackageX className="h-3 w-3 text-red-500" />}
                                  {inv.quantity > 0 && inv.quantity <= inv.low_stock_threshold && <AlertTriangle className="h-3 w-3 text-amber-500" />}
                                </div>
                              ))
                            ) : (
                              <div className="flex items-center gap-2">
                                <span className={cn('tabular-nums font-medium', totalQty === 0 && 'text-red-600', totalQty > 0 && totalQty <= minThreshold && 'text-amber-600')}>
                                  {totalQty}
                                </span>
                                <StockBadge quantity={totalQty} threshold={minThreshold} />
                              </div>
                            )}
                            {multiLocation && p.inventory.length > 0 ? (
                              <StockBadge quantity={totalQty} threshold={p.inventory.reduce((s, r) => s + r.low_stock_threshold, 0) / p.inventory.length} />
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 align-middle">
                          <span
                            className={cn(
                              'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                              p.is_active
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-zinc-100 text-zinc-500'
                            )}
                          >
                            {p.is_active ? 'Attivo' : 'Inattivo'}
                          </span>
                        </td>
                        <td className="w-1 px-3 py-2 text-right align-middle">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => doToggle(p)}
                              disabled={pending}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                              title={p.is_active ? 'Disattiva' : 'Attiva'}
                            >
                              <Power className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEdit(p)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica prodotto' : 'Nuovo prodotto'}
        className="max-h-[90vh] overflow-y-auto sm:max-w-xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Annulla
            </Button>
            <Button onClick={save} disabled={pending}>
              {pending ? 'Salvataggio…' : 'Salva'}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="p-name">Nome *</Label>
            <Input
              id="p-name"
              value={form.name}
              onChange={(e) => patch('name', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-brand">Brand</Label>
            <Input
              id="p-brand"
              value={form.brand}
              onChange={(e) => patch('brand', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-cat">Categoria</Label>
            <Input
              id="p-cat"
              value={form.category}
              onChange={(e) => patch('category', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-sell">Prezzo vendita (€) *</Label>
            <Input
              id="p-sell"
              type="number"
              step="0.01"
              min="0"
              value={form.price_sell}
              onChange={(e) => patch('price_sell', e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-cost">Prezzo costo (€)</Label>
            <Input
              id="p-cost"
              type="number"
              step="0.01"
              min="0"
              value={form.price_cost}
              onChange={(e) => patch('price_cost', e.target.value)}
              placeholder="—"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="p-sku">SKU</Label>
            <Input
              id="p-sku"
              value={form.sku}
              onChange={(e) => patch('sku', e.target.value)}
              placeholder="opzionale"
            />
          </div>

          <div className="flex items-center gap-2 pt-5">
            <input
              id="p-active"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch('is_active', e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="p-active">Attivo</Label>
          </div>

          {form.inventory.length > 0 ? (
            <div className="col-span-2 flex flex-col gap-2">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Giacenza per sede
              </div>
              {form.inventory.map((inv, i) => (
                <div key={inv.location_id} className="rounded-lg border bg-muted/30 p-3">
                  {multiLocation ? (
                    <div className="mb-2 text-sm font-medium">{inv.location_name}</div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`p-qty-${i}`}>Quantità in stock</Label>
                      <Input
                        id={`p-qty-${i}`}
                        type="number"
                        min="0"
                        value={inv.quantity}
                        onChange={(e) => patchInventory(i, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor={`p-thr-${i}`}>Soglia scorta bassa</Label>
                      <Input
                        id={`p-thr-${i}`}
                        type="number"
                        min="0"
                        value={inv.low_stock_threshold}
                        onChange={(e) => patchInventory(i, 'low_stock_threshold', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </AdminModal>
    </>
  )
}
