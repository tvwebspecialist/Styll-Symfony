# Documentazione Completa — Progetto Styll

> **Styll** è una piattaforma SaaS di retention e fidelizzazione per barbieri.
> Questa cartella `/docs` contiene tutta la documentazione organizzata del progetto.
> Tutta la documentazione di progetto è consolidata in questa cartella.

---

## 🚀 Quick Start

| Se sei... | Inizia da... |
|-----------|-------------|
| Nuovo al progetto | [`01-progetto/overview.md`](01-progetto/overview.md) |
| Interessato al business | [`06-business/business-plan.md`](06-business/business-plan.md) |
| Sviluppatore | [`07-tecnico/architettura.md`](07-tecnico/architettura.md) |
| Tesi / ricerca | [`09-tesi/literature-review.md`](09-tesi/literature-review.md) |
| Strategia go-to-market | [`06-business/go-to-market.md`](06-business/go-to-market.md) |

---

## 📁 Indice Completo

### 01 — Progetto
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`01-progetto/overview.md`](01-progetto/overview.md) | Visione, idea, storia del brand e riepilogo contesto progetto | `messaggio.md` |
| [`01-progetto/roadmap.md`](01-progetto/roadmap.md) | Roadmap di sviluppo e milestones | — |

### 02 — Mercato
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`02-mercato/analisi-mercato.md`](02-mercato/analisi-mercato.md) | Validazione di mercato, TAM/SAM/SOM, segmenti target | `validazione-mercato.md` |
| [`02-mercato/competitor-analysis.md`](02-mercato/competitor-analysis.md) | Analisi dettagliata dei competitor (merged) | `competitor-watch.md` |
| [`02-mercato/trend-analysis.md`](02-mercato/trend-analysis.md) | Trend di mercato e analisi futura del settore | `trend-analysis.md` |

### 03 — Prodotto
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`03-prodotto/feature-overview.md`](03-prodotto/feature-overview.md) | Funzionalità e sistema di gamification | — |
| [`03-prodotto/design-ux.md`](03-prodotto/design-ux.md) | Design della dashboard, decisioni UX | — |
| [`03-prodotto/onboarding-strategy.md`](03-prodotto/onboarding-strategy.md) | Strategia di onboarding utenti | `onboarding-strategy.md` |

### 04 — Utenti
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`04-utenti/personas-e-journeys.md`](04-utenti/personas-e-journeys.md) | 4 personas dettagliate e 4 user journeys | — |
| [`04-utenti/voice-of-customer.md`](04-utenti/voice-of-customer.md) | Voice of Customer e analisi churn prevention | `voice-of-customer.md` (= `churn-prevention.md`) |

### 05 — Brand
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`05-brand/brand-identity.md`](05-brand/brand-identity.md) | Brand identity, nome, mission, valori, archetipo, tone of voice | — |

### 06 — Business
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`06-business/business-plan.md`](06-business/business-plan.md) | Business plan completo (merged) | `bussines-plan.md` |
| [`06-business/pricing-strategy.md`](06-business/pricing-strategy.md) | Strategia di pricing, tier, freemium vs paid | `pricing-strategy.md` |
| [`06-business/go-to-market.md`](06-business/go-to-market.md) | Go-to-market, content marketing e SEO | `content-marketing-seo.md` |
| [`06-business/kpi-framework.md`](06-business/kpi-framework.md) | KPI framework, metriche di successo | `kpi-framework.md` |

### 07 — Tecnico
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`07-tecnico/architettura.md`](07-tecnico/architettura.md) | Architettura, stack tecnologico, multi-tenancy (merged) | `tech-stack-recommendations.md` |
| [`07-tecnico/database-schema.md`](07-tecnico/database-schema.md) | Schema del database, decisioni architetturali DB | `database-architetture.md` |

### 08 — Strategia
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`08-strategia/analisi-strategica.md`](08-strategia/analisi-strategica.md) | Analisi strategica completa (SWOT, positioning, ecc.) | `analisi-strategica.md` |
| [`08-strategia/internazionalizzazione.md`](08-strategia/internazionalizzazione.md) | Strategia di espansione internazionale | `internazionalizzazione.md` |
| [`08-strategia/legal-compliance.md`](08-strategia/legal-compliance.md) | Compliance legale, GDPR, requisiti normativi | `legal-compliance.md` |

### 09 — Tesi
| File | Descrizione | Fonti |
|------|-------------|-------|
| [`09-tesi/literature-review.md`](09-tesi/literature-review.md) | Literature review accademica per la tesi | `literature-review.md` |
| [`09-tesi/indice-tesi.md`](09-tesi/indice-tesi.md) | Struttura e indice della tesi | — |

---

## 📊 Stato della Documentazione

| Sezione | Stato | Note |
|---------|-------|------|
| 01 Progetto | ✅ Completo | Visione + roadmap |
| 02 Mercato | ✅ Completo | Analisi, competitor, trend |
| 03 Prodotto | ✅ Completo | Feature, UX, onboarding |
| 04 Utenti | ✅ Completo | Personas, VoC |
| 05 Brand | ✅ Completo | Identity estratta da 01-visione |
| 06 Business | ✅ Completo | Piano, pricing, GTM, KPI |
| 07 Tecnico | ✅ Completo | Architettura + DB |
| 08 Strategia | ✅ Completo | SWOT, intl, legal |
| 09 Tesi | ✅ Completo | Literature review + indice |

---

## 📌 Note sui File Originali

La cartella `progetto/` (8 file originali del progetto) è stata rimossa durante l'audit di coerenza (Sessione 4) dopo aver verificato che tutto il contenuto era già consolidato in `docs/`. I file originali nella radice del repo (`messaggio.md`, `bussines-plan.md`, ecc.) rimangono come reference.

- **`styll/`:** `README.md` (README tecnico dell'app React/Vite — non incluso in /docs)

---

*Documentazione generata e organizzata automaticamente. Vedere [`REPORT-RIORDINO.md`](REPORT-RIORDINO.md) per i dettagli del processo di riordino.*
