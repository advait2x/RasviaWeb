import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { X, Users, ShoppingCart, Plus, Minus, Crown } from "lucide-react";

type PartyItemRow = {
  id: string;
  menu_item_id: number;
  added_by_name: string;
  quantity: number;
  menu_items: { name: string; price: number; description: string | null; image_url: string | null } | null;
};

export default function JoinBridge() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantImage, setRestaurantImage] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [menu, setMenu] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<PartyItemRow[]>([]);
  const [guestName, setGuestName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const nameKeyRef = useRef(`rasvia:web:party-name:${sessionId}`);

  const fetchCart = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("party_items")
      .select("id, menu_item_id, added_by_name, quantity, menu_items(name, price, description, image_url)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setCartItems((data ?? []) as unknown as PartyItemRow[]);
  };

  useEffect(() => {
    if (!sessionId) {
      setError("Missing group order id.");
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const storedName = localStorage.getItem(nameKeyRef.current);
        if (storedName) {
          setGuestName(storedName);
          setIsJoined(true);
        }

        const { data: sessionData, error: sessionError } = await supabase
          .from("party_sessions")
          .select("id, restaurant_id, host_user_id, status, restaurants(name, image_url)")
          .eq("id", sessionId)
          .single();
        if (sessionError || !sessionData) throw new Error("Session not found.");

        if (sessionData.status === "submitted") setSubmitted(true);
        if (sessionData.status === "cancelled") throw new Error("This group order has ended.");

        setRestaurantId(sessionData.restaurant_id);
        setRestaurantName((sessionData.restaurants as any)?.name ?? "Restaurant");
        setRestaurantImage((sessionData.restaurants as any)?.image_url ?? null);

        const [{ data: menuData }, { data: authData }] = await Promise.all([
          supabase.from("menu_items").select("*").eq("restaurant_id", sessionData.restaurant_id).neq("is_available", false),
          supabase.auth.getSession(),
        ]);
        setMenu(menuData ?? []);
        setIsHost(Boolean(authData.session?.user?.id && authData.session.user.id === sessionData.host_user_id));

        await fetchCart();
      } catch (err: any) {
        setError(err.message ?? "Could not load group order.");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const channel = supabase
      .channel(`web-party-live-${sessionId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "party_items", filter: `session_id=eq.${sessionId}` }, fetchCart)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "party_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          if ((payload.new as any)?.status === "submitted") setSubmitted(true);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return menu;
    const q = search.toLowerCase().trim();
    return menu.filter((m) => m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [menu, search]);

  const members = useMemo(() => Array.from(new Set(cartItems.map((i) => i.added_by_name).filter(Boolean))), [cartItems]);
  const totalItems = cartItems.reduce((s, i) => s + (i.quantity ?? 1), 0);
  const total = cartItems.reduce((s, i) => s + Number(i.menu_items?.price ?? 0) * (i.quantity ?? 1), 0);

  const addItem = async (item: any) => {
    const qty = Math.max(1, qtyByItem[String(item.id)] ?? 1);
    const optimistic: PartyItemRow = {
      id: `tmp-${Date.now()}`,
      menu_item_id: item.id,
      added_by_name: guestName,
      quantity: qty,
      menu_items: { name: item.name, price: Number(item.price ?? 0), description: item.description ?? null, image_url: item.image_url ?? null },
    };
    setCartItems((prev) => [...prev, optimistic]);

    const { error } = await supabase.from("party_items").insert({
      session_id: sessionId,
      menu_item_id: item.id,
      added_by_name: guestName,
      quantity: qty,
    });
    if (error) {
      setCartItems((prev) => prev.filter((x) => x.id !== optimistic.id));
      return;
    }
    setQtyByItem((prev) => {
      const next = { ...prev };
      delete next[String(item.id)];
      return next;
    });
  };

  const removeItem = async (itemId: string) => {
    setCartItems((prev) => prev.filter((x) => x.id !== itemId));
    if (!itemId.startsWith("tmp-")) {
      await supabase.from("party_items").delete().eq("id", itemId);
    }
  };

  const submitGroupOrder = async () => {
    if (!isHost || totalItems === 0 || submitting) return;
    setSubmitting(true);
    try {
      const { error: updateErr } = await supabase
        .from("party_sessions")
        .update({ status: "submitted", submitted_at: new Date().toISOString() })
        .eq("id", sessionId);
      if (updateErr) throw updateErr;

      await supabase.from("group_orders").insert({
        party_session_id: sessionId,
        restaurant_id: restaurantId,
        total,
        submitted_at: new Date().toISOString(),
        items: cartItems.map((c) => ({
          name: c.menu_items?.name ?? "Item",
          price: Number(c.menu_items?.price ?? 0),
          quantity: c.quantity ?? 1,
          added_by: c.added_by_name,
        })),
      });
      setSubmitted(true);
    } catch {
      setError("Could not submit group order.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#09090b] text-zinc-200 flex items-center justify-center">Loading group order...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-[#09090b] text-red-300 flex items-center justify-center">{error}</div>;
  }

  if (!isJoined) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900/90 p-6 space-y-4">
          <h1 className="text-2xl font-bold tracking-tight">Join Group Order</h1>
          <p className="text-zinc-400 text-sm">{restaurantName}</p>
          <input
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl bg-zinc-800 border border-white/10 px-4 py-3 text-zinc-100 focus:outline-none focus:border-amber-500/50"
          />
          <button
            onClick={() => {
              if (!guestName.trim()) return;
              localStorage.setItem(nameKeyRef.current, guestName.trim());
              setGuestName(guestName.trim());
              setIsJoined(true);
            }}
            className="w-full rounded-xl bg-amber-500 text-black font-semibold py-3 hover:bg-amber-400 transition-colors"
          >
            Start Ordering
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100">
      {showBanner && (
        <div className="sticky top-0 z-50 w-full border-b border-amber-500/20 bg-amber-500/10">
          <div className="mx-auto max-w-6xl px-4 py-2 flex items-center justify-between gap-3">
            <a href={`rasvia://join/${sessionId}`} className="text-sm text-amber-300 hover:text-amber-200">
              Better in the Rasvia app: faster checkout and richer group controls.
            </a>
            <button onClick={() => setShowBanner(false)} className="text-amber-300 hover:text-amber-100">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-6xl px-4 py-5 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h1 className="text-2xl font-bold tracking-tight">{restaurantName}</h1>
            {restaurantImage && (
              <img
                src={restaurantImage}
                alt={restaurantName}
                className="mt-2 h-24 w-full rounded-xl object-cover border border-white/10"
              />
            )}
            <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2">
              <Users size={13} />
              <span>{members.length || 1} members</span>
              {isHost && <><Crown size={12} className="text-amber-400" /><span className="text-amber-300">Host</span></>}
            </div>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search menu..."
              className="w-full mt-3 rounded-xl bg-zinc-800 border border-white/10 px-4 py-2.5 text-sm text-zinc-100 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          <div className="p-4 space-y-3 max-h-[68vh] overflow-y-auto">
            {filteredMenu.map((item) => {
              const qty = qtyByItem[String(item.id)] ?? 1;
              return (
                <div key={item.id} className="rounded-xl border border-white/10 bg-zinc-800/40 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{item.name}</div>
                      <div className="text-xs text-zinc-400 truncate">{item.description || "No description"}</div>
                      <div className="text-sm text-amber-400 mt-1">${Number(item.price ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setQtyByItem((p) => ({ ...p, [String(item.id)]: Math.max(1, qty - 1) }))}
                        className="w-8 h-8 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm">{qty}</span>
                      <button
                        onClick={() => setQtyByItem((p) => ({ ...p, [String(item.id)]: qty + 1 }))}
                        className="w-8 h-8 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={() => addItem(item)}
                        className="ml-1 rounded-lg bg-amber-500 text-black px-3 py-2 text-sm font-semibold hover:bg-amber-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredMenu.length === 0 && <div className="text-zinc-500 text-sm">No menu items found.</div>}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/80 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="font-bold flex items-center gap-2"><ShoppingCart size={16} /> Group Cart</div>
            <div className="text-xs text-zinc-400">{totalItems} items</div>
          </div>
          <div className="p-4 space-y-2 max-h-[52vh] overflow-y-auto">
            {cartItems.map((c) => (
              <div key={c.id} className="rounded-lg border border-white/10 bg-zinc-800/40 p-2.5 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{c.menu_items?.name ?? "Item"} {c.quantity > 1 ? `x${c.quantity}` : ""}</div>
                  <div className="text-[11px] text-zinc-400 truncate">{c.added_by_name}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-300">${(Number(c.menu_items?.price ?? 0) * (c.quantity ?? 1)).toFixed(2)}</span>
                  {(isHost || c.added_by_name === guestName) && (
                    <button
                      onClick={() => removeItem(c.id)}
                      className="text-[11px] px-2 py-1 rounded-md bg-red-500/15 text-red-300 border border-red-500/30"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
            {cartItems.length === 0 && <div className="text-zinc-500 text-sm">No items yet.</div>}
          </div>
          <div className="p-4 border-t border-white/10">
            <div className="flex items-center justify-between mb-3">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="font-bold text-lg">${total.toFixed(2)}</span>
            </div>
            {submitted ? (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold py-2.5 text-center">
                Order Submitted
              </div>
            ) : isHost ? (
              <button
                onClick={submitGroupOrder}
                disabled={submitting || totalItems === 0}
                className="w-full rounded-xl bg-emerald-500 text-white font-semibold py-2.5 hover:bg-emerald-400 disabled:opacity-50"
              >
                {submitting ? "Submitting..." : "Submit Group Order"}
              </button>
            ) : (
              <div className="rounded-xl bg-zinc-800 border border-white/10 text-zinc-400 text-sm py-2.5 text-center">
                Waiting for host to submit
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
