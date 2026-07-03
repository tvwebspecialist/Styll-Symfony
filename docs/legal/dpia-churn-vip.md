# DPIA — Data Protection Impact Assessment
## Silent Churn Detector e VIP Score

**Data:** 3 luglio 2026
**Redatto da:** Tommaso Vezzaro
**Base normativa:** Art. 35 GDPR, WP248 rev.01, Garante Provv. n. 467 del 11 ottobre 2018

---

## Sezione 1 — Perché la DPIA è necessaria

Il trattamento rientra nei criteri del WP248:

- **Criterio 1:** scoring/valutazione sistematica (churn 🟢🟡🔴 e VIP Score)
- **Criterio 3:** monitoraggio sistematico delle visite nel tempo

La presenza di 2 o più criteri richiede DPIA a prescindere dalla scala. La DPIA è stata adottata prudenzialmente come prerequisito all'attivazione delle funzionalità.

---

## Sezione 2 — Descrizione sistematica (Art. 35(7)(a))

### Silent Churn Detector

| Voce | Dettaglio |
|---|---|
| **Finalità** | Segnalare al barbiere i clienti a rischio di abbandono |
| **Dati trattati** | Date degli appuntamenti, frequenza media calcolata |
| **Algoritmo** | Confronto `days_since_last_visit` vs `avg_frequency * 1.5` |
| **Destinatari** | Solo il barbiere (dashboard) |
| **Conservazione** | Aggiornato ad ogni appuntamento; nessuno storico dei punteggi precedenti conservato |

### VIP Score

| Voce | Dettaglio |
|---|---|
| **Finalità** | Aiutare il barbiere a identificare i clienti di alto valore |
| **Dati trattati** | Frequenza visite, spesa totale, puntualità, referral, review |
| **Algoritmo** | Punteggio composito normalizzato 0–100 |
| **Destinatari** | Solo il barbiere (CRM) |
| **Conservazione** | Ricalcolato periodicamente; nessuna profilazione storica degli score precedenti |

---

## Sezione 3 — Necessità e proporzionalità (Art. 35(7)(b))

- Il trattamento è **necessario** per la finalità dichiarata
- Alternative considerate: notifiche generiche "controlla i tuoi clienti" senza classificazione individuale → meno efficaci e comunque non prive di trattamento
- I dati usati sono già nella disponibilità del barbiere per finalità contrattuali (storico appuntamenti)
- Nessun dato "sensibile" ex Art. 9 GDPR è coinvolto

---

## Sezione 4 — Valutazione dei rischi (Art. 35(7)(c))

| # | Rischio | Probabilità | Impatto | Mitigazione |
|---|---|---|---|---|
| 1 | Classificazione errata → contatti indesiderati al cliente | Media | Basso | Approvazione manuale del barbiere prima di ogni invio |
| 2 | Uso improprio dello score per trattamento discriminatorio | Bassa | Medio | Score visibile solo al barbiere; nessun effetto automatico sul cliente |
| 3 | Data breach espone profili comportamentali | Bassa | Medio | RLS su tutte le tabelle; isolamento multi-tenant verificato; Sentry configurato per non loggare PII |
| 4 | Il coinvolgimento umano del barbiere diventa formale | Bassa | Alto | Interfaccia progettata per richiedere review esplicita, non click automatico |

---

## Sezione 5 — Misure adottate (Art. 35(7)(d))

- **Diritto di opposizione effettivo:** toggle PWA collegato a `clients.churn_profiling_objected_at` — esclude dai ricalcoli, non solo dalla visualizzazione
- Disclosure nella Privacy Policy B2C di ogni tenant
- **Consenso marketing separato** obbligatorio per invio SMS/WhatsApp win-back
- Accesso al dato di score limitato al ruolo `barbiere` / `owner` / `manager`
- Nessuna decisione automatica: approvazione umana obbligatoria (v1)
- DPIA da aggiornare quando si scala o si aggiungono funzionalità

---

## Sezione 6 — Trigger di aggiornamento

Questa DPIA va rivista quando:

- Si supera un numero significativo di barbieri attivi
- Churn o VIP Score vengono collegati a decisioni automatiche (depositi, prezzi differenziati, accesso limitato)
- Si aggiungono nuove fonti di dati al calcolo dello score
