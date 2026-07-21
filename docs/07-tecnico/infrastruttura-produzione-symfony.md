# Styll — Documentazione Infrastruttura

> Ultimo aggiornamento: 21 luglio 2026
> Questo documento descrive l'infrastruttura di produzione del backend Symfony di Styll (VPS Hetzner). **Non riguarda** il frontend Next.js su Vercel, che resta separato e non è stato toccato in questa sessione.

---

## 0. Panoramica — cosa esiste e come si collega

```
┌─────────────────────────────┐         ┌──────────────────────────────────┐
│   styll.it / www.styll.it    │         │        api.styll.it               │
│   Frontend Next.js           │         │        Backend Symfony (NUOVO)    │
│   Hosting: Vercel            │         │        Hosting: VPS Hetzner       │
│   Deploy: push su main del   │         │        (styll-vps-01)             │
│   repo Next.js originale     │         │                                    │
│   → Vercel builda in auto    │         │        NON ancora collegato       │
│                               │         │        al frontend pubblico       │
└─────────────────────────────┘         └──────────────────────────────────┘
         │                                          │
         │ DNS gestito da Cloudflare                │ DNS gestito da Cloudflare
         │ (record CNAME verso Vercel)              │ (record A verso VPS)
         └──────────────────┬───────────────────────┘
                             │
                    Cloudflare (DNS manager)
                    Nameserver: henry.ns.cloudflare.com, tori.ns.cloudflare.com
```

**Punto chiave**: oggi il sito pubblico (`styll.it`) è ancora l'app Next.js/Supabase originale, invariata. Il backend Symfony sulla VPS esiste, è online e funzionante su `api.styll.it`, ma è un pezzo separato — nessuno lo sta ancora usando in produzione.

---

## 1. VPS — Accesso

| Voce | Valore |
|---|---|
| Provider | Hetzner Cloud |
| Nome server | `styll-vps-01` |
| IP pubblico | `2.28.1.250` |
| Location | Falkenstein (Germania) |
| Piano | CPX22 (2 vCPU, 4GB RAM, 80GB disco) — ~€24/mese |
| OS | Ubuntu 26.04 LTS |
| Utente | `tommaso` (sudo abilitato) |
| Utente root | **disabilitato** (accesso solo via `tommaso` + sudo) |
| Porta SSH | `2222` (non la 22 standard) |
| Chiave SSH | `~/.ssh/styll_vps_ed25519` (sul tuo Mac) |

**Connessione rapida** (grazie alla entry in `~/.ssh/config` sul tuo Mac):

```bash
ssh styll-vps
```

Se serve il comando esteso:

```bash
ssh -i ~/.ssh/styll_vps_ed25519 -p 2222 tommaso@2.28.1.250
```

Password utente `tommaso` (per `sudo`): salvata nel tuo password manager (generata durante il setup).

---

## 2. Sicurezza applicata

- SSH: solo chiave, no password, no login root, porta non standard (2222)
- Firewall a livello OS: **UFW**, aperte solo 2222/tcp, 80/tcp, 443/tcp
- Firewall a livello rete: **Hetzner Cloud Firewall** (`styll-firewall`), stesse porte + ICMP, applicato al server
- **fail2ban** attivo (banna IP con tentativi SSH falliti ripetuti)
- Aggiornamenti di sicurezza del sistema operativo: automatici (`unattended-upgrades`)
- Nessuna porta database o servizi interni esposta pubblicamente (Postgres, Mercure interno solo su `127.0.0.1`)

---

## 3. Applicazione — Docker Compose

Repo: `github.com/tvwebspecialist/Styll-Symfony` (privato o da rendere privato)
Path sulla VPS: `~/Styll-Symfony`
Accesso al repo dalla VPS: **deploy key dedicata**, sola lettura (`~/.ssh/styll_deploy_key`)

### Servizi attivi (`docker-compose.yml`)

| Servizio | Cosa fa | Porta (solo localhost) |
|---|---|---|
| `postgres` | Database PostgreSQL 16 | `127.0.0.1:5432` |
| `php` | Backend Symfony (PHP-FPM) | interna (9000) |
| `nginx` | Web server verso PHP | `127.0.0.1:8080` |
| `mercure` | Realtime / Server-Sent Events | `127.0.0.1:3001` |

Tutte le porte sono vincolate a `127.0.0.1` — **non raggiungibili da internet direttamente**. L'unico accesso esterno passa da Caddy (vedi sezione 4).

### File `.env` di produzione

Path: `~/Styll-Symfony/.env` (sulla VPS, **non committato su git**, permessi `600`)

Contiene: credenziali Postgres, `APP_SECRET`, `JWT_PASSPHRASE`, `MERCURE_JWT_SECRET`, `MERCURE_PUBLIC_URL=https://mercure.styll.it/.well-known/mercure`, `CORS_ALLOW_ORIGIN=https://styll.it,https://www.styll.it`.

### Comandi utili Docker

```bash
cd ~/Styll-Symfony

# Stato dei container
docker compose ps

# Log di un servizio
docker compose logs -f php

# Riavviare un servizio dopo modifica .env
docker compose restart php

# Rebuild completo dopo modifiche al Dockerfile
docker compose up -d --build

# Fermare tutto
docker compose down
```

### Deploy di nuove modifiche al backend

```bash
ssh styll-vps
cd ~/Styll-Symfony
git pull
docker compose up -d --build
```

(Attualmente manuale — non c'è ancora CI/CD automatico per questo repo, a differenza di Vercel che deploya in automatico ad ogni push.)

---

## 4. Caddy — Reverse proxy pubblico e HTTPS

Installato come **servizio systemd** (`caddy.service`), utente dedicato `caddy` (non root).

- Binario: `/usr/local/bin/caddy` (build custom con plugin Cloudflare DNS)
- Configurazione: `/etc/caddy/Caddyfile`
- Token Cloudflare (per certificati automatici): `/etc/caddy/cloudflare.env` (permessi ristretti)

### Domini pubblici attivi

| Dominio | Proxy verso | Certificato TLS |
|---|---|---|
| `api.styll.it` | `127.0.0.1:8080` (Nginx → Symfony) | Automatico, Let's Encrypt via Cloudflare DNS |
| `mercure.styll.it` | `127.0.0.1:3001` (Mercure) | Automatico, Let's Encrypt via Cloudflare DNS |

I certificati si **rinnovano automaticamente** da soli, nessuna azione manuale richiesta.

### Comandi utili Caddy

```bash
# Stato del servizio
sudo systemctl status caddy

# Log recenti
sudo journalctl -u caddy -n 50 --no-pager

# Dopo aver modificato /etc/caddy/Caddyfile:
sudo caddy fmt --overwrite /etc/caddy/Caddyfile   # formatta
sudo caddy validate --config /etc/caddy/Caddyfile  # verifica sintassi (nota: darà errore su token vuoto se lanciato manualmente fuori dal servizio — è normale)
sudo systemctl reload caddy                        # applica senza downtime
```

**Aggiungere un nuovo dominio in futuro**: aggiungi un blocco nel Caddyfile tipo:

```
nuovo.styll.it {
    reverse_proxy 127.0.0.1:PORTA
    tls {
        dns cloudflare {env.CF_API_TOKEN}
    }
}
```

poi `sudo systemctl reload caddy`. Ricordati di creare anche il record DNS A su Cloudflare (vedi sezione 5).

---

## 5. DNS — Cloudflare

Dominio `styll.it` gestito su **Cloudflare** (piano Free), nameserver: `henry.ns.cloudflare.com`, `tori.ns.cloudflare.com`.

### Record importanti

| Nome | Tipo | Punta a | Proxy |
|---|---|---|---|
| `@` (styll.it) | CNAME | `cname.vercel-dns.com` | DNS only |
| `www` | CNAME | `cname.vercel-dns.com` | DNS only |
| `api` | A | `2.28.1.250` | DNS only |
| `mercure` | A | `2.28.1.250` | DNS only |
| `mail`, `mx`, `pop3`, `smtp` | A | (IP Aruba) | DNS only |

**Email Aruba**: preservata, nessuna modifica necessaria — tutti i record mail sono DNS-only (il proxy Cloudflare romperebbe l'email se attivato su questi).

**Token API Cloudflare** (per Caddy): creato con permesso `DNS:Edit` limitato alla sola zona `styll.it`. Scadenza impostata su ~3 mesi da luglio 2026 — **da ricordarsi di rigenerare prima della scadenza**, altrimenti i rinnovi certificato wildcard/DNS falliranno.

---

## 6. Backup — Postgres → Backblaze B2

### Dove sono i backup

- **Storage remoto**: Backblaze B2, bucket `styll-postgres-backup-tv2026` (privato)
- **Script**: `~/scripts/backup-postgres.sh` sulla VPS
- **Log**: `~/logs/backup-postgres.log`
- **Stato ultimo run**: `~/.config/styll-backup/last-status`
- **Credenziali B2**: `~/.config/styll-backup/b2.env` (permessi ristretti)

### Come verificare che i backup funzionino

```bash
ssh styll-vps
cat ~/.config/styll-backup/last-status
tail -50 ~/logs/backup-postgres.log
```

Puoi anche controllare visivamente i file caricati andando su backblaze.com → Buckets → `styll-postgres-backup-tv2026`.

### Quando gira

Automaticamente ogni notte alle **03:00** (cron):

```
0 3 * * * /home/tommaso/scripts/backup-postgres.sh
```

### Come ripristinare un backup (procedura manuale — non c'è ancora un "bottone")

1. Scarica il dump da B2 (via rclone o dal sito Backblaze)
2. Sulla VPS:

```bash
docker compose exec -T postgres pg_restore -U styll -d styll --clean --if-exists < nome_file.dump
```

3. Verifica che i dati siano tornati correttamente prima di considerare l'operazione conclusa.

**Nota**: un restore reale è già stato testato con successo durante il setup (32 tabelle ripristinate correttamente su un database temporaneo).

### TODO futuro — non ancora fatto

- [ ] Pannello nell'Admin di Styll che mostra stato backup e permette restore con un click (feature applicativa da costruire, non infrastrutturale)
- [ ] Notifica automatica (es. Telegram/Discord) se un backup fallisce

---

## 7. Cose NON ancora fatte (dal piano iniziale)

- [ ] CI/CD automatico per il deploy del backend Symfony (oggi è `git pull` + `docker compose up -d --build` manuale)
- [ ] Collegamento reale del frontend Next.js al nuovo backend Symfony (oggi il frontend usa ancora Supabase)
- [ ] Wildcard certificate per subdomain multi-tenant (`*.styll.it`) — non ancora necessario, un solo tenant per ora
- [ ] Monitoring/alerting (uptime, errori) — non configurato
- [ ] Pannello Admin per gestione backup (vedi sezione 6)

---

## 8. Cheat-sheet comandi rapidi

```bash
# Connettersi alla VPS
ssh styll-vps

# Vedere se tutto è su
docker compose -f ~/Styll-Symfony/docker-compose.yml ps
sudo systemctl status caddy

# Vedere i log del backend
docker compose -f ~/Styll-Symfony/docker-compose.yml logs -f php

# Deploy nuove modifiche
cd ~/Styll-Symfony && git pull && docker compose up -d --build

# Controllare stato backup
cat ~/.config/styll-backup/last-status

# Testare che tutto risponda dall'esterno
curl -I https://api.styll.it
curl -I https://mercure.styll.it
```
