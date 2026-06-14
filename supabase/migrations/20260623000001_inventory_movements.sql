-- inventory_movements: immutable audit log for all stock changes.
-- quantity < 0 = outgoing (sale/write-off), quantity > 0 = incoming (restock/adjustment).
CREATE TABLE IF NOT EXISTS inventory_movements (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id      UUID        NOT NULL REFERENCES tenants(id)      ON DELETE CASCADE,
  product_id     UUID        NOT NULL REFERENCES products(id)     ON DELETE CASCADE,
  location_id    UUID                 REFERENCES locations(id)    ON DELETE SET NULL,
  appointment_id UUID                 REFERENCES appointments(id) ON DELETE SET NULL,
  movement_type  TEXT        NOT NULL CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'write_off')),
  quantity       INTEGER     NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "inventory_movements_select_staff"
  ON inventory_movements FOR SELECT
  USING (
    tenant_id IN (
      SELECT sm.tenant_id FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.is_active  = TRUE
        AND sm.deleted_at IS NULL
    )
  );

CREATE POLICY "inventory_movements_insert_staff"
  ON inventory_movements FOR INSERT
  WITH CHECK (
    tenant_id IN (
      SELECT sm.tenant_id FROM staff_members sm
      WHERE sm.profile_id = auth.uid()
        AND sm.is_active  = TRUE
        AND sm.deleted_at IS NULL
    )
  );

-- Safely decrements product_inventory.quantity for a given product+location.
-- Uses SECURITY DEFINER so application code calls this via service-role client.
-- Allows quantity to go negative: visibility over blocking (barber can still
-- mark appointment completed even if stock is miscounted).
CREATE OR REPLACE FUNCTION decrement_product_inventory(
  p_tenant_id    UUID,
  p_product_id   UUID,
  p_location_id  UUID,
  p_quantity     INTEGER
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE product_inventory
  SET    quantity   = quantity - p_quantity,
         updated_at = NOW()
  WHERE  tenant_id   = p_tenant_id
    AND  product_id  = p_product_id
    AND  location_id = p_location_id;
  -- No-op if the row doesn't exist (inventory not tracked for this combo).
END;
$$;
