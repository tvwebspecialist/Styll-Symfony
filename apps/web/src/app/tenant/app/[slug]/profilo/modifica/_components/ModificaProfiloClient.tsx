'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { uploadAvatar } from '@/lib/actions/profilo'
import { updateClientProfileData } from '@/lib/actions/pwa-client-actions'
import { BottomCTA } from '@/components/pwa/ui/BottomCTA'

interface InitialData {
  fullName: string
  phone: string
  email: string
  avatarUrl: string | null
  dateOfBirth: string | null
}

interface Props {
  tenantId: string
  userId: string
  initialData: InitialData
  primaryColor: string
  profiloPath: string
}

function Toast({ message, type }: { message: string; type: 'success' | 'error' }) {
  return (
    <div
      className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium text-white shadow-lg ${
        type === 'success' ? 'bg-emerald-500' : 'bg-red-500'
      }`}
    >
      {message}
    </div>
  )
}

export function ModificaProfiloClient({ tenantId, userId: _userId, initialData, primaryColor, profiloPath }: Props) {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl)
  const [fullName, setFullName] = useState(initialData.fullName)
  const [phone, setPhone] = useState(initialData.phone)
  const [dateOfBirth, setDateOfBirth] = useState(initialData.dateOfBirth ?? '')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [isUploading, startUpload] = useTransition()
  const [isSaving, startSave] = useTransition()

  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => (w[0] ?? '').toUpperCase())
    .join('')

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 2500)
  }

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    startUpload(async () => {
      const res = await uploadAvatar(fd)
      if (res.ok) setAvatarUrl(res.url)
      else showToast(res.error, 'error')
    })
  }

  function handleSave() {
    if (!fullName.trim()) {
      showToast('Il nome è obbligatorio', 'error')
      return
    }
    if (phone && phone.length < 6) {
      showToast('Telefono non valido', 'error')
      return
    }
    startSave(async () => {
      const res = await updateClientProfileData(tenantId, {
        fullName: fullName.trim(),
        phone: phone.trim() || null,
        dateOfBirth: dateOfBirth || null,
      })
      if (res.ok) {
        showToast('Profilo aggiornato!', 'success')
        router.refresh()
      } else {
        showToast(res.error, 'error')
      }
    })
  }

  const inputCls = 'h-12 w-full rounded-2xl border border-neutral-200 bg-white px-4 text-sm text-neutral-900 outline-none focus:border-[var(--brand-primary)] transition-colors'

  return (
    <div className="px-4 pt-4">
      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={isUploading}
          className="relative rounded-full active:scale-95 transition-transform mb-3"
          aria-label="Cambia foto profilo"
        >
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt={fullName}
              className="size-20 rounded-full object-cover"
              style={{ border: `3px solid ${primaryColor}` }}
            />
          ) : (
            <div
              className="size-20 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: primaryColor, border: `3px solid ${primaryColor}` }}
            >
              {initials || '?'}
            </div>
          )}
          {isUploading && (
            <div className="absolute inset-0 rounded-full bg-black/30 flex items-center justify-center">
              <div className="size-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}
          <div className="absolute bottom-0 right-0 size-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-neutral-600">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
              <circle cx="12" cy="13" r="4"/>
            </svg>
          </div>
        </button>
        <p className="text-xs text-neutral-400">Tocca per cambiare foto</p>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
      </div>

      {/* Form */}
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Nome completo *</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Mario Rossi"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Telefono</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 333 123 4567"
            className={inputCls}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Email</label>
          <input
            type="email"
            value={initialData.email}
            readOnly
            className={`${inputCls} bg-neutral-100 text-neutral-400 cursor-not-allowed`}
          />
          <p className="mt-1 text-[11px] text-neutral-400">L&apos;email non può essere modificata</p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-neutral-500 uppercase tracking-wide">Data di nascita</label>
          <input
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <BottomCTA
        primary={{
          label: 'Salva modifiche',
          onClick: handleSave,
          loading: isSaving,
        }}
        tenantPrimary={primaryColor}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  )
}
