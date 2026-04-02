-- Fix infinite recursion on profiles UPDATE when policies subquery profiles under RLS.

CREATE OR REPLACE FUNCTION public.profile_role_for_user(uid uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role::text FROM public.profiles WHERE id = uid LIMIT 1;
$$;

COMMENT ON FUNCTION public.profile_role_for_user(uuid) IS
  'Returns profiles.role for a user; used in RLS WITH CHECK to avoid recursive subqueries on profiles.';

REVOKE ALL ON FUNCTION public.profile_role_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.profile_role_for_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_role_for_user(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(lower(trim(public.profile_role_for_user(auth.uid()))), '') = 'admin';
$$;

DROP POLICY IF EXISTS "users_cannot_change_own_role" ON public.profiles;

CREATE POLICY "users_cannot_change_own_role"
  ON public.profiles FOR UPDATE
  USING (
    id = auth.uid()
    OR public.is_platform_admin()
  )
  WITH CHECK (
    (role IS NOT DISTINCT FROM public.profile_role_for_user(auth.uid()))
    OR public.is_platform_admin()
  );
