'use client'

import * as React from 'react'
import {
  Search, ChevronDown, X,
  Rocket, CalendarDays, Users, Gift,
  MessageCircle, Package, Settings, LayoutGrid,
  Bot, Sparkles, ArrowRight, SendHorizontal,
} from 'lucide-react'

// ─── Data ─────────────────────────────────────────────────────────────────────

interface Faq {
  q: string
  a: string
}

interface Category {
  id: string
  icon: React.ElementType
  label: string
  faqs: Faq[]
}

const CATEGORIES: Category[] = [
  {
    id: 'primo-avvio',
    icon: Rocket,
    label: 'Primo avvio',
    faqs: [
      {
        q: 'Come configuro la mia app per la prima volta?',
        a: 'Vai su Impostazioni → La mia App e completa i passaggi guidati: carica il logo, scegli il colore primario e inserisci gli orari del tuo salone. Ci vogliono circa 5 minuti. Una volta salvato, la tua app è pronta da condividere.',
      },
      {
        q: 'Come importo i clienti da Fresha o Booksy?',
        a: 'Vai su Clienti → Importa clienti. Esporta il file CSV dal gestionale precedente, poi trascinalo nella pagina di importazione. Styll rileva automaticamente i campi e ti mostra un\'anteprima prima di confermare.',
      },
      {
        q: 'Come condivido il link della mia app ai clienti?',
        a: 'Trovi il tuo link personale in Impostazioni → La mia App → Link pubblico. Puoi copiarlo e incollarlo in un messaggio WhatsApp, oppure scaricare il QR code da stampare o appendere in salone.',
      },
    ],
  },
  {
    id: 'appuntamenti',
    icon: CalendarDays,
    label: 'Appuntamenti & Calendario',
    faqs: [
      {
        q: 'Come aggiungo un appuntamento manualmente?',
        a: 'Dal Calendario, clicca su una fascia oraria libera oppure sul pulsante "+ Nuovo" in alto a destra. Seleziona il cliente (o creane uno al momento), scegli il servizio e conferma. L\'appuntamento appare subito nella vista giornaliera.',
      },
      {
        q: 'Come gestisco un walk-in?',
        a: 'Clicca su "+ Nuovo" nel calendario e scegli "Walk-in" come tipo di appuntamento. Puoi associarlo a un cliente esistente o lasciarlo anonimo. Utile per tenere traccia dei passaggi e le statistiche del salone.',
      },
      {
        q: 'Come blocco un giorno o un orario?',
        a: 'Nel Calendario, clicca sull\'orario che vuoi bloccare e scegli "Blocca fascia". Puoi bloccare un\'ora singola, un\'intera giornata o un intervallo ricorrente (es. pausa pranzo). I clienti non potranno prenotare in quel periodo.',
      },
      {
        q: 'Cosa succede se un cliente cancella?',
        a: 'Ricevi una notifica push e il tempo torna disponibile nel calendario. Se hai attivato il promemoria anti no-show, il sistema invia in automatico un messaggio di ri-prenotazione al cliente entro 24 ore dalla cancellazione.',
      },
    ],
  },
  {
    id: 'clienti',
    icon: Users,
    label: 'Clienti & CRM',
    faqs: [
      {
        q: 'Come aggiungo un cliente nuovo?',
        a: 'Vai su Clienti → pulsante "+ Nuovo cliente". Inserisci nome, numero di telefono e (opzionale) email. Puoi anche aggiungere un cliente al volo direttamente dalla schermata di creazione appuntamento.',
      },
      {
        q: 'Dove vedo le note private su un cliente?',
        a: 'Apri la scheda cliente cliccando sul suo nome. In basso trovi la sezione "Note private": solo i membri del tuo team le vedono, non sono mai visibili al cliente. Ideale per preferenze su tagli, allergie o note di stile.',
      },
      {
        q: 'Cosa significa il semaforo 🟡🔴 accanto al nome?',
        a: '🟢 Cliente attivo (tornato di recente). 🟡 Cliente a rischio (non viene da 4–8 settimane). 🔴 Cliente perso (assente da più di 8 settimane). Il semaforo ti aiuta a capire a colpo d\'occhio chi ha bisogno di un messaggio win-back.',
      },
    ],
  },
  {
    id: 'loyalty',
    icon: Gift,
    label: 'Loyalty & Punti',
    faqs: [
      {
        q: 'Come assegno punti a un cliente che non ha l\'app?',
        a: 'Apri la scheda cliente e clicca su "Assegna punti manualmente". Inserisci il numero di punti e un\'eventuale nota (es. "taglio + barba"). I punti vengono accreditati subito e il cliente li vedrà quando scarica l\'app.',
      },
      {
        q: 'Come riscatto un premio per un cliente?',
        a: 'Dalla scheda cliente, nella sezione Loyalty, clicca su "Riscatta premio". Seleziona il premio dal menu e conferma. Il saldo punti viene scalato automaticamente e il cliente riceve una notifica di conferma.',
      },
      {
        q: 'Come cambio le soglie dei premi?',
        a: 'Vai su Impostazioni → Loyalty. Da qui puoi modificare il numero di punti necessari per ogni premio, aggiungere nuovi premi o disattivare quelli esistenti. Le modifiche sono attive immediatamente per tutti i clienti.',
      },
    ],
  },
  {
    id: 'messaggi',
    icon: MessageCircle,
    label: 'Messaggi & Win-back',
    faqs: [
      {
        q: 'Come invio un messaggio a un cliente che non viene da tempo?',
        a: 'Vai su Marketing → Win-back. Styll mostra già la lista dei clienti 🟡🔴. Seleziona uno o più clienti e clicca "Invia messaggio". Puoi usare un template pronto o scrivere un testo personalizzato, inviato via WhatsApp o SMS.',
      },
      {
        q: 'Come funziona il promemoria automatico anti no-show?',
        a: 'Il promemoria viene inviato in automatico 24 ore prima dell\'appuntamento con un link di conferma. Se il cliente non risponde entro 2 ore dall\'appuntamento, ricevi una notifica. Puoi attivarlo o disattivarlo in Impostazioni → Notifiche.',
      },
      {
        q: 'Posso personalizzare il testo dei messaggi?',
        a: 'Sì. In Marketing → Messaggi trovi tutti i template attivi. Clicca su un template per modificarlo: puoi cambiare il testo, usare variabili dinamiche come {{nome_cliente}} o {{data_appuntamento}}, e visualizzare un\'anteprima prima di salvare.',
      },
    ],
  },
  {
    id: 'prodotti',
    icon: Package,
    label: 'Prodotti & Inventario',
    faqs: [
      {
        q: 'Come aggiungo un prodotto al catalogo?',
        a: 'Vai su Catalogo → Prodotti → "+ Aggiungi prodotto". Inserisci nome, prezzo di vendita, prezzo di costo e quantità iniziale. Puoi anche aggiungere una foto e associare il prodotto a una categoria per trovarlo più facilmente.',
      },
      {
        q: 'Come registro una vendita durante un appuntamento?',
        a: 'Quando chiudi un appuntamento, clicca su "Aggiungi prodotto venduto" prima di confermare. Scegli il prodotto dal catalogo e la quantità: lo stock si aggiorna in automatico e la vendita appare nel report Vendite.',
      },
      {
        q: 'Come faccio a sapere quando sto finendo uno stock?',
        a: 'In Catalogo → Prodotti puoi impostare una soglia di riordino per ogni articolo. Quando lo stock scende sotto quella soglia, ricevi una notifica e il prodotto appare nella lista "Da riordinare" con evidenziazione arancione.',
      },
    ],
  },
  {
    id: 'impostazioni',
    icon: Settings,
    label: 'Impostazioni & Account',
    faqs: [
      {
        q: 'Come cambio logo o colori della mia app?',
        a: 'Vai su Impostazioni → La mia App → Personalizzazione. Carica un nuovo logo (formato PNG o SVG consigliato) e usa il color picker per scegliere il colore primario. Puoi vedere un\'anteprima in tempo reale prima di salvare.',
      },
      {
        q: 'Come aggiungo un membro del team?',
        a: 'Vai su Team → "+ Invita membro". Inserisci il nome, il ruolo e l\'email. Il tuo collaboratore riceve una mail di invito con le istruzioni per accedere. Puoi assegnare permessi diversi per ogni membro (es. solo calendario, o accesso completo).',
      },
      {
        q: 'Come esporto i miei dati?',
        a: 'In Impostazioni → Account → Esporta dati puoi scaricare l\'elenco clienti, la storico appuntamenti e le vendite in formato CSV. L\'esportazione è disponibile per qualsiasi intervallo di date e viene inviata alla tua email entro qualche minuto.',
      },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const normalise = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

// ─── Main component ───────────────────────────────────────────────────────────

export function AiutoClient() {
  const [search, setSearch] = React.useState('')
  const [selectedCat, setSelectedCat] = React.useState<string | null>(null)
  const [bodyOpenId, setBodyOpenId] = React.useState<string | null>(null)
  const [isMobile, setIsMobile] = React.useState(false)
  const bodyRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const q = normalise(search.trim())

  const filteredCats = React.useMemo(
    () =>
      CATEGORIES.map((cat) => ({
        ...cat,
        faqs: q
          ? cat.faqs.filter(
              (f) => normalise(f.q).includes(q) || normalise(f.a).includes(q)
            )
          : cat.faqs,
      })).filter((cat) => cat.faqs.length > 0),
    [q]
  )

  const isSearching = q.length > 0
  const showCards = !isSearching && !selectedCat
  const bodyCats = isSearching
    ? filteredCats
    : selectedCat
      ? CATEGORIES.filter((c) => c.id === selectedCat)
      : []

  function handleSelectCat(id: string | null) {
    setSelectedCat(id)
    setSearch('')
    setBodyOpenId(null)
    setTimeout(
      () => bodyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      50
    )
  }

  function toggleBody(key: string) {
    setBodyOpenId((prev) => (prev === key ? null : key))
  }

  const totalFaqs = CATEGORIES.reduce((acc, c) => acc + c.faqs.length, 0)

  return (
    <div style={{ fontFamily: 'var(--font-primary, Outfit, sans-serif)' }}>
      {/* ── Standard header ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <h1 className="dashboard-page-title" style={{ fontSize: 28, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>
          Centro assistenza
        </h1>
        <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: '4px 0 0' }}>
          Trova risposta alle domande più comuni su Styll.
        </p>
      </div>

      {/* ── Search bar ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 100,
          border: '1px solid var(--color-border)',
          background: 'var(--color-bg-secondary)',
          boxShadow: '0 2px 8px rgba(64,79,104,0.06)',
          marginBottom: 28,
          maxWidth: 480,
        }}
      >
        <Search size={16} style={{ color: 'var(--color-fg-muted)', flexShrink: 0 }} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cerca una domanda..."
          style={{
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 14,
            color: 'var(--color-fg)',
            width: '100%',
            fontFamily: 'inherit',
          }}
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            aria-label="Cancella ricerca"
            style={{
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              padding: 0,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={14} style={{ color: 'var(--color-fg-muted)' }} />
          </button>
        )}
      </div>

      {/* ── Body ──────────────────────────────────────────────────────────────── */}
      <div
        ref={bodyRef}
        style={{ scrollMarginTop: 120 }}
      >
        {/* Mobile: horizontal category scroll */}
        {isMobile && (
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              scrollbarWidth: 'none',
              paddingBottom: 2,
              marginBottom: 24,
              flexWrap: 'nowrap',
            }}
          >
            <CategoryPill
              icon={LayoutGrid}
              label="Tutte"
              active={!selectedCat && !isSearching}
              onClick={() => handleSelectCat(null)}
            />
            {CATEGORIES.map((cat) => (
              <CategoryPill
                key={cat.id}
                icon={cat.icon}
                label={cat.label}
                active={selectedCat === cat.id && !isSearching}
                onClick={() => handleSelectCat(cat.id)}
              />
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 32, alignItems: 'flex-start' }}>
          {/* Desktop left nav */}
          {!isMobile && (
            <aside
              style={{
                width: 260,
                flexShrink: 0,
                position: 'sticky',
                top: 120,
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
              }}
            >
              <CategoryNavItem
                icon={LayoutGrid}
                label="Tutte le categorie"
                active={!selectedCat && !isSearching}
                onClick={() => handleSelectCat(null)}
                count={totalFaqs}
              />
              {CATEGORIES.map((cat) => (
                <CategoryNavItem
                  key={cat.id}
                  icon={cat.icon}
                  label={cat.label}
                  active={selectedCat === cat.id && !isSearching}
                  onClick={() => handleSelectCat(cat.id)}
                  count={cat.faqs.length}
                />
              ))}
            </aside>
          )}

          {/* Right column */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {isSearching && filteredCats.length === 0 ? (
              <EmptySearch query={search} />
            ) : showCards ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                  gap: 16,
                }}
              >
                {CATEGORIES.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onClick={() => handleSelectCat(cat.id)}
                  />
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {bodyCats.map((cat) => (
                  <CategoryFaqSection
                    key={cat.id}
                    category={cat}
                    openId={bodyOpenId}
                    onToggle={toggleBody}
                    searchQuery={q}
                    prefix="body"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>



      {/* ── AI Chat ───────────────────────────────────────────────────────────── */}
      <AiutoChat />
    </div>
  )
}

// ─── EmptySearch ──────────────────────────────────────────────────────────────

function EmptySearch({ query }: { query: string }) {
  return (
    <div
      style={{
        padding: '56px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <span style={{ fontSize: 40 }}>🔍</span>
      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-fg)', margin: 0 }}>
        Nessun risultato
      </p>
      <p style={{ fontSize: 14, color: 'var(--color-fg-muted)', margin: 0 }}>
        Nessuna domanda trovata per &ldquo;{query}&rdquo;.
      </p>
    </div>
  )
}

// ─── CategoryNavItem ──────────────────────────────────────────────────────────

function CategoryNavItem({
  icon: Icon,
  label,
  active,
  onClick,
  count,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
  count: number
}) {
  const [hover, setHover] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 16px',
        borderRadius: 10,
        border: 'none',
        cursor: 'pointer',
        width: '100%',
        fontSize: 14,
        fontWeight: active ? 600 : 400,
        color: active ? '#fff' : hover ? 'var(--color-fg)' : 'var(--color-fg-secondary)',
        background: active
          ? 'var(--color-fg)'
          : hover
            ? 'var(--color-bg-secondary)'
            : 'transparent',
        transition: 'background 120ms ease, color 120ms ease',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span
        style={{
          flex: 1,
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 11,
          fontWeight: 500,
          color: active ? 'rgba(255,255,255,0.65)' : 'var(--color-fg-muted)',
          background: active ? 'rgba(255,255,255,0.15)' : 'var(--color-bg-tertiary)',
          borderRadius: 20,
          padding: '2px 7px',
          flexShrink: 0,
          lineHeight: 1.6,
        }}
      >
        {count}
      </span>
    </button>
  )
}

// ─── CategoryPill (mobile tabs) ───────────────────────────────────────────────

function CategoryPill({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 14px',
        borderRadius: 20,
        border: '1px solid',
        borderColor: active ? 'var(--color-fg)' : 'var(--color-border)',
        cursor: 'pointer',
        fontSize: 13,
        fontWeight: active ? 600 : 500,
        color: active ? '#fff' : 'var(--color-fg-secondary)',
        background: active ? 'var(--color-fg)' : 'var(--color-bg)',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'all 150ms ease',
        fontFamily: 'inherit',
      }}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  )
}

// ─── CategoryCard ─────────────────────────────────────────────────────────────

function CategoryCard({
  category,
  onClick,
}: {
  category: Category
  onClick: () => void
}) {
  const [hover, setHover] = React.useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="styll-card"
      style={{
        padding: 24,
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        borderColor: hover ? 'var(--color-border-strong)' : 'var(--color-border)',
        background: hover ? 'var(--color-bg-secondary)' : 'var(--color-bg)',
        boxShadow: hover ? 'var(--shadow-lg)' : 'var(--shadow-md)',
        transform: hover ? 'translateY(-2px)' : 'translateY(0)',
        transition: 'all 150ms ease',
        width: '100%',
        fontFamily: 'inherit',
        borderRadius: 16,
      }}
    >
      <div
        style={{
          width: 44, height: 44, borderRadius: 10,
          background: 'var(--color-bg-secondary)',
          border: '1px solid var(--color-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--color-fg-secondary)',
          flexShrink: 0,
        }}
      >
        <category.icon size={22} />
      </div>
      <div style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 16,
            fontWeight: 700,
            color: 'var(--color-fg)',
            margin: '0 0 6px',
          }}
        >
          {category.label}
        </p>
        <p
          style={{
            fontSize: 13,
            color: 'var(--color-fg-muted)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {category.faqs.length} domande disponibili
        </p>
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <span
          style={{
            fontSize: 13,
            fontWeight: 500,
            color: 'var(--color-primary)',
          }}
        >
          Vedi domande →
        </span>
      </div>
    </button>
  )
}

// ─── CategoryFaqSection ───────────────────────────────────────────────────────

function CategoryFaqSection({
  category,
  openId,
  onToggle,
  searchQuery,
  prefix,
}: {
  category: Category
  openId: string | null
  onToggle: (key: string) => void
  searchQuery: string
  prefix: string
}) {
  return (
    <section style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div
          style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--color-fg-secondary)',
            flexShrink: 0,
          }}
        >
          <category.icon size={22} />
        </div>
        <h2
          style={{
            fontSize: 17,
            fontWeight: 700,
            color: 'var(--color-fg)',
            margin: 0,
          }}
        >
          {category.label}
        </h2>
      </div>
      <div>
        {category.faqs.map((faq, idx) => {
          const key = `${prefix}-${category.id}-${idx}`
          return (
            <AccordionItem
              key={key}
              itemKey={key}
              question={faq.q}
              answer={faq.a}
              icon={category.icon}
              open={openId === key}
              onToggle={() => onToggle(key)}
              searchQuery={searchQuery}
            />
          )
        })}
      </div>
    </section>
  )
}

// ─── AccordionItem ────────────────────────────────────────────────────────────

function AccordionItem({
  itemKey,
  question,
  answer,
  icon: Icon,
  open,
  onToggle,
  searchQuery,
}: {
  itemKey: string
  question: string
  answer: string
  icon: React.ElementType
  open: boolean
  onToggle: () => void
  searchQuery: string
}) {
  const [hover, setHover] = React.useState(false)

  function highlight(text: string): React.ReactNode {
    if (!searchQuery) return text
    const normText = normalise(text)
    const idx = normText.indexOf(searchQuery)
    if (idx < 0) return text
    return (
      <>
        {text.slice(0, idx)}
        <mark
          style={{
            background: '#fef08a',
            color: 'inherit',
            borderRadius: 2,
            padding: '0 1px',
          }}
        >
          {text.slice(idx, idx + searchQuery.length)}
        </mark>
        {text.slice(idx + searchQuery.length)}
      </>
    )
  }

  return (
    <div
      style={{
        background: 'var(--color-bg)',
        border: '1px solid',
        borderColor: open
          ? 'var(--color-primary)'
          : hover
            ? 'var(--color-border-strong)'
            : 'var(--color-border)',
        borderRadius: 'var(--radius-md)',
        marginBottom: 8,
        overflow: 'hidden',
        boxShadow: open
          ? '0 0 0 3px rgba(var(--color-primary-rgb), 0.08)'
          : 'none',
        transition: 'border-color 150ms ease, box-shadow 150ms ease',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* Question trigger */}
      <button
        id={`accordion-btn-${itemKey}`}
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '16px 18px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          userSelect: 'none',
          fontFamily: 'inherit',
          textAlign: 'left',
        }}
      >
        <Icon
          size={18}
          style={{ color: 'var(--color-fg-secondary)', flexShrink: 0 }}
        />
        <span
          style={{
            flex: 1,
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--color-fg)',
            lineHeight: 1.4,
          }}
        >
          {highlight(question)}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: 'var(--color-fg-muted)',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 250ms ease',
          }}
        />
      </button>

      {/* Answer panel */}
      <div
        style={{
          overflow: 'hidden',
          maxHeight: open ? 500 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-height 300ms ease, opacity 200ms ease',
        }}
      >
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.75,
            color: 'var(--color-fg-secondary)',
            margin: 0,
            padding: '0 18px 18px 48px',
          }}
        >
          {highlight(answer)}
        </p>
      </div>
    </div>
  )
}

// ─── AiutoChat ────────────────────────────────────────────────────────────────

type ChatMessage = { role: 'user' | 'assistant'; content: string }

function AiutoChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([])
  const [input, setInput] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [isStreaming, setIsStreaming] = React.useState(false)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  async function handleSend() {
    const text = input.trim()
    if (!text || isLoading) return

    const newMessages: ChatMessage[] = [...messages, { role: 'user', content: text }]
    setMessages([...newMessages, { role: 'assistant', content: '' }])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)

    try {
      const res = await fetch('/api/aiuto-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages.slice(-10) }),
      })

      if (!res.ok) throw new Error(`HTTP ${res.status}`)

      setIsStreaming(true)
      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      const assistantIndex = newMessages.length

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        accumulated += decoder.decode(value, { stream: true })
        setMessages(prev => {
          const updated = [...prev]
          updated[assistantIndex] = { role: 'assistant', content: accumulated }
          return updated
        })
      }
    } catch {
      const assistantIndex = newMessages.length
      setMessages(prev => {
        const updated = [...prev]
        updated[assistantIndex] = {
          role: 'assistant',
          content: 'Si è verificato un errore. Riprova tra poco.',
        }
        return updated
      })
    } finally {
      setIsLoading(false)
      setIsStreaming(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const canSend = input.trim().length > 0 && !isLoading

  const [chatOpen, setChatOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  React.useEffect(() => {
    const mql = window.matchMedia('(max-width: 768px)')
    const update = () => setIsMobile(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  return (
    <>
      {/* ── CTA dark card ────────────────────────────────────────────────────── */}
      <div
        style={{
          marginTop: 64,
          borderRadius: 24,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)',
          padding: isMobile ? '32px 24px' : '48px 48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 32,
          overflow: 'hidden',
          position: 'relative',
          marginBottom: 48,
        }}
      >
        {/* Decorative blur blob */}
        <div
          style={{
            position: 'absolute', top: -40, right: 80,
            width: 200, height: 200, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(233,69,96,0.25) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Left: text + button */}
        <div style={{ flex: 1, maxWidth: 400, position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(233,69,96,0.15)', border: '1px solid rgba(233,69,96,0.3)',
              borderRadius: 999, padding: '4px 12px', marginBottom: 16,
            }}
          >
            <Sparkles size={13} color="#E94560" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#E94560', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              Assistente AI
            </span>
          </div>

          <h2 style={{ fontSize: isMobile ? 22 : 26, fontWeight: 700, color: '#FFFFFF', margin: '0 0 10px', lineHeight: 1.2, letterSpacing: '-0.3px' }}>
            Non trovi quello che cerchi?
          </h2>
          <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', margin: '0 0 28px', lineHeight: 1.6 }}>
            Il nostro assistente conosce tutta la documentazione Styll e risponde in pochi secondi.
          </p>

          <button
            type="button"
            onClick={() => setChatOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', borderRadius: 12,
              background: '#FFFFFF', color: '#111111',
              border: 'none', cursor: 'pointer',
              fontSize: 14, fontWeight: 600,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              transition: 'transform 150ms ease, box-shadow 150ms ease',
              fontFamily: 'inherit',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)' }}
          >
            <Bot size={16} />
            Parla con l&apos;assistente
            <ArrowRight size={15} />
          </button>
        </div>

        {/* Right: floating chat preview card — hidden on mobile */}
        {!isMobile && (
          <div
            style={{
              flexShrink: 0, width: 260,
              background: '#FFFFFF', borderRadius: 16,
              padding: 16, position: 'relative', zIndex: 1,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #1a1a1a, #444)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <Bot size={16} color="white" />
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#111', margin: 0 }}>Styll AI</p>
                <p style={{ fontSize: 11, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                  Online
                </p>
              </div>
            </div>
            {[
              { bot: true, text: 'Ciao! Come posso aiutarti?' },
              { bot: false, text: 'Come attivo la loyalty?' },
              { bot: true, text: 'Vai su Loyalty → Configura...' },
            ].map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.bot ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: m.bot ? '12px 12px 12px 4px' : '12px 12px 4px 12px',
                    background: m.bot ? '#F4F4F4' : '#111111',
                    color: m.bot ? '#222' : '#fff',
                    fontSize: 12, maxWidth: '80%', lineHeight: 1.4,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Chat modal ───────────────────────────────────────────────────────── */}
      {chatOpen && (
        <div
          style={{
            position: 'fixed',
            bottom: isMobile ? 0 : 24,
            right: isMobile ? 0 : 24,
            width: isMobile ? '100vw' : 380,
            height: isMobile ? '100dvh' : 540,
            borderRadius: isMobile ? 0 : 20,
            background: 'var(--color-bg)',
            boxShadow: '0 24px 80px rgba(0,0,0,0.18), 0 0 0 1px var(--color-border)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 9999,
            animation: 'aiuto-slide-up 250ms cubic-bezier(0.16,1,0.3,1)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <div
            style={{
              height: 64, padding: '0 16px',
              display: 'flex', alignItems: 'center', gap: 12,
              borderBottom: '1px solid var(--color-border)',
              background: 'var(--color-bg)',
              borderRadius: isMobile ? 0 : '20px 20px 0 0',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a1a1a, #444)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Bot size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-fg)', margin: 0 }}>Styll AI</p>
              <p style={{ fontSize: 12, color: '#22c55e', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />
                Online
              </p>
            </div>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: 'none', background: 'transparent',
                cursor: 'pointer', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                color: 'var(--color-fg-muted)',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--color-bg-secondary)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Messages area */}
          <div
            style={{
              flex: 1, overflowY: 'auto', padding: 16,
              display: 'flex', flexDirection: 'column', gap: 10,
            }}
          >
            {messages.length === 0 ? (
              <div
                style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                <Bot size={28} style={{ color: 'var(--color-fg-muted)' }} />
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-fg)', margin: 0 }}>
                  Ciao! Come posso aiutarti?
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-fg-muted)', margin: 0 }}>
                  Fai una domanda su Styll
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => {
                const isUser = msg.role === 'user'
                const isLastAssistant = !isUser && idx === messages.length - 1
                const showLoading = isLoading && isLastAssistant && msg.content === ''
                const showCursor = isStreaming && isLastAssistant && msg.content !== ''

                return (
                  <div
                    key={idx}
                    style={{
                      alignSelf: isUser ? 'flex-end' : 'flex-start',
                      maxWidth: '75%',
                      background: isUser ? 'var(--color-fg)' : 'var(--color-bg-secondary)',
                      border: isUser ? 'none' : '1px solid var(--color-border)',
                      borderRadius: isUser ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      padding: '10px 14px',
                      fontSize: 13,
                      color: isUser ? 'white' : 'var(--color-fg)',
                      lineHeight: 1.5,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {showLoading ? (
                      <span style={{ display: 'flex', gap: 5, alignItems: 'center', padding: '3px 0' }}>
                        <span className="aiuto-dot" />
                        <span className="aiuto-dot" style={{ animationDelay: '0.16s' }} />
                        <span className="aiuto-dot" style={{ animationDelay: '0.32s' }} />
                      </span>
                    ) : (
                      <>
                        {msg.content}
                        {showCursor && (
                          <span
                            style={{
                              display: 'inline-block', width: 2, height: '1em',
                              background: 'var(--color-fg-muted)', marginLeft: 2,
                              verticalAlign: 'text-bottom',
                              animation: 'aiuto-cursor-blink 1s step-end infinite',
                            }}
                          />
                        )}
                      </>
                    )}
                  </div>
                )
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input area */}
          <div
            style={{
              padding: '12px 16px', borderTop: '1px solid var(--color-border)',
              display: 'flex', gap: 8, alignItems: 'flex-end', flexShrink: 0,
            }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Scrivi un messaggio..."
              rows={1}
              style={{
                flex: 1, border: 'none', background: 'transparent',
                outline: 'none', resize: 'none', fontSize: 14,
                color: 'var(--color-fg)', fontFamily: 'inherit',
                lineHeight: 1.5, minHeight: 20, maxHeight: 80, overflowY: 'auto',
              }}
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              style={{
                width: 36, height: 36, borderRadius: '50%',
                border: 'none', cursor: canSend ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: canSend ? 'var(--color-fg)' : 'var(--color-bg-secondary)',
                flexShrink: 0, transition: 'background 150ms ease',
              }}
            >
              <SendHorizontal size={16} style={{ color: canSend ? 'white' : 'var(--color-fg-muted)' }} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
