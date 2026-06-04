-- order_items had SELECT/INSERT/UPDATE policies but no DELETE policy, so client
-- deletes matched 0 rows under RLS and items reappeared on the next realtime fetch.

DROP POLICY IF EXISTS "auth_delete_order_items" ON public.order_items;

CREATE POLICY "auth_delete_order_items"
  ON public.order_items
  FOR DELETE
  TO authenticated
  USING (auth.role() = 'authenticated');
