
-- Add is_new flag to products
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_new boolean NOT NULL DEFAULT false;

-- Create client product wishlist table
CREATE TABLE IF NOT EXISTS client_product_wishlist (
  id          uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id   uuid        NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  client_id   uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  product_id  uuid        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, client_id, product_id)
);

ALTER TABLE client_product_wishlist ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS; authenticated clients read their own rows
CREATE POLICY "wishlist_service_all"
  ON client_product_wishlist
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "wishlist_owner_read"
  ON client_product_wishlist
  FOR SELECT
  TO authenticated
  USING (
    client_id IN (
      SELECT id FROM clients
      WHERE profile_id = auth.uid()
        AND tenant_id = client_product_wishlist.tenant_id
    )
  );
;
