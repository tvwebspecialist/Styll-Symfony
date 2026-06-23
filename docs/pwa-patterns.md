# PWA Patterns — Styll

Fonte di verità per i pattern visivi della PWA cliente.

---

## Floating Card

Blocco bianco con angoli arrotondati, staccato dai bordi, con ombra. Componente base per tutti i contenuti PWA.

```css
background: white;
border-radius: 24px;
margin: 0 12px;
padding: 20px;
box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
```

```tsx
import { FloatingCard } from '@/components/pwa/FloatingCard'

<FloatingCard style={{ /* override */ }}>
  contenuto
</FloatingCard>
```

Props: `children`, `className`, `style` (spread sopra gli stili base). `margin: 0` nell'override quando si usa `position: fixed` con `left`/`right` espliciti.

---

## Pattern: Dual Floating Card

Due card verticali che insieme occupano `100dvh`, con gap 8px tra loro. Card 1 = immagine, Card 2 = contenuto + CTA.

```
┌─────────────────────────────────┐  ← safe area top (paddingTop: max(12px, safe-area))
│  ╭─────────────────────────╮   │
│  │  [← back]               │   │  Card 1: immagine
│  │  aspect-ratio: 16/9     │   │  margin: 0 12px, border-radius: 24px
│  │  overflow: hidden       │   │  flex-shrink: 0
│  ╰─────────────────────────╯   │
│           ← gap: 8px →         │
│  ╭─────────────────────────╮   │
│  │  ▬ drag handle          │   │
│  │  Titolo (22px 800)      │   │  Card 2: contenuto
│  │  Descrizione (2 righe)  │   │  margin: 0 12px 12px
│  │  Pill validità          │   │  flex: 1, display: flex, flex-direction: column
│  │  ─── items (flex:1) ─── │   │  overflow: hidden
│  │  [  Prenota ora →     ] │   │
│  ╰─────────────────────────╯   │
└─────────────────────────────────┘  ← safe area bottom (paddingBottom via padding shorthand)
```

### Struttura

```tsx
<main style={{
  height: '100dvh',
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
  background: '#F2F2F7',
  paddingTop: 'max(12px, env(safe-area-inset-top, 0px))',
  overflow: 'hidden',
}}>

  {/* Card 1 — immagine */}
  <FloatingCard style={{
    margin: '0 12px',
    padding: 0,
    flexShrink: 0,
    aspectRatio: '16/9',
    overflow: 'hidden',
    position: 'relative',       /* per back button assoluto + Next Image fill */
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
    background: brandColorGradient,
  }}>
    <Image src={coverUrl} alt={title} fill sizes="100vw" style={{ objectFit: 'cover' }} />
    {/* Back button: position: absolute, top: 12, left: 12 */}
  </FloatingCard>

  {/* Card 2 — contenuto */}
  <FloatingCard style={{
    margin: '0 12px 12px',
    padding: `16px 20px max(env(safe-area-inset-bottom, 0px), 16px)`,
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
  }}>
    {/* drag handle (flex-shrink: 0) */}
    {/* title (flex-shrink: 0) */}
    {/* description, pills (flex-shrink: 0) */}
    {/* items list: flex: 1, minHeight: 0, overflowY: auto */}
    {/* CTA: flex-shrink: 0, marginTop: 16, height: 52, borderRadius: 14 */}
  </FloatingCard>
</main>
```

### Note chiave

- `minHeight: 0` sul container items è **obbligatorio** — senza, flex items non rispettano `overflow: auto` dentro un flex container
- `flex-shrink: 0` su tutti gli elementi tranne items (altrimenti si comprimono quando Card 2 è piena)
- Il back button va dentro Card 1 come `position: absolute` — non serve TopBar
- `gap: 8` sul `<main>` gestisce lo spazio tra le card

### Pagine che usano questo pattern

- `app/tenant/app/[slug]/offerte/[id]/page.tsx` — dettaglio offerta
