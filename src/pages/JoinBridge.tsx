// src/pages/JoinBridge.tsx
// Group Order Bridge — web (schema_version = 2).
// Four stages: Name entry → Browse & Add → Review & Split / Pay & Wait → Success.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, Copy, Crown, CreditCard, Lock, Minus, Plus, ShoppingCart, Smartphone,
  Trash2, Users, X, Search, AlertCircle, PartyPopper, Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import {
  fetchSnapshot, joinSession, addItem, updateItemQuantity, removeItem,
  setItemSplit, assignItemPayer, setPaymentMode, lockSession, unlockSession,
  startCheckout, cancelSession, leaveSession,
  formatCents, totalCartCents, paymentForMember, memberById,
  type PartySnapshot, type PartyCreds, type PaymentMode, type PartyMember, type PartyItem,
} from "@/lib/party-session";
import { savePartyCreds, loadPartyCreds, clearPartyCreds } from "@/lib/party-credentials";
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
  { key: "host_pays", title: "Host pays", subtitle: "You cover the whole bill" },
  { key: "equal_split", title: "Split equally", subtitle: "1 / N across everyone" },
  { key: "per_person", title: "Each pays their items", subtitle: "Split per item / shares" },
  { key: "assigned", title: "Host assigns", subtitle: "Pick who pays for each item" },
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nameInput, setNameInput] = useState("");
  const [joining, setJoining] = useState(false);
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<"browse" | "review" | "pay" | "success">("browse");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [showAppOverlay, setShowAppOverlay] = useState(
    !(checkoutStatus === "success" || checkoutStatus === "cancel"),
  );
  const checkoutAckRef = useRef(false);

  const session = snapshot?.session ?? null;
  const members = snapshot?.members ?? [];
  const items = snapshot?.items ?? [];
  const payments = snapshot?.payments ?? [];
  const me = creds ? members.find((m) => m.id === creds.memberId) ?? null : null;
  const isHost = me?.role === "host";
  const myPayment = creds ? paymentForMember(payments, creds.memberId) : null;

  // ── Boot: load creds, initial snapshot, restaurant + menu ──────────────
  useEffect(() => {
    if (!sessionId) {
      setError("Missing group order id.");
      setLoading(false);
      return;
    }
    const saved = loadPartyCreds(sessionId);
    if (saved) setCreds(saved);
  }, [sessionId]);

  const loadAll = useCallback(async () => {
    if (!sessionId) return;
    try {
      const snap = await fetchSnapshot(supabase, sessionId);
      setSnapshot(snap);
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
      (snap) => setSnapshot(snap),
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

  // Acknowledge Stripe redirect
  useEffect(() => {
    if (!checkoutStatus || checkoutAckRef.current) return;
    checkoutAckRef.current = true;
    if (checkoutStatus === "success") {
      toast.success("Payment received — hang tight!");
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
    if (!name) { toast.error("Enter your name."); return; }
    setJoining(true);
    try {
      const result = await joinSession(supabase, sessionId, name);
      const next: PartyCreds = { sessionId, memberId: result.member_id, memberToken: result.member_token };
      setCreds(next);
      savePartyCreds(next);
      await loadAll();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to join.");
    } finally {
      setJoining(false);
    }
  };

  const wrapMutation = async (fn: () => Promise<void>, errMsg = "Action failed") => {
    try { await fn(); } catch (err) { toast.error(err instanceof Error ? err.message : errMsg); }
  };

  const handleAddItem = (menuItemId: number) => wrapMutation(
    () => addItem(supabase, creds!, menuItemId, 1).then(() => { /* noop */ }),
    "Could not add item",
  );
  const handleChangeQty = (item: PartyItem, delta: number) =>
    wrapMutation(() => updateItemQuantity(supabase, creds!, item.id, Math.max(0, item.quantity + delta)), "Could not update item");
  const handleRemoveItem = (item: PartyItem) =>
    wrapMutation(() => removeItem(supabase, creds!, item.id), "Could not remove item");
  const handleSetMode = (mode: PaymentMode) =>
    wrapMutation(() => setPaymentMode(supabase, creds!, mode), "Could not change payment mode");
  const handleAssignPayer = (itemId: string, payerId: string) =>
    wrapMutation(() => assignItemPayer(supabase, creds!, itemId, payerId), "Could not assign payer");
  const handleSetSplit = (itemId: string, memberIds: string[]) =>
    wrapMutation(() => setItemSplit(supabase, creds!, itemId, memberIds), "Could not set split");

  const handleLock = async () => {
    if (items.length === 0) { toast.error("Add at least one item before checkout."); return; }
    setBusy(true);
    try { await lockSession(supabase, creds!); toast.success("Cart locked — collecting payments."); }
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
      toast.error(err instanceof Error ? err.message : "Checkout failed");
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
      toast.error(err instanceof Error ? err.message : "Checkout failed");
      setBusy(false);
    }
  };

  const handleCancelSession = async () => {
    setBusy(true);
    try {
      const result = await cancelSession(supabase, creds!);
      toast.success(`Cancelled — ${result.refunded} payment${result.refunded === 1 ? "" : "s"} refunded.`);
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

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/join?id=${sessionId}`;
    try { await navigator.clipboard.writeText(url); toast.success("Link copied!"); }
    catch { toast.error("Could not copy link."); }
  };

  // ── Early returns ──────────────────────────────────────────────────────
  if (!sessionId) return <FullScreenMessage title="Missing id" body="This link is invalid." />;
  if (loading) return <LoadingScreen />;
  if (error) return <FullScreenMessage title="Can't open group order" body={error} />;
  if (!session) return <FullScreenMessage title="Not found" body="This group order no longer exists." />;

  // App interstitial (only before joining & before any checkout return)
  if (showAppOverlay && !creds && !checkoutStatus) {
    return <OpenInAppOverlay restaurantName={restaurant?.name ?? "this restaurant"} sessionId={sessionId} onContinueWeb={() => setShowAppOverlay(false)} />;
  }

  // Name entry
  if (!creds || !me) {
    return (
      <NameEntryScreen
        restaurantName={restaurant?.name ?? "this restaurant"}
        nameInput={nameInput}
        setNameInput={setNameInput}
        joining={joining}
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
      <Layout restaurantName={restaurant?.name ?? "Group order"} subtitle="Collecting payments" onBack={() => window.history.back()}>
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-24 pt-6">
          <SummaryCard total={session.total_cents} itemCount={items.length} memberCount={members.length} subtitle="Cart locked" locked />
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
                  "mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-base font-bold text-zinc-900 transition hover:bg-amber-400",
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
          />

          {isHost ? (
            <div className="flex flex-col gap-2 pt-2">
              {session.status === "locked" && !payments.some((p) => p.status === "paid" || p.status === "covered") ? (
                <button type="button" disabled={busy} onClick={handleUnlock} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">
                  <Unlock className="h-4 w-4" /> Back to editing
                </button>
              ) : null}
              <button type="button" disabled={busy} onClick={() => setCancelOpen(true)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-sm font-semibold text-red-400 hover:bg-red-500/20">
                <X className="h-4 w-4" /> Cancel group order
              </button>
            </div>
          ) : null}
        </div>

        <CancelDialog open={cancelOpen} busy={busy} onClose={() => setCancelOpen(false)} onConfirm={handleCancelSession} />
      </Layout>
    );
  }

  // Review & Split (host only overlay on open)
  if (view === "review" && session.status === "open") {
    const mode = (session.payment_mode === "split" ? "per_person" : session.payment_mode === "assign" ? "assigned" : session.payment_mode) as PaymentMode;
    return (
      <Layout restaurantName="Review & split" subtitle={restaurant?.name ?? undefined} onBack={() => setView("browse")}>
        <div className="mx-auto max-w-2xl space-y-5 px-4 pb-32 pt-6">
          <SummaryCard total={totalCartCents(items)} itemCount={items.length} memberCount={members.length} subtitle="Ready to checkout" />
          <section>
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">How will you split?</h3>
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PAYMENT_MODES.map((m) => (
                <button
                  key={m.key} type="button" onClick={() => handleSetMode(m.key)}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl border p-4 text-left transition",
                    mode === m.key ? "border-amber-500 bg-amber-500/10" : "border-white/10 bg-zinc-900 hover:border-white/20",
                  )}
                >
                  <div className="flex-1">
                    <div className={cn("text-sm font-bold", mode === m.key ? "text-amber-400" : "text-zinc-100")}>{m.title}</div>
                    <div className="mt-0.5 text-xs text-zinc-500">{m.subtitle}</div>
                  </div>
                  {mode === m.key ? <Check className="h-5 w-5 text-amber-400" strokeWidth={3} /> : null}
                </button>
              ))}
            </div>
          </section>

          {mode === "assigned" ? (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Assign each item</h3>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <AssignRow key={it.id} item={it} members={members} onAssign={(pid) => handleAssignPayer(it.id, pid)} />
                ))}
              </div>
            </section>
          ) : null}

          {mode === "per_person" ? (
            <section>
              <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-400">Per-item shares</h3>
              <p className="mt-1 text-xs text-zinc-500">By default each item is billed to whoever added it. Tap to split across multiple members.</p>
              <div className="mt-3 space-y-2">
                {items.map((it) => (
                  <SplitRow key={it.id} item={it} members={members} onSetSplit={(ids) => handleSetSplit(it.id, ids)} />
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-zinc-950/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto flex max-w-2xl gap-3">
            <button type="button" onClick={() => setView("browse")} className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 hover:bg-zinc-800">Back</button>
            <button
              type="button" disabled={busy} onClick={handleLock}
              className={cn("flex flex-1 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-zinc-900 hover:bg-amber-400", busy && "opacity-60")}
            >
              <Lock className="h-4 w-4" /> {busy ? "Locking…" : "Lock cart & collect"}
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Default: Browse & Add
  return (
    <Layout
      restaurantName={restaurant?.name ?? "Group order"}
      subtitle={`${members.length} member${members.length === 1 ? "" : "s"} · ${items.length} item${items.length === 1 ? "" : "s"}`}
      onBack={() => window.history.back()}
      rightAction={
        <button type="button" onClick={handleCopyLink} className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-900/80 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-zinc-800">
          <Copy className="h-3.5 w-3.5" /> Share
        </button>
      }
    >
      <div className="mx-auto max-w-3xl px-4 pb-64">
        <div className="flex gap-2 overflow-x-auto py-3">
          {members.map((m, idx) => (
            <MemberChip key={m.id} member={m} index={idx} isSelf={m.id === creds.memberId} />
          ))}
        </div>

        <div className="sticky top-0 z-10 flex items-center gap-2 rounded-xl border border-white/10 bg-zinc-950/95 px-3 py-2 backdrop-blur">
          <Search className="h-4 w-4 text-zinc-500" />
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu" className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none"
          />
        </div>

        <CategoryChips menu={menu} active={category} onChange={setCategory} />

        <MenuList items={items} menu={menu} search={search} category={category} onAdd={handleAddItem} />
      </div>

      <CartStrip
        items={items}
        members={members}
        selfMemberId={creds.memberId}
        isHost={isHost}
        onChangeQty={handleChangeQty}
        onRemove={handleRemoveItem}
        onReview={() => setView("review")}
        onLeave={handleLeave}
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

function SummaryCard({ total, itemCount, memberCount, subtitle, locked }: { total: number; itemCount: number; memberCount: number; subtitle?: string; locked?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-zinc-900/80 p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total</div>
          <div className="mt-1 text-3xl font-black">{formatCents(total)}</div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div>{memberCount} member{memberCount === 1 ? "" : "s"}</div>
          <div>{itemCount} item{itemCount === 1 ? "" : "s"}</div>
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

function MemberChip({ member, index, isSelf }: { member: PartyMember; index: number; isSelf: boolean }) {
  const colors = ["bg-amber-500", "bg-green-500", "bg-blue-500", "bg-purple-500", "bg-pink-500", "bg-yellow-500", "bg-cyan-500", "bg-red-500"];
  return (
    <div className={cn("flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition", isSelf ? "border-amber-500 bg-amber-500/10 text-amber-400" : "border-white/10 bg-zinc-900 text-zinc-200")}>
      <span className={cn("relative flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-zinc-900", colors[index % colors.length])}>
        {memberInitials(member.display_name)}
        {member.role === "host" ? <Crown className="absolute -right-1 -top-1 h-3 w-3 text-amber-300" strokeWidth={3} /> : null}
      </span>
      <span className="max-w-[120px] truncate">{member.display_name}{isSelf ? " · You" : ""}</span>
    </div>
  );
}

function CategoryChips({ menu, active, onChange }: { menu: MenuItemRow[]; active: string | null; onChange: (v: string | null) => void }) {
  const categories = useMemo(() => Array.from(new Set(menu.map((m) => m.category).filter(Boolean))) as string[], [menu]);
  if (categories.length === 0) return null;
  return (
    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
        "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
        active ? "border-amber-500 bg-amber-500 text-zinc-900" : "border-white/10 bg-zinc-900 text-zinc-300 hover:bg-zinc-800",
      )}
    >
      {label}
    </button>
  );
}

function MenuList({ items, menu, search, category, onAdd }: { items: PartyItem[]; menu: MenuItemRow[]; search: string; category: string | null; onAdd: (id: number) => void }) {
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
        <MenuRow key={m.id} item={m} inCartCount={cartCountFor(items, m.id)} onAdd={() => onAdd(m.id)} />
      ))}
      {filtered.length === 0 ? (
        <li className="py-10 text-center text-sm text-zinc-500">No menu items match.</li>
      ) : null}
    </ul>
  );
}

function MenuRow({ item, inCartCount, onAdd }: { item: MenuItemRow; inCartCount: number; onAdd: () => void }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 rounded-2xl border border-white/5 bg-zinc-900/70 p-3"
    >
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" loading="lazy" />
      ) : (
        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-zinc-800 text-zinc-600">—</div>
      )}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold">{item.name}</div>
        {item.description ? <div className="mt-0.5 line-clamp-2 text-xs text-zinc-500">{item.description}</div> : null}
        <div className="mt-1 text-sm font-bold text-amber-400">${Number(item.price).toFixed(2)}</div>
      </div>
      <button
        type="button" onClick={onAdd}
        className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-zinc-900 shadow-lg transition hover:bg-amber-400"
      >
        <Plus className="h-5 w-5" strokeWidth={3} />
        {inCartCount > 0 ? (
          <span className="absolute -right-1 -top-1 rounded-full border-2 border-zinc-900 bg-zinc-950 px-1.5 text-[10px] font-bold text-amber-400">
            {inCartCount}
          </span>
        ) : null}
      </button>
    </motion.li>
  );
}

function CartStrip(props: {
  items: PartyItem[]; members: PartyMember[]; selfMemberId: string; isHost: boolean;
  onChangeQty: (item: PartyItem, delta: number) => void;
  onRemove: (item: PartyItem) => void;
  onReview: () => void;
  onLeave: () => void;
}) {
  const [open, setOpen] = useState(false);
  const total = totalCartCents(props.items);
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto max-w-3xl">
        <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-center gap-3 px-4 py-3">
          <ShoppingCart className="h-5 w-5 text-amber-400" />
          <span className="text-sm font-bold">{props.items.length} item{props.items.length === 1 ? "" : "s"}</span>
          <span className="ml-auto text-sm font-black text-amber-400">{formatCents(total)}</span>
        </button>
        <AnimatePresence initial={false}>
          {open ? (
            <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
              <ul className="max-h-[40vh] overflow-y-auto px-4 pb-2">
                {props.items.length === 0 ? (
                  <li className="py-6 text-center text-sm text-zinc-500">No items yet — add something from the menu.</li>
                ) : (
                  props.items.map((it) => {
                    const canEdit = it.added_by_member_id === props.selfMemberId || props.isHost;
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
          {props.isHost ? (
            <button
              type="button" disabled={props.items.length === 0} onClick={props.onReview}
              className={cn("flex-1 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400", props.items.length === 0 && "opacity-50")}
            >
              Review & checkout
            </button>
          ) : (
            <div className="flex-1 rounded-xl border border-white/10 bg-zinc-900 px-4 py-2.5 text-center text-sm font-semibold text-zinc-500">
              Waiting on host…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AssignRow({ item, members, onAssign }: { item: PartyItem; members: PartyMember[]; onAssign: (pid: string) => void }) {
  const current = memberById(members, item.assigned_payer_id) ?? memberById(members, item.added_by_member_id);
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-3">
      <div className="truncate text-sm font-semibold">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.menu_item?.name ?? "Item"}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {members.map((m) => (
          <button
            key={m.id} type="button" onClick={() => onAssign(m.id)}
            className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", current?.id === m.id ? "border-amber-500 bg-amber-500 text-zinc-900" : "border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
          >
            {m.display_name.split(" ")[0]}
          </button>
        ))}
      </div>
    </div>
  );
}

function SplitRow({ item, members, onSetSplit }: { item: PartyItem; members: PartyMember[]; onSetSplit: (ids: string[]) => void }) {
  const currentIds = item.split_member_ids ?? [];
  const toggle = (id: string) => {
    const set = new Set(currentIds);
    if (set.has(id)) set.delete(id); else set.add(id);
    onSetSplit(Array.from(set));
  };
  return (
    <div className="rounded-xl border border-white/5 bg-zinc-900/70 p-3">
      <div className="truncate text-sm font-semibold">{item.quantity > 1 ? `${item.quantity}× ` : ""}{item.menu_item?.name ?? "Item"}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {members.map((m) => {
          const active = currentIds.includes(m.id);
          return (
            <button
              key={m.id} type="button" onClick={() => toggle(m.id)}
              className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", active ? "border-amber-500 bg-amber-500 text-zinc-900" : "border-white/10 bg-zinc-800 text-zinc-300 hover:bg-zinc-700")}
            >
              {m.display_name.split(" ")[0]}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CancelDialog({ open, busy, onClose, onConfirm }: { open: boolean; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="w-full max-w-md rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <h3 className="text-lg font-bold">Cancel group order?</h3>
        <p className="mt-2 text-sm text-zinc-400">Any paid shares will be refunded via Stripe. This can't be undone.</p>
        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700">Never mind</button>
          <button type="button" disabled={busy} onClick={onConfirm} className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-400 disabled:opacity-60">{busy ? "Cancelling…" : "Cancel & refund"}</button>
        </div>
      </motion.div>
    </div>
  );
}

function NameEntryScreen({
  restaurantName, nameInput, setNameInput, joining, onJoin,
}: { restaurantName: string; nameInput: string; setNameInput: (v: string) => void; joining: boolean; onJoin: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-8 shadow-2xl">
        <div className="flex items-center gap-2 text-amber-400">
          <Users className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">Group order</span>
        </div>
        <h1 className="mt-2 text-2xl font-black text-zinc-100">Join at {restaurantName}</h1>
        <p className="mt-2 text-sm text-zinc-400">Enter your name so everyone knows who added what.</p>
        <input
          autoFocus value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          placeholder="Your name"
          onKeyDown={(e) => { if (e.key === "Enter" && !joining) onJoin(); }}
          className="mt-5 w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 text-base text-zinc-100 placeholder-zinc-500 outline-none focus:border-amber-500"
          maxLength={60}
        />
        <button
          type="button" disabled={joining} onClick={onJoin}
          className={cn("mt-4 w-full rounded-xl bg-amber-500 px-5 py-3 text-base font-bold text-zinc-900 transition hover:bg-amber-400", joining && "opacity-60")}
        >
          {joining ? "Joining…" : "Join"}
        </button>
      </motion.div>
    </div>
  );
}

function OpenInAppOverlay({ restaurantName, sessionId, onContinueWeb }: { restaurantName: string; sessionId: string; onContinueWeb: () => void }) {
  const deepLink = `rasvia://join/${sessionId}`;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 p-4">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md rounded-3xl border border-white/10 bg-zinc-900 p-8 text-center shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15">
          <Smartphone className="h-7 w-7 text-amber-400" />
        </div>
        <h2 className="mt-4 text-xl font-black">Open in the Rasvia app?</h2>
        <p className="mt-2 text-sm text-zinc-400">You're joining a group order at {restaurantName}. The full experience is on mobile.</p>
        <a href={deepLink} className="mt-5 inline-flex w-full items-center justify-center rounded-xl bg-amber-500 px-5 py-3 text-base font-bold text-zinc-900 hover:bg-amber-400">Open app</a>
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
        <p className="mt-2 text-sm text-zinc-400">Your group order at {restaurant?.name ?? "the restaurant"} is in. The kitchen is on it.</p>
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
        <button type="button" onClick={onDone} className="mt-8 w-full rounded-xl bg-amber-500 px-5 py-3 text-base font-bold text-zinc-900 hover:bg-amber-400">Done</button>
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
      <a href="/" className="mt-3 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-zinc-900 hover:bg-amber-400">Back to home</a>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function cartCountFor(items: PartyItem[], menuItemId: number): number {
  return items.filter((i) => i.menu_item_id === menuItemId).reduce((sum, i) => sum + (i.quantity ?? 1), 0);
}
