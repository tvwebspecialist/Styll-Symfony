'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Trash2, Power, GripVertical, Search } from 'lucide-react'
import { toast } from 'sonner'
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { AdminModal, ConfirmDialog } from '@/components/admin/admin-modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  createService,
  updateService,
  deleteService,
  reorderServices,
} from '@/app/admin/actions'

interface Service {
  id: string
  name: string
  description: string | null
  price: number
  duration_minutes: number
  category: string | null
  display_order: number
  is_active: boolean
}

interface FormState {
  name: string
  description: string
  price: string
  duration_minutes: string
  category: string
  is_active: boolean
}

const EMPTY: FormState = {
  name: '',
  description: '',
  price: '0',
  duration_minutes: '30',
  category: '',
  is_active: true,
}

export function ServicesClient({
  tenantId,
  initial,
}: {
  tenantId: string
  initial: Service[]
}) {
  const router = useRouter()
  const [items, setItems] = React.useState(initial)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  React.useEffect(() => setItems(initial), [initial])

  const [open, setOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<Service | null>(null)
  const [form, setForm] = React.useState<FormState>(EMPTY)
  const [confirmDel, setConfirmDel] = React.useState<Service | null>(null)
  const [pending, startTransition] = React.useTransition()

  function openNew() {
    setEditing(null)
    setForm(EMPTY)
    setOpen(true)
  }
  function openEdit(s: Service) {
    setEditing(s)
    setForm({
      name: s.name,
      description: s.description ?? '',
      price: String(s.price),
      duration_minutes: String(s.duration_minutes),
      category: s.category ?? '',
      is_active: s.is_active,
    })
    setOpen(true)
  }
  function patch<K extends keyof FormState>(k: K, v: FormState[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function save() {
    if (!form.name.trim()) {
      toast.error('Nome obbligatorio.')
      return
    }
    const price = Number(form.price)
    const duration = Number(form.duration_minutes)
    if (Number.isNaN(price) || price < 0) {
      toast.error('Prezzo non valido.')
      return
    }
    if (Number.isNaN(duration) || duration <= 0) {
      toast.error('Durata non valida.')
      return
    }
    startTransition(async () => {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        price,
        duration_minutes: duration,
        category: form.category.trim() || null,
        is_active: form.is_active,
      }
      const res = editing
        ? await updateService(tenantId, editing.id, payload)
        : await createService(tenantId, { ...payload, display_order: items.length })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success(editing ? 'Servizio aggiornato.' : 'Servizio creato.')
      setOpen(false)
      router.refresh()
    })
  }

  function toggleActive(s: Service) {
    startTransition(async () => {
      const res = await updateService(tenantId, s.id, { is_active: !s.is_active })
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      router.refresh()
    })
  }

  function doDelete() {
    if (!confirmDel) return
    startTransition(async () => {
      const res = await deleteService(tenantId, confirmDel.id)
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        return
      }
      toast.success('Servizio eliminato.')
      setConfirmDel(null)
      router.refresh()
    })
  }

  const [query, setQuery] = React.useState('')
  const dndEnabled = query.trim() === ''

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter((s) =>
      `${s.name} ${s.category ?? ''}`.toLowerCase().includes(q)
    )
  }, [items, query])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((s) => s.id === active.id)
    const newIndex = items.findIndex((s) => s.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const previous = items
    const next = arrayMove(items, oldIndex, newIndex)
    setItems(next)
    startTransition(async () => {
      const res = await reorderServices(
        tenantId,
        next.map((x) => x.id)
      )
      if (!res.success) {
        toast.error(res.error ?? 'Errore')
        setItems(previous)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="relative w-full max-w-sm flex-1">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cerca servizi…"
              className="pl-8"
            />
          </div>
          <Button onClick={openNew} size="sm">
            <Plus /> Nuovo servizio
          </Button>
        </div>

        {!dndEnabled ? (
          <p className="text-xs text-muted-foreground">
            Trascinamento disabilitato durante la ricerca. Cancella il filtro per riordinare.
          </p>
        ) : null}

        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="w-10 px-3 py-2" aria-label="Riordina" />
                  <th className="px-3 py-2 font-semibold">Nome</th>
                  <th className="hidden px-3 py-2 font-semibold md:table-cell">Categoria</th>
                  <th className="px-3 py-2 font-semibold">Prezzo</th>
                  <th className="px-3 py-2 font-semibold">Durata</th>
                  <th className="px-3 py-2 font-semibold">Attivo</th>
                  <th className="w-1 px-3 py-2 text-right font-semibold" />
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-3 py-12 text-center text-xs text-muted-foreground"
                    >
                      Nessun risultato.
                    </td>
                  </tr>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={onDragEnd}
                  >
                    <SortableContext
                      items={filtered.map((s) => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      {filtered.map((row) => (
                        <SortableRow
                          key={row.id}
                          service={row}
                          dndEnabled={dndEnabled}
                          pending={pending}
                          onToggleActive={() => toggleActive(row)}
                          onEdit={() => openEdit(row)}
                          onDelete={() => setConfirmDel(row)}
                        />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AdminModal
        open={open}
        onOpenChange={setOpen}
        title={editing ? 'Modifica servizio' : 'Nuovo servizio'}
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
            <Label htmlFor="s-name">Nome *</Label>
            <Input id="s-name" value={form.name} onChange={(e) => patch('name', e.target.value)} />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label htmlFor="s-desc">Descrizione</Label>
            <Input
              id="s-desc"
              value={form.description}
              onChange={(e) => patch('description', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-price">Prezzo (€)</Label>
            <Input
              id="s-price"
              type="number"
              step="0.01"
              value={form.price}
              onChange={(e) => patch('price', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-dur">Durata (min)</Label>
            <Input
              id="s-dur"
              type="number"
              value={form.duration_minutes}
              onChange={(e) => patch('duration_minutes', e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-cat">Categoria</Label>
            <Input
              id="s-cat"
              value={form.category}
              onChange={(e) => patch('category', e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2 pt-6">
            <input
              id="s-act"
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => patch('is_active', e.target.checked)}
            />
            <Label htmlFor="s-act">Attivo</Label>
          </div>
        </div>
      </AdminModal>

      <ConfirmDialog
        open={!!confirmDel}
        onOpenChange={(o) => !o && setConfirmDel(null)}
        title="Elimina servizio"
        description={`Vuoi eliminare "${confirmDel?.name ?? ''}"?`}
        destructive
        confirmLabel="Elimina"
        loading={pending}
        onConfirm={doDelete}
      />
    </>
  )
}

function SortableRow({
  service,
  dndEnabled,
  pending,
  onToggleActive,
  onEdit,
  onDelete,
}: {
  service: Service
  dndEnabled: boolean
  pending: boolean
  onToggleActive: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
    disabled: !dndEnabled,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-t transition-colors hover:bg-muted/30',
        isDragging && 'opacity-60 shadow-lg ring-2 ring-emerald-400/50'
      )}
    >
      <td className="w-10 px-3 py-2 align-middle">
        <button
          type="button"
          aria-label="Trascina per riordinare"
          disabled={!dndEnabled}
          className={cn(
            'flex items-center justify-center rounded p-1 text-zinc-400',
            dndEnabled
              ? 'cursor-grab hover:text-foreground active:cursor-grabbing'
              : 'cursor-not-allowed opacity-40'
          )}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4 text-zinc-400 cursor-grab" />
        </button>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="font-medium">{service.name}</span>
      </td>
      <td className="hidden px-3 py-2 align-middle md:table-cell">
        <span className="text-xs text-muted-foreground">{service.category ?? '—'}</span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="tabular-nums">€ {service.price.toFixed(2)}</span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span className="tabular-nums">{service.duration_minutes} min</span>
      </td>
      <td className="px-3 py-2 align-middle">
        <span
          className={
            service.is_active
              ? 'text-xs font-medium text-emerald-600'
              : 'text-xs text-muted-foreground'
          }
        >
          {service.is_active ? 'Sì' : 'No'}
        </span>
      </td>
      <td className="w-1 px-3 py-2 text-right align-middle">
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            onClick={onToggleActive}
            disabled={pending}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            title={service.is_active ? 'Disattiva' : 'Attiva'}
          >
            <Power className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}
