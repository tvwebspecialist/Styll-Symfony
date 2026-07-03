-- =============================================================
-- 04_clienti.sql
-- profiles (client), clients, client_notes
-- =============================================================

-- client profile UUIDs: e1000000-0000-0000-0000-00000000000{4-5}
-- client UUIDs:         j1000000-0000-0000-0000-00000000000{1-20}

-- 1. profiles for Luca and Sara (app users)
INSERT INTO public.profiles (id, full_name, phone, user_type)
VALUES
  ('e1000000-0000-0000-0000-000000000004', 'Luca Martini', '+39 347 2000001', 'client'),
  ('e1000000-0000-0000-0000-000000000005', 'Sara Conti',   '+39 347 2000002', 'client')
ON CONFLICT (id) DO NOTHING;

-- 2. clients
INSERT INTO public.clients (id, tenant_id, profile_id, full_name, phone, email, date_of_birth, tags, marketing_consent, preferred_contact_channel)
VALUES
  ('j1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000004',
   'Luca Martini', '+39 347 2000001', 'luca.martini@email.it', '1990-05-15', '["vip","loyal"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'e1000000-0000-0000-0000-000000000005',
   'Sara Conti', '+39 347 2000002', 'sara.conti@email.it', '1995-08-22', '["churn-risk"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Roberto Mancini', '+39 347 2000003', 'roberto.mancini@email.it', '1982-03-10', '["offline"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Marco Ferraro', '+39 347 2000004', 'marco.ferraro@email.it', '1988-11-01', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Giulia Romano', '+39 347 2000005', 'giulia.romano@email.it', '1993-04-17', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Antonio Verde', '+39 347 2000006', 'antonio.verde@email.it', '1979-07-30', '["churn-risk"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Francesca Marino', '+39 347 2000007', 'francesca.marino@email.it', '1997-02-14', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Davide Costa', '+39 347 2000008', 'davide.costa@email.it', '1985-09-05', '["vip"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000009', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Elena Bruno', '+39 347 2000009', 'elena.bruno@email.it', '1992-12-20', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000010', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Matteo Ricci', '+39 347 2000010', 'matteo.ricci@email.it', '1987-06-08', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000011', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Valentina Greco', '+39 347 2000011', 'valentina.greco@email.it', '1999-01-25', '["new"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000012', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Alessandro Ferrari', '+39 347 2000012', 'alex.ferrari@email.it', '1991-10-12', '["active"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000013', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Chiara Bianchi', '+39 347 2000013', 'chiara.bianchi@email.it', '1996-03-30', '["new"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000014', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Simone Moretti', '+39 347 2000014', 'simone.moretti@email.it', '1984-08-18', '["churn-risk"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000015', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Laura Fontana', '+39 347 2000015', 'laura.fontana@email.it', '1990-11-07', '["churn-risk"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000016', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Diego Barbieri', '+39 347 2000016', 'diego.barbieri@email.it', '1998-05-02', '["new"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000017', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Marta Pellegrini', '+39 347 2000017', 'marta.pellegrini@email.it', '1986-09-14', '["churn-risk"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000018', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Riccardo Gallo', '+39 347 2000018', 'riccardo.gallo@email.it', '1993-07-21', '["new"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000019', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Serena Caruso', '+39 347 2000019', 'serena.caruso@email.it', '1989-02-28', '["vip"]', false, 'whatsapp'),
  ('j1000000-0000-0000-0000-000000000020', 'b1000000-0000-0000-0000-000000000001', NULL,
   'Paolo Santoro', '+39 347 2000020', 'paolo.santoro@email.it', '2000-04-01', '["new"]', false, 'whatsapp')
ON CONFLICT (id) DO NOTHING;

-- 3. client_notes
INSERT INTO public.client_notes (id, tenant_id, client_id, staff_id, note_text)
VALUES
  ('cn000000-0000-0000-0000-000000000001',
   'b1000000-0000-0000-0000-000000000001',
   'j1000000-0000-0000-0000-000000000001',
   'f1000000-0000-0000-0000-000000000003',
   'Cliente VIP, preferisce il taglio corto ai lati con sfumatura alta. Sempre puntuale.'),
  ('cn000000-0000-0000-0000-000000000002',
   'b1000000-0000-0000-0000-000000000001',
   'j1000000-0000-0000-0000-000000000002',
   'f1000000-0000-0000-0000-000000000003',
   'Attenta alla cura della barba. Ultima visita 44 giorni fa – da ricontattare.'),
  ('cn000000-0000-0000-0000-000000000003',
   'b1000000-0000-0000-0000-000000000001',
   'j1000000-0000-0000-0000-000000000008',
   'f1000000-0000-0000-0000-000000000003',
   'VIP – prenotazione prioritaria, vuole sempre taglio + barba completa.'),
  ('cn000000-0000-0000-0000-000000000004',
   'b1000000-0000-0000-0000-000000000001',
   'j1000000-0000-0000-0000-000000000019',
   'f1000000-0000-0000-0000-000000000001',
   'Cliente affezionata, preferisce Marco per il servizio. Torna regolarmente ogni 30-35 giorni.')
ON CONFLICT (id) DO NOTHING;
