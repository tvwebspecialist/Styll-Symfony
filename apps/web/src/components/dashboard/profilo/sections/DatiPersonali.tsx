'use client'

import * as React from 'react'
import { Lock } from 'lucide-react'
import type { ProfileData } from '@/lib/actions/profilo'
import { updateProfile, updatePassword, uploadAvatar } from '@/lib/actions/profilo'
import {
  Field,
  StyledInput,
  StyledTextarea,
  StyledSelect,
  primaryButtonStyle,
  outlineButtonStyle,
  Toast,
} from '../ui'

const BIO_MAX = 200

export function DatiPersonali({
  profile,
  avatarUrl,
  fullName,
  onAvatarChange,
  onFullNameChange,
}: {
  profile: ProfileData
  avatarUrl: string | null
  fullName: string
  onAvatarChange: (url: string | null) => void
  onFullNameChange: (name: string) => void
}) {
  const [phone, setPhone] = React.useState(profile.phone ?? '')
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [language, setLanguage] = React.useState(profile.language || 'it')
  const [timezone, setTimezone] = React.useState(profile.timezone || 'Europe/Rome')
  const [saving, setSaving] = React.useState(false)
  const [msg, setMsg] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  const [pwdCurrent, setPwdCurrent] = React.useState('')
  const [pwdNew, setPwdNew] = React.useState('')
  const [pwdConfirm, setPwdConfirm] = React.useState('')
  const [pwdSaving, setPwdSaving] = React.useState(false)
  const [pwdMsg, setPwdMsg] = React.useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [pwdOpen, setPwdOpen] = React.useState(false)

  const fileRef = React.useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = React.useState(false)

  const initials =
    (fullName || profile.email || '?')
      .split(/\s+/)
      .filter(Boolean)
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?'

  const handleAvatarPick = async (file: File) => {
    setUploading(true)
    setMsg(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadAvatar(fd)
    setUploading(false)
    if (res.ok) {
      onAvatarChange(res.url)
      setMsg({ kind: 'success', text: 'Avatar aggiornato' })
    } else {
      setMsg({ kind: 'error', text: res.error })
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setMsg(null)
    const res = await updateProfile(profile.id, {
      fullName,
      phone: phone || null,
      bio: bio || null,
      language,
      timezone,
    })
    setSaving(false)
    setMsg(
      res.ok
        ? { kind: 'success', text: 'Profilo aggiornato' }
        : { kind: 'error', text: res.error },
    )
  }

  const handleUpdatePassword = async () => {
    setPwdMsg(null)
    if (pwdNew.length < 8) {
      setPwdMsg({ kind: 'error', text: 'La nuova password deve avere almeno 8 caratteri' })
      return
    }
    if (pwdNew !== pwdConfirm) {
      setPwdMsg({ kind: 'error', text: 'Le password non coincidono' })
      return
    }
    setPwdSaving(true)
    const res = await updatePassword(pwdCurrent, pwdNew)
    setPwdSaving(false)
    if (res.ok) {
      setPwdMsg({ kind: 'success', text: 'Password aggiornata' })
      setPwdCurrent('')
      setPwdNew('')
      setPwdConfirm('')
      setPwdOpen(false)
    } else {
      setPwdMsg({ kind: 'error', text: res.error })
    }
  }

  const closePwd = () => {
    setPwdOpen(false)
    setPwdCurrent('')
    setPwdNew('')
    setPwdConfirm('')
    setPwdMsg(null)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {msg && <Toast message={msg.text} kind={msg.kind} />}

      {/* Avatar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Carica avatar"
          style={{
            width: 72,
            height: 72,
            borderRadius: 100,
            background: avatarUrl
              ? `center / cover no-repeat url(${avatarUrl})`
              : '#F0F0F0',
            border: '1px solid #E9E9E9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 22,
            fontWeight: 700,
            color: '#222222',
            opacity: uploading ? 0.6 : 1,
            flexShrink: 0,
          }}
        >
          {!avatarUrl && initials}
        </button>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
            Foto profilo
          </div>
          <div style={{ fontSize: 13, color: '#B0B0B0', marginTop: 4 }}>
            JPG o PNG, almeno 256×256.
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleAvatarPick(f)
            }}
          />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        <Field label="Nome completo">
          <StyledInput
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="Mario Rossi"
          />
        </Field>
        <Field label="Email">
          <StyledInput value={profile.email ?? ''} disabled style={{ background: '#F4F4F4' }} />
        </Field>
        <Field label="Telefono">
          <StyledInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+39 ..."
          />
        </Field>
        <Field label="Lingua">
          <StyledSelect value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="it">Italiano</option>
            <option value="en">English</option>
          </StyledSelect>
        </Field>
        <Field label="Fuso orario">
          <StyledSelect value={timezone} onChange={(e) => setTimezone(e.target.value)}>
            <option value="Europe/Rome">Europe/Rome</option>
            <option value="Europe/London">Europe/London</option>
            <option value="Europe/Madrid">Europe/Madrid</option>
            <option value="Europe/Paris">Europe/Paris</option>
            <option value="UTC">UTC</option>
          </StyledSelect>
        </Field>
        <div style={{ gridColumn: '1 / -1' }}>
          <Field label={`Bio (${bio.length}/${BIO_MAX})`}>
            <StyledTextarea
              value={bio}
              maxLength={BIO_MAX}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Raccontaci qualcosa di te..."
            />
          </Field>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{ ...primaryButtonStyle, padding: '10px 24px', borderRadius: 10 }}
        >
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>

      <div style={{ borderTop: '1px solid #F0F0F0', margin: '28px 0 0' }} />

      <div
        style={{
          background: '#F9F9F9',
          borderRadius: 12,
          padding: 16,
        }}
      >
        {!pwdOpen ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#FFFFFF',
                  border: '1px solid #E9E9E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={16} color="#222222" />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
                  Cambio password
                </div>
                <div style={{ fontSize: 12, color: '#B0B0B0' }}>
                  Aggiorna la password del tuo account.
                </div>
              </div>
            </div>
            <button
              onClick={() => setPwdOpen(true)}
              style={{ ...outlineButtonStyle, padding: '8px 16px', fontSize: 13 }}
            >
              Modifica
            </button>
          </div>
        ) : (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#FFFFFF',
                  border: '1px solid #E9E9E9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Lock size={16} color="#222222" />
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#222222' }}>
                Cambio password
              </div>
            </div>

            {pwdMsg && (
              <div style={{ marginBottom: 12 }}>
                <Toast message={pwdMsg.text} kind={pwdMsg.kind} />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Field label="Password attuale">
                <StyledInput
                  type="password"
                  value={pwdCurrent}
                  onChange={(e) => setPwdCurrent(e.target.value)}
                />
              </Field>
              <Field label="Nuova password">
                <StyledInput
                  type="password"
                  value={pwdNew}
                  onChange={(e) => setPwdNew(e.target.value)}
                />
              </Field>
              <Field label="Conferma nuova password">
                <StyledInput
                  type="password"
                  value={pwdConfirm}
                  onChange={(e) => setPwdConfirm(e.target.value)}
                />
              </Field>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 12, marginTop: 16 }}>
              <button
                type="button"
                onClick={closePwd}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 13,
                  color: '#B0B0B0',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: 0,
                }}
              >
                Annulla
              </button>
              <button
                onClick={handleUpdatePassword}
                disabled={pwdSaving}
                style={{ ...primaryButtonStyle, padding: '10px 20px', borderRadius: 10 }}
              >
                {pwdSaving ? 'Aggiornamento...' : 'Aggiorna password'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
