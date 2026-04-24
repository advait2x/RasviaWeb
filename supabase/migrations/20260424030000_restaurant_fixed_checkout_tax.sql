-- Checkout tax should be based on the restaurant's configured location/rate,
-- not the customer's billing or shipping address collected by Stripe Checkout.
--
-- Adds:
--   • restaurants.sales_tax_rate_bps      — fixed checkout sales tax rate in basis points
--   • restaurants.stripe_manual_tax_rate_id — cached connected-account Stripe Tax Rate object

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'sales_tax_rate_bps'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN sales_tax_rate_bps integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'stripe_manual_tax_rate_id'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN stripe_manual_tax_rate_id text;
  END IF;
END $$;
