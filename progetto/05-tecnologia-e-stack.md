# Tecnologia e Stack — Styll

## Stack Tecnologico
- **Frontend:** Next.js 14+ con App Router, TypeScript
- **Backend / Database / Auth:** Supabase
- **Architettura:** SaaS online, sempre accessibile, aggiornabile centralmente
- **Tipo app cliente:** PWA (Progressive Web App) — no App Store, installabile da browser

---

## Architettura Multi-Tenant

Un'unica piattaforma centrale che ospita più barbieri contemporaneamente, mantenendo separati dati, impostazioni e identità visiva di ciascuno.

---

## Architettura branding per tenant (Next.js + Supabase)

```javascript
// Ogni tenant ha un config in Supabase
{
  tenant_id: "uuid",
  business_name: "Marco's Barber",
  primary_color: "#1A1A2E",
  secondary_color: "#E94560",
  logo_url: "https://cdn.Styll.app/tenants/marco/logo.png",
  favicon_url: "...",
  custom_domain: "prenotamarco.it", // v2
  subdomain: "marco.Styll.app"     // v1
}
```

**v1 — Subdomain + CSS Variables:**
- Ogni barbiere ha: `nomeattività.Styll.app`
- CSS Variables caricate da config tenant → colori, font, logo cambiano runtime
- Il cliente vede SOLO il brand del barbiere, MAI "Styll" (tranne un piccolo "Powered by" nel footer)

**v2 — Custom domain:**
- Il barbiere usa il suo dominio: `prenotamarco.it`
- SSL automatico via Let's Encrypt
- DNS CNAME + wildcard certificate

---

## Database schema gamification (Supabase)

```sql
-- Loyalty config per tenant
CREATE TABLE loyalty_config (
  tenant_id UUID REFERENCES tenants(id),
  points_per_euro INTEGER DEFAULT 10,
  streak_threshold_days INTEGER DEFAULT 45,
  tiers JSONB DEFAULT '[
    {"name": "Bronze", "min_points": 0, "benefits": []},
    {"name": "Silver", "min_points": 500, "benefits": ["5% sconto"]},
    {"name": "Gold", "min_points": 1500, "benefits": ["10% sconto", "prodotto omaggio"]},
    {"name": "Platinum", "min_points": 5000, "benefits": ["taglio gratis trimestrale"]}
  ]'
);

-- Loyalty stato per cliente
CREATE TABLE client_loyalty (
  client_id UUID REFERENCES clients(id),
  total_points INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  tier VARCHAR DEFAULT 'Bronze',
  badges JSONB DEFAULT '[]',
  last_visit_date DATE
);
```

---

## Prezzi API di comunicazione reali 2025 (Italia)

### WhatsApp Business API (prezzi Meta)

| Tipo messaggio | Costo per messaggio |
|---------------|-------------------|
| Marketing (template) | €0.0572 |
| Utility (reminder, conferma) | €0.0248 |
| Autenticazione | €0.0248-0.0313 |
| User-initiated (entro 24h) | **GRATIS** |

### SMS API (Italia)

| Provider | Costo per SMS |
|----------|--------------|
| **Twilio** | ~€0.055 |
| **MessageBird** | ~€0.045 |
| **Infobip** | ~€0.04-0.05 (volume) |
| **Vonage** | ~€0.062 |

**Provider consigliati per Styll:** MessageBird o Infobip (API unificata WhatsApp + SMS, prezzi competitivi Italia, pay-as-you-go).

**Calcolo costi per barbiere singolo (~120 clienti/mese):**
- Reminder 24h prima: 120 × €0.0248 = €2.98/mese
- Win-back (10 clienti/mese): 10 × €0.0572 = €0.57/mese
- Review request: 120 × €0.0248 = €2.98/mese
- **Totale: ~€6.50/mese** → ampiamente sostenibile

---

## Template social — Specifiche tecniche

**5 template statici auto-brandizzati:**
1. *"Prenota qui"* — con QR code alla PWA
2. *"La mia nuova app"* — per lancio
3. *"Promo inaugurale"* — sconto primo taglio
4. *"Post-taglio"* — "Come è andata? Lascia una recensione"
5. *"Reminder stagionale"* — "È ora di un taglio!"

**Specifiche tecniche:**
- Generati server-side con **Sharp/Canvas API** (Node.js) usando colori + logo + nome del barbiere
- Export come PNG per Instagram Stories (1080x1920) e post (1080x1080)
- Deep link alla PWA integrato
- Costo: zero (librerie open source)
- Nella dashboard sotto "Promuovi la tua app"

---

## Google Business Profile API

- Gratuita (con limiti di quota)
- OAuth 2.0 → `locations.get` → nome, indirizzo, orari, telefono, foto, categorie
- Perfetta per auto-fill al signup

---

## Privacy e GDPR

- Le note del barbiere NON sono visibili al cliente nella PWA
- Il cliente vede: storico prenotazioni, punti loyalty, prossima visita
- Il cliente può aggiornare: telefono, email, preferenze orario
- Consenso esplicito al primo accesso, opt-out sempre disponibile
- Export dati cliente: sempre gratis
- GDPR: opt-in esplicito + opt-out in ogni messaggio
- Frequenza win-back: max 1 al mese per cliente
- Il barbiere approva i win-back prima dell'invio (mai spam automatico in v1)

---

## Cascata intelligente canali (v2)

Push → WhatsApp → SMS → Email

| Canale | Per chi | Quando |
|--------|---------|--------|
| **Push notification (PWA)** | Luca (ha la PWA) | Reminder 24h, conferma booking |
| **WhatsApp** | Luca + clienti con WhatsApp | Reminder, win-back, promozioni |
| **SMS** | Roberto (no WhatsApp business) | Reminder, win-back |
| **Email** | Tutti (fallback) | Conferma booking, receipt |
