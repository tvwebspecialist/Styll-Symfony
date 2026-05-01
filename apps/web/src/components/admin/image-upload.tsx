'use client'

import * as React from 'react'
import Image from 'next/image'
import imageCompression from 'browser-image-compression'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { uploadAdminImage } from '@/app/admin/actions'

export interface ImageUploadProps {
  value: string | null | undefined
  onChange: (url: string | null) => void
  bucket: 'tenants' | 'locations' | 'avatars'
  pathPrefix: string
  shape?: 'circle' | 'square'
  label?: string
  size?: number
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 0.2,
  maxWidthOrHeight: 800,
  initialQuality: 0.8,
  useWebWorker: true,
  fileType: 'image/webp',
}

export function ImageUpload({
  value,
  onChange,
  bucket,
  pathPrefix,
  shape = 'circle',
  label,
  size = 96,
}: ImageUploadProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [busy, setBusy] = React.useState(false)

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('Seleziona un file immagine.')
      return
    }
    setBusy(true)
    try {
      const compressed = await imageCompression(file, COMPRESSION_OPTIONS)
      const fd = new FormData()
      fd.append('file', compressed, compressed.name || 'upload.webp')
      fd.append('bucket', bucket)
      fd.append('pathPrefix', pathPrefix)
      const res = await uploadAdminImage(fd)
      if (!res.success) {
        toast.error(res.error)
        return
      }
      onChange(res.url)
      toast.success('Immagine caricata.')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Errore upload.')
    } finally {
      setBusy(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const radius = shape === 'circle' ? '9999px' : '12px'

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden border border-input bg-muted"
        style={{ width: size, height: size, borderRadius: radius }}
      >
        {value ? (
          <Image src={value} alt={label ?? 'image'} fill sizes={`${size}px`} className="object-cover" />
        ) : (
          <ImageIcon className="h-6 w-6 text-muted-foreground" />
        )}
        {busy && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-3.5 w-3.5" />
            {value ? 'Sostituisci' : 'Carica'}
          </Button>
          {value && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => onChange(null)}
            >
              <X className="h-3.5 w-3.5" />
              Rimuovi
            </Button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground">JPG/PNG/WEBP · auto-compressa a ≤200KB</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) void handleFile(f)
        }}
      />
    </div>
  )
}
