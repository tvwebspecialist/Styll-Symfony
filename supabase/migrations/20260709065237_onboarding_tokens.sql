-- Onboarding tokens: invite-only registration gating
CREATE TABLE onboarding_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token VARCHAR(32) UNIQUE NOT NULL,
  barbiere_email VARCHAR(255),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT now() + INTERVAL '30 days',
  used_at TIMESTAMPTZ,
  used_by_email VARCHAR(255),
  active BOOLEAN DEFAULT true
);

CREATE INDEX idx_onboarding_tokens_token ON onboarding_tokens(token);
CREATE INDEX idx_onboarding_tokens_active ON onboarding_tokens(active, expires_at);
CREATE INDEX idx_onboarding_tokens_created_by ON onboarding_tokens(created_by, created_at);

ALTER TABLE onboarding_tokens ENABLE ROW LEVEL SECURITY;;
