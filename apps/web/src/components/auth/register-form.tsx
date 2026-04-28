'use client'

import { useMemo, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, Eye, EyeOff, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'

import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

const MAX_AVATAR_BYTES = 2 * 1024 * 1024 // 2MB

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function RegisterForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [password2, setPassword2] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const initials = useMemo(() => getInitials(fullName), [fullName])

  const validation = useMemo(() => {
    const errs: string[] = []
    if (fullName.trim().length < 2) errs.push('Inserisci il tuo nome completo')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Email non valida')
    if (password.length < 8) errs.push('La password deve avere almeno 8 caratteri')
    if (password !== password2) errs.push('Le password non corrispondono')
    return errs
  }, [fullName, email, password, password2])

  const isValid = validation.length === 0

  function handleAvatarChange(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast.error('Carica un file immagine')
      return
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error('Immagine troppo grande (max 2MB)')
      return
    }
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = () =>
      setAvatarPreview(typeof reader.result === 'string' ? reader.result : null)
    reader.readAsDataURL(file)
  }

  function clearAvatar() {
    setAvatarFile(null)
    setAvatarPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) {
      toast.error(validation[0])
      return
    }

    startTransition(async () => {
      const supabase = createClient()
      const cleanName = fullName.trim()
      const cleanEmail = email.trim().toLowerCase()

      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: { full_name: cleanName },
        },
      })

      if (error) {
        toast.error(error.message)
        return
      }

      const userId = data.user?.id
      const hasSession = !!data.session

      // Upload avatar (richiede sessione attiva)
      if (avatarFile && userId && hasSession) {
        const ext = avatarFile.name.split('.').pop()?.toLowerCase() || 'jpg'
        const path = `${userId}/avatar.${ext}`
        const { error: upErr } = await supabase.storage
          .from('avatars')
          .upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
        if (!upErr) {
          const { data: pub } = supabase.storage
            .from('avatars')
            .getPublicUrl(path)
          if (pub?.publicUrl) {
            await supabase
              .from('profiles')
              .update({ avatar_url: pub.publicUrl })
              .eq('id', userId)
          }
        }
      }

      if (!hasSession) {
        toast.success('Account creato! Controlla la tua email per confermare.')
        router.push('/login')
        return
      }

      toast.success('Benvenuto su Styll! 👋')
      router.push('/onboarding/step-1')
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Avatar */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          aria-label="Carica foto profilo"
          className="relative flex h-16 w-16 items-center justify-center overflow-hidden rounded-full transition-colors"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
          }}
        >
          {avatarPreview ? (
            <Image
              src={avatarPreview}
              alt="Avatar"
              width={64}
              height={64}
              unoptimized
              className="h-full w-full object-cover"
            />
          ) : fullName.trim() ? (
            <span
              className="text-lg font-bold"
              style={{ color: 'var(--color-fg)' }}
            >
              {initials}
            </span>
          ) : (
            <Camera
              className="h-5 w-5"
              style={{ color: 'var(--color-fg-secondary)' }}
            />
          )}
        </button>
        <div className="flex flex-col gap-1">
          <span
            className="text-xs font-semibold"
            style={{ color: 'var(--color-fg)' }}
          >
            Foto profilo
          </span>
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--color-fg)' }}
            >
              {avatarPreview ? 'Cambia' : 'Carica'}
            </button>
            {avatarPreview && (
              <>
                <span style={{ color: 'var(--color-fg-muted)' }}>·</span>
                <button
                  type="button"
                  onClick={clearAvatar}
                  className="flex items-center gap-1 font-medium underline-offset-2 hover:underline"
                  style={{ color: 'var(--color-fg-secondary)' }}
                >
                  <X className="h-3 w-3" /> Rimuovi
                </button>
              </>
            )}
          </div>
          <span
            className="text-[11px]"
            style={{ color: 'var(--color-fg-muted)' }}
          >
            Opzionale · max 2MB
          </span>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => handleAvatarChange(e.target.files?.[0])}
        />
      </div>

      <label htmlFor="fullName" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Nome completo
        </span>
        <input
          id="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Marco Rossi"
          className="styll-input w-full px-4 py-3 text-sm"
        />
      </label>

      <label htmlFor="email" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Email
        </span>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@esempio.com"
          className="styll-input w-full px-4 py-3 text-sm"
        />
      </label>

      <label htmlFor="password" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Password
        </span>
        <div className="relative">
          <input
            id="password"
            type={showPw ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 8 caratteri"
            className="styll-input w-full px-4 py-3 pr-11 text-sm"
          />
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            aria-label={showPw ? 'Nascondi password' : 'Mostra password'}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 hover:bg-[color:var(--color-bg-secondary)]"
            style={{ color: 'var(--color-fg-secondary)' }}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <label htmlFor="password2" className="flex flex-col gap-1.5">
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--color-fg)' }}
        >
          Conferma password
        </span>
        <input
          id="password2"
          type={showPw ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          placeholder="Ripeti la password"
          className="styll-input w-full px-4 py-3 text-sm"
        />
        {password2 && password !== password2 && (
          <span
            className="text-xs"
            style={{ color: 'var(--color-danger)' }}
          >
            Le password non corrispondono
          </span>
        )}
      </label>

      <button
        type="submit"
        disabled={isPending || !isValid}
        className={cn(
          'styll-btn-primary mt-2 flex w-full items-center justify-center gap-2 px-4 py-3 text-sm'
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Creazione account...
          </>
        ) : (
          'Crea account'
        )}
      </button>
    </form>
  )
}
