-- When the host is on the review / payment-mode screen, non-hosts cannot add to the cart.
ALTER TABLE public.party_sessions
  ADD COLUMN IF NOT EXISTS host_in_review boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.party_sessions.host_in_review IS
  'True while the host is on the pre-lock review screen; guests should not add items.';
