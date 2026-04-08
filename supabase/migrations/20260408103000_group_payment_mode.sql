ALTER TABLE public.party_sessions
  ADD COLUMN IF NOT EXISTS payment_mode TEXT NOT NULL DEFAULT 'host_pays',
  ADD COLUMN IF NOT EXISTS assigned_payer_name TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'party_sessions_payment_mode_check'
  ) THEN
    ALTER TABLE public.party_sessions
      ADD CONSTRAINT party_sessions_payment_mode_check
      CHECK (payment_mode IN ('host_pays', 'split', 'assign'));
  END IF;
END $$;

COMMENT ON COLUMN public.party_sessions.payment_mode IS
  'How the group will pay: host_pays, split, or assign.';
COMMENT ON COLUMN public.party_sessions.assigned_payer_name IS
  'Display name selected by host when payment_mode is assign.';
