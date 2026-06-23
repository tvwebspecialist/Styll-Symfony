# PWA Patterns — Styll

Fonte di verità per i pattern visivi della PWA cliente.

---

## Floating Card

Blocco bianco fisso in basso, staccato dai bordi laterali, con ombra superiore. Standard Styll per contenuti principali della PWA. **Non scrolla con la pagina — è sempre visibile.**

### Valori CSS esatti (posizione fixed)

```css
position: fixed;
bottom: 12px;
left: 12px;
right: 12px;
margin: 0;               /* annulla il margin base del componente */
z-index: 10;
background: white;
border-radius: 24px;
padding: 20px 20px max(env(safe-area-inset-bottom, 0px), 20px);
box-shadow: 0 -4px 32px rgba(0,0,0,0.12);
```

### Componente

```tsx
import { FloatingCard } from '@/components/pwa/FloatingCard'

<FloatingCard style={{
  position: 'fixed',
  bottom: 12,
  left: 12,
  right: 12,
  margin: 0,
  zIndex: 10,
  boxShadow: '0 -4px 32px rgba(0,0,0,0.12)',
  padding: `20px 20px max(env(safe-area-inset-bottom, 0px), 20px)`,
}}>
  contenuto
</FloatingCard>
```

Props: `children`, `className`, `style` (spread sopra gli stili base).

> **Nota:** il componente ha `margin: '0 12px'` come base; quando si usa `position: fixed` con `left`/`right` espliciti, passare `margin: 0` nell'override per annullarlo.

---

## Pattern Hero + Floating Card

Hero image fissa come sfondo, FloatingCard fisso in basso con tutto il contenuto e il CTA dentro.

### Struttura

```
┌─────────────────────────────────┐
│                                 │
│   Hero image (fixed, 100dvh)    │
│                                 │
│   [← back button, fixed]        │
│                                 │
│                                 │
│  ╭──────────────────────────╮   │
│  │  ▬ drag handle           │   │
│  │  Titolo offerta          │   │
│  │  Descrizione (2 righe)   │   │
│  │  Pill validità           │   │
│  │  Servizio A    €18  ~~€30│   │
│  │  Servizio B    €12  ~~€20│   │
│  │  [  Prenota ora →      ] │   │
│  ╰──────────────────────────╯   │
└─────────────────────────────────┘
```

### Hero

```tsx
<div style={{
  position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0,
  background: `linear-gradient(135deg, ${brandColor} 0%, ${brandColor}88 100%)`,
}}>
  <Image src={coverUrl} alt={title} fill priority sizes="100vw" style={{ objectFit: 'cover' }} />
</div>
```

### Contenuto FloatingCard (ordine dall'alto)

1. **Drag handle** — `width: 40, height: 4, borderRadius: 2, background: #E5E7EB`, centrato, `margin: '0 auto 16px'`
2. **Titolo** — `fontSize: 22, fontWeight: 800, color: #18181B`
3. **Descrizione** — `fontSize: 14, color: #6B7280, WebkitLineClamp: 2` (max 2 righe)
4. **Pill validità** — badge data e urgenza
5. **Lista servizi/prodotti** — righe compatte, `maxHeight: 120, overflowY: auto`
   - ogni riga: nome + prezzo scontato verde (`#16A34A, 14px bold`) + originale barrato (`#A1A1AA`)
6. **CTA** — `height: 52, borderRadius: 14, background: brandColor`, full-width, `marginTop: 16`

### Main wrapper

```tsx
<main style={{ height: '100dvh', overflow: 'hidden', position: 'relative' }}>
```

---

## Pagine che usano FloatingCard

- `app/tenant/app/[slug]/offerte/[id]/page.tsx` — dettaglio offerta (Hero + Floating Card)
