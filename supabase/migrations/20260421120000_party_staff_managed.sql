-- Tableside QR sessions created by restaurant staff are "staff-managed":
-- only the host (the waiter) may add items to the cart. Guests scan the
-- QR to pay their share, but cannot browse the menu or add items themselves.

-- ────────────────────────────────────────────────────────────────────────────
-- 1. party_sessions.staff_managed flag
-- ────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.party_sessions
  ADD COLUMN IF NOT EXISTS staff_managed boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.party_sessions.staff_managed IS
  'True for tableside sessions started by restaurant staff. Guests cannot add/edit items; only the host (waiter) can.';

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Guard party_add_item — non-host guests cannot add items in staff-managed
--    sessions, even if they somehow bypass the UI.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.party_add_item(
  p_session_id   uuid,
  p_member_id    uuid,
  p_token        text,
  p_menu_item_id bigint,
  p_quantity     integer DEFAULT 1,
  p_notes        text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member   public.party_members;
  v_session  public.party_sessions;
  v_menu     public.menu_items;
  v_qty      integer;
  v_item_id  uuid;
  v_existing uuid;
BEGIN
  v_member := public._party_auth(p_session_id, p_member_id, p_token);
  SELECT * INTO v_session FROM public.party_sessions WHERE id = p_session_id;
  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'session_not_open' USING ERRCODE = '22023';
  END IF;

  -- Staff-managed (tableside) sessions: only the host (waiter) can add items.
  IF coalesce(v_session.staff_managed, false) = true AND v_member.role <> 'host' THEN
    RAISE EXCEPTION 'host_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_menu FROM public.menu_items WHERE id = p_menu_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'menu_item_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_menu.restaurant_id IS DISTINCT FROM v_session.restaurant_id THEN
    RAISE EXCEPTION 'menu_item_wrong_restaurant' USING ERRCODE = '22023';
  END IF;
  IF coalesce(v_menu.in_stock, true) = false OR coalesce(v_menu.is_available, true) = false THEN
    RAISE EXCEPTION 'menu_item_unavailable' USING ERRCODE = '22023';
  END IF;

  v_qty := greatest(1, least(coalesce(p_quantity, 1), 25));

  SELECT id INTO v_existing
    FROM public.party_items
    WHERE session_id = p_session_id
      AND menu_item_id = p_menu_item_id
      AND added_by_member_id = p_member_id
      AND coalesce(special_requests, '') = coalesce(p_notes, '')
    LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.party_items
      SET quantity = least(25, coalesce(quantity, 1) + v_qty)
      WHERE id = v_existing;
    v_item_id := v_existing;
  ELSE
    INSERT INTO public.party_items (
      session_id, menu_item_id, added_by_name, added_by_user_id,
      added_by_member_id, quantity, special_requests
    ) VALUES (
      p_session_id, p_menu_item_id, v_member.display_name, v_member.user_id,
      v_member.id, v_qty, p_notes
    ) RETURNING id INTO v_item_id;
  END IF;

  RETURN jsonb_build_object('item_id', v_item_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.party_add_item(uuid, uuid, text, bigint, integer, text) TO anon, authenticated;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. party_host_add_item_for — host (waiter) adds an item attributed to a
--    specific guest member. Powers the tableside "add to <guest>'s check"
--    flow so that per_person / assigned ledger math credits the right guest.
-- ────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.party_host_add_item_for(
  p_session_id     uuid,
  p_member_id      uuid,
  p_token          text,
  p_for_member_id  uuid,
  p_menu_item_id   bigint,
  p_quantity       integer DEFAULT 1,
  p_notes          text    DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member   public.party_members;
  v_for      public.party_members;
  v_session  public.party_sessions;
  v_menu     public.menu_items;
  v_qty      integer;
  v_item_id  uuid;
  v_existing uuid;
BEGIN
  v_member := public._party_auth(p_session_id, p_member_id, p_token);
  IF v_member.role <> 'host' THEN
    RAISE EXCEPTION 'host_only' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_session FROM public.party_sessions WHERE id = p_session_id;
  IF v_session.status <> 'open' THEN
    RAISE EXCEPTION 'session_not_open' USING ERRCODE = '22023';
  END IF;

  -- p_for_member_id may be null → attribute to the host (caller).
  IF p_for_member_id IS NULL THEN
    v_for := v_member;
  ELSE
    SELECT * INTO v_for FROM public.party_members
      WHERE id = p_for_member_id AND session_id = p_session_id AND left_at IS NULL;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'invalid_payer' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT * INTO v_menu FROM public.menu_items WHERE id = p_menu_item_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'menu_item_not_found' USING ERRCODE = 'P0002'; END IF;
  IF v_menu.restaurant_id IS DISTINCT FROM v_session.restaurant_id THEN
    RAISE EXCEPTION 'menu_item_wrong_restaurant' USING ERRCODE = '22023';
  END IF;
  IF coalesce(v_menu.in_stock, true) = false OR coalesce(v_menu.is_available, true) = false THEN
    RAISE EXCEPTION 'menu_item_unavailable' USING ERRCODE = '22023';
  END IF;

  v_qty := greatest(1, least(coalesce(p_quantity, 1), 25));

  -- Coalesce with an existing identical row attributed to the same member,
  -- so repeated "+" taps bump quantity rather than creating duplicate rows.
  SELECT id INTO v_existing
    FROM public.party_items
    WHERE session_id = p_session_id
      AND menu_item_id = p_menu_item_id
      AND added_by_member_id = v_for.id
      AND coalesce(special_requests, '') = coalesce(p_notes, '')
    LIMIT 1;

  IF v_existing IS NOT NULL THEN
    UPDATE public.party_items
      SET quantity = least(25, coalesce(quantity, 1) + v_qty)
      WHERE id = v_existing;
    v_item_id := v_existing;
  ELSE
    INSERT INTO public.party_items (
      session_id, menu_item_id, added_by_name, added_by_user_id,
      added_by_member_id, quantity, special_requests
    ) VALUES (
      p_session_id, p_menu_item_id, v_for.display_name, v_for.user_id,
      v_for.id, v_qty, p_notes
    ) RETURNING id INTO v_item_id;
  END IF;

  RETURN jsonb_build_object('item_id', v_item_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.party_host_add_item_for(uuid, uuid, text, uuid, bigint, integer, text)
  TO anon, authenticated;
