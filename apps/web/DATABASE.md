# Database — Styll

> **Documento tecnico** per la tesi e come riferimento per le AI che lavorano al progetto.
> Aggiornato alla versione v1 del database (33 tabelle).

---

## Schema ER — Relazioni principali

```
auth.users (Supabase)
    └── profiles (1:1)
            └── staff_members (1:N) ← un utente può essere staff in più tenant
                    └── tenants (N:1)

tenants
    ├── locations (1:N)
    ├── services (1:N)
    │       └── staff_services (N:N con staff_members)
    ├── products (1:N)
    │       └── product_inventory (1:N per location)
    ├── staff_members (1:N)
    │       └── staff_locations (N:N con locations)
    ├── clients (1:N)
    │       ├── client_notes (1:N) [PRIVATO — mai visibile al cliente]
    │       ├── client_loyalty (1:1)
    │       │       └── loyalty_transactions (1:N)
    │       └── reward_redemptions (1:N)
    ├── appointments (1:N)
    │       ├── appointment_services (1:N)
    │       ├── appointment_products (1:N)
    │       └── payments (1:N)
    ├── loyalty_configs (1:N versioned)
    ├── rewards (1:N, max 6)
    ├── tenant_subscriptions (1:1 attiva)
    └── portfolio_photos (1:N)

-- Tabelle globali (no tenant_id):
subscription_plans
admin_audit_log
admin_settings
email_templates
```

---

## Tabelle — Riferimento Rapido

| Tabella | Area | Righe chiave | Note |
|---------|------|-------------|------|
| `tenants` | Platform | id, slug, status, primary_color | Una per barbiere |
| `profiles` | Auth | id=auth.user.id, is_superadmin | Globale, no tenant_id |
| `staff_members` | Auth | tenant_id, profile_id, role | Collega profilo a tenant |
| `locations` | Sedi | tenant_id, name, is_active | Multi-sede da Tier 2 |
| `services` | Catalogo | tenant_id, price, duration_minutes | Servizi offerti |
| `products` | Catalogo | tenant_id, price_sell, price_cost | Prodotti fisici |
| `product_inventory` | Catalogo | product_id, location_id, quantity | Per sede! |
| `staff_services` | Catalogo | staff_id, service_id | N:N |
| `staff_locations` | Auth | staff_id, location_id | N:N |
| `appointments` | Operativo | status, booking_source, deleted_at | Soft delete |
| `appointment_services` | Operativo | price_at_booking | Snapshot immutabile |
| `appointment_products` | Operativo | price_at_sale | Snapshot immutabile |
| `clients` | CRM | profile_id nullable, deleted_at | Soft delete |
| `client_notes` | CRM | staff_id, note_text | SEMPRE privato |
| `client_loyalty` | Loyalty | total_points, available_points, current_streak | Aggregato |
| `loyalty_transactions` | Loyalty | type, points | Log immutabile |
| `loyalty_configs` | Loyalty | template, version | Versionato |
| `rewards` | Loyalty | points_cost, reward_type | Max 6 per tenant |
| `reward_redemptions` | Loyalty | confirmed_by, confirmed_at | Nullable = non confermato |
| `payments` | Pagamenti | amount, payment_method, status | |
| `portfolio_photos` | Media | photo_url, service_tags | |
| `subscription_plans` | Platform | slug, price_monthly, feature_flags | Globale |
| `tenant_subscriptions` | Platform | status, trial_ends_at | |
| `admin_audit_log` | Admin | actor_id, action, entity_type | Globale, immutabile |
| `admin_settings` | Admin | key, value (jsonb) | Globale |
| `email_templates` | Admin | slug, body | Globale |
| `working_hours` | Calendario | staff_id, day_of_week, start_time, end_time | Ricorrenti |
| `working_hour_overrides` | Calendario | staff_id, date, is_closed | Eccezioni/ferie |

---

## Valori Enum

### `appointments.status`
```
'pending'       → in attesa di conferma
'confirmed'     → confermato
'completed'     → visita completata
'cancelled'     → cancellato
'no_show'       → cliente non si è presentato
```

### `appointments.booking_source`
```
'pwa'                    → prenotato dal cliente via PWA
'dashboard_owner'        → inserito dal titolare
'dashboard_manager'      → inserito dal manager
'dashboard_staff'        → inserito dallo staff
'dashboard_receptionist' → inserito dalla receptionist
'walk_in'               → walk-in senza prenotazione
'phone'                 → prenotato per telefono
```

### `staff_members.role`
```
'owner'         → titolare, vede tutto
'manager'       → come owner meno billing
'staff'         → solo suo calendario
'receptionist'  → tutti i calendari, solo lettura + walk-in
```

### `clients.preferred_contact_channel`
```
'push'          → notifica PWA
'whatsapp'      → WhatsApp
'sms'           → SMS
'email'         → email
```

### `loyalty_configs.template`
```
'classic'       → punti fissi per visita (points_per_visit)
'streak_master' → punti per €1 speso (points_per_euro) + streak
'vip_club'      → come streak_master + badge + tier (v2)
```

### `loyalty_transactions.type`
```
'earn'          → punti guadagnati da visita
'redeem'        → punti riscattati per reward
'bonus'         → bonus manuale dello staff
'import'        → punti importati da altro sistema
'adjustment'    → rettifica manuale (errore)
```

### `rewards.reward_type`
```
'product'       → prodotto omaggio
'service'       → servizio gratis
'discount'      → sconto percentuale o fisso
'custom'        → custom definito dal barbiere
```

### `payments.payment_method`
```
'cash'              → contanti
'card_terminal'     → POS fisico
'stripe_online'     → pagamento online (v2)
'bank_transfer'     → bonifico
'other'             → altro
```

### `tenant_subscriptions.status`
```
'trial'         → periodo di prova
'active'        → abbonamento attivo
'past_due'      → pagamento in ritardo
'cancelled'     → disdetto
```

### `tenants.status`
```
'active'        → attivo e funzionante
'suspended'     → sospeso (soft disable)
'trial'         → in prova
```

### `profiles.user_type`
```
'staff'         → membro dello staff (include owner, manager, ecc.)
'client'        → cliente finale con account PWA
'admin'         → superadmin della piattaforma
```

---

## Query Utili

### Trovare il tenant di un utente autenticato
```sql
SELECT sm.tenant_id, sm.role, t.business_name, t.slug
FROM staff_members sm
JOIN tenants t ON t.id = sm.tenant_id
WHERE sm.profile_id = auth.uid()
  AND sm.is_active = true
  AND sm.deleted_at IS NULL;
```

### Controllare se un utente è superadmin
```sql
SELECT is_superadmin
FROM profiles
WHERE id = auth.uid();
```

### Clienti a rischio churn (non vengono da più di 45 giorni)
```sql
SELECT c.id, c.full_name, c.phone,
       cl.last_visit_date,
       NOW()::date - cl.last_visit_date AS days_since_visit
FROM clients c
JOIN client_loyalty cl ON cl.client_id = c.id
WHERE c.tenant_id = $1
  AND c.deleted_at IS NULL
  AND cl.last_visit_date IS NOT NULL
  AND NOW()::date - cl.last_visit_date > 45
ORDER BY days_since_visit DESC;
```

### Punti disponibili di un cliente
```sql
SELECT available_points, total_points, current_streak
FROM client_loyalty
WHERE tenant_id = $1 AND client_id = $2;
```

### Appuntamenti di oggi per un tenant
```sql
SELECT a.*, c.full_name as client_name, s.name as service_name
FROM appointments a
JOIN clients c ON c.id = a.client_id
JOIN appointment_services aps ON aps.appointment_id = a.id
JOIN services s ON s.id = aps.service_id
WHERE a.tenant_id = $1
  AND a.start_time::date = CURRENT_DATE
  AND a.deleted_at IS NULL
  AND a.status NOT IN ('cancelled')
ORDER BY a.start_time;
```

---

## Note Implementative

### Perché `client_loyalty` e `loyalty_transactions` coesistono?
- `loyalty_transactions` è il log immutabile di ogni singola operazione (append-only)
- `client_loyalty` è l'aggregato pre-calcolato per performance
- Quando si aggiunge una transazione, si aggiorna anche `client_loyalty`
- In caso di discrepanza, `loyalty_transactions` è la fonte di verità

### Perché `clients.profile_id` è nullable?
Un cliente può esistere nel CRM del barbiere senza avere un account Supabase:
- Roberto (54 anni) è stato aggiunto a mano dal barbiere
- Non ha mai installato la PWA
- Ha comunque un profilo CRM, punti loyalty, storico appuntamenti
- Se un giorno si registra, il suo `profile_id` viene aggiornato e i dati si sincronizzano

### Perché i prezzi sono snapshot?
`appointment_services.price_at_booking` non deve mai cambiare, nemmeno se il barbiere aggiorna i prezzi dei servizi. Lo storico deve riflettere quanto il cliente ha pagato realmente.

### Perché `working_hours` + `working_hour_overrides`?
- `working_hours` = orari ricorrenti settimanali (es. "ogni Lunedì dalle 9 alle 19")
- `working_hour_overrides` = eccezioni per date specifiche (ferie, chiusura straordinaria, orario esteso)
- La logica di disponibilità slot combina entrambe le tabelle