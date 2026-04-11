import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { X, Users, ShoppingCart, Plus, Minus, Crown, Smartphone, ExternalLink } from "lucide-react";

type PartyItemRow = {
  id: string;
  menu_item_id: number;
  added_by_name: string;
  added_by_user_id?: string | null;
  quantity: number;
  special_requests?: string | null;
  menu_items: { name: string; price: number; description: string | null; image_url: string | null } | null;
};
type PaymentMode = "host_pays" | "split" | "assign";
const SPLIT_META_PREFIX = "__rasvia_split:";
type ItemSplitMeta = { type: "equal"; members: string[] };

function normalizePaymentMode(mode: unknown): PaymentMode {
  return mode === "split" || mode === "assign" || mode === "host_pays" ? mode : "host_pays";
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function parseItemSplitMeta(raw: unknown): ItemSplitMeta | null {
  if (typeof raw !== "string" || !raw.startsWith(SPLIT_META_PREFIX)) return null;
  try {
    const parsed = JSON.parse(raw.slice(SPLIT_META_PREFIX.length));
    if (!parsed || parsed.type !== "equal" || !Array.isArray(parsed.members)) return null;
    const members = parsed.members
      .map((m: unknown) => String(m || "").trim())
      .filter(Boolean);
    if (members.length === 0) return null;
    return { type: "equal", members: Array.from(new Set(members)) };
  } catch {
    return null;
  }
}

function checkoutUrlFromResponse(payload: unknown): string {
  const data = (payload ?? {}) as Record<string, any>;
  const candidate =
    data?.url ??
    data?.checkout_url ??
    data?.data?.url ??
    data?.data?.checkout_url;
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    return candidate.trim();
  }
  const err = data?.error ?? data?.message ?? data?.data?.error ?? data?.data?.message;
  if (typeof err === "string" && err.trim().length > 0) {
    throw new Error(err.trim());
  }
  throw new Error("Checkout service did not return a URL.");
}

export default function JoinBridge() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id") ?? "";
  const splitPaid = params.get("split_paid") === "1";
  const splitPaidPayer = params.get("payer") ?? "";
  const fullPaid = params.get("full_paid") === "1";
  const checkoutStatus = params.get("checkout_status") ?? "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState("");
  const [restaurantImage, setRestaurantImage] = useState<string | null>(null);
  const [restaurantId, setRestaurantId] = useState<number | null>(null);
  const [isHost, setIsHost] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ended, setEnded] = useState(false);
  const [endedMessage, setEndedMessage] = useState("This group order has ended.");
  const [paymentMode, setPaymentMode] = useState<PaymentMode>("host_pays");
  const [assignedPayer, setAssignedPayer] = useState<string | null>(null);
  const [paymentModeSyncing, setPaymentModeSyncing] = useState(false);
  const [menu, setMenu] = useState<any[]>([]);
  const [cartItems, setCartItems] = useState<PartyItemRow[]>([]);
  const [guestName, setGuestName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [search, setSearch] = useState("");
  const [showBanner, setShowBanner] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // App interstitial: show "Open in Rasvia" overlay before the web fallback
  const [appOverlay, setAppOverlay] = useState(!(splitPaid || fullPaid || checkoutStatus === "success"));
  const [appLinkFired, setAppLinkFired] = useState(false);
  const [qtyByItem, setQtyByItem] = useState<Record<string, number>>({});
  const [selectedMenuItem, setSelectedMenuItem] = useState<any | null>(null);
  const [payingMyShare, setPayingMyShare] = useState(false);
  const [payingFullBill, setPayingFullBill] = useState(false);
  const [splitPaidMembers, setSplitPaidMembers] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const nameKeyRef = useRef(`rasvia:web:party-name:${sessionId}`);

  const fetchCart = async () => {
    if (!sessionId) return;
    const { data } = await supabase
      .from("party_items")
      .select("*, menu_items(name, price, description, image_url)")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setCartItems((data ?? []) as unknown as PartyItemRow[]);
  };

  const fetchSplitPaidMembers = async () => {
    if (!sessionId) return;
    try {
      const { data } = await supabase
        .from("orders")
        .select("customer_name,status,party_session_id")
        .eq("party_session_id", sessionId)
        .in("status", ["paid", "ready", "served"]);

      const paid = Array.from(
        new Set(
          (data ?? [])
            .map((row: any) => String(row?.customer_name ?? "").trim())
            .filter(Boolean)
        )
      );
      setSplitPaidMembers(paid);
    } catch {
      // ignore for anonymous browsers
    }
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
          .select("id, restaurant_id, host_user_id, status, payment_mode, assigned_payer_name, restaurants(name, image_url)")
          .eq("id", sessionId)
          .single();
        if (sessionError || !sessionData) throw new Error("Session not found.");

        setRestaurantId(sessionData.restaurant_id);
        setRestaurantName((sessionData.restaurants as any)?.name ?? "Restaurant");
        setRestaurantImage((sessionData.restaurants as any)?.image_url ?? null);

        if (sessionData.status === "submitted") {
          setSubmitted(true);
          setEnded(true);
          setEndedMessage("This group order has already been submitted.");
          return;
        }
        if (sessionData.status === "cancelled") {
          setEnded(true);
          setEndedMessage("This group order has ended.");
          return;
        }

        setPaymentMode(normalizePaymentMode((sessionData as any).payment_mode));
        setAssignedPayer((sessionData as any).assigned_payer_name ?? null);

        const [{ data: menuData }, { data: authData }] = await Promise.all([
          supabase.from("menu_items").select("*").eq("restaurant_id", sessionData.restaurant_id).neq("is_available", false),
          supabase.auth.getSession(),
        ]);
        setMenu(menuData ?? []);
        setCurrentUserId(authData.session?.user?.id ?? null);
        setIsHost(Boolean(authData.session?.user?.id && authData.session.user.id === sessionData.host_user_id));

        await fetchCart();
        await fetchSplitPaidMembers();
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
          const nextSession = payload.new as Record<string, unknown>;
          const nextStatus = nextSession?.status;
          if (nextStatus === "submitted") {
            setSubmitted(true);
            setEnded(true);
            setEndedMessage("This group order has already been submitted.");
          } else if (nextStatus === "cancelled") {
            setEnded(true);
            setEndedMessage("This group order has ended.");
          }
          setPaymentMode(normalizePaymentMode(nextSession?.payment_mode));
          setAssignedPayer(typeof nextSession?.assigned_payer_name === "string" ? nextSession.assigned_payer_name : null);
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const paymentsChannel = supabase
      .channel(`web-party-payments-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `party_session_id=eq.${sessionId}` },
        () => {
          fetchSplitPaidMembers().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(paymentsChannel);
    };
  }, [sessionId]);

  // Build deep link — include guest name so the app can skip the name prompt
  const buildAppScheme = (name?: string) => {
    const storedName = name ?? localStorage.getItem(nameKeyRef.current) ?? "";
    const base = import.meta.env.PROD
      ? `rasvia://join/${sessionId}`
      : `exp://192.168.1.96:8081/--/join/${sessionId}`;
    return storedName ? `${base}?name=${encodeURIComponent(storedName)}` : base;
  };

  const appScheme = buildAppScheme();

  const filteredMenu = useMemo(() => {
    if (!search.trim()) return menu;
    const q = search.toLowerCase().trim();
    return menu.filter((m) => m.name?.toLowerCase().includes(q) || m.description?.toLowerCase().includes(q));
  }, [menu, search]);

  const members = useMemo(() => Array.from(new Set(cartItems.map((i) => i.added_by_name).filter(Boolean))), [cartItems]);
  const totalItems = cartItems.reduce((s, i) => s + (i.quantity ?? 1), 0);
  const total = cartItems.reduce((s, i) => s + Number(i.menu_items?.price ?? 0) * (i.quantity ?? 1), 0);
  const memberTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    members.forEach((name) => {
      totals[name] = 0;
    });
    for (const item of cartItems) {
      const owner = String(item.added_by_name || "");
      const splitMeta = parseItemSplitMeta(item.special_requests);
      const splitMembers = splitMeta?.members?.filter((name) => members.includes(name)) ?? [];
      const payers = splitMembers.length >= 2 ? splitMembers : [owner];
      const totalCents = Math.max(0, Math.round(Number(item.menu_items?.price ?? 0) * Math.max(1, Number(item.quantity ?? 1)) * 100));
      const base = Math.floor(totalCents / payers.length);
      let remainder = totalCents - base * payers.length;
      payers.forEach((name) => {
        if (!totals[name]) totals[name] = 0;
        const cents = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        totals[name] += cents / 100;
      });
    }
    return totals;
  }, [cartItems, members]);
  const myShareTotal = guestName ? (memberTotals[guestName] ?? 0) : 0;
  const splitPaidMemberSet = useMemo(
    () => new Set(splitPaidMembers.map((name) => normalizeName(name))),
    [splitPaidMembers]
  );
  const splitRequiredMembers = useMemo(
    () => members.filter((name) => (memberTotals[name] ?? 0) > 0),
    [memberTotals, members]
  );
  const splitAllPaid = useMemo(
    () => splitRequiredMembers.every((name) => splitPaidMemberSet.has(normalizeName(name))),
    [splitRequiredMembers, splitPaidMemberSet]
  );
  const unpaidSplitMembers = useMemo(
    () => splitRequiredMembers.filter((name) => !splitPaidMemberSet.has(normalizeName(name))),
    [splitRequiredMembers, splitPaidMemberSet]
  );
  const mySharePaid = guestName ? splitPaidMemberSet.has(normalizeName(guestName)) : false;
  const membersWithAppIdentity = useMemo(
    () =>
      members.filter((name) =>
        cartItems.some((item) => item.added_by_name === name && Boolean(item.added_by_user_id))
      ),
    [cartItems, members]
  );
  const assignableMembers = useMemo(() => Array.from(new Set<string>(membersWithAppIdentity)), [membersWithAppIdentity]);
  const canAssignPayer = assignableMembers.length > 0;
  const canUseMultiPayerModes = members.length > 1;
  const isAssignedPayerValid =
    paymentMode !== "assign" || (!!assignedPayer && assignableMembers.includes(assignedPayer));
  const lineTotal = (price: number, qty: number) => Number(price ?? 0) * Math.max(1, qty);

  const buildPayerCheckoutItems = (payerName?: string) => {
    if (!payerName) {
      return cartItems.map((item) => ({
        name: item.menu_items?.name ?? "Unknown",
        price: Number(item.menu_items?.price ?? 0),
        quantity: item.quantity ?? 1,
        menu_item_id: item.menu_item_id,
        added_by: item.added_by_name || guestName,
      }));
    }

    const payerItems = cartItems.flatMap((item) => {
      const owner = String(item.added_by_name || "");
      const splitMeta = parseItemSplitMeta(item.special_requests);
      const splitMembers = splitMeta?.members?.filter((name) => members.includes(name)) ?? [];
      const payers = splitMembers.length >= 2 ? splitMembers : [owner];
      if (!payers.includes(payerName)) return [];

      const totalCents = Math.max(0, Math.round(Number(item.menu_items?.price ?? 0) * Math.max(1, Number(item.quantity ?? 1)) * 100));
      const base = Math.floor(totalCents / payers.length);
      let remainder = totalCents - base * payers.length;
      let payerCents = 0;
      payers.forEach((name) => {
        const cents = base + (remainder > 0 ? 1 : 0);
        if (remainder > 0) remainder -= 1;
        if (name === payerName) payerCents = cents;
      });

      return [{
        name: payers.length >= 2 ? `${item.menu_items?.name ?? "Unknown"} (split)` : (item.menu_items?.name ?? "Unknown"),
        price: payerCents / 100,
        quantity: 1,
        menu_item_id: item.menu_item_id,
        added_by: payerName,
      }];
    });

    return payerItems.filter((item) => item.price > 0);
  };

  const addItem = async (item: any) => {
    const qty = Math.max(1, qtyByItem[String(item.id)] ?? 1);
    const existing = cartItems.find(
      (ci) => ci.menu_item_id === item.id && (ci.added_by_name || "").trim() === guestName.trim()
    );

    if (existing && !String(existing.id).startsWith("tmp-")) {
      const nextQty = (existing.quantity ?? 1) + qty;
      setCartItems((prev) =>
        prev.map((ci) => (ci.id === existing.id ? { ...ci, quantity: nextQty } : ci))
      );
      const { error } = await supabase
        .from("party_items")
        .update({ quantity: nextQty })
        .eq("id", existing.id);
      if (error) {
        await fetchCart();
        return;
      }
    } else {
      const optimistic: PartyItemRow = {
        id: `tmp-${Date.now()}`,
        menu_item_id: item.id,
        added_by_name: guestName,
        quantity: qty,
        menu_items: { name: item.name, price: Number(item.price ?? 0), description: item.description ?? null, image_url: item.image_url ?? null },
      };
      setCartItems((prev) => [...prev, optimistic]);

      const insertPayload: Record<string, any> = {
        session_id: sessionId,
        menu_item_id: item.id,
        added_by_name: guestName,
        quantity: qty,
      };
      const { error } = await supabase.from("party_items").insert(insertPayload);
      if (error) {
        setCartItems((prev) => prev.filter((x) => x.id !== optimistic.id));
        return;
      }
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

  const syncPaymentMode = async (nextMode: PaymentMode, nextAssignedPayer: string | null) => {
    if (paymentModeSyncing) return;
    if ((nextMode === "split" || nextMode === "assign") && !canUseMultiPayerModes) return;
    setPaymentModeSyncing(true);
    setPaymentMode(nextMode);
    setAssignedPayer(nextAssignedPayer);
    if (!isHost) {
      setPaymentModeSyncing(false);
      return;
    }

    const { error } = await supabase
      .from("party_sessions")
      .update({
        payment_mode: nextMode,
        assigned_payer_name: nextMode === "assign" ? nextAssignedPayer : null,
      })
      .eq("id", sessionId);
    if (error) {
      setPaymentModeSyncing(false);
      throw error;
    }
    setPaymentModeSyncing(false);
  };

  useEffect(() => {
    if (canUseMultiPayerModes) return;
    if (paymentMode === "host_pays") return;
    setPaymentMode("host_pays");
    setAssignedPayer(null);
    if (isHost) {
      supabase
        .from("party_sessions")
        .update({ payment_mode: "host_pays", assigned_payer_name: null })
        .eq("id", sessionId)
        .then(() => {});
    }
  }, [canUseMultiPayerModes, isHost, paymentMode, sessionId]);

  const createCheckoutUrl = async (body: Record<string, unknown>) => {
    const { data, error: checkoutError } = await supabase.functions.invoke("create-checkout", {
      body,
    });
    if (checkoutError) throw checkoutError;
    return checkoutUrlFromResponse(data);
  };

  const payMyShare = async () => {
    if (!restaurantId || !sessionId || !guestName || myShareTotal <= 0 || payingMyShare) return;
    setPayingMyShare(true);
    try {
      const { data: restData, error: restError } = await supabase
        .from("restaurants")
        .select("stripe_account_id")
        .eq("id", restaurantId)
        .single();
      if (restError) throw restError;
      const stripeAccountId = restData?.stripe_account_id;
      if (!stripeAccountId) {
        throw new Error("Online payments are not enabled for this restaurant yet.");
      }

      const payerItems = buildPayerCheckoutItems(guestName);

      if (payerItems.length === 0) {
        throw new Error("No items found for your share.");
      }

      const returnBase = `${window.location.origin}/join?id=${encodeURIComponent(sessionId)}&split_paid=1&payer=${encodeURIComponent(guestName)}`;
      const checkoutUrl = await createCheckoutUrl({
        restaurant_id: restaurantId,
        stripe_account_id: stripeAccountId,
        amount: myShareTotal,
        party_session_id: sessionId,
        cart_items: payerItems,
        restaurant_name: restaurantName,
        customer_name: guestName,
        user_id: currentUserId,
        order_type: "dine_in",
        return_url_base: returnBase,
      });

      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Could not initiate payment.");
    } finally {
      setPayingMyShare(false);
    }
  };

  const payAndSubmitFullOrder = async () => {
    if (!isHost || totalItems === 0 || submitting || payingFullBill || !restaurantId) return;
    setPayingFullBill(true);
    try {
      const { data: restData, error: restError } = await supabase
        .from("restaurants")
        .select("stripe_account_id")
        .eq("id", restaurantId)
        .single();
      if (restError) throw restError;
      const stripeAccountId = restData?.stripe_account_id;
      if (!stripeAccountId) {
        await submitGroupOrder();
        return;
      }

      const checkoutUrl = await createCheckoutUrl({
        restaurant_id: restaurantId,
        stripe_account_id: stripeAccountId,
        amount: total,
        party_session_id: sessionId,
        cart_items: cartItems.map((item) => ({
          name: item.menu_items?.name ?? "Unknown",
          price: Number(item.menu_items?.price ?? 0),
          quantity: item.quantity ?? 1,
          menu_item_id: item.menu_item_id,
          added_by: item.added_by_name || guestName,
        })),
        restaurant_name: restaurantName,
        customer_name: guestName,
        user_id: currentUserId,
        order_type: "dine_in",
        return_url_base: `${window.location.origin}/join?id=${encodeURIComponent(sessionId)}&full_paid=1&payer=${encodeURIComponent(guestName)}`,
      });

      window.location.href = checkoutUrl;
    } catch (err: any) {
      setError(err?.message ?? "Could not start checkout.");
    } finally {
      setPayingFullBill(false);
    }
  };

  useEffect(() => {
    if (!fullPaid || checkoutStatus !== "success" || submitted || loading || !isHost) return;
    submitGroupOrder().catch(() => {});
  }, [checkoutStatus, fullPaid, isHost, loading, submitted]);

  if (ended) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-900/80 p-8 sm:p-10 text-center">
          <div className="mx-auto mb-6 inline-flex items-center justify-center h-16 w-16 bg-zinc-900 border border-white/10">
            <img src="/rasvia-icon.png" alt="Rasvia" className="h-12 w-12 object-contain" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">
            Group Order Ended
          </h1>
          <p className="text-zinc-300 text-base sm:text-lg mb-2">
            This group order has ended, but there are still great restaurants to be found on Rasvia.
          </p>
          <p className="text-zinc-500 text-sm mb-8">{endedMessage}</p>

          <div className="grid grid-cols-1 gap-3">
            <a
              href={appScheme}
              onClick={() => setAppLinkFired(true)}
              className="rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 px-4 transition-colors"
            >
              Open Rasvia App
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Show overlay immediately — don't wait for data to load
  if (appOverlay) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#09090b] px-6">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="mb-8"
        >
          <img
            src="/rasvia-logo-transparent.png"
            alt="Rasvia"
            className="h-14 w-auto"
            style={{ objectFit: "contain" }}
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="text-center space-y-2 mb-8"
        >
          <h1 className="text-2xl font-bold text-zinc-100 tracking-tight">
            {restaurantName || "Group Order"}
          </h1>
          <p className="text-zinc-400 text-sm">You've been invited to a group order.</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="w-full max-w-xs space-y-3"
        >
          <button
            onClick={() => {
              setAppLinkFired(true);
              window.location.href = appScheme;
            }}
            className="flex items-center justify-center gap-3 w-full rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 text-lg transition-colors shadow-xl shadow-amber-500/20"
          >
            <Smartphone size={22} strokeWidth={2} />
            Open in Rasvia
          </button>
          <button
            onClick={() => setAppOverlay(false)}
            className="w-full text-zinc-500 text-sm hover:text-zinc-300 transition-colors py-2"
          >
            Continue in browser instead
          </button>
        </motion.div>

        {appLinkFired && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-6 text-center space-y-2"
          >
            <p className="text-xs text-zinc-600">Don't have the app?</p>
            <div className="flex items-center justify-center gap-4">
              <a
                href="https://apps.apple.com/app/rasvia/id123456789"
                className="text-xs text-amber-500/80 hover:text-amber-400 flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={11} />
                App Store
              </a>
              <a
                href="https://play.google.com/store/apps/details?id=com.rasvia"
                className="text-xs text-amber-500/80 hover:text-amber-400 flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink size={11} />
                Google Play
              </a>
            </div>
          </motion.div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          <span className="text-amber-500/70 text-sm font-medium tracking-wide">Loading group order...</span>
        </div>
      </div>
    );
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
      {/* Sticky "Open in App" button — visible after overlay dismisses */}
      {!appOverlay && showBanner && (
        <div className="sticky top-0 z-50 w-full border-b border-white/8 bg-zinc-950/95 backdrop-blur-md">
          <div className="mx-auto max-w-6xl px-4 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <img src="/rasvia-logo-transparent.png" alt="Rasvia" className="h-5 w-auto" />
              <span className="text-sm text-zinc-300 font-medium">Better in the app — faster checkout & group controls.</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={appScheme}
                className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold transition-colors"
              >
                Open App
              </a>
              <button onClick={() => setShowBanner(false)} className="text-zinc-500 hover:text-zinc-300 p-1">
                <X size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {splitPaid && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
            {splitPaidPayer
              ? `${splitPaidPayer} completed payment successfully.`
              : "Payment completed successfully."}
          </div>
        </div>
      )}
      {fullPaid && checkoutStatus === "success" && (
        <div className="mx-auto max-w-6xl px-4 pt-4">
          <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
            Full payment completed. Submitting group order...
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
                className="mt-2 h-24 w-full rounded-xl object-contain bg-zinc-950 border border-white/10"
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
            {filteredMenu.length > 0 && (
              <div className="text-[11px] text-zinc-500 -mt-1 mb-1">Tap any item card for details</div>
            )}
            {filteredMenu.map((item) => {
              const qty = qtyByItem[String(item.id)] ?? 1;
              const itemPrice = Number(item.price ?? 0);
              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedMenuItem(item)}
                  className="w-full text-left rounded-xl border border-white/10 bg-zinc-800/40 p-3 hover:border-amber-500/35 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold truncate">{item.name}</div>
                        <div className="text-xs text-zinc-400 mt-1 line-clamp-2">
                          {item.description || "No description available for this item."}
                        </div>
                        <div className="text-sm text-amber-400 mt-2">${itemPrice.toFixed(2)} each</div>
                      </div>
                      <div className="text-xs text-zinc-500 mt-2">
                        {qty} {qty === 1 ? "item" : "items"} · ${lineTotal(itemPrice, qty).toFixed(2)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQtyByItem((p) => ({ ...p, [String(item.id)]: Math.max(1, qty - 1) }));
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center text-sm">{qty}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setQtyByItem((p) => ({ ...p, [String(item.id)]: qty + 1 }));
                        }}
                        className="w-8 h-8 rounded-full bg-zinc-700 border border-white/10 flex items-center justify-center"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          addItem(item);
                        }}
                        className="ml-1 rounded-lg bg-amber-500 text-black px-3 py-2 text-sm font-semibold hover:bg-amber-400"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                </button>
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
                {(() => {
                  const splitMeta = parseItemSplitMeta(c.special_requests);
                  const splitCount = (splitMeta?.members?.filter((name) => members.includes(name)).length ?? 0);
                  return (
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1.5">
                    <span className="truncate">{c.menu_items?.name ?? "Item"} {c.quantity > 1 ? `x${c.quantity}` : ""}</span>
                    {splitCount >= 2 && (
                      <span className="shrink-0 rounded-md border border-indigo-400/40 bg-indigo-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-200">
                        Split {splitCount} ways
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-zinc-400 truncate">{c.added_by_name}</div>
                </div>
                  );
                })()}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-amber-300">${(Number(c.menu_items?.price ?? 0) * (c.quantity ?? 1)).toFixed(2)}</span>
                  {(isHost || c.added_by_name === guestName) && (
                    <button
                      onClick={() => {
                        const confirmed = window.confirm("Are you sure you want to remove this item from the group cart?");
                        if (!confirmed) return;
                        removeItem(c.id);
                      }}
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
          <div className="p-4 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-zinc-400 text-sm">Total</span>
              <span className="font-bold text-lg">${total.toFixed(2)}</span>
            </div>

            {members.length > 0 && (
              <div className="rounded-xl border border-white/10 bg-zinc-800/35 p-3">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500 mb-2">Per-person totals</div>
                <div className="space-y-1.5">
                  {members.map((name) => (
                    <div key={name} className="flex items-center justify-between text-sm">
                      <span className="text-zinc-300">{name}</span>
                      <span className="font-semibold text-indigo-300">${(memberTotals[name] ?? 0).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {isHost && totalItems > 0 && (
              <div className="rounded-xl border border-white/10 bg-zinc-800/35 p-3 space-y-2">
                <div className="text-[11px] uppercase tracking-wide text-zinc-500">Payment mode</div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => {
                      syncPaymentMode("host_pays", null).catch((err: any) => setError(err?.message ?? "Could not update payment mode."));
                    }}
                    disabled={paymentModeSyncing}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold border ${paymentMode === "host_pays" ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300" : "bg-zinc-900 border-white/10 text-zinc-300"}`}
                  >
                    I'll Pay
                  </button>
                  <button
                    onClick={() => {
                      if (!canUseMultiPayerModes) return;
                      syncPaymentMode("split", null).catch((err: any) => setError(err?.message ?? "Could not update payment mode."));
                    }}
                    disabled={paymentModeSyncing || !canUseMultiPayerModes}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold border ${paymentMode === "split" ? "bg-indigo-500/15 border-indigo-500/50 text-indigo-300" : "bg-zinc-900 border-white/10 text-zinc-300"} ${(!canUseMultiPayerModes || paymentModeSyncing) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Split by Person
                  </button>
                  <button
                    onClick={() => {
                      if (!canUseMultiPayerModes) return;
                      const fallbackPayer = assignedPayer || guestName || assignableMembers[0] || null;
                      syncPaymentMode("assign", fallbackPayer).catch((err: any) => setError(err?.message ?? "Could not update payment mode."));
                    }}
                    disabled={!canAssignPayer || paymentModeSyncing || !canUseMultiPayerModes}
                    className={`rounded-lg px-2 py-2 text-xs font-semibold border ${paymentMode === "assign" ? "bg-orange-500/15 border-orange-500/50 text-orange-300" : "bg-zinc-900 border-white/10 text-zinc-300"} ${(!canUseMultiPayerModes || paymentModeSyncing) ? "opacity-50 cursor-not-allowed" : ""}`}
                  >
                    Assign
                  </button>
                </div>
                {!canUseMultiPayerModes && (
                  <div className="text-[11px] text-zinc-500">
                    Split and Assign unlock when at least 2 members are in the group.
                  </div>
                )}
                {paymentMode === "assign" && (
                  <div className="space-y-1.5 pt-1">
                    {assignableMembers.map((name) => (
                      <button
                        key={name}
                        onClick={() => {
                          if (paymentModeSyncing) return;
                          syncPaymentMode("assign", name).catch((err: any) => setError(err?.message ?? "Could not update assigned payer."));
                        }}
                        disabled={paymentModeSyncing}
                        className={`w-full text-left rounded-lg px-2.5 py-2 text-xs border ${assignedPayer === name ? "bg-orange-500/15 border-orange-500/50 text-orange-300" : "bg-zinc-900 border-white/10 text-zinc-300"}`}
                      >
                        {name}
                      </button>
                    ))}
                    {assignableMembers.length < members.length && (
                      <div className="text-[11px] text-amber-300/90 pt-1">
                        Web-only participants cannot be assigned as payer yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {submitted ? (
              <div className="rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm font-semibold py-2.5 text-center">
                Order Submitted
              </div>
            ) : paymentMode === "split" ? (
              <>
                {myShareTotal > 0 && (
                  <button
                    onClick={payMyShare}
                    disabled={payingMyShare || mySharePaid}
                    className="w-full rounded-xl bg-indigo-500 text-white font-semibold py-2.5 hover:bg-indigo-400 disabled:opacity-60"
                  >
                    {payingMyShare ? "Opening checkout..." : mySharePaid ? "My Share Paid" : `Pay My Share · $${myShareTotal.toFixed(2)}`}
                  </button>
                )}
                <div className="rounded-xl bg-indigo-500/12 border border-indigo-500/30 text-indigo-200 text-xs py-2.5 px-3 text-center">
                  {isHost
                    ? splitAllPaid
                      ? "All members have paid. You can submit the order."
                      : `Split mode is active. Waiting on: ${unpaidSplitMembers.join(", ")}`
                    : myShareTotal > 0
                      ? mySharePaid
                        ? "Your split payment is complete."
                        : "Host enabled split checkout. Pay your amount above."
                      : "Host enabled split checkout. Add items to see your amount."}
                </div>
                {isHost && (
                  <button
                    onClick={submitGroupOrder}
                    disabled={submitting || !splitAllPaid || totalItems === 0}
                    className="w-full rounded-xl bg-emerald-500 text-white font-semibold py-2.5 hover:bg-emerald-400 disabled:opacity-50"
                  >
                    {submitting ? "Submitting..." : splitAllPaid ? "Submit Paid Group Order" : "Waiting for all split payments"}
                  </button>
                )}
              </>
            ) : isHost ? (
              <button
                onClick={payAndSubmitFullOrder}
                disabled={submitting || payingFullBill || totalItems === 0 || !isAssignedPayerValid}
                className="w-full rounded-xl bg-emerald-500 text-white font-semibold py-2.5 hover:bg-emerald-400 disabled:opacity-50"
              >
                {payingFullBill ? "Opening checkout..." : submitting ? "Submitting..." : `Pay & Submit · $${total.toFixed(2)}`}
              </button>
            ) : (
              <div className="rounded-xl bg-zinc-800 border border-white/10 text-zinc-400 text-sm py-2.5 text-center">
                Waiting for host to submit
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedMenuItem && (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-[1px] flex items-end sm:items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-zinc-900 overflow-hidden">
            <div className="relative">
              <img
                src={selectedMenuItem.image_url || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=1000&q=75"}
                alt={selectedMenuItem.name || "Menu item"}
                className="w-full h-56 sm:h-64 object-cover"
              />
              <button
                onClick={() => setSelectedMenuItem(null)}
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-zinc-950/70 border border-white/20 flex items-center justify-center text-zinc-100 hover:bg-zinc-900"
                aria-label="Close item details"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-4 sm:p-5">
              <h3 className="text-xl font-bold tracking-tight">{selectedMenuItem.name}</h3>
              <div className="text-amber-400 font-semibold mt-1">${Number(selectedMenuItem.price ?? 0).toFixed(2)}</div>
              <p className="text-sm text-zinc-300 mt-3 leading-relaxed">
                {selectedMenuItem.description || "No description available for this item."}
              </p>
              <div className="mt-4 text-xs text-zinc-500">
                Category: <span className="text-zinc-400">{selectedMenuItem.category || "Menu item"}</span>
              </div>
              {selectedMenuItem.meal_period && (
                <div className="mt-1 text-xs text-zinc-500">
                  Meal period: <span className="text-zinc-400">{selectedMenuItem.meal_period}</span>
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={() => setSelectedMenuItem(null)}
                  className="flex-1 rounded-xl border border-white/10 bg-zinc-800 text-zinc-200 py-2.5 text-sm font-medium hover:bg-zinc-700/80"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    addItem(selectedMenuItem);
                    setSelectedMenuItem(null);
                  }}
                  className="flex-1 rounded-xl bg-amber-500 text-black py-2.5 text-sm font-semibold hover:bg-amber-400"
                >
                  Add to cart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
