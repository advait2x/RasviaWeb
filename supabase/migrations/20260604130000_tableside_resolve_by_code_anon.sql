-- Allow guest browsers to resolve /t/{code} via RPC when edge function is unavailable.
-- Scoped to valid codes in restaurant_tableside_tables only (SECURITY DEFINER).

GRANT EXECUTE ON FUNCTION public.tableside_resolve_by_code(text) TO anon;
GRANT EXECUTE ON FUNCTION public.tableside_resolve_by_code(text) TO authenticated;
