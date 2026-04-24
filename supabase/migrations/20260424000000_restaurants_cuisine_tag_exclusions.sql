-- Hides default cuisine tag chips per restaurant (partner dashboard "remove options" flow).
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS cuisine_tag_exclusions text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.restaurants.cuisine_tag_exclusions IS
  'Default cuisine labels hidden from the partner picker for this restaurant.';
