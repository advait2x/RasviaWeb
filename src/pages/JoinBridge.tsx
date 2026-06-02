// src/pages/JoinBridge.tsx
// Group Order Bridge - web (schema_version = 2).
// Four stages: Name entry → Browse & Add → Review & Split / Pay & Wait → Success.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, Copy, Crown, CreditCard, Lock, Minus, Plus, ShoppingCart, Smartphone,
  Trash2, Users, X, Search, AlertCircle, PartyPopper, Unlock, ChevronUp, ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { DASH_PRIMARY_CTA, DASH_PRIMARY_SELECTED } from "@/lib/dashboardUi";
import { supabase } from "@/lib/supabase";
import {
  fetchSnapshot, joinSession, completeJoinCredentials, addItem, updateItemQuantity, removeItem,
  setItemSplit, assignItemPayer, setPaymentMode, lockSession, unlockSession,
  startCheckout, cancelSession, leaveSession, CheckoutError, setHostInReview,
  formatCents, totalCartCents, paymentForMember, memberById,
  isSelfServeTableside, isSoloTableside, canProceedToCheckout, orderFlowTitle,
  type PartySnapshot, type PartyCreds, type PaymentMode, type PartyMember, type PartyItem,
} from "@/lib/party-session";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  savePartyCreds, loadPartyCreds, clearPartyCreds,
} from "@/lib/party-credentials";
import { subscribeToParty } from "@/lib/party-realtime";
import { PartyLedger, memberInitials } from "@/components/party/PartyLedger";

type MenuItemRow = {
  id: number;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string | null;
  is_vegetarian: boolean | null;
  is_available?: boolean | null;
  in_stock?: boolean | null;
};

type RestaurantInfo = {
  id: number;
  name: string;
  image_url: string | null;
};

const PAYMENT_MODES: { key: PaymentMode; title: string; subtitle: string }[] = [
  { key: "host_pays",   title: "Host covers everyone", subtitle: "You pay the whole bill." },
  { key: "equal_split", title: "Split evenly",         subtitle: "Everyone pays the same share." },
  { key: "per_person",  title: "Each pays their own",  subtitle: "You pay for the items you added." },
  { key: "assigned",    title: "Host decides",         subtitle: "You choose who pays for each item." },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function JoinBridge() {
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get("id") ?? "";
  const checkoutStatus = params.get("checkout_status") ?? "";
  const checkoutReason = params.get("reason") ?? "";

  const [snapshot, setSnapshot] = useState<PartySnapshot | null>(null);
  const [restaurant, setRestaurant] = useState<RestaurantInfo | null>(null);
  const [menu, setMenu] = useState<MenuItemRow[]>([]);
  const [creds, setCreds] = useState<PartyCreds | null>(null);
  const [credsLoaded, setCredsLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  // Optimistic payment-mode selection so the "Host decides / Each pays their
  // own" buttons feel instant. We clear this whenever the real server-side
  // value catches up.
  const [pendingMode, setPendingMode] = useState<PaymentMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"browse" | "review" | "pay" | "success">("browse");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [viewingMemberId, setViewingMemberId] = useState<string | null>(null);
  const [showAppOverlay, setShowAppOverlay] = useState(
    !(checkoutStatus === "success" || checkoutStatus === "cancel"),
  );
  const checkoutAckRef = useRef(false);
  /** Pending Add-button presses, keyed by menu_item_id. We bump these as soon
   *  as the user taps + and clear them when the party snapshot refreshes so
   *  the cart badge reflects the click instantly, even before the round-trip
   *  to Supabase completes. */
  const [pendingAdds, setPendingAdds] = useState<Record<number, number>>({});
  /**
   * Modal shown when `create-checkout` bails because the restaurant isn't
   * linked to Stripe yet. We surface a blocking dialog (rather than a toast)
   * so the message doesn't disappear off-screen while the user is deciding
   * what to do about it.
   */
  const [checkoutUnavailable, setCheckoutUnavailable] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const handleCheckoutError = (err: unknown, fallback: string) => {
    if (err instanceof CheckoutError && err.code === "restaurant_not_linked") {
      setCheckoutUnavailable({
        title: err.title || "Checkout unavailable",
        message: err.message,
      });
      return;
    }
    toast.error(err instanceof Error ? err.message : fallback);
  };

  const session = snapshot?.session ?? null;
  const members = snapshot?.members ?? [];
  const items = snapshot?.items ?? [];
  const payments = snapshot?.payments ?? [];
  const me = creds ? members.find((m) => m.id === creds.memberId) ?? null : null;
  const isHost = me?.role === "host";
  const myPayment = creds ? paymentForMember(payments, creds.memberId) : null;
  const selfServe = isSelfServeTableside(session);
  const soloTableside = isSoloTableside(session, members.length);
  const flowTitle = orderFlowTitle(session, restaurant?.name);
  const hostInReview = session?.host_in_review === true;
  const nonHostCartLocked = !isHost && hostInReview;

  const showCartLockToast = useCallback(() => {
    toast.info("Cart locked. Host is currently deciding how the bill should be paid.");
  }, []);

  // ── Boot: load creds, initial snapshot, restaurant + menu ──────────────
  useEffect(() => {
    if (!sessionId) {
      setError("Missing group order id.");
      setLoading(false);
      setCredsLoaded(true);
      return;
    }
    const saved = loadPartyCreds(sessionId);
    if (saved) setCreds(saved);
    setCredsLoaded(true);
  }, [sessionId]);

  // Pre-fill nameInput from the signed-in user's profile (first + last name
  // if both are set, else any available display_name / full_name metadata).
  // We deliberately do NOT fall back to a device-cached "last display name"
  // here, since that leaks whatever name the previous user of this browser
  // typed to the next person who joins a group order - when signed out the
  // field should start blank and make them type their own name.
  useEffect(() => {
    if (nameInput.trim().length > 0) return;
    let cancelled = false;
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (cancelled || !user) return;
        const meta: Record<string, unknown> = user.user_metadata ?? {};
        const metaFirst = typeof meta.first_name === "string" ? meta.first_name : "";
        const metaLast = typeof meta.last_name === "string" ? meta.last_name : "";
        let candidate = [metaFirst, metaLast].filter(Boolean).join(" ").trim();
        if (!candidate) {
          const metaFull = (
            (typeof meta.full_name === "string" ? meta.full_name : "") ||
            (typeof meta.name === "string" ? meta.name : "") ||
            (typeof meta.display_name === "string" ? meta.display_name : "")
          ).trim();
          candidate = metaFull;
        }
        if (!candidate) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("first_name, last_name, full_name, display_name")
            .eq("id", user.id)
            .maybeSingle();
          const p = (profile as {
            first_name?: string | null;
            last_name?: string | null;
            full_name?: string | null;
            display_name?: string | null;
          } | null) ?? null;
          if (p) {
            const first = (p.first_name ?? "").trim();
            const last = (p.last_name ?? "").trim();
            candidate = [first, last].filter(Boolean).join(" ")
              || (p.full_name ?? "").trim()
              || (p.display_name ?? "").trim();
          }
        }
        if (cancelled) return;
        if (candidate) setNameInput(candidate);
      } catch {
        /* ignore - stay blank */
      }
    })();
    return () => { cancelled = true; };
    // Run once on mount - pre-fill is a best-effort initial value; if the
    // user starts typing their own name we stop overriding.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const snap = await fetchSnapshot(supabase, sessionId);
      setSnapshot(snap);
      setPendingAdds({});
      setPendingMode(null);
      if (!restaurant || restaurant.id !== snap.session.restaurant_id) {
        const [{ data: rest }, { data: menuRows }] = await Promise.all([
          supabase.from("restaurants").select("id, name, image_url").eq("id", snap.session.restaurant_id).maybeSingle(),
          supabase
            .from("menu_items")
            .select("id, name, description, price, image_url, category, is_vegetarian, in_stock, is_available")
            .eq("restaurant_id", snap.session.restaurant_id)
            .order("category", { ascending: true })
            .order("name", { ascending: true }),
        ]);
        if (rest) setRestaurant(rest as RestaurantInfo);
        const available = (menuRows ?? []).filter(
          (r: MenuItemRow) => (r.is_available ?? true) && (r.in_stock ?? true),
        );
        setMenu(available as MenuItemRow[]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load group order.");
    } finally {
      setLoading(false);
    }
  }, [sessionId, restaurant]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Realtime
  useEffect(() => {
    if (!sessionId) return;
    const handle = subscribeToParty(
      supabase,
      sessionId,
      (snap) => {
        setSnapshot(snap);
        setPendingAdds({});
        setPendingMode(null);
      },
      (err) => console.warn("Party realtime error:", err.message),
    );
    return () => handle.unsubscribe();
  }, [sessionId]);

  // Auto-switch view by status
  useEffect(() => {
    if (!session) return;
    if (session.status === "submitted" || session.status === "completed") { setView("success"); return; }
    if (session.status === "cancelled") { setView("browse"); return; }
    if (session.status === "locked" || session.status === "paying") { setView("pay"); return; }
    setView((prev) => (prev === "review" ? "review" : "browse"));
  }, [session?.status]);

  useEffect(() => {
    if (!sessionId || !isHost) return;
    if (view !== "review" || session?.status !== "open") return;
    let cancelled = false;
    (async () => {
      try {
        await setHostInReview(supabase, sessionId, true);
      } catch (e) {
        if (!cancelled) console.warn("setHostInReview", e);
      }
    })();
    return () => {
      cancelled = true;
      void setHostInReview(supabase, sessionId, false).catch(() => {});
    };
  }, [sessionId, isHost, view, session?.status]);

  // Acknowledge Stripe redirect
  useEffect(() => {
    if (!checkoutStatus || checkoutAckRef.current) return;
    checkoutAckRef.current = true;
    if (checkoutStatus === "success") {
      toast.success("Payment received - hang tight!");
    } else if (checkoutStatus === "cancel") {
      toast("Payment cancelled.");
    } else if (checkoutStatus === "error") {
      toast.error(checkoutReason === "payment_mismatch" ? "Payment amount mismatch." : "We could not verify the payment.");
    }
    // Strip params
    try {
      const url = new URL(window.location.href);
      ["checkout_status", "reason", "order_id", "party_payment_id", "restaurant_name", "session_status", "return_url_base"].forEach((k) => url.searchParams.delete(k));
      window.history.replaceState({}, "", url.toString());
    } catch { /* ignore */ }
  }, [checkoutStatus, checkoutReason]);

  // ── Actions ────────────────────────────────────────────────────────────
  const handleJoin = async () => {
    const name = nameInput.trim();
    if (!name) {
      setJoinError("Enter your name to continue.");
      toast.error("Enter your name to continue.");
      return;
    }
    setJoinError(null);
    setJoining(true);
    try {
      const existing = loadPartyCreds(sessionId);
      const result = await joinSession(supabase, sessionId, name);
      const next = await completeJoinCredentials(supabase, sessionId, result, existing);
      setCreds(next);
      savePartyCreds(next);
      await loadAll();
    } catch (err) {
      // Surface the error in-page too - a Sonner toast in the bottom-right
      // is easy to miss on mobile when the virtual keyboard is up.
      const message = err instanceof Error ? err.message : "Unable to join.";
      console.error("party join failed", err);
      setJoinError(message);
      toast.error(message);
    } finally {
      setJoining(false);
    }
  };

  const wrapMutation = async (fn: () => Promise<void>, errMsg = "Action failed") => {
    try { await fn(); } catch (err) { toast.error(err instanceof Error ? err.message : errMsg); }
  };

  const handleAddItem = (menuItemId: number) => {
    if (nonHostCartLocked) {
      showCartLockToast();
      return;
    }
    // Optimistically bump the badge so the UI responds instantly - Supabase's
    // RPC round-trip can take a few hundred ms which feels laggy otherwise.
    setPendingAdds((prev) => ({ ...prev, [menuItemId]: (prev[menuItemId] ?? 0) + 1 }));
    return wrapMutation(
      async () => {
        try {
          await addItem(supabase, creds!, menuItemId, 1);
        } catch (err) {
          // Roll back the optimistic bump if the server rejected it.
          setPendingAdds((prev) => {
            const next = { ...prev };
            const current = next[menuItemId] ?? 0;
            if (current <= 1) delete next[menuItemId]; else next[menuItemId] = current - 1;
            return next;
          });
          throw err;
        }
      },
      "Could not add item",
    );
  };
  const handleChangeQty = (item: PartyItem, delta: number) => {
    if (nonHostCartLocked) {
      showCartLockToast();
      return;
    }
    return wrapMutation(
      () => updateItemQuantity(supabase, creds!, item.id, Math.max(0, item.quantity + delta)),
      "Could not update item",
    );
  };
  const handleRemoveItem = (item: PartyItem) =>
    wrapMutation(() => removeItem(supabase, creds!, item.id), "Could not remove item");
  const handleSetMode = async (mode: PaymentMode) => {
    // Flip the selection instantly so the buttons feel responsive; roll back
    // if the RPC rejects. The realtime snapshot will clear `pendingMode` when
    // the server-side value catches up.
    setPendingMode(mode);
    try {
      await setPaymentMode(supabase, creds!, mode);
    } catch (err) {
      setPendingMode(null);
      toast.error(err instanceof Error ? err.message : "Could not change payment mode");
    }
  };
  const handleAssignPayer = (itemId: string, payerId: string) =>
    wrapMutation(() => assignItemPayer(supabase, creds!, itemId, payerId), "Could not assign payer");
  const handleSetSplit = (itemId: string, memberIds: string[]) =>
    wrapMutation(() => setItemSplit(supabase, creds!, itemId, memberIds), "Could not set split");

  const handleLock = async () => {
    if (items.length === 0) { toast.error("Add at least one item before checkout."); return; }
    setBusy(true);
    try { await lockSession(supabase, creds!); toast.success("Cart locked - collecting payments."); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not lock cart"); }
    finally { setBusy(false); }
  };
  const handleUnlock = async () => {
    setBusy(true);
    try { await unlockSession(supabase, creds!); }
    catch (err) { toast.error(err instanceof Error ? err.message : "Could not unlock"); }
    finally { setBusy(false); }
  };

  const handlePayMyShare = async () => {
    if (!myPayment || myPayment.amount_cents <= 0) return;
    setBusy(true);
    try {
      const { url } = await startCheckout(supabase, creds!, {
        returnUrlBase: window.location.origin + "/join?id=" + sessionId,
      });
      window.location.href = url;
    } catch (err) {
      handleCheckoutError(err, "Checkout failed");
      setBusy(false);
    }
  };

  const handleCoverMember = async (memberId: string) => {
    const target = members.find((m) => m.id === memberId);
    if (!target) return;
    if (!window.confirm(`Pay for ${target.display_name}? You'll be charged their share.`)) return;
    setBusy(true);
    try {
      const { url } = await startCheckout(supabase, creds!, {
        coverMemberId: memberId,
        returnUrlBase: window.location.origin + "/join?id=" + sessionId,
      });
      window.location.href = url;
    } catch (err) {
      handleCheckoutError(err, "Checkout failed");
      setBusy(false);
    }
  };

  const handleCancelSession = async () => {
    setBusy(true);
    try {
      const result = await cancelSession(supabase, creds!);
      toast.success(`Cancelled - ${result.refunded} payment${result.refunded === 1 ? "" : "s"} refunded.`);
      clearPartyCreds(sessionId);
      window.location.href = "/";
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed");
    } finally { setBusy(false); setCancelOpen(false); }
  };

  const handleLeave = async () => {
    if (!creds) return;
    if (!window.confirm("Leave this group order?")) return;
    try { await leaveSession(supabase, creds); } catch { /* ignore */ }
    clearPartyCreds(sessionId);
    window.location.href = "/";
  };

  const [linkCopied, setLinkCopied] = useState(false);
  const handleCopyLink = async () => {
    const url = `${window.location.origin}/join?id=${sessionId}`;
    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
    catch { toast.error("Could not copy link."); }
  };

  // ── Early returns ──────────────────────────────────────────────────────
  if (!sessionId) return <FullScreenMessage title="Missing id" body="This link is invalid." />;
  // Wait for BOTH the initial snapshot load AND the saved-creds read before
  // deciding whether to show the name-entry screen. Avoids a brief flicker of
  // the name prompt for returning users whose creds load a tick later.
  if (loading || !credsLoaded) return <LoadingScreen />;
  if (error) return <FullScreenMessage title={selfServe ? "Can't open table order" : "Can't open group order"} body={error} />;
  if (!session) return <FullScreenMessage title="Not found" body={selfServe ? "This table order no longer exists." : "This group order no longer exists."} />;

  // Cancelled session kicks everyone out, regardless of whether they'd joined.
  if (session.status === "cancelled") {
    return (
      <CancelledScreen
        restaurantName={restaurant?.name ?? null}
        onHome={() => { clearPartyCreds(sessionId); window.location.href = "/"; }}
      />
    );
  }

  // App interstitial (only before joining & before any checkout return)
  if (showAppOverlay && !creds && !checkoutStatus) {
    return <OpenInAppOverlay restaurantName={restaurant?.name ?? "this restaurant"} sessionId={sessionId} isTableside={selfServe} onContinueWeb={() => setShowAppOverlay(false)} />;
  }

  // Name entry
  if (!creds || !me) {
    return (
      <NameEntryScreen
        restaurantName={restaurant?.name ?? "this restaurant"}
        tableLabel={session.table_label}
        isTableside={selfServe}
        nameInput={nameInput}
        setNameInput={setNameInput}
        joining={joining}
        joinError={joinError}
        onJoin={handleJoin}
      />
    );
  }

  // Success
  if (view === "success" && (session.status === "submitted" || session.status === "completed")) {
    return (
      <SuccessScreen
        snapshot={snapshot!}
        restaurant={restaurant}
        creds={creds}
        onDone={() => { clearPartyCreds(sessionId); window.location.href = "/"; }}
      />
    );
  }

  // Pay & Wait
  if (view === "pay" && (session.status === "locked" || session.status === "paying")) {
    return (
      <Layout restaurantName={flowTitle} subtitle={soloTableside ? "Ready to pay" : "Collecting payments"} onBack={() => window.history.back()}>
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-6">
          <SummaryCard total={session.total_cents} itemCount={items.length} memberCount={members.length} subtitle="Cart locked" locked isTableside={selfServe} />
          {myPayment && myPayment.amount_cents > 0 && myPayment.status !== "paid" && myPayment.status !== "covered" ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5 p-5 shadow-lg"
            >
              <div className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Your share</div>
              <div className="mt-1 text-3xl font-black text-amber-400">{formatCents(myPayment.amount_cents)}</div>
              <button
                type="button" disabled={busy} onClick={handlePayMyShare}
                className={cn(
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-bold transition",
                  DASH_PRIMARY_CTA,
                  busy && "opacity-60",
                )}
              >
                <CreditCard className="h-5 w-5" /> {busy ? "Opening…" : "Pay now"}
              </button>
            </motion.div>
          ) : myPayment && (myPayment.status === "paid" || myPayment.status === "covered") ? (
            <div className="rounded-2xl border border-green-500/35 bg-green-500/10 p-5">
              <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
                <Check className="h-5 w-5" strokeWidth={3} /> Your share is paid
              </div>
            </div>
          ) : null}

          <PartyLedger
            members={members}
            payments={payments}
            selfMemberId={creds.memberId}
            isHost={isHost}
            onCoverMember={handleCoverMember}
            onRetry={handlePayMyShare}
            onMemberTap={(id) => setViewingMemberId(id)}
          />

          {isHost ? (
            <div className="flex flex-col gap-2 pt-2">
              {session.status === "locked" && !payments.some((p) => p.status === "paid" || p.status === "covered") ? (
                <button type="button" disabled={busy} onClick={handleUnlock} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">
                  <Unlock className="h-4 w-4" /> Back to editing
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => setCancelOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20">
                <X className="h-4 w-4" /> {selfServe ? "Cancel order" : "Cancel group order"}
              </button>
            </div>
          ) : null}
        </div>

        <CancelDialog open={cancelOpen} busy={busy} isTableside={selfServe} onClose={() => setCancelOpen(false)} onConfirm={handleCancelSession} />
        <MemberItemsModal
          memberId={viewingMemberId}
          members={members}
          items={items}
          selfMemberId={creds.memberId}
          onClose={() => setViewingMemberId(null)}
        />
        <CheckoutUnavailableDialog
          open={!!checkoutUnavailable}
          title={checkoutUnavailable?.title ?? "Checkout unavailable"}
          message={checkoutUnavailable?.message ?? ""}
          onClose={() => setCheckoutUnavailable(null)}
        />
      </Layout>
    );
  }

  // Review & Split (host only overlay on open)
  if (view === "review" && session.status === "open") {
    const serverMode = (session.payment_mode === "split" ? "per_person" : session.payment_mode === "assign" ? "assigned" : session.payment_mode) as PaymentMode;
    const mode = pendingMode ?? serverMode;
    return (
      <Layout restaurantName="Review" subtitle={restaurant?.name ?? undefined} onBack={() => setView("browse")}>
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-6">
          <SummaryCard total={totalCartCents(items)} itemCount={items.length} memberCount={members.length} subtitle="Ready to checkout" isTableside={selfServe} />
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">How should the bill be paid?</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAYMENT_MODES.map((m) => (
                <motion.button
                  key={m.key} type="button" onClick={() => handleSetMode(m.key)}
                  whileTap={{ scale: 0.98 }}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                    mode === m.key
                      ? "border-amber-800/60 bg-amber-800/10 dark:border-amber-500/50 dark:bg-amber-500/10"
                      : "border-white/10 bg-zinc-900 hover:border-white/20",
                  )}
                >
                  <div className="flex-1">
                    <div className={cn("text-sm font-bold", mode === m.key ? "text-amber-400" : "text-zinc-100")}>{m.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{m.subtitle}</div>
                  </div>
                  {mode === m.key ? <Check className="h-5 w-5 text-amber-400" strokeWidth={3} /> : null}
                </motion.button>
              ))}
            </div>
          </section>

          {mode === "assigned" ? (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Choose a payer for each item</h3>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <AssignRow key={it.id} item={it} members={members} onAssign={(pid) => handleAssignPayer(it.id, pid)} />
                ))}
              </div>
            </section>
          ) : null}

          {mode === "per_person" ? (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Fine-tune who pays for what</h3>
              <p className="mt-1 text-xs text-zinc-500">By default each person pays for the items they added. Tap names below to share an item between multiple people.</p>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <SplitRow key={it.id} item={it} members={members} onSetSplit={(ids) => handleSetSplit(it.id, ids)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950 px-4 pt-3 pb-[max(env(safe-area-inset-bottom),16px)]">
          <div className="mx-auto flex max-w-2xl gap-3">
            <button type="button" onClick={() => setView("browse")} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Back</button>
            <button
              type="button" disabled={busy} onClick={handleLock}
              className={cn(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold",
                DASH_PRIMARY_CTA,
                busy && "opacity-60",
              )}
            >
              <Lock className="h-4 w-4" /> {busy ? "Locking…" : "Lock cart & start collecting"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Tableside (staff-managed) - guests can't add items, the waiter takes the
  // order on their dashboard. Show a compact "hang tight" view with the
  // table roster and whatever is already on the guest's check.
  if (session.staff_managed && !isHost) {
    const myItems = items.filter((it) => it.added_by_member_id === creds.memberId);
    const mySubtotal = myItems.reduce(
      (sum, it) => sum + Math.round(Number(it.menu_item?.price ?? 0) * 100) * Math.max(1, it.quantity),
      0,
    );
    return (
      <Layout
        restaurantName={restaurant?.name ?? "Tableside"}
        subtitle={`${members.length} at the table · waiter is taking the order`}
        onBack={() => window.history.back()}
      >
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-6">
          <div className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-300">
              <PartyPopper className="h-4 w-4" />
              You're on the table
            </div>
            <p className="mt-1 text-sm text-zinc-300">
              Just tell your server what you'd like - they'll add it to your check from their tablet.
              When the waiter locks the cart, your "Pay my share" button will appear here.
            </p>
          </div>

          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">At the table</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {members.map((m, idx) => (
                <MemberChip
                  key={m.id}
                  member={m}
                  index={idx}
                  isSelf={m.id === creds.memberId}
                  itemCount={items.filter((it) => it.added_by_member_id === m.id).reduce((s, it) => s + (it.quantity ?? 1), 0)}
                  onClick={() => setViewingMemberId(m.id)}
                />
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-baseline justify-between">
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Your items</h3>
              <span className="text-sm font-semibold text-zinc-300">{formatCents(mySubtotal)}</span>
            </div>
            {myItems.length === 0 ? (
              <p className="mt-2 rounded-xl border border-dashed border-white/10 bg-zinc-900/40 px-3 py-4 text-center text-xs text-zinc-500">
                Nothing on your check yet - flag down your server and they'll add it here.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {myItems.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-center gap-3 rounded-xl border border-white/5 bg-zinc-900/70 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-zinc-100">
                        {it.menu_item?.name ?? "Item"}
                        {it.quantity > 1 ? <span className="text-zinc-500"> ×{it.quantity}</span> : null}
                      </div>
                      {it.special_requests ? (
                        <div className="truncate text-[11px] italic text-zinc-500">
                          "{it.special_requests}"
                        </div>
                      ) : null}
                    </div>
                    <span className="whitespace-nowrap font-mono text-sm text-zinc-300">
                      {formatCents(Math.round(Number(it.menu_item?.price ?? 0) * 100) * Math.max(1, it.quantity))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <MemberItemsModal
          memberId={viewingMemberId}
          members={members}
          items={items}
          selfMemberId={creds.memberId}
          onClose={() => setViewingMemberId(null)}
        />
      </Layout>
    );
  }

  // Default: Browse & Add
  const browseSubtitle = selfServe
    ? (soloTableside
      ? "Order from your table · friends can scan the same QR to join"
      : `${members.length} at the table · ${items.length} item${items.length === 1 ? "" : "s"}`)
    : `${members.length} member${members.length === 1 ? "" : "s"} · ${items.length} item${items.length === 1 ? "" : "s"}`;

  return (
    <Layout
      restaurantName={flowTitle}
      subtitle={browseSubtitle}
      onBack={() => window.history.back()}
      rightAction={
        !soloTableside ? (
        <button type="button" onClick={handleCopyLink} className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${linkCopied ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:bg-zinc-800"}`}>
          {linkCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {linkCopied ? "Copied!" : selfServe ? "Invite" : "Share"}
        </button>
        ) : null
      }
    >
      <div className="mx-auto max-w-3xl px-4 pb-64">
        <div className="flex items-center gap-2 overflow-x-auto py-3">
          {members.map((m, idx) => {
            const count = items
              .filter((it) => it.added_by_member_id === m.id)
              .reduce((sum, it) => sum + (it.quantity ?? 1), 0);
            return (
              <MemberChip
                key={m.id}
                member={m}
                index={idx}
                isSelf={m.id === creds.memberId}
                itemCount={count}
                onClick={() => setViewingMemberId(m.id)}
              />
            );
          })}
        </div>

        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu" className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
        </div>

        <CategoryChips menu={menu} active={category} onChange={setCategory} />

        <MenuList
          items={items}
          menu={menu}
          search={search}
          category={category}
          pendingAdds={pendingAdds}
          onAdd={handleAddItem}
          cartLocked={nonHostCartLocked}
          onCartLocked={showCartLockToast}
        />
      </div>

      <CartStrip
        items={items}
        menu={menu}
        pendingAdds={pendingAdds}
        members={members}
        selfMemberId={creds.memberId}
        isHost={isHost}
        hostDeciding={hostInReview}
        guestCartLocked={nonHostCartLocked}
        isTableside={selfServe}
        soloTableside={soloTableside}
        canCheckout={canProceedToCheckout(session, members.length)}
        onChangeQty={handleChangeQty}
        onRemove={handleRemoveItem}
        onReview={() => {
          if (soloTableside) void handleLock();
          else setView("review");
        }}
        onLeave={handleLeave}
      />
      <MemberItemsModal
        memberId={viewingMemberId}
        members={members}
        items={items}
        selfMemberId={creds.memberId}
        onClose={() => setViewingMemberId(null)}
      />
    </Layout>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Presentational components
// ─────────────────────────────────────────────────────────────────────────────

function Layout({
  children, restaurantName, subtitle, onBack, rightAction,
}: { children: React.ReactNode; restaurantName: string; subtitle?: string; onBack?: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          {onBack ? (
            <button type="button" onClick={onBack} className="rounded-lg p-2 text-zinc-300 hover:bg-white/5">
              <ArrowLeft className="h-5 w-5" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{restaurantName}</div>
            {subtitle ? <div className="truncate text-xs text-zinc-500">{subtitle}</div> : null}
          </div>
          {rightAction}
        </div>
      </header>
      {children}
    </div>
  );
}

function SummaryCard({ total, itemCount, memberCount, subtitle, locked, isTableside }: { total: number; itemCount: number; memberCount: number; subtitle?: string; locked?: boolean; isTableside?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">{isTableside ? "Order total" : "Group total"}</div>
          <div className="mt-1 text-3xl font-black">{formatCents(total)}</div>
        </div>
        <div className="text-right text-xs text-zinc-500 font-semibold">
          <div>{memberCount} {memberCount === 1 ? "member" : "members"}</div>
          <div>{itemCount} {itemCount === 1 ? "item" : "items"}</div>
        </div>
      </div>
      {subtitle ? (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-zinc-500">
          {locked ? <Lock className="h-3 w-3" /> : null}
          {subtitle}
        </div>
      ) : null}
    </div>
  );
}

function MemberChip({
  member, index, isSelf, itemCount = 0, onClick,
}: { member: PartyMember; index: number; isSelf: boolean; itemCount?: number; onClick?: () => void }) {
  const colors = ["bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-yellow-500", "bg-cyan-500", "bg-red-500"];
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition hover:brightness-110",
        isSelf ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 bg-zinc-900 text-zinc-200 hover:bg-zinc-800",
      )}
    >
      <span className={cn(
        "relative flex h-6 w-6 items-center justify-center overflow-hidden rounded-full text-[10px] font-bold text-zinc-900",
        member.avatar_url ? "bg-zinc-800" : colors[index % colors.length],
      )}>
        {member.avatar_url ? (
          <img
            src={member.avatar_url}
            alt={member.display_name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          memberInitials(member.display_name)
        )}
        {member.role === "host" ? <Crown className="absolute -right-1 -top-1 h-3 w-3 text-amber-300" strokeWidth={3} /> : null}
      </span>
      <span className="max-w-[120px] truncate">
        {isSelf ? `${member.display_name} · You` : member.display_name}
      </span>
      {itemCount > 0 ? (
        <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-400">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}

function CategoryChips({ menu, active, onChange }: { menu: MenuItemRow[]; active: string | null; onChange: (v: string | null) => void }) {
  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category).filter(Boolean))) as string[], [menu]);
  if (categories.length === 0) return null;
  return (
    <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
      <CategoryPill label="All" active={!active} onClick={() => onChange(null)} />
      {categories.map((c) => (
        <CategoryPill key={c} label={c} active={active === c} onClick={() => onChange(c === active ? null : c)} />
      ))}
    </div>
  );
}

function CategoryPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button" onClick={onClick}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold leading-none transition",
        active ? DASH_PRIMARY_SELECTED : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
      )}
    >
      {label}
    </button>
  );
}

function MenuList({ items, menu, search, category, pendingAdds, onAdd, cartLocked, onCartLocked }: {
  items: PartyItem[]; menu: MenuItemRow[]; search: string; category: string | null; pendingAdds: Record<number, number>;
  onAdd: (id: number) => void; cartLocked: boolean; onCartLocked: () => void;
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return menu.filter((m) => {
      if (category && m.category !== category) return false;
      if (!q) return true;
      return m.name.toLowerCase().includes(q) || (m.description ?? "").toLowerCase().includes(q);
    });
  }, [menu, search, category]);
  return (
    <ul className="mt-4 space-y-2">
      {filtered.map((m) => (
        <MenuRow
          key={m.id}
          item={m}
          inCartCount={cartCountFor(items, m.id) + (pendingAdds[m.id] ?? 0)}
          onAdd={() => (cartLocked ? onCartLocked() : onAdd(m.id))}
          cartLocked={cartLocked}
        />
      ))}
      {filtered.length === 0 ? (
        <li className="flex flex-col items-center gap-2 py-14 text-center text-sm text-zinc-500">
          <Search className="h-6 w-6 text-zinc-700" />
          <span>Nothing matches that filter.</span>
          <span className="text-[11px] text-zinc-600">Try clearing the search or category.</span>
        </li>
      ) : null}
    </ul>
  );
}

function MenuRow({ item, inCartCount, onAdd, cartLocked }: { item: MenuItemRow; inCartCount: number; onAdd: () => void; cartLocked: boolean }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={cn(
        "flex items-center gap-3 rounded-2xl border border-white/5 p-3",
        cartLocked ? "cursor-not-allowed bg-zinc-950/80 opacity-50" : "bg-zinc-900/70",
      )}
    >
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-600">-</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{item.name}</div>
        {item.description ? <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.description}</div> : null}
        <div className="mt-1 text-sm font-bold text-amber-400">${Number(item.price).toFixed(2)}</div>
      </div>
      {/* Tap feedback: instant scale on press + bumping badge on count change
          so the button feels as snappy as the native mobile button. */}
      <motion.button
        type="button" onClick={onAdd} disabled={cartLocked}
        whileTap={cartLocked ? undefined : { scale: 0.85 }}
        transition={{ type: "spring", stiffness: 500, damping: 25 }}
        className={cn(
          "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full shadow-lg transition-colors",
          cartLocked ? "cursor-not-allowed bg-zinc-700" : DASH_PRIMARY_CTA,
        )}
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        <AnimatePresence>
          {inCartCount > 0 ? (
            <motion.span
              key={inCartCount}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className="absolute -right-1 -top-1 rounded-full border-2 border-zinc-900 bg-zinc-950 px-1.5 text-[10px] font-bold text-amber-400"
            >
              {inCartCount}
            </motion.span>
          ) : null}
        </AnimatePresence>
      </motion.button>
    </motion.li>
  );
}

function CartStrip(props: {
  items: PartyItem[]; menu: MenuItemRow[]; pendingAdds: Record<number, number>;
  members: PartyMember[]; selfMemberId: string; isHost: boolean;
  hostDeciding?: boolean; guestCartLocked?: boolean;
  isTableside?: boolean; soloTableside?: boolean; canCheckout?: boolean;
  onChangeQty: (item: PartyItem, delta: number) => void;
  onRemove: (item: PartyItem) => void;
  onReview: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState(false);
  // Optimistic overlay: count pending adds toward the strip totals so the
  // bottom bar feels as instant as the + button badge above it.
  const pendingCount = Object.values(props.pendingAdds).reduce((a, b) => a + b, 0);
  const pendingCents = Object.entries(props.pendingAdds).reduce((acc, [id, qty]) => {
    const menuItem = props.menu.find((m) => m.id === Number(id));
    if (!menuItem) return acc;
    return acc + Math.round(Number(menuItem.price) * 100) * qty;
  }, 0);
  const displayCount = props.items.length + pendingCount;
  const total = totalCartCents(props.items) + pendingCents;
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        >
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-bold">{displayCount} item{displayCount === 1 ? "" : "s"}</span>
          <span className="ml-auto text-sm font-black text-amber-400">{formatCents(total)}</span>
          <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-white/5 text-zinc-400">
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
          </span>
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <ul className="max-h-[40vh] overflow-y-auto px-4 pb-2">
                {props.items.length === 0 ? (
                  <li className="py-6 text-center text-sm text-zinc-500">No items yet - add something from the menu.</li>
                ) : (
                  props.items.map((it) => {
                    const canEdit = (it.added_by_member_id === props.selfMemberId || props.isHost) && !props.guestCartLocked;
                    const owner = memberById(props.members, it.added_by_member_id);
                    return (
                      <li key={it.id} className="flex items-center gap-2 border-b border-white/5 py-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold">{it.menu_item?.name ?? "Item"}</div>
                          <div className="text-[11px] text-zinc-500">added by <span className="text-zinc-300">{owner?.display_name ?? it.added_by_name ?? "Guest"}</span></div>
                        </div>
                        {canEdit ? (
                          <div className="flex items-center gap-1">
                            <button onClick={() => props.onChangeQty(it, -1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700"><Minus className="h-3 w-3" /></button>
                            <span className="w-5 text-center text-sm font-bold">{it.quantity}</span>
                            <button onClick={() => props.onChangeQty(it, 1)} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700"><Plus className="h-3 w-3" /></button>
                            <button onClick={() => props.onRemove(it)} className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-red-400 hover:bg-red-500/20"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">x{it.quantity}</span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            </motion.div>
          ) : null}
        </AnimatePresence>
        <div className="flex gap-2 px-4 pb-3">
          <button type="button" onClick={props.onLeave} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Leave</button>
          {props.isHost ? (() => {
            const canCheckout = props.canCheckout ?? false;
            const noItems = props.items.length === 0;
            const disabled = !canCheckout || noItems;
            const label = !canCheckout
              ? "Waiting for guests to join…"
              : props.soloTableside
                ? "Checkout"
                : "Review & checkout";
            return (
              <button
                type="button" disabled={disabled} onClick={props.onReview}
                className={cn(
                  "flex-1 rounded-xl px-4 py-2.5 text-sm font-bold",
                  DASH_PRIMARY_CTA,
                  disabled && "cursor-not-allowed opacity-50",
                )}
                title={!canCheckout ? "Share the link so others can join before checking out." : undefined}
              >
                {label}
              </button>
            );
          })() : (
            <div className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-3 py-2.5 text-center text-sm font-semibold text-zinc-500">
              {props.hostDeciding ? "Host is deciding how to pay..." : "Waiting on host…"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignRow({ item, members, onAssign }: { item: PartyItem; members: PartyMember[]; onAssign: (pid: string) => void }) {
  const serverCurrentId = (memberById(members, item.assigned_payer_id) ?? memberById(members, item.added_by_member_id))?.id ?? null;
  // Optimistic selection so the chip highlights instantly on tap. Cleared
  // when the incoming prop snapshot matches the pending value.
  const [pendingId, setPendingId] = useState<string | null>(null);
  useEffect(() => {
    if (pendingId && pendingId === serverCurrentId) setPendingId(null);
  }, [pendingId, serverCurrentId]);
  const currentId = pendingId ?? serverCurrentId;
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-3">
      <div className="truncate text-sm font-semibold">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.menu_item?.name ?? "Item"}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {members.map((m) => (
          <motion.button
            key={m.id} type="button"
            whileTap={{ scale: 0.93 }}
            onClick={() => { setPendingId(m.id); onAssign(m.id); }}
            className={cn(
              "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition",
              currentId === m.id ? DASH_PRIMARY_SELECTED : "border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
            )}
          >
            {m.display_name.split(" ")[0]}
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function SplitRow({ item, members, onSetSplit }: { item: PartyItem; members: PartyMember[]; onSetSplit: (ids: string[]) => void }) {
  const serverIds = useMemo(() => item.split_member_ids ?? [], [item.split_member_ids]);
  // Optimistic overlay: show the typed selection immediately and clear once
  // the server snapshot mirrors it.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  useEffect(() => {
    if (!pendingIds) return;
    const a = [...pendingIds].sort().join(",");
    const b = [...serverIds].sort().join(",");
    if (a === b) setPendingIds(null);
  }, [pendingIds, serverIds]);
  const currentIds = pendingIds ?? serverIds;
  const toggle = (id: string) => {
    const set = new Set(currentIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    const next = Array.from(set);
    setPendingIds(next);
    onSetSplit(next);
  };
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-3">
      <div className="truncate text-sm font-semibold">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.menu_item?.name ?? "Item"}</div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {members.map((m) => {
          const active = currentIds.includes(m.id);
          return (
            <motion.button
              key={m.id} type="button"
              whileTap={{ scale: 0.93 }}
              onClick={() => toggle(m.id)}
              className={cn(
                "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold leading-none transition",
                active ? DASH_PRIMARY_SELECTED : "border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
              )}
            >
              {m.display_name.split(" ")[0]}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

function CheckoutUnavailableDialog({
  open, title, message, onClose,
}: { open: boolean; title: string; message: string; onClose: () => void }) {
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-400" />
            <DialogTitle className="text-zinc-100">{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm leading-relaxed text-zinc-300">
            {message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button
            type="button"
            onClick={onClose}
            className={cn("inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-bold", DASH_PRIMARY_CTA)}
          >
            Got it
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CancelDialog({ open, busy, isTableside, onClose, onConfirm }: { open: boolean; busy: boolean; isTableside?: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 pb-[max(env(safe-area-inset-bottom),16px)] sm:items-center">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold">{isTableside ? "Cancel order?" : "Cancel group order?"}</h3>
        <p className="mt-2 text-sm text-zinc-400">Any paid shares will be refunded via Stripe. This can't be undone.</p>
        <div className="mt-5 flex flex-col gap-3">
          <button type="button" disabled={busy} onClick={onConfirm} className="w-full rounded-xl bg-red-500 px-4 py-3 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-60">
            {busy ? "Cancelling…" : "Cancel & refund"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="mx-auto rounded-lg border border-white/10 bg-zinc-800 px-5 py-2 text-xs font-extrabold text-zinc-200 hover:bg-zinc-700"
          >
            Never mind
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function MemberItemsModal({
  memberId, members, items, selfMemberId, onClose,
}: {
  memberId: string | null;
  members: PartyMember[];
  items: PartyItem[];
  selfMemberId: string;
  onClose: () => void;
}) {
  const member = memberId ? members.find((m) => m.id === memberId) ?? null : null;
  const memberIdx = memberId ? Math.max(0, members.findIndex((m) => m.id === memberId)) : 0;
  const colors = ["bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-yellow-500", "bg-cyan-500", "bg-red-500"];
  const theirItems = memberId ? items.filter((it) => it.added_by_member_id === memberId) : [];
  const isSelf = memberId === selfMemberId;
  const totalCents = theirItems.reduce((sum, it) => {
    const price = Math.round(Number((it.menu_item?.price ?? 0)) * 100);
    return sum + price * (it.quantity ?? 1);
  }, 0);
  const itemCount = theirItems.reduce((sum, it) => sum + (it.quantity ?? 1), 0);

  return (
    <AnimatePresence>
      {member ? (
        <motion.div
          key="member-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 30 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-t-3xl border border-white/10 bg-zinc-900 p-6 shadow-2xl sm:rounded-2xl"
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={cn(
                  "flex h-11 w-11 items-center justify-center overflow-hidden rounded-full text-sm font-bold text-zinc-900",
                  member.avatar_url ? "bg-zinc-800" : colors[memberIdx % colors.length],
                )}>
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.display_name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    memberInitials(member.display_name)
                  )}
                </div>
                {member.role === "host" ? (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-zinc-900 bg-amber-500">
                    <Crown className="h-2.5 w-2.5 text-white" strokeWidth={3} />
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-base font-bold text-zinc-100">
                  {isSelf ? `${member.display_name} · You` : member.display_name}
                </div>
                <div className="text-xs text-zinc-500">
                  {itemCount === 0 ? "No items yet" : `${itemCount} ${itemCount === 1 ? "item" : "items"} · ${formatCents(totalCents)}`}
                </div>
              </div>
              <button type="button" onClick={onClose} className="rounded-full bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              {theirItems.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-zinc-500">
                  <ShoppingCart className="h-6 w-6 text-zinc-700" />
                  <span>{isSelf ? "You haven't added anything yet." : `${member.display_name.split(" ")[0]} hasn't added anything yet.`}</span>
                </div>
              ) : (
                <ul className="divide-y divide-white/5">
                  {theirItems.map((it) => {
                    const priceCents = Math.round(Number(it.menu_item?.price ?? 0) * 100);
                    return (
                      <li key={it.id} className="flex items-start gap-3 py-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-zinc-100">
                            {it.quantity > 1 ? `${it.quantity}× ` : ""}{it.menu_item?.name ?? "Item"}
                          </div>
                          {it.special_requests ? (
                            <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{it.special_requests}</div>
                          ) : null}
                        </div>
                        <div className="text-sm font-bold text-amber-400">{formatCents(priceCents * (it.quantity ?? 1))}</div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function NameEntryScreen({
  restaurantName, tableLabel, isTableside, nameInput, setNameInput, joining, joinError, onJoin,
}: {
  restaurantName: string;
  tableLabel?: string | null;
  isTableside?: boolean;
  nameInput: string;
  setNameInput: (v: string) => void;
  joining: boolean;
  joinError?: string | null;
  onJoin: () => void;
}) {
  const hasPrefill = nameInput.trim().length > 0;
  const table = tableLabel?.trim();
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-amber-400">
          <Users className="h-3.5 w-3.5" />
          <span className="text-[11px] font-bold uppercase tracking-wider">{isTableside ? "Table order" : "Group order"}</span>
        </div>
        <h1 className="mt-3 text-2xl font-black text-zinc-100">
          {isTableside && table ? `Order at ${table}` : `Join at ${restaurantName}`}
        </h1>
        <p className="mt-2 text-sm text-zinc-400">
          {isTableside
            ? "Enter your name so the kitchen knows who ordered. Friends at your table can scan the same QR to join later."
            : "Your name shows up on the order so everyone knows who added what."}
        </p>
        <input
          autoFocus={!hasPrefill}
          value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          onBlur={(e) => setNameInput(e.target.value.trim())}
          onFocus={(e) => { if (hasPrefill) e.currentTarget.select(); }}
          placeholder="Your name"
          onKeyDown={(e) => { if (e.key === "Enter" && !joining) onJoin(); }}
          className="mt-5 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
          maxLength={60}
        />
        {/* Inline error - the Sonner toast can be easy to miss, especially on
            mobile with the keyboard up, so show it right under the button. */}
        {joinError && (
          <div className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300">
            {joinError}
          </div>
        )}
        <button
          type="button" disabled={joining} onClick={onJoin}
          className={cn("mt-4 w-full rounded-xl px-5 py-3 text-base font-bold transition", DASH_PRIMARY_CTA, joining && "opacity-60")}
        >
          {joining ? "Joining…" : hasPrefill ? `Continue as ${nameInput.trim()}` : "Join"}
        </button>
      </motion.div>
    </div>
  );
}

function OpenInAppOverlay({ restaurantName, sessionId, isTableside, onContinueWeb }: { restaurantName: string; sessionId: string; isTableside?: boolean; onContinueWeb: () => void }) {
  const deepLink = `rasvia://join/${sessionId}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <Smartphone className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="mt-4 text-xl font-black">Open in the Rasvia app?</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {isTableside
            ? `Order from your table at ${restaurantName}. The full experience is on mobile.`
            : `You're joining a group order at ${restaurantName}. The full experience is on mobile.`}
        </p>
        <a href={deepLink} className={cn("mt-5 inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-bold", DASH_PRIMARY_CTA)}>Open app</a>
        <button type="button" onClick={onContinueWeb} className="mt-2 w-full rounded-xl border border-white/10 bg-zinc-950 px-5 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Continue in browser</button>
      </motion.div>
    </div>
  );
}

function SuccessScreen({ snapshot, restaurant, creds, onDone }: { snapshot: PartySnapshot; restaurant: RestaurantInfo | null; creds: PartyCreds; onDone: () => void }) {
  const me = snapshot.members.find((m) => m.id === creds.memberId);
  const myPayment = paymentForMember(snapshot.payments, creds.memberId);
  return (
    <Layout restaurantName="All paid up!">
      <div className="relative mx-auto max-w-2xl px-4 pb-24 pt-6 text-center">
        <ConfettiBurst />
        <motion.div
          initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.05, type: "spring", stiffness: 260, damping: 18 }}
          className="relative z-10 mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-500/15"
        >
          <motion.span
            className="absolute inset-0 rounded-full border-2 border-amber-500/40"
            animate={{ scale: [1, 1.5, 2], opacity: [0.8, 0.2, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeOut" }}
          />
          <PartyPopper className="relative h-9 w-9 text-amber-400" />
        </motion.div>
        <h2 className="mt-5 text-3xl font-black">All paid up!</h2>
        <p className="mt-2 text-sm text-zinc-400">
          {isSelfServeTableside(snapshot.session)
            ? `Your order at ${restaurant?.name ?? "the restaurant"} is in. The kitchen is on it.`
            : `Your group order at ${restaurant?.name ?? "the restaurant"} is in. The kitchen is on it.`}
        </p>
        <div className="mt-6 space-y-4 text-left">
          <SummaryCard total={snapshot.session.total_cents} itemCount={snapshot.items.length} memberCount={snapshot.members.length} />
          {myPayment && me ? (
            <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5">
              <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Your receipt</div>
              <div className="mt-1 text-lg font-bold">{me.display_name}</div>
              <div className="mt-1 text-sm font-semibold text-amber-400">
                {formatCents(myPayment.amount_cents)} · {myPayment.status === "covered" ? "covered by host" : "paid"}
              </div>
            </div>
          ) : null}
          <PartyLedger members={snapshot.members} payments={snapshot.payments} selfMemberId={creds.memberId} isHost={me?.role === "host"} />
        </div>
        <button type="button" onClick={onDone} className={cn("mt-8 w-full rounded-xl px-5 py-3 text-base font-bold", DASH_PRIMARY_CTA)}>Done</button>
      </div>
    </Layout>
  );
}

function ConfettiBurst() {
  const pieces = useMemo(() => {
    const colors = ["#FF9933", "#22C55E", "#3B82F6", "#A855F7", "#EC4899", "#F59E0B"];
    return Array.from({ length: 28 }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * 240,
      y: 40 + Math.random() * 260,
      rotate: Math.random() * 720 - 360,
      color: colors[i % colors.length],
      delay: Math.random() * 0.25,
      size: 6 + Math.random() * 6,
    }));
  }, []);
  return (
    <div aria-hidden className="pointer-events-none absolute left-1/2 top-6 z-0 h-[280px] w-0">
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          className="absolute block rounded-sm"
          style={{ left: 0, top: 0, width: p.size, height: p.size * 0.4, backgroundColor: p.color }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 0 }}
          animate={{ x: p.x, y: p.y, rotate: p.rotate, opacity: [0, 1, 1, 0] }}
          transition={{ duration: 1.8, ease: "easeOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}

function CancelledScreen({ restaurantName, onHome }: { restaurantName: string | null; onHome: () => void }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-6 text-center">
      <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex h-20 w-20 items-center justify-center rounded-full bg-red-500/15">
        <X className="h-9 w-9 text-red-400" strokeWidth={3} />
      </motion.div>
      <h2 className="mt-5 text-2xl font-black text-zinc-100">Group order ended</h2>
      <p className="mt-2 max-w-md text-sm text-zinc-400">
        {restaurantName ? `The host cancelled the group order at ${restaurantName}.` : "The host cancelled this group order."}
        {" "}Any paid shares have been refunded.
      </p>
      <button type="button" onClick={onHome} className={cn("mt-6 rounded-xl px-5 py-3 text-base font-bold", DASH_PRIMARY_CTA)}>
        Back to home
      </button>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
    </div>
  );
}

function FullScreenMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
      <AlertCircle className="h-8 w-8 text-red-400" />
      <h2 className="text-xl font-bold text-zinc-100">{title}</h2>
      <p className="max-w-sm text-sm text-zinc-400">{body}</p>
      <a href="/" className={cn("mt-3 rounded-xl px-5 py-2.5 text-sm font-bold", DASH_PRIMARY_CTA)}>Back to home</a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function cartCountFor(items: PartyItem[], menuItemId: number): number {
  return items.filter((i) => i.menu_item_id === menuItemId).reduce((sum, i) => sum + (i.quantity ?? 1), 0);
}
