-- Fix infinite recursion on restaurants when updating (e.g. waitlist_open): permissive UPDATE
-- policies evaluate "Staff can update own restaurant" → restaurant_staff RLS →
-- get_my_restaurant_id() → restaurants under RLS → "Staff can see own restaurant" → restaurant_staff…

CREATE OR REPLACE FUNCTION public.get_my_restaurant_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT restaurant_id FROM restaurant_staff WHERE user_id = auth.uid() LIMIT 1),
    (SELECT id FROM restaurants WHERE owner_id = auth.uid() LIMIT 1)
  );
$$;

COMMENT ON FUNCTION public.get_my_restaurant_id() IS
  'Restaurant id for the current user: staff assignment, else owned restaurant via owner_id. row_security=off avoids RLS recursion.';

CREATE OR REPLACE FUNCTION public.am_i_restaurant_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM restaurant_staff
    WHERE user_id = auth.uid()
      AND (role = 'admin' OR role = 'owner')
  )
  OR EXISTS (
    SELECT 1 FROM restaurants WHERE owner_id = auth.uid()
  );
$$;

COMMENT ON FUNCTION public.am_i_restaurant_admin() IS
  'True if user is admin/owner in restaurant_staff OR owns a restaurant row. row_security=off avoids RLS recursion.';
