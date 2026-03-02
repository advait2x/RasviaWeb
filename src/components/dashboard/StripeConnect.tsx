import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ─── Component ────────────────────────────────────────────────────────────────

export default function StripeConnect() {
    const { restaurantId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);

    useEffect(() => {
        async function fetchStripeStatus() {
            if (!restaurantId) {
                setLoading(false);
                return;
            }

            const { data, error } = await supabase
                .from("restaurants")
                .select("stripe_account_id")
                .eq("id", restaurantId)
                .single();

            if (!error && data) {
                setStripeAccountId((data as { stripe_account_id: string | null }).stripe_account_id ?? null);
            }

            setLoading(false);
        }

        fetchStripeStatus();
    }, [restaurantId]);

    const handleConnectClick = () => {
        alert("Contact Support to enable payouts");
    };

    return (
        <div className="space-y-4 border-t border-white/5 pt-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h3 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                        <CreditCard size={16} strokeWidth={1.5} className="text-amber-500/70" />
                        Payouts
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">
                        Connect your bank account to receive payouts via Stripe
                    </p>
                </div>
            </div>

            {/* Card body */}
            <div className="rounded-xl border border-white/8 bg-zinc-800/40 p-4 flex items-center justify-between gap-4">
                {loading ? (
                    /* Loading skeleton */
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-zinc-700/60 border border-white/5 flex items-center justify-center flex-shrink-0">
                            <Loader2 size={18} strokeWidth={1.5} className="text-zinc-500 animate-spin" />
                        </div>
                        <div className="space-y-1.5 flex-1">
                            <div className="h-3 w-28 rounded bg-zinc-700/60 animate-pulse" />
                            <div className="h-2.5 w-40 rounded bg-zinc-700/40 animate-pulse" />
                        </div>
                    </div>
                ) : stripeAccountId ? (
                    /* ── Payouts Active ── */
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <CheckCircle2 size={18} strokeWidth={1.5} className="text-emerald-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-zinc-100">Payouts Active</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Your bank account is connected and ready to receive payouts.
                            </p>
                        </div>
                        {/* Badge */}
                        <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-xs font-semibold text-emerald-400 flex-shrink-0">
                            <CheckCircle2 size={11} strokeWidth={2.5} />
                            Active ✅
                        </span>
                    </div>
                ) : (
                    /* ── Not connected ── */
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-zinc-700/60 border border-white/8 flex items-center justify-center flex-shrink-0">
                            <CreditCard size={18} strokeWidth={1.5} className="text-zinc-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-zinc-200">No Bank Account Connected</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                Connect your bank account to start receiving payouts from orders.
                            </p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={handleConnectClick}
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors flex-shrink-0 shadow-lg shadow-amber-500/20"
                        >
                            <ExternalLink size={12} strokeWidth={2.5} />
                            Connect Bank Account
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Fine print */}
            {!loading && !stripeAccountId && (
                <p className="text-[11px] text-zinc-600 leading-relaxed px-1">
                    Payouts are processed via Stripe. Contact{" "}
                    <a
                        href="mailto:support@rasvia.com"
                        className="text-amber-500/70 hover:text-amber-400 underline underline-offset-2 transition-colors"
                    >
                        support@rasvia.com
                    </a>{" "}
                    to get started with manual onboarding.
                </p>
            )}
        </div>
    );
}
