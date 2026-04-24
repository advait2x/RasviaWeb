import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CreditCard, CheckCircle2, Loader2, ExternalLink, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { DASH_BTN_ADD } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

// ─── Component ────────────────────────────────────────────────────────────────

export default function StripeConnect() {
    const { restaurantId } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
    const [payoutsEnabled, setPayoutsEnabled] = useState(false);
    const [detailsSubmitted, setDetailsSubmitted] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        async function fetchStripeStatus() {
            if (!restaurantId) {
                setLoading(false);
                return;
            }

            try {
                // 1. Get stripe_account_id from database
                const { data, error } = await supabase
                    .from("restaurants")
                    .select("stripe_account_id")
                    .eq("id", restaurantId)
                    .maybeSingle();

                if (!error && data) {
                    const accountId = (data as { stripe_account_id: string | null }).stripe_account_id ?? null;
                    setStripeAccountId(accountId);
                    
                    // 2. Check actual status from Stripe API
                    if (accountId) {
                        const { data: statusData, error: statusErr } = await supabase.functions.invoke('check-stripe-status', {
                            body: { restaurant_id: restaurantId }
                        });
                        
                        if (!statusErr && statusData) {
                            setPayoutsEnabled(statusData.payouts_enabled);
                            setDetailsSubmitted(statusData.details_submitted);
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to fetch stripe status:", err);
            } finally {
                setLoading(false);
            }
        }

        fetchStripeStatus();
    }, [restaurantId]);

    const handleConnectClick = async () => {
        if (!restaurantId) return;
        
        setActionLoading(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-stripe-account', {
                body: { restaurant_id: restaurantId }
            });
            
            if (error) {
                throw new Error(error.message);
            }
            if (data?.error) {
                throw new Error(data.error);
            }
            if (!data?.url) {
                throw new Error("Failed to generate onboarding link");
            }
            
            // Redirect to Stripe onboarding
            window.location.href = data.url;
        } catch (err: any) {
            console.error("Stripe connect error:", err);
            toast.error(err.message || "Failed to start onboarding. Please try again.");
            setActionLoading(false);
        }
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
                ) : stripeAccountId && payoutsEnabled ? (
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
                            Active
                        </span>
                    </div>
                ) : stripeAccountId && !payoutsEnabled ? (
                    /* ── Onboarding Started but Not Finished/Verified ── */
                    <div className="flex items-center gap-3 w-full">
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle size={18} strokeWidth={1.5} className="text-amber-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-zinc-200">Action Required</p>
                            <p className="text-xs text-zinc-500 mt-0.5">
                                {detailsSubmitted 
                                    ? "Stripe is verifying your details. Check back later." 
                                    : "Please complete onboarding to enable payouts."}
                            </p>
                        </div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            whileHover={{ scale: 1.02 }}
                            onClick={handleConnectClick}
                            disabled={actionLoading}
                            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 text-white text-xs font-semibold hover:bg-orange-500 transition-colors flex-shrink-0 min-w-[140px]"
                        >
                            {actionLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <>
                                    <ExternalLink size={12} strokeWidth={2.5} />
                                    {detailsSubmitted ? "Update Details" : "Finish Onboarding"}
                                </>
                            )}
                        </motion.button>
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
                            disabled={actionLoading}
                            className={cn(
                                "flex min-w-[140px] flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-lg transition-colors dark:shadow-amber-500/20",
                                DASH_BTN_ADD,
                            )}
                        >
                            {actionLoading ? (
                                <Loader2 size={14} className="animate-spin" />
                            ) : (
                                <>
                                    <ExternalLink size={12} strokeWidth={2.5} />
                                    Connect Bank Account
                                </>
                            )}
                        </motion.button>
                    </div>
                )}
            </div>

            {/* Fine print */}
            {!loading && !stripeAccountId && (
                <p className="text-[11px] text-zinc-600 leading-relaxed px-1">
                    Payouts are processed securely via Stripe. By connecting, you agree to the Stripe Connected Account Agreement.
                </p>
            )}
        </div>
    );
}
