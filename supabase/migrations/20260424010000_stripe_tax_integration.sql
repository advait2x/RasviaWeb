-- Stripe Tax integration: seller-of-record model
--
-- The connected restaurant account is responsible for tax collection.
-- Stripe Tax (automatic_tax) calculates the correct rate at checkout
-- using the connected account's tax registrations.
--
-- Adds:
--   • menu_items.stripe_tax_code   - per-item Stripe product tax code
--   • orders.tax_cents             - actual tax collected (from Stripe)
--   • party_payments.tax_cents     - tax on group-order member shares

-- ─── menu_items ─────────────────────────────────────────────────────────────
-- Default to 'txcd_40060003' (Prepared Food - Hot). Restaurants can override
-- per-item via the menu editor for non-prepared items (e.g. sealed beverages).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'menu_items' AND column_name = 'stripe_tax_code'
  ) THEN
    ALTER TABLE public.menu_items ADD COLUMN stripe_tax_code text NOT NULL DEFAULT 'txcd_40060003';
  END IF;
END $$;

-- ─── orders ─────────────────────────────────────────────────────────────────
-- Actual tax collected on this order (populated from Stripe webhook).

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'tax_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN tax_cents integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── party_payments ─────────────────────────────────────────────────────────
-- Tax on each v2 group-order member share.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'party_payments' AND column_name = 'tax_cents'
  ) THEN
    ALTER TABLE public.party_payments ADD COLUMN tax_cents integer NOT NULL DEFAULT 0;
  END IF;
END $$;
