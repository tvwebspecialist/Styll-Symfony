/* eslint-disable react/no-unknown-property */
import type { SVGProps } from 'react'

const baseProps: SVGProps<SVGSVGElement> = {
  viewBox: '0 0 480 480',
  fill: 'none',
  xmlns: 'http://www.w3.org/2000/svg',
  'aria-hidden': true,
}

const STROKE = '#171717'
const SOFT = '#a3a3a3'
const FILL_DARK = '#000000'
const FILL_LIGHT = '#ffffff'

export function LoginIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      {/* poltrona barbiere stilizzata */}
      <rect x="120" y="320" width="240" height="20" rx="4" fill={FILL_DARK} />
      <rect x="200" y="200" width="80" height="120" rx="12" fill={FILL_DARK} />
      <rect x="180" y="220" width="120" height="20" rx="6" fill={STROKE} />
      <rect x="180" y="280" width="120" height="20" rx="6" fill={STROKE} />
      <rect x="232" y="120" width="16" height="80" fill={FILL_DARK} />
      {/* Testa */}
      <circle cx="240" cy="100" r="36" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
      {/* Specchio */}
      <rect x="60" y="80" width="80" height="120" rx="40" fill="none" stroke={SOFT} strokeWidth="2" />
      {/* Mensola flaconi */}
      <rect x="340" y="160" width="80" height="6" fill={SOFT} />
      <rect x="350" y="130" width="14" height="30" fill={STROKE} />
      <rect x="372" y="135" width="12" height="25" fill={STROKE} />
      <rect x="392" y="125" width="14" height="35" fill={STROKE} />
      {/* Pavimento */}
      <line x1="40" y1="345" x2="440" y2="345" stroke={STROKE} strokeWidth="2" />
    </svg>
  )
}

export function RegisterIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      {/* Tre card affiancate */}
      {[
        { x: 50, label: 'Zero commissioni', icon: '€' },
        { x: 170, label: 'Il tuo brand', icon: '✱' },
        { x: 290, label: 'I tuoi dati', icon: '◐' },
      ].map((c, i) => (
        <g key={i}>
          <rect
            x={c.x}
            y={140}
            width="140"
            height="200"
            rx="12"
            fill={FILL_LIGHT}
            stroke={STROKE}
            strokeWidth="2"
          />
          <circle cx={c.x + 70} cy={200} r="22" fill={FILL_DARK} />
          <text
            x={c.x + 70}
            y={208}
            textAnchor="middle"
            fontSize="22"
            fontWeight="700"
            fill={FILL_LIGHT}
            fontFamily="'Outfit', sans-serif"
          >
            {c.icon}
          </text>
          <rect x={c.x + 24} y={244} width="92" height="6" rx="3" fill={STROKE} />
          <rect x={c.x + 30} y={258} width="80" height="4" rx="2" fill={SOFT} />
          <rect x={c.x + 30} y={270} width="60" height="4" rx="2" fill={SOFT} />
          <text
            x={c.x + 70}
            y={310}
            textAnchor="middle"
            fontSize="11"
            fontWeight="700"
            fill={STROKE}
            fontFamily="'Outfit', sans-serif"
          >
            {c.label.toUpperCase()}
          </text>
        </g>
      ))}
    </svg>
  )
}

export function ForgotIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      {/* Busta + lucchetto */}
      <rect x="120" y="160" width="240" height="160" rx="12" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
      <path d="M120 160 L240 260 L360 160" stroke={STROKE} strokeWidth="3" fill="none" />
      <circle cx="240" cy="280" r="40" fill={FILL_DARK} />
      <rect x="226" y="270" width="28" height="22" rx="3" fill={FILL_LIGHT} />
      <path d="M232 270 V262 a8 8 0 0 1 16 0 V270" stroke={FILL_LIGHT} strokeWidth="3" fill="none" />
    </svg>
  )
}

/* ── Onboarding step illustrations ───────────────────────── */

export function ShopSignIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="80" y="100" width="320" height="140" rx="16" fill={FILL_DARK} />
      <text
        x="240"
        y="180"
        textAnchor="middle"
        fontSize="42"
        fontWeight="800"
        fill={FILL_LIGHT}
        fontFamily="'Outfit', sans-serif"
      >
        OPEN
      </text>
      <line x1="120" y1="240" x2="120" y2="320" stroke={STROKE} strokeWidth="4" />
      <line x1="360" y1="240" x2="360" y2="320" stroke={STROKE} strokeWidth="4" />
      <circle cx="120" cy="100" r="6" fill={FILL_DARK} />
      <circle cx="360" cy="100" r="6" fill={FILL_DARK} />
      <line x1="60" y1="340" x2="420" y2="340" stroke={STROKE} strokeWidth="2" />
    </svg>
  )
}

export function ForkIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <path
        d="M240 100 L240 200 L130 320"
        stroke={STROKE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M240 200 L350 320"
        stroke={STROKE}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      <circle cx="240" cy="100" r="14" fill={FILL_DARK} />
      <circle cx="130" cy="320" r="20" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
      <circle cx="350" cy="320" r="20" fill={FILL_DARK} />
      <circle cx="350" cy="320" r="6" fill={FILL_LIGHT} />
      <circle cx="338" cy="340" r="8" fill={FILL_DARK} />
      <circle cx="362" cy="340" r="8" fill={FILL_DARK} />
    </svg>
  )
}

export function MenuIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="120" y="80" width="240" height="320" rx="8" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
      <text
        x="240"
        y="130"
        textAnchor="middle"
        fontSize="22"
        fontWeight="800"
        fill={FILL_DARK}
        fontFamily="'Outfit', sans-serif"
      >
        SERVIZI
      </text>
      <line x1="160" y1="150" x2="320" y2="150" stroke={STROKE} strokeWidth="2" />
      {[170, 210, 250, 290, 330].map((y, i) => (
        <g key={i}>
          <rect x="150" y={y} width="120" height="6" rx="3" fill={STROKE} />
          <rect x="290" y={y} width="40" height="6" rx="3" fill={SOFT} />
        </g>
      ))}
    </svg>
  )
}

export function CalendarIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="80" y="100" width="320" height="280" rx="12" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
      <rect x="80" y="100" width="320" height="40" fill={FILL_DARK} />
      {/* days header */}
      {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((d, i) => (
        <text
          key={i}
          x={114 + i * 46}
          y={170}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill={STROKE}
          fontFamily="'Outfit', sans-serif"
        >
          {d}
        </text>
      ))}
      {/* slots grid */}
      {[0, 1, 2, 3].map((row) =>
        [0, 1, 2, 3, 4, 5, 6].map((col) => (
          <rect
            key={`${row}-${col}`}
            x={94 + col * 46}
            y={190 + row * 42}
            width="36"
            height="32"
            rx="4"
            fill={
              (row + col) % 4 === 0 ? FILL_DARK : 'none'
            }
            stroke={SOFT}
          />
        ))
      )}
    </svg>
  )
}

export function TeamIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      {[
        { x: 100, h: 200 },
        { x: 200, h: 240 },
        { x: 300, h: 200 },
      ].map((p, i) => (
        <g key={i}>
          <circle cx={p.x + 40} cy={140} r="32" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="3" />
          <rect x={p.x} y={172} width="80" height={p.h - 32} rx="14" fill={FILL_DARK} />
          <rect x={p.x + 16} y={186} width="48" height="6" rx="3" fill={FILL_LIGHT} />
        </g>
      ))}
      <line x1="60" y1="380" x2="420" y2="380" stroke={STROKE} strokeWidth="2" />
    </svg>
  )
}

export function PhoneIllustration(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...baseProps} {...props}>
      <rect x="160" y="60" width="160" height="320" rx="32" fill={FILL_LIGHT} stroke={STROKE} strokeWidth="4" />
      <rect x="160" y="60" width="160" height="50" rx="32" fill={FILL_DARK} />
      <circle cx="240" cy="86" r="3" fill={FILL_LIGHT} />
      {/* logo placeholder */}
      <circle cx="240" cy="180" r="32" fill={FILL_DARK} />
      <rect x="200" y="232" width="80" height="8" rx="4" fill={STROKE} />
      <rect x="180" y="280" width="120" height="20" rx="6" fill={FILL_DARK} />
      <rect x="180" y="310" width="120" height="20" rx="6" fill="none" stroke={STROKE} strokeWidth="2" />
      <rect x="180" y="340" width="120" height="20" rx="6" fill="none" stroke={STROKE} strokeWidth="2" />
    </svg>
  )
}
