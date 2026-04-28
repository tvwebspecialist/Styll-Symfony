'use client'

import * as React from 'react'

export const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#F9F9F9',
  border: '1px solid #E9E9E9',
  borderRadius: 10,
  padding: '10px 14px',
  fontSize: 14,
  color: '#222222',
  outline: 'none',
  transition: 'border-color 120ms ease, background 120ms ease',
  boxSizing: 'border-box',
}

export const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#B0B0B0',
  fontWeight: 500,
  marginBottom: 6,
}

export const primaryButtonStyle: React.CSSProperties = {
  background: '#222222',
  color: '#FFFFFF',
  border: 'none',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
}

export const outlineButtonStyle: React.CSSProperties = {
  background: '#FFFFFF',
  color: '#222222',
  border: '1px solid #E9E9E9',
  borderRadius: 10,
  padding: '10px 20px',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

export function Divider() {
  return <div style={{ height: 1, background: '#F0F0F0', margin: '24px 0' }} />
}

export function StyledInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...(props.style ?? {}) }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#222222'
        e.currentTarget.style.background = '#FFFFFF'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E9E9E9'
        e.currentTarget.style.background = props.disabled ? '#F4F4F4' : '#F9F9F9'
        props.onBlur?.(e)
      }}
    />
  )
}

export function StyledTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      style={{ ...inputStyle, resize: 'vertical', minHeight: 80, ...(props.style ?? {}) }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#222222'
        e.currentTarget.style.background = '#FFFFFF'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E9E9E9'
        e.currentTarget.style.background = '#F9F9F9'
        props.onBlur?.(e)
      }}
    />
  )
}

export function StyledSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...inputStyle, ...(props.style ?? {}) }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = '#222222'
        e.currentTarget.style.background = '#FFFFFF'
        props.onFocus?.(e)
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = '#E9E9E9'
        e.currentTarget.style.background = '#F9F9F9'
        props.onBlur?.(e)
      }}
    />
  )
}

export function Toast({ message, kind }: { message: string; kind: 'success' | 'error' }) {
  return (
    <div
      style={{
        padding: '10px 14px',
        borderRadius: 10,
        fontSize: 13,
        background: kind === 'success' ? '#F0FDF4' : '#FFF2F2',
        color: kind === 'success' ? '#16A34A' : '#DC2626',
        border: `1px solid ${kind === 'success' ? '#BBF7D0' : '#FECACA'}`,
      }}
    >
      {message}
    </div>
  )
}
