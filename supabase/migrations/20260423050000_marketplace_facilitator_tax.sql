-- Phase 1: Seller-of-record tax schema migration
--
-- The connected account (restaurant) is responsible for tax collection and
-- remittance. The platform only takes a platform fee via application_fee_amount.
--
-- Adds columns for:
--   • restaurants: address fields, platform_fee_bps
--   • orders: platform_fee_cents, transfer_amount_cents
--   • party_payments: platform_fee_cents

-- ─── restaurants ────────────────────────────────────────────────────────────
-- Address fields are still useful for display, search, and restaurant profiles.

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'street_address'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN street_address text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'city'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN city text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'state'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN state text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'postal_code'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN postal_code text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'country'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN country text NOT NULL DEFAULT 'US';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'restaurants' AND column_name = 'platform_fee_bps'
  ) THEN
    ALTER TABLE public.restaurants ADD COLUMN platform_fee_bps integer NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ─── orders ─────────────────────────────────────────────────────────────────
-- Platform fee audit columns (no tax columns - restaurant handles tax)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'platform_fee_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN platform_fee_cents integer NOT NULL DEFAULT 0;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'transfer_amount_cents'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN transfer_amount_cents integer;
  END IF;
END $$;

-- ─── party_payments ─────────────────────────────────────────────────────────
-- Platform fee for v2 group-order payments

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'party_payments' AND column_name = 'platform_fee_cents'
  ) THEN
    ALTER TABLE public.party_payments ADD COLUMN platform_fee_cents integer NOT NULL DEFAULT 0;
  END IF;
END $$;
