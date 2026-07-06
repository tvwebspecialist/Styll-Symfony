
-- ── TABLE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS platform_notifications (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  type               TEXT        NOT NULL,
  title              TEXT        NOT NULL,
  body               TEXT,
  tenant_id          UUID        REFERENCES tenants(id) ON DELETE SET NULL,
  related_profile_id UUID        REFERENCES profiles(id) ON DELETE SET NULL,
  meta               JSONB       NOT NULL DEFAULT '{}',
  is_read            BOOLEAN     NOT NULL DEFAULT false,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT platform_notifications_type_check CHECK (type IN (
    'tenant_created',
    'tenant_suspended',
    'tenant_reactivated',
    'user_registered_staff'
  ))
);

-- ── REPLICA IDENTITY FULL ─────────────────────────────────────────
ALTER TABLE platform_notifications REPLICA IDENTITY FULL;

-- ── REALTIME ──────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE platform_notifications;

-- ── INDEXES ───────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_platform_notifications_created
  ON platform_notifications (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_notifications_unread
  ON platform_notifications (is_read, created_at DESC)
  WHERE is_read = false;

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE platform_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "superadmin_select_platform_notifications"
  ON platform_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  );

CREATE POLICY "superadmin_update_platform_notifications"
  ON platform_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND is_superadmin = true
    )
  )
  WITH CHECK (true);

-- ── TRIGGER: tenant created ────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_platform_notif_tenant_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO platform_notifications (type, title, body, tenant_id, meta)
  VALUES (
    'tenant_created',
    'Nuovo tenant: ' || NEW.business_name,
    'Onboarding avviato. Slug: ' || NEW.slug,
    NEW.id,
    jsonb_build_object('tenant_id', NEW.id, 'slug', NEW.slug, 'status', NEW.status)
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_platform_notif_tenant_created
  AFTER INSERT ON tenants
  FOR EACH ROW EXECUTE FUNCTION fn_platform_notif_tenant_created();

-- ── TRIGGER: tenant status changed ────────────────────────────────
CREATE OR REPLACE FUNCTION fn_platform_notif_tenant_status()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF OLD.status IS NOT DISTINCT FROM NEW.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'suspended' THEN
    INSERT INTO platform_notifications (type, title, body, tenant_id, meta)
    VALUES (
      'tenant_suspended',
      'Tenant sospeso: ' || NEW.business_name,
      'Stato cambiato da ' || OLD.status || ' a sospeso.',
      NEW.id,
      jsonb_build_object('tenant_id', NEW.id, 'slug', NEW.slug, 'previous_status', OLD.status)
    );
  ELSIF OLD.status = 'suspended' AND NEW.status = 'active' THEN
    INSERT INTO platform_notifications (type, title, body, tenant_id, meta)
    VALUES (
      'tenant_reactivated',
      'Tenant riattivato: ' || NEW.business_name,
      'Stato tornato attivo.',
      NEW.id,
      jsonb_build_object('tenant_id', NEW.id, 'slug', NEW.slug)
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_platform_notif_tenant_status
  AFTER UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION fn_platform_notif_tenant_status();

-- ── TRIGGER: profile registered (staff only) ──────────────────────
CREATE OR REPLACE FUNCTION fn_platform_notif_user_registered()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NEW.user_type = 'staff' THEN
    INSERT INTO platform_notifications (type, title, body, related_profile_id, meta)
    VALUES (
      'user_registered_staff',
      'Nuovo staff registrato: ' || COALESCE(NULLIF(TRIM(NEW.full_name), ''), NEW.email, 'Senza nome'),
      'Un nuovo barbiere o staff si è registrato alla piattaforma.',
      NEW.id,
      jsonb_build_object('profile_id', NEW.id, 'email', NEW.email, 'user_type', NEW.user_type)
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_platform_notif_user_registered
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION fn_platform_notif_user_registered();
;
