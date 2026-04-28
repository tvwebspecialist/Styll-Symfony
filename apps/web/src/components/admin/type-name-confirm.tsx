'use client'

import * as React from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  confirmName: string
  confirmLabel?: string
  loading?: boolean
  onConfirm: () => void
}

export function TypeNameConfirm({
  open,
  onOpenChange,
  title,
  description,
  confirmName,
  confirmLabel = 'Elimina',
  loading,
  onConfirm,
}: Props) {
  const [typed, setTyped] = React.useState('')
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setTyped('')
  }, [open])
  const matches = typed === confirmName

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex flex-col gap-2 py-1">
          <Label htmlFor="type-confirm-input" className="text-xs">
            Per confermare digita{' '}
            <span className="font-mono font-semibold text-foreground">{confirmName}</span>
          </Label>
          <Input
            id="type-confirm-input"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={confirmName}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annulla
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={!matches || loading}>
            {loading ? '…' : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
