# PWA Patterns — Styll

Fonte di verità per i pattern visivi della PWA cliente.

---

## Floating Card

Blocco bianco con angoli arrotondati, staccato dai bordi laterali e con ombra leggera superiore. Standard Styll per contenuti nella PWA.

### Valori CSS esatti

```css
background: white;
border-radius: 24px;
margin: 0 12px;
padding: 20px;
box-shadow: 0 -4px 24px rgba(0,0,0,0.08);
```

### Quando usarlo

- Contenuto principale di una pagina PWA che deve "galleggiare" sul background
- Sheet sovrapposto a hero image (pattern Hero + Floating Card)
- Qualsiasi card che non deve toccare i bordi laterali del viewport

### Componente

```tsx
import { FloatingCard } from '@/components/pwa/FloatingCard'

<FloatingCard>
  contenuto
</FloatingCard>
```

Props: `children`, `className`, `style` (spread sopra gli stili base).

### Pattern Hero + Floating Card

Quando il FloatingCard si sovrappone a un'immagine hero:

```tsx
// Hero: full-width, altezza fissa
<div style={{ position: 'relative', height: '55vh', width: '100%' }}>
  <Image src={url} alt="" fill style={{ objectFit: 'cover' }} />
</div>

// FloatingCard sovrapposto di 24px
<FloatingCard style={{ position: 'relative', marginTop: -24, zIndex: 1 }}>
  {/* drag handle */}
  <div style={{ width: 40, height: 4, borderRadius: 2, background: '#E5E7EB', margin: '0 auto 20px' }} />
  {/* contenuto */}
</FloatingCard>
```

Aggiungere drag handle (40×4px, `#E5E7EB`) in cima al card quando il pattern viene usato su mobile.

### CTA fixed bottom abbinato

Quando c'è un FloatingCard con Hero, il CTA fixed bottom usa lo stesso padding laterale del card:

```tsx
<div style={{
  position: 'fixed', bottom: 0, left: 0, right: 0,
  padding: '12px 12px',
  paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 20px)',
  background: 'rgba(255,255,255,0.92)',
  backdropFilter: 'blur(12px)',
}}>
  <Link href={ctaUrl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: 56, borderRadius: 999, background: 'var(--brand-primary)', color: '#fff', fontSize: 16, fontWeight: 700, textDecoration: 'none' }}>
    Testo CTA →
  </Link>
</div>
```

### Pagine che usano FloatingCard

- `app/tenant/app/[slug]/offerte/[id]/page.tsx` — dettaglio offerta
