# LIA — Legitimate Interest Assessment
## Silent Churn Detector

**Data:** 3 luglio 2026
**Redatto da:** Tommaso Vezzaro
**Revisione prevista:** entro 3 mesi dall'attivazione con dati reali

---

## Sezione 1 — Descrizione del trattamento

Il Silent Churn Detector calcola automaticamente uno stato di rischio (🟢🟡🔴) per ogni cliente di ogni barbiere, basandosi sulla frequenza storica delle visite. Confronta i giorni dall'ultima visita con la frequenza media personale del cliente.

Il risultato è visibile **solo al barbiere** nella dashboard. Il cliente non vede il proprio stato né riceve notifiche automatiche. Il barbiere decide autonomamente se e come contattare il cliente — ogni messaggio richiede approvazione manuale del barbiere prima dell'invio (v1).

---

## Sezione 2 — Test dei tre pilastri (WP217)

### Pilastro 1 — Interesse legittimo reale e lecito

Il barbiere ha interesse commerciale concreto nel sapere quali clienti abituali stanno smettendo di venire. Rientra nell'**Art. 6(1)(f) GDPR**.

### Pilastro 2 — Necessità

Non esiste alternativa meno invasiva che garantisca lo stesso risultato automaticamente e su scala.

### Pilastro 3 — Bilanciamento

Il bilanciamento è **favorevole** perché:

- i dati sono generati nell'ambito di un rapporto di servizio esistente
- il risultato non è mai comunicato al cliente né usato per decisioni automatiche che lo riguardano direttamente
- l'unica conseguenza possibile è un messaggio dal barbiere, che richiede comunque consenso marketing separato per SMS/WhatsApp
- il cliente ha diritto di opposizione effettivo (toggle in PWA) che esclude dai ricalcoli, non solo dalla visualizzazione
- i dati (date delle visite) sono già nella disponibilità del barbiere per finalità contrattuali

**Conclusione:** bilanciamento favorevole, base **Art. 6(1)(f) GDPR**.

---

> **Nota importante:** il calcolo dello score è coperto dal legittimo interesse. L'**invio di messaggi di win-back via SMS/WhatsApp** richiede **consenso marketing separato** (Art. 130 Codice Privacy, confermato da Garante Provv. 23 ottobre 2025 n. 10199166 — il soft-spam vale solo per email, non per SMS/WhatsApp).

---

## Sezione 3 — Misure di mitigazione adottate

- **Toggle opt-out** nelle preferenze PWA (`clients.churn_profiling_objected_at`)
- Quando attivato, il cliente viene escluso da tutti i ricalcoli futuri (non solo dalla visualizzazione)
- Nessuna decisione automatizzata: il barbiere interpreta e decide
- Stato churn visibile solo al barbiere, mai esposto al cliente
- Disclosure nella Privacy Policy B2C di ogni tenant
- Dato non condiviso con altri tenant né con terze parti

---

## Sezione 4 — Aggiornamento previsto

Rivedere entro 3 mesi dall'attivazione con dati reali sulla base di:

- opposizioni ricevute
- reclami
- cambiamenti nelle funzionalità (es. collegamento a decisioni automatiche)
