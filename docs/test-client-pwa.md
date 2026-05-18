# Test manuale Client PWA

Checklist per verificare il booking flow end-to-end con il tenant demo `demo-marco`.

---

## Setup

### 1. Prerequisiti

- [ ] `pnpm dev` in esecuzione (`apps/web`)
- [ ] Accesso al Supabase Dashboard del progetto

### 2. Migration RLS

- [ ] Aprire Supabase Dashboard → SQL Editor
- [ ] Eseguire `supabase/migrations/20260616000001_public_pwa_rls.sql`
- [ ] Verificare nel SQL Editor:
  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE tablename IN ('services','locations','staff_members','promotions','loyalty_configs','rewards')
  ORDER BY tablename;
  -- rowsecurity deve essere TRUE per tutte le righe
  ```

### 3. Seed dati demo

- [ ] Aprire Supabase Dashboard → SQL Editor
- [ ] Eseguire la sezione principale di `supabase/seed-demo.sql`
  - Crea: tenant `demo-marco`, 1 location, 5 servizi, loyalty config, 3 rewards, 1 promozione
- [ ] **PASSO MANUALE** — Staff member (vedi nota sotto)

> **⚠️ Nota staff**: `staff_members.profile_id` è NOT NULL con FK verso `auth.users`.
> Devi usare un UUID di un utente già esistente oppure crearne uno nuovo dal
> dashboard (Authentication → Users → Add user).
> Poi esegui il blocco commentato `/* ... */` nel seed, sostituendo `YOUR_USER_UUID`.

- [ ] Eseguire il blocco staff nel seed con il UUID corretto
- [ ] Verificare con la query di check in fondo al seed:
  ```
  locations: 1, services: 5, staff: 1, working_hours: 6
  ```

### 4. Edge Function (opzionale — solo per client non-Next.js)

> La PWA Next.js usa Server Actions con service role direttamente — l'Edge Function
> non è necessaria per il test locale. Deployarla solo se vuoi testare l'API diretta.

```bash
supabase functions deploy create-guest-booking
```

---

## Landing page

URL: `http://localhost:3000/tenant/landing/demo-marco`

- [ ] Branding: sfondo/pulsanti usano colore `#1a1a2e`
- [ ] Colore accent `#e94560` visibile sui CTA secondari
- [ ] Font Outfit caricato correttamente (non fallback sans-serif)
- [ ] Hero: nome "Marco Ferretti Barber" visibile
- [ ] Sezione Servizi: 5 servizi visibili, raggruppati per categoria
- [ ] Promozione "🎉 Primo Taglio -20%" visibile
- [ ] Link/bottone "Prenota" o "Apri l'app" naviga a `/tenant/app/demo-marco`
- [ ] Footer mostra indirizzo (Via Roma 42, Napoli) e telefono

---

## Home app (PWA shell)

URL: `http://localhost:3000/tenant/app/demo-marco`

- [ ] Header con nome barbiere "Marco Ferretti Barber"
- [ ] Card promozione "Primo Taglio -20%" visibile
- [ ] Bottone "Prenota ora" presente e cliccabile
- [ ] Card loyalty system visibile (con anteprima rewards)
- [ ] Bottom navigation con 3 tab: Home · Prenota · Punti

---

## Booking flow

### Step 1 — Sedi (`/prenota`)

- [ ] Se esiste 1 sola sede → redirect automatico a `/prenota/servizi`
- [ ] Se più sedi → lista sedi visibile, selezione funziona

### Step 2 — Servizi (`/prenota/servizi`)

- [ ] 5 servizi visibili, con nome, prezzo e durata
- [ ] Raggruppati per categoria (Taglio, Barba, Colore)
- [ ] Selezione singola e multipla funzionano
- [ ] Checkbox visuale con tick brand-color
- [ ] Totale prezzo/durata aggiornato in real-time
- [ ] Bottone "Continua" attivo solo dopo aver selezionato almeno 1 servizio
- [ ] Seleziona "Taglio Classico" → "Continua" → naviga a `/prenota/staff`

### Step 3 — Staff (`/prenota/staff`)

- [ ] Se esiste 1 solo staff attivo con i servizi selezionati → redirect automatico
- [ ] Se più staff → lista visibile con nome e foto/avatar
- [ ] URL contiene `?staff=<id>` dopo selezione

### Step 4 — Data & Ora (`/prenota/data`)

- [ ] Calendario mostra 14 giorni da oggi
- [ ] Domenica esclusa (nessun orario lavorativo impostato)
- [ ] Sabato: slot fino alle 14:00 (break alle 14:00 per orario dimezzato)
- [ ] Lun-Ven: slot 9:00–19:00 con step corretto per la durata del servizio
  - Taglio Classico (30 min) → slot ogni 30 min: 09:00, 09:30, 10:00...
- [ ] Slot già prenotati non compaiono
- [ ] Selezionare uno slot → naviga a `/prenota/conferma`

### Step 5 — Conferma (`/prenota/conferma`)

- [ ] Riepilogo corretto: servizio, staff, data/ora, sede, prezzo totale
- [ ] Form con campi: Nome completo, Telefono, Email (opzionale), Note (opzionale)
- [ ] Checkbox consenso marketing
- [ ] Validazione: nome min 2 caratteri, telefono min 6 caratteri
- [ ] Email validata se inserita
- [ ] Bottone "Conferma prenotazione" presente
- [ ] Compilare il form e inviare → naviga a `/prenota/successo`

### Step 6 — Successo (`/prenota/successo`)

- [ ] Messaggio di conferma con riepilogo appuntamento
- [ ] Link "Aggiungi a Google Calendar" funzionante
- [ ] Link "Torna alla home" naviga alla home PWA

---

## Verifica DB post-booking

Aprire Supabase Dashboard → Table Editor dopo aver completato una prenotazione:

- [ ] Tabella `clients`: record con nome e telefono inseriti, `deleted_at` IS NULL
- [ ] Tabella `appointments`: record con `booking_source = 'pwa'`, `status = 'confirmed'`
- [ ] Tabella `appointment_services`: record con `price_at_booking` corretto

Query di verifica:
```sql
SELECT
  a.id AS appointment_id,
  a.status,
  a.booking_source,
  a.start_time,
  c.full_name,
  c.phone,
  array_agg(s.name) AS servizi,
  sum(aps.price_at_booking) AS totale_pagato
FROM public.appointments a
JOIN public.clients c ON c.id = a.client_id
JOIN public.appointment_services aps ON aps.appointment_id = a.id
JOIN public.services s ON s.id = aps.service_id
WHERE a.tenant_id = 'aaaaaaaa-0001-0001-0001-000000000001'
GROUP BY a.id, a.status, a.booking_source, a.start_time, c.full_name, c.phone
ORDER BY a.created_at DESC
LIMIT 5;
```

---

## Punti (loyalty teaser)

URL: `http://localhost:3000/tenant/app/demo-marco/punti`

- [ ] Pagina punti accessibile
- [ ] 3 rewards visibili (Prodotto Styling, Rifinitura Gratis, Taglio Gratis)
- [ ] Spiegazione del sistema punti (100 punti per visita)
- [ ] CTA per prenotare (i punti si guadagnano prenotando)

---

## Profilo

URL: `http://localhost:3000/tenant/app/demo-marco/profilo`

- [ ] Pagina profilo accessibile (può essere placeholder — auth OTP in task separato)

---

## Note finali

- **OTP Auth**: il login cliente via OTP è un task separato e non blocca il test booking
- **Edge Function**: deployare solo per testare integrazioni esterne (non necessaria per PWA)
- **Subdomain routing**: testabile solo in produzione — in locale usare i path `/tenant/app/[slug]`
