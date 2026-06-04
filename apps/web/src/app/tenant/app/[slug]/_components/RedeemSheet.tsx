'use client'

import { useState } from 'react'
import { CheckCircle2, Gift } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface RedeemSheetProps {
  reward: {
    id: string
    name: string
    pointsCost: number
    rewardType: string
  }
  children: React.ReactNode
}

export function RedeemSheet({ reward, children }: RedeemSheetProps) {
  const [open, setOpen] = useState(false)
  const fmt = new Intl.NumberFormat('it-IT')

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        className="cursor-pointer"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') setOpen(true)
        }}
      >
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton className="rounded-[28px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-black text-neutral-950">
              Riscatta il premio
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 pt-2 text-center">
            <div className="flex size-20 items-center justify-center rounded-full bg-[var(--brand-primary)]/10">
              <Gift className="size-10 text-[var(--brand-primary)]" aria-hidden="true" />
            </div>

            <div>
              <p className="text-lg font-bold text-neutral-950">{reward.name}</p>
              <p className="mt-1 text-sm text-neutral-500">
                {fmt.format(reward.pointsCost)} punti
              </p>
            </div>

            <div className="w-full rounded-2xl bg-neutral-50 p-4 text-left">
              <div className="flex items-start gap-3">
                <CheckCircle2
                  className="mt-0.5 size-5 shrink-0 text-green-500"
                  aria-hidden="true"
                />
                <p className="text-sm leading-relaxed text-neutral-700">
                  <span className="font-bold">Mostra questa schermata al tuo barbiere</span>{' '}
                  per riscattare il tuo premio. Il barbiere verificherà i tuoi punti e
                  confermerà il riscatto.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-full rounded-2xl bg-[var(--brand-primary)] py-3.5 text-sm font-bold text-white"
            >
              Ho capito
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
