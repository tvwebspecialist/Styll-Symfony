# Runbook operativo — Incident Response e Data Breach

**Data:** 10 luglio 2026  
**Versione:** 1.0  
**Stato:** operativo interno

> Documento di riferimento per incidenti che coinvolgono o possono coinvolgere dati personali trattati da Styll. Va usato insieme a [DPA Styll↔barbiere](dpa-barbieri.md), [ROPA](ropa.md), [LIA Silent Churn](lia-churn-detector.md), [DPIA Churn/VIP](dpia-churn-vip.md), [Legal & Compliance](../08-strategia/legal-compliance.md) e [GDPR — approfondimento implementazione](../../gdpr-approfondimento-implementazione.md).

---

## Indice

1. [Scopo](#1-scopo)
2. [Ambito](#2-ambito)
3. [Assunzioni operative e strumenti disponibili oggi](#3-assunzioni-operative-e-strumenti-disponibili-oggi)
4. [Ruoli](#4-ruoli)
5. [Classificazione incidente](#5-classificazione-incidente)
6. [Timeline operativa](#6-timeline-operativa)
7. [Checklist operative](#7-checklist-operative)
8. [Matrice decisionale notifiche](#8-matrice-decisionale-notifiche)
9. [Template comunicazioni](#9-template-comunicazioni)
10. [Registro incidenti](#10-registro-incidenti)
11. [Checklist chiusura incidente](#11-checklist-chiusura-incidente)
12. [Manutenzione del runbook](#12-manutenzione-del-runbook)

---

## 1. Scopo

Questo runbook serve a rendere **eseguibile** la gestione di un incidente privacy/security in Styll:

- contenere l'incidente nei primi minuti;
- preservare le prove;
- distinguere un generico security incident da un vero **data breach**;
- capire se Styll sta agendo come **Titolare** o come **Responsabile**;
- decidere in modo documentato chi notificare, quando e con quali informazioni;
- chiudere l'incidente con registro, azioni correttive e post mortem.

> **Checklist immediata se stai leggendo durante un incidente:** apri un ID incidente, nomina Incident Lead, congela i deploy non urgenti, preserva i log disponibili, ruota subito le chiavi chiaramente esposte, assegna una severita provvisoria P0/P1/P2/P3.

---

## 2. Ambito

Questo runbook si applica a ogni evento che coinvolge o puo coinvolgere:

- accesso non autorizzato a dati di barbieri o clienti finali;
- leak cross-tenant;
- invio di email o messaggi al destinatario sbagliato con dati personali;
- esposizione di chiavi, token, credenziali o link di accesso;
- cancellazione o modifica indebita di dati personali;
- indisponibilita dei sistemi con rischio concreto per disponibilita o integrita dei dati;
- compromissione o sospetto di compromissione presso sub-responsabili o provider.

**Sistemi e perimetri da considerare almeno:**

- applicazione web/PWA e deploy su Vercel;
- Supabase (database, auth, storage, funzioni pianificate, log);
- Resend per email;
- Sentry per monitoring;
- export locali, CSV/JSON, allegati di supporto, screenshot e qualsiasi copia manuale di dati personali;
- qualunque altro sub-responsabile pubblicato nella documentazione legale vigente.

**Fuori ambito solo dopo esclusione esplicita del Privacy Lead:**

- puro disservizio tecnico senza impatto su dati personali;
- falso positivo senza accesso, perdita, alterazione o rischio concreto per dati personali.

Nel dubbio, trattare l'evento come **in ambito** finche non viene escluso per iscritto nel registro incidenti.

---

## 3. Assunzioni operative e strumenti disponibili oggi

| Voce | Cosa emerge oggi dal repo/documentazione | Implicazione operativa |
|---|---|---|
| Provider documentati | Supabase, Vercel, Resend, Sentry; piu eventuali altri sub-responsabili nella documentazione legale pubblica | Le dashboard e i canali support dei provider sono fonti primarie di evidenza |
| Logging/alerting automatico 24/7 | Non documentato nel repo | L'escalation iniziale e manuale |
| Workflow automatico di notifica data breach | Non documentato nel repo | Le notifiche vanno preparate e inviate manualmente dai ruoli del runbook |
| DR/RTO/RPO formalizzati | Non documentati come procedura operativa attiva | Non promettere tempi di restore: verificarli in provider dashboard e registrarli durante l'incidente |
| Backup | La documentazione tecnica cita backup giornalieri / PITR come target infrastrutturale | Durante l'incidente va verificato lo stato reale del backup e della restaurabilita, non assunto |
| Canale unico di war room | Non documentato | L'Incident Lead deve aprirlo all'inizio dell'incidente e registrarlo nel log |

**Fonti minime da controllare e preservare quando disponibili:**

1. deploy e log applicativi del provider hosting;
2. query/log/dashboard del backend e del database;
3. issue/eventi di monitoring;
4. activity log del provider email;
5. ticket/support case aperti con i provider;
6. segnalazioni di utenti, barbieri o team interno.

---

## 4. Ruoli

> In un team piccolo una stessa persona puo coprire piu ruoli, ma deve essere scritto esplicitamente nel registro incidenti.

| Ruolo | Responsabilita operative | Output minimo |
|---|---|---|
| **Incident Lead** | Apre l'incidente, assegna severita iniziale, congela cambi non urgenti, approva contenimento, decide i checkpoint di aggiornamento | ID incidente, severita, owner, timeline aggiornata |
| **Tech Lead** | Contenimento tecnico, raccolta prove, rotazione chiavi, confronto con provider, validazione dello stato del sistema | elenco sistemi impattati, azioni di contenimento, evidenze tecniche |
| **Privacy Lead** | Decide se l'evento e un data breach, chiarisce se Styll e Titolare o Responsabile, applica la matrice decisionale, valida le notifiche | decisione notifiche con motivazione scritta |
| **Comunicazione** | Prepara le bozze per team interno, barbieri, clienti finali, Garante e post mortem | testi pronti, revisionati e versionati |
| **Supporto / Recorder** | Tiene il registro incidente, centralizza domande in ingresso, aggiorna FAQ temporanee, salva link a prove e ticket | registro completo, log domande/risposte, prossimi update |

**Regola pratica:** nessuna comunicazione esterna parte senza approvazione del Privacy Lead e dell'Incident Lead, salvo contenimento tecnico urgente verso un provider.

---

## 5. Classificazione incidente

| Severita | Criteri oggettivi | Esempi tipici | Escalation minima |
|---|---|---|---|
| **P0** | Accesso non autorizzato confermato o exfiltration in corso; leak cross-tenant; chiavi privilegiate esposte; piu tenant coinvolti; rischio elevato o attivo per interessati | query cross-tenant in produzione, `service_role` esposta, bulk export non autorizzato, account admin compromesso | Incident Lead + Tech Lead + Privacy Lead immediati |
| **P1** | Data breach confermato ma contenuto o di portata limitata; forte probabilita di breach ancora da quantificare | email con dati inviata al tenant sbagliato, file export perso, singolo tenant esposto ma incidente fermato | ruoli completi entro 1 ora |
| **P2** | Security incident o malfunzionamento con possibile impatto privacy ma senza prova di esposizione dati personali | log anomali, tentativo fallito, bug sospetto senza accesso confermato | triage formale entro 4 ore |
| **P3** | Falso positivo o evento senza impatto su dati personali | allarme rumoroso, errore applicativo senza dati personali | chiusura con motivazione scritta |

**Regole di uso:**

- un incidente puo essere **promosso** di severita in qualsiasi momento;
- non va **declassato** senza motivazione scritta del Privacy Lead;
- se c'e dubbio tra due classi, usare la piu alta fino a chiarimento.

---

## 6. Timeline operativa

| Scadenza | Owner principale | Azioni minime obbligatorie | Output da registrare |
|---|---|---|---|
| **Entro 15 minuti** | Incident Lead | aprire incidente, assegnare severita provvisoria, nominare ruoli, congelare deploy non urgenti, avviare raccolta prove, ruotare subito chiavi chiaramente esposte | ID incidente, severita iniziale, owner, primo timestamp UTC |
| **Entro 1 ora** | Tech Lead + Privacy Lead | chiarire se c'e coinvolgimento di dati personali, elencare sistemi e provider coinvolti, verificare se il problema e ancora attivo, aprire ticket ai provider se servono log o supporto | perimetro iniziale, ipotesi di causa, stato contenimento |
| **Entro 4 ore** | Privacy Lead | distinguere security incident vs data breach, chiarire ruolo Styll (Titolare/Responsabile), stimare tenant e categorie dati coinvolti, preparare prime bozze di comunicazione | decisione provvisoria di notifica, elenco soggetti impattati |
| **Entro 24 ore** | Incident Lead + Comunicazione | inviare primo avviso ai barbieri coinvolti se Styll agisce come Responsabile e il loro tenant puo essere impattato; predisporre eventuale bozza Garante o bozza clienti; verificare backup/restaurabilita reali | primo notice inviato o motivo del rinvio, piano prossimo aggiornamento |
| **Entro 72 ore** | Privacy Lead | chiudere la decisione sulla notifica ex Artt. 33-34 GDPR, completare o aggiornare i testi, registrare eventuali motivi per cui alcune informazioni non sono ancora disponibili | decisione finale di notifica, timestamp, contenuti inviati |
| **Oltre 72 ore** | Incident Lead | remediation definitiva, verifica stabilita, post mortem, azioni correttive, aggiornamento documenti/processi | root cause, follow-up owner, data di chiusura |

---

## 7. Checklist operative

### 7.1 Contenimento

- [ ] Bloccare o limitare il sistema/integrazione coinvolta se il rischio e ancora attivo.
- [ ] Revocare o ruotare chiavi, token, password o account chiaramente esposti.
- [ ] Sospendere automazioni, campagne o invii massivi che possono peggiorare l'impatto.
- [ ] Congelare deploy non urgenti finche severita e perimetro non sono chiari.
- [ ] Se l'incidente e collegato a un rilascio recente, preparare rollback o disattivazione della versione coinvolta.
- [ ] Verificare se esiste un backup/restauro utile, ma **non** ripristinare prima di aver preservato le prove e approvato il piano.

### 7.2 Preservazione prove

- [ ] Salvare timestamp in UTC di rilevazione, conferma, contenimento e comunicazioni.
- [ ] Esportare o schermare i log disponibili da provider e applicazione senza modificarli.
- [ ] Registrare deployment ID, issue ID, ticket ID, query o job ID rilevanti.
- [ ] Salvare copia dei messaggi/email errati o delle segnalazioni ricevute.
- [ ] Annotare chi ha eseguito ogni azione e in quale ordine.
- [ ] Evitare cancellazioni o pulizie non indispensabili prima di avere una copia delle prove.

### 7.3 Analisi impatto

- [ ] Capire se l'evento riguarda dati dei barbieri (Styll Titolare), dati dei clienti finali (Styll Responsabile), o entrambi.
- [ ] Elencare tenant coinvolti o potenzialmente coinvolti.
- [ ] Elencare categorie di dati: contatti, prenotazioni, loyalty, note CRM, token, log tecnici, dati di pagamento, ecc.
- [ ] Stimare numero di interessati e numero di record, anche per intervalli.
- [ ] Distinguere accesso effettivo, alterazione effettiva, cancellazione effettiva o sola finestra di esposizione.
- [ ] Valutare conseguenze probabili: spam, phishing, frode, perdita riservatezza, danno reputazionale, indisponibilita del servizio.

### 7.4 Decisione notifiche

- [ ] Applicare la matrice del paragrafo 8.
- [ ] Decidere chi notifica chi, con quale ruolo giuridico e con quale canale.
- [ ] Se Styll e Responsabile, informare il barbiere senza aspettare il quadro perfetto: il primo avviso puo essere incrementale.
- [ ] Se non si notifica, registrare la motivazione in modo difendibile.
- [ ] Se i fatti sono incompleti, pianificare una comunicazione integrativa con data/owner.

### 7.5 Registro, recovery e lessons learned

- [ ] Tenere aggiornato il registro incidente in tempo reale.
- [ ] Verificare che le misure di contenimento abbiano davvero fermato l'evento.
- [ ] Pianificare correzione definitiva e verifiche post-fix.
- [ ] Preparare FAQ temporanee per supporto e team interno.
- [ ] Chiudere con root cause, azioni correttive, owner e scadenze.
- [ ] Programmare review/post mortem entro 5 giorni lavorativi dalla chiusura.

---

## 8. Matrice decisionale notifiche

| Destinatario | Quando notificare | Chi decide | Contenuto minimo | Quando NON notificare |
|---|---|---|---|---|
| **Garante** | Se Styll agisce come **Titolare** e la violazione dei dati personali presenta un rischio per i diritti e le liberta degli interessati | Privacy Lead + Incident Lead | natura della violazione, categorie e numeri stimati, contatto utile, conseguenze probabili, misure adottate/proposte | nessun data breach, nessun dato personale coinvolto, rischio improbabile e motivazione registrata |
| **Barbieri / tenant coinvolti** | Se l'incidente coinvolge o puo coinvolgere dati del loro tenant e Styll agisce come **Responsabile** | Privacy Lead + Incident Lead | cosa e successo, da quando, quali dati/tenant possono essere coinvolti, cosa ha fatto Styll, cosa serve al barbiere, quando arriva il prossimo update | falso positivo o tenant certamente non coinvolto |
| **Clienti finali** | Se il **Titolare** (normalmente il barbiere) ritiene che il breach comporti un rischio elevato ex Art. 34 GDPR; Styll prepara bozza e supporto | Titolare del trattamento, con supporto Styll | linguaggio semplice, dati coinvolti, rischi principali, azioni consigliate, contatti del Titolare | se il Titolare conclude che Art. 34 non si applica e la decisione viene registrata |
| **Sub-responsabili / provider** | Se l'incidente nasce da loro, li coinvolge, o serve preservare log/prove o chiedere contenimento | Tech Lead | incident ID, perimetro, timestamp, richiesta di log/supporto, contatto tecnico | incidente interno senza loro coinvolgimento |
| **Forze dell'ordine** | In caso di estorsione, accesso malevolo, furto credenziali, frode, minaccia concreta o richiesta legale | Incident Lead + Privacy Lead | fatti noti, cronologia, prove disponibili, impatto, contatti | bug interno contenuto senza indicatori di reato |

**Regola chiave sul modello B2B2C di Styll:** per i dati dei clienti finali del barbiere, Styll prepara fatti, evidenze e bozze, ma la decisione finale su Garante e clienti finali spetta normalmente al **barbiere come Titolare**, salvo diverso mandato documentato.

---

## 9. Template comunicazioni

### 9.1 Template interno — primo alert

**Oggetto:** `[INCIDENTE {{ID}}] {{SEVERITA}} — {{TITOLO BREVE}}`

```text
Incident ID: {{ID}}
Severita iniziale: {{P0/P1/P2/P3}}
Rilevato da: {{persona/canale}}
Ora rilevazione UTC: {{timestamp}}
Sistemi coinvolti: {{sistemi/provider}}
Ipotesi iniziale: {{breve descrizione}}
Contenimento gia eseguito: {{azioni}}
Ruoli assegnati: {{Incident Lead / Tech / Privacy / Comms / Supporto}}
Prossimo aggiornamento previsto: {{timestamp}}
```

### 9.2 Template barbieri / tenant

**Oggetto:** `Aggiornamento urgente su possibile incidente dati — tenant {{BUSINESS_NAME}}`

```text
Ciao {{NOME BARBIERE}},

ti informiamo che Styll sta gestendo un incidente che puo coinvolgere dati trattati per conto del tuo tenant.

Cosa sappiamo adesso:
- Incident ID: {{ID}}
- Finestra temporale stimata: {{quando}}
- Dati potenzialmente coinvolti: {{categorie dati}}
- Stato del contenimento: {{contenuto}}

Cosa ha gia fatto Styll:
- {{azione 1}}
- {{azione 2}}

Cosa ti chiediamo ora:
- {{eventuale azione del barbiere}}

Ti invieremo un nuovo aggiornamento entro: {{timestamp}}.
Contatto operativo Styll: {{contatto incidente}}.
```

### 9.3 Template Garante

**Oggetto:** `Notifica di violazione dei dati personali ex Art. 33 GDPR — {{ID}}`

```text
Titolare/Responsabile che notifica: {{soggetto}}
Contatto utile: {{nome, email, telefono}}
Data/ora di conoscenza della violazione: {{timestamp}}
Natura della violazione: {{confidenzialita/integrita/disponibilita}}
Categorie di interessati: {{barbieri/clienti finali/...}}
Categorie di dati: {{dati}}
Numero approssimativo di interessati/record: {{stima}}
Probabili conseguenze: {{rischi}}
Misure adottate o proposte: {{azioni}}
Ulteriori informazioni mancanti e data prevista di integrazione: {{se applicabile}}
```

### 9.4 Template clienti finali

**Oggetto:** `Avviso importante sui tuoi dati personali`

```text
Ciao,

ti informiamo che il tuo salone / barbiere {{BUSINESS_NAME}} sta gestendo un incidente che ha coinvolto alcuni dati personali trattati tramite Styll.

Cosa e successo:
{{descrizione chiara e breve}}

Quali dati possono essere coinvolti:
{{categorie dati}}

Cosa stiamo facendo:
{{misure di contenimento}}

Cosa puoi fare tu:
{{azioni consigliate: attenzione phishing, cambio password se rilevante, ecc.}}

Per assistenza o per esercitare i tuoi diritti privacy contatta:
{{contatto del Titolare}}
```

### 9.5 Template post mortem

**Oggetto:** `Post mortem incidente {{ID}} — {{data}}`

```text
Sintesi esecutiva:
{{1-3 righe}}

Timeline:
- {{timestamp}} {{evento}}
- {{timestamp}} {{evento}}

Root cause:
{{causa}}

Impatto:
{{tenant, interessati, dati, downtime}}

Notifiche inviate:
{{chi, quando, base decisionale}}

Azioni correttive:
- {{azione}} — owner {{nome/ruolo}} — scadenza {{data}}

Lezioni apprese:
- {{lesson 1}}
- {{lesson 2}}
```

---

## 10. Registro incidenti

Ogni incidente deve avere un registro unico e aggiornato. Struttura minima:

```text
incident_id
opened_at_utc
detected_at_utc
detected_by
incident_lead
tech_lead
privacy_lead
communications_owner
support_owner
severity_initial
severity_final
status
styll_role_in_processing
systems_affected
providers_involved
tenants_affected
data_categories
estimated_data_subjects
estimated_records
breach_confirmed_yes_no
containment_actions
keys_rotated
evidence_locations
provider_ticket_ids
notification_decision
notified_barbers_at
notified_garante_at
notified_data_subjects_at
law_enforcement_at
root_cause
corrective_actions
closed_at_utc
post_mortem_link
```

**Regole minime del registro:**

- usare sempre timestamp UTC;
- nessun campo critico lasciato vuoto a chiusura incidente;
- se un'informazione e sconosciuta, scrivere `UNKNOWN` e il prossimo owner;
- allegare link a prove, ticket provider e comunicazioni inviate.

---

## 11. Checklist chiusura incidente

- [ ] Contenimento verificato e monitorato per almeno un ciclo di controllo ragionevole.
- [ ] Tutte le chiavi/account compromessi sono stati ruotati o disabilitati.
- [ ] Decisioni di notifica (anche negative) registrate con motivazione.
- [ ] Eventuali notifiche inviate archiviate nel registro.
- [ ] Root cause documentata.
- [ ] Azioni correttive con owner e scadenza assegnati.
- [ ] FAQ/supporto temporaneo aggiornati o chiusi.
- [ ] Post mortem completato entro 5 giorni lavorativi.
- [ ] Runbook e documentazione legale aggiornati se l'incidente ha mostrato gap reali.

---

## 12. Manutenzione del runbook

Questo runbook va rivisto:

- dopo ogni incidente **P0** o **P1**;
- dopo ogni tabletop exercise;
- almeno una volta per trimestre se il prodotto e live;
- ogni volta che cambiano provider, ruoli, canali di notifica o perimetro dei trattamenti.

Se il runbook cambia in modo sostanziale, aggiornare anche i riferimenti in:

- [DPA Styll↔barbiere](dpa-barbieri.md)
- [Legal & Compliance](../08-strategia/legal-compliance.md)
- [GDPR — approfondimento implementazione](../../gdpr-approfondimento-implementazione.md)
