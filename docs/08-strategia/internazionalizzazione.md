> **Progetto:** Styll — Piattaforma SaaS di retention per barbieri  
> **Stack:** Next.js 14+ (frontend) + Symfony 7.4 + PostgreSQL 16 self-hosted (VPS EU)  
> _Documento aggiornato: luglio 2026. Versione Supabase archiviata in `docs/_archivio-supabase/internazionalizzazione-supabase.md`_

---

# Internazionalizzazione & Espansione Mercati — Styll

> Documento di analisi strategica per l'internazionalizzazione della piattaforma **Styll**, SaaS verticale per barbieri con focus sulla retention.

---

## 1. Introduzione

Styll parte dal mercato italiano (137.730 barbieri, 82.7% micro-imprenditori) come mercato pilota. L'architettura tecnica è stata progettata fin dall'inizio per supportare l'espansione internazionale grazie a:

| Aspetto | Approccio Symfony + PostgreSQL VPS |
|---------|-----------------------------------|
| **Multi-lingua (i18n)** | Symfony Translation component + database per contenuti tenant-specific |
| **Multi-valuta** | `DECIMAL(10,2)` + currency ISO code per tenant (`tenants.currency`) |
| **Data residency** | VPS per regione (Hetzner Frankfurt EU, Hetzner Hillsboro US-West, Hetzner Singapore APAC) |
| **Timezone** | PHP `DateTimeImmutable` con timezone esplicita; PostgreSQL `TIMESTAMPTZ` |
| **Stack tecnologico** | `Next.js 14+ (App Router), TypeScript (frontend), Symfony 7.4 + API Platform (backend), PostgreSQL 16 self-hosted` |

---

## 2. Readiness all'internazionalizzazione

### 2.1 — Punti di forza attuali

| Aspetto | Stato |
|---------|-------|
| **Multi-tenancy** | ✅ Ogni tenant isolato via Doctrine TenantFilter. Ogni barbiere in qualsiasi paese è un tenant indipendente |
| **UUID come PK** | ✅ UUID v4 non incrementali → impossibile enumerare. Funziona in qualsiasi paese |
| **API-first (API Platform)** | ✅ Frontend internazionale può consumare la stessa API |
| **PWA** | ✅ Nessuna dipendenza da App Store locali (Apple/Google) — deployment istantaneo |
| **GDPR-native** | ✅ `client_consents` granulari, soft delete con audit, `deleted_by` |
| **Data residency** | ✅ VPS in EU (Hetzner Frankfurt) — nessun trasferimento extra-UE per dati core |

### 2.2 — Gap da colmare per internazionalizzazione

| Gap | Soluzione |
|-----|-----------|
| **i18n frontend** | `next-intl` o `react-i18next` per Next.js |
| **i18n backend** | Symfony Translation + ICU messages per API responses |
| **Multi-valuta** | `tenants.currency` ISO 4217 + conversione con prezzi snapshot in valuta locale |
| **Normative locali** | DPA con sub-responsabili locali, compliance PECR (UK), LGPD (Brasile) |
| **Messaggistica locale** | Provider SMS/WhatsApp con copertura locale (Infobip o MessageBird globali) |
| **SEPA vs non-SEPA** | Stripe supporta 135+ valute — nessun cambio architetturale necessario |

---

## 3. Mappatura mercati

### 3.1 — Priorità di espansione

| Priorità | Mercato | Barbieri stimati | Motivazione |
|----------|---------|-----------------|-------------|
| 🔴 **Fase 1** | Italia | 137.730 | Mercato pilota, lingua comune, GDPR familiare |
| 🟡 **Fase 2** | Spagna | ~95.000 | Cultura simile, mercato grande, bassa penetrazione digitale |
| 🟡 **Fase 2** | Francia | ~80.000 | Mercato europeo, GDPR, alto potere d'acquisto |
| 🟢 **Fase 3** | UK | ~60.000 | English-speaking, post-Brexit compliance separata (PECR/UK GDPR) |
| 🟢 **Fase 3** | Germania | ~70.000 | Grande mercato, privacy-conscious (DSGVO) |
| ⚪ **Fase 4** | Brasile | ~350.000 | Mercato enorme, LGPD compliance, portogallo-speaking |

### 3.2 — Barriere per mercato

| Mercato | Barriera principale | Soluzione |
|---------|-------------------|-----------|
| **Spagna** | Lingua (ES), fatturazione SII | `es` locale + Stripe fatturazione EU |
| **Francia** | Lingua (FR), RGPD (= GDPR) | `fr` locale, DPA stesso template |
| **UK** | Post-Brexit: UK GDPR + PECR | DPA UK separato, ICO registration |
| **Germania** | DSGVO, preferenza dato locale | VPS Hetzner Frankfurt (già in EU) + `de` locale |
| **Brasile** | LGPD, fuso orario -3/-5, BRL | VPS São Paulo (Hetzner non disponibile → DigitalOcean/Vultr), Stripe BRL |

---

## 4. Strategia di localizzazione

### 4.1 — Architettura i18n Symfony

```php
// config/packages/translation.yaml
framework:
    default_locale: it
    translator:
        default_path: '%kernel.project_dir%/translations'
        fallbacks: [en]
        providers:
            # Crowdin o Lokalise per traduzioni professionali
```

```yaml
# translations/messages.it.yaml
appointment:
    created: "Appuntamento creato"
    reminder: "Reminder: il tuo appuntamento è tra {hours} ore"

# translations/messages.es.yaml  
appointment:
    created: "Cita creada"
    reminder: "Recordatorio: tu cita es en {hours} horas"
```

### 4.2 — Tenant locale

```sql
-- Campi internazionalizzazione già in tenants table
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS locale VARCHAR(5) DEFAULT 'it';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency CHAR(3) DEFAULT 'EUR';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'Europe/Rome';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS data_region VARCHAR(20) DEFAULT 'eu-west';
```

---

## 5. Pricing internazionale

| Mercato | Tier Starter | Tier Growth | Tier Pro | Note |
|---------|-------------|------------|---------|------|
| **Italia** | €19-29/mese | €49-69/mese | €99-149/mese | Prezzo base |
| **Spagna** | €17-25/mese | €44-62/mese | €89-135/mese | -10% (potere d'acquisto) |
| **Francia** | €22-32/mese | €52-72/mese | €109-159/mese | +10% (potere d'acquisto) |
| **UK** | £18-28/mese | £45-65/mese | £90-140/mese | In GBP, prezzi simili |
| **Germania** | €22-32/mese | €52-75/mese | €110-165/mese | +15% (mercato premium) |
| **Brasile** | R$79-119/mese | R$199-289/mese | R$399-599/mese | In BRL, potere d'acquisto locale |

---

## 6. GDPR e Compliance Internazionale

### 6.1 — Sub-responsabili del trattamento dati (aggiornati per Symfony/VPS)

| Sub-responsabile | Ruolo | Sede | Trasferimento extra-UE |
|-----------------|-------|------|----------------------|
| **Hetzner Online GmbH** | Hosting VPS (database + backend) | Germania (Frankfurt) | ❌ No — dati UE rimangono in UE |
| **Vercel Inc.** | Hosting frontend Next.js | USA (con edge EU) | ⚠️ Edge EU attivo — verificare configurazione |
| **Stripe Inc.** | Processore pagamenti | USA (con sede UE) | ⚠️ Usa SCC (Standard Contractual Clauses) |
| **MessageBird / Infobip** | Provider SMS/WhatsApp | NL / SI | ⚠️ Verifica DPA e certificazione DPF |
| **Anthropic PBC** | AI (inbox receptionist) | USA | ⚠️ Usa SCC, dati minimizzati nel prompt |
| **Sentry Inc.** | Error monitoring | USA | ⚠️ Configura data scrubbing (no PII in errori) |

**Nota Hetzner:** Essendo VPS self-hosted (non managed service), il titolare del trattamento è Styll stessa. Hetzner è solo il fornitore di infrastruttura hardware — questo semplifica la catena di responsabilità GDPR rispetto a un managed database service (come era Supabase).

### 6.2 — Registri del trattamento (art. 30 GDPR)

| Categoria | Finalità | Base giuridica | Conservazione |
|-----------|---------|----------------|--------------|
| Dati staff (`users`, `staff_members`) | Fornitura servizio SaaS | Contratto (art. 6.1.b) | Vita contratto + 5 anni |
| Dati clienti barbieri (`clients`) | CRM per conto del barbiere | Legittimo interesse (art. 6.1.f) | 24 mesi dall'ultimo appuntamento |
| Dati prenotazioni (`appointments`) | Fornitura servizio | Contratto | 36 mesi (obbligo fiscale) |
| Comunicazioni (`messages_log`) | Audit trail | Legittimo interesse | 24 mesi |
| Log AI (`inbox_ai_runs`) | Audit e miglioramento | Legittimo interesse | 12 mesi |
| Dati loyalty (`client_loyalty`) | Funzionalità prodotto | Contratto | Vita contratto |

### 6.3 — Misure tecniche di sicurezza

| Misura | Implementazione Symfony/PostgreSQL |
|--------|-----------------------------------|
| **Crittografia in transit** | TLS 1.3 (Nginx), JWT RS256 |
| **Crittografia at rest** | Hetzner Volume encryption (opzionale), `pgcrypto` per campi sensibili |
| **Pseudonimizzazione** | UUID non incrementali, `deleted_at` senza rimozione immediata |
| **Accesso minimo privilegio** | PostgreSQL roles separati per app user vs admin |
| **Audit trail** | `audit_log` table per operazioni sensibili |
| **Data portability** | Export CSV/JSON via API (GDPR art. 20) |
| **Right to erasure** | Soft delete + `deleted_by` + cron di pulizia dopo 30 giorni |

### 6.4 — Azioni prioritarie GDPR

- [ ] 🔴 **DPA con sub-responsabili** — Hetzner (DPA già disponibile online), Stripe, MessageBird/Infobip
- [ ] 🔴 **Privacy Policy** per ogni mercato (IT, ES, FR, UK)
- [ ] 🔴 **Cookie Policy** — solo cookie tecnici (nessun tracking senza consenso)
- [ ] 🟡 **Data Processing Agreements** per tenant (barbieri) come responsabili verso i loro clienti
- [ ] 🟡 **Nomina DPO** — non obbligatorio per PMI ma raccomandato
- [ ] 🟡 **DPIA** — necessaria per profilazione AI (inbox receptionist, churn prediction)

---

## 7. Roadmap espansione internazionale

```
2026 Q3-Q4   2027 Q1-Q2   2027 Q3-Q4   2028       2029+
│            │            │             │           │
▼            ▼            ▼             ▼           ▼
Italia MVP   Spagna       Francia/UK    Germania    Brasile/
100+ tenant  200+ tenant  500+ tenant   1K+ tenant  LATAM
IT locale    ES locale    FR/EN locale  DE locale   PT locale
VPS EU-IT    VPS EU-SP    VPS EU-FR     VPS EU-DE   VPS BR
```

---

## 8. Fonti

1. European Commission (2025). *GDPR Enforcement — Annual Report*
2. Supabase Documentation (archiviata) → sostituita con `docs/07-tecnico/architettura.md`
3. Hetzner Online GmbH (2026). *Data Processing Agreement*. Disponibile su: hetzner.com/legal/privacy
4. Symfony Documentation (2026). *Translation Component*. symfony.com/doc/current/translation.html
5. Stripe Inc. (2026). *Global Payment Methods*. stripe.com/global
