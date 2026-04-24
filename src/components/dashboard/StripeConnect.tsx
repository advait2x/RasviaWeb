import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Landmark,
  Loader2,
  MapPin,
  ReceiptText,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DASH_BTN_ADD } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

type StripeStatusResponse = {
  payouts_enabled?: boolean;
  details_submitted?: boolean;
  requirements_currently_due?: string[];
}

type TaxRegistration = {
  id: string;
  status: string | null;
  country: string | null;
  state: string | null;
  type: string | null;
  active_from: number | null;
  expires_at: number | null;
}

type TaxSnapshot = {
  tax_enabled: boolean;
  tax_status: string;
  tax_missing_fields: string[];
  sales_tax_rate_bps: number;
  sales_tax_rate_percent: string;
  stripe_manual_tax_rate_id: string | null;
  head_office_address: {
    line1: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  } | null;
  registrations: TaxRegistration[];
  restaurant_address: {
    street_address: string | null;
    city: string | null;
    state: string | null;
    postal_code: string | null;
    country: string | null;
  };
  us_states: Record<string, string>;
}

type TaxAddressForm = {
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

const EMPTY_ADDRESS_FORM: TaxAddressForm = {
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
};

type SalesTaxRateForm = {
  percent: string;
};

function deriveTaxAddressForm(snapshot: TaxSnapshot | null): TaxAddressForm {
  if (!snapshot) return EMPTY_ADDRESS_FORM;

  const headOffice = snapshot.head_office_address;
  const restaurantAddress = snapshot.restaurant_address;

  return {
    streetAddress: headOffice?.line1 ?? restaurantAddress.street_address ?? "",
    city: headOffice?.city ?? restaurantAddress.city ?? "",
    state: headOffice?.state ?? restaurantAddress.state ?? "",
    postalCode: headOffice?.postal_code ?? restaurantAddress.postal_code ?? "",
    country: headOffice?.country ?? restaurantAddress.country ?? "US",
  };
}

function formatUnixDate(timestamp: number | null): string | null {
  if (!timestamp) return null;
  return new Date(timestamp * 1000).toLocaleDateString();
}

function formatMissingField(field: string): string {
  return field.split("_").join(" ");
}

function taxStatusLabel(status: string, enabled: boolean) {
  if (enabled || status === "active") return "Ready"
  if (status === "pending") return "Setup Required"
  return "Needs Review"
}

async function extractFunctionError(error: unknown, fallback: string): Promise<string> {
  const context = (error as { context?: Response } | null)?.context;
  if (!context || typeof context.clone !== "function") {
    return error instanceof Error ? error.message : fallback;
  }

  try {
    const body = await context.clone().json();
    if (body && typeof body === "object" && "error" in body && body.error) {
      return String((body as { error: unknown }).error);
    }
    if (body && typeof body === "object" && "message" in body && body.message) {
      return String((body as { message: unknown }).message);
    }
  } catch {
    // fall through to text parsing
  }

  try {
    const text = await context.clone().text();
    if (text) return text;
  } catch {
    // ignore
  }

  return error instanceof Error ? error.message : fallback;
}

export default function StripeConnect() {
  const { restaurantId, isAdmin, isRestaurantOwner } = useAuth();
  const canManageBilling = isAdmin || isRestaurantOwner;

  const [loading, setLoading] = useState(true);
  const [stripeAccountId, setStripeAccountId] = useState<string | null>(null);
  const [payoutsEnabled, setPayoutsEnabled] = useState(false);
  const [detailsSubmitted, setDetailsSubmitted] = useState(false);
  const [requirementsCurrentlyDue, setRequirementsCurrentlyDue] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState(false);

  const [taxLoading, setTaxLoading] = useState(false);
  const [taxBusy, setTaxBusy] = useState<"address" | "registration" | "rate" | null>(null);
  const [taxError, setTaxError] = useState<string | null>(null);
  const [taxSnapshot, setTaxSnapshot] = useState<TaxSnapshot | null>(null);
  const [taxAddressForm, setTaxAddressForm] = useState<TaxAddressForm>(EMPTY_ADDRESS_FORM);
  const [salesTaxRateForm, setSalesTaxRateForm] = useState<SalesTaxRateForm>({ percent: "" });
  const [selectedRegistrationState, setSelectedRegistrationState] = useState<string>("");

  const registeredStates = useMemo(
    () => new Set(taxSnapshot?.registrations.map((registration) => registration.state).filter(Boolean)),
    [taxSnapshot],
  );

  const availableRegistrationStates = useMemo(() => {
    if (!taxSnapshot) return [];
    return Object.entries(taxSnapshot.us_states)
      .filter(([code]) => !registeredStates.has(code))
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [registeredStates, taxSnapshot]);

  useEffect(() => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadBillingState() {
      setLoading(true);
      setTaxError(null);

      try {
        const { data, error } = await supabase
          .from("restaurants")
          .select("stripe_account_id")
          .eq("id", restaurantId)
          .maybeSingle();

        if (cancelled) return;
        if (error) throw error;

        const accountId = (data as { stripe_account_id: string | null } | null)?.stripe_account_id ?? null;
        setStripeAccountId(accountId);
        setPayoutsEnabled(false);
        setDetailsSubmitted(false);
        setRequirementsCurrentlyDue([]);
        setTaxSnapshot(null);
        setTaxAddressForm(EMPTY_ADDRESS_FORM);
        setSalesTaxRateForm({ percent: "" });
        setSelectedRegistrationState("");

        if (!accountId || !canManageBilling) {
          return;
        }

        const [{ data: statusData, error: statusError }, { data: taxData, error: taxInvokeError }] = await Promise.all([
          supabase.functions.invoke("check-stripe-status", {
            body: { restaurant_id: restaurantId },
          }),
          supabase.functions.invoke("manage-tax-settings", {
            body: { action: "get_snapshot", restaurant_id: restaurantId },
          }),
        ]);

        if (cancelled) return;
        if (statusError) throw new Error(await extractFunctionError(statusError, "Failed to load Stripe status."));
        if (taxInvokeError) throw new Error(await extractFunctionError(taxInvokeError, "Failed to load tax settings."));

        const statusPayload = (statusData ?? {}) as StripeStatusResponse;
        const taxPayload = taxData as TaxSnapshot | undefined;

        setPayoutsEnabled(statusPayload.payouts_enabled === true);
        setDetailsSubmitted(statusPayload.details_submitted === true);
        setRequirementsCurrentlyDue(statusPayload.requirements_currently_due ?? []);

        if (taxPayload) {
          const taxRegisteredStates = new Set(
            taxPayload.registrations.map((registration) => registration.state).filter(Boolean),
          );
          setTaxSnapshot(taxPayload);
          setTaxAddressForm(deriveTaxAddressForm(taxPayload));
          setSalesTaxRateForm({ percent: taxPayload.sales_tax_rate_percent });
          const firstAvailableState = Object.keys(taxPayload.us_states).find((code) => !taxRegisteredStates.has(code)) ?? "";
          setSelectedRegistrationState(firstAvailableState);
        }
      } catch (error) {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : "Failed to load Stripe status.";
        console.error("Failed to fetch Stripe billing state:", message);
        setTaxError(message);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setTaxLoading(false);
        }
      }
    }

    void loadBillingState();

    return () => {
      cancelled = true;
    };
  }, [restaurantId, canManageBilling]);

  useEffect(() => {
    if (!selectedRegistrationState && availableRegistrationStates.length > 0) {
      setSelectedRegistrationState(availableRegistrationStates[0][0]);
    }
  }, [availableRegistrationStates, selectedRegistrationState]);

  const handleConnectClick = async () => {
    if (!restaurantId || !canManageBilling) return;

    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-stripe-account", {
        body: { restaurant_id: restaurantId },
      });

      if (error) throw new Error(await extractFunctionError(error, "Failed to refresh tax settings."));
      if (data?.error) throw new Error(String(data.error));
      if (!data?.url) throw new Error("Failed to generate onboarding link.");

      window.location.href = data.url;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to start Stripe onboarding.";
      console.error("Stripe connect error:", message);
      toast.error(message);
      setActionLoading(false);
    }
  };

  const refreshTaxSnapshot = async (showSpinner: boolean) => {
    if (!restaurantId || !stripeAccountId || !canManageBilling) return;
    if (showSpinner) setTaxLoading(true);
    setTaxError(null);

    try {
      const { data, error } = await supabase.functions.invoke("manage-tax-settings", {
        body: { action: "get_snapshot", restaurant_id: restaurantId },
      });

      if (error) throw new Error(await extractFunctionError(error, "Failed to save checkout sales tax rate."));
      if (data?.error) throw new Error(String(data.error));

      const snapshot = data as TaxSnapshot;
      setTaxSnapshot(snapshot);
      setTaxAddressForm(deriveTaxAddressForm(snapshot));
      setSalesTaxRateForm({ percent: snapshot.sales_tax_rate_percent });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to refresh Stripe Tax status.";
      console.error("Failed to refresh tax settings:", message);
      setTaxError(message);
    } finally {
      if (showSpinner) setTaxLoading(false);
    }
  };

  const saveSalesTaxRate = async () => {
    if (!restaurantId || !stripeAccountId || !canManageBilling) return;

    const parsedPercent = Number(salesTaxRateForm.percent);
    if (!Number.isFinite(parsedPercent) || parsedPercent < 0 || parsedPercent > 100) {
      const message = "Enter a sales tax rate between 0.00 and 100.00.";
      setTaxError(message);
      toast.error(message);
      return;
    }

    setTaxBusy("rate");
    setTaxError(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-tax-settings", {
        body: {
          action: "update_tax_rate",
          restaurant_id: restaurantId,
          sales_tax_rate_bps: Math.round(parsedPercent * 100),
        },
      });

      if (error) throw new Error(await extractFunctionError(error, "Failed to save tax address."));
      if (data?.error) throw new Error(String(data.error));

      const snapshot = data as TaxSnapshot & { message?: string };
      setTaxSnapshot(snapshot);
      setTaxAddressForm(deriveTaxAddressForm(snapshot));
      setSalesTaxRateForm({ percent: snapshot.sales_tax_rate_percent });
      toast.success(snapshot.message ?? "Checkout sales tax rate saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save checkout sales tax rate.";
      console.error("Failed to save checkout sales tax rate:", message);
      setTaxError(message);
      toast.error(message);
    } finally {
      setTaxBusy(null);
    }
  };

  const saveTaxAddress = async () => {
    if (!restaurantId || !stripeAccountId || !canManageBilling) return;

    setTaxBusy("address");
    setTaxError(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-tax-settings", {
        body: {
          action: "update_head_office",
          restaurant_id: restaurantId,
          street_address: taxAddressForm.streetAddress,
          city: taxAddressForm.city,
          state: taxAddressForm.state.toUpperCase(),
          postal_code: taxAddressForm.postalCode,
          country: taxAddressForm.country.toUpperCase(),
        },
      });

      if (error) throw new Error(await extractFunctionError(error, "Failed to add Stripe Tax registration."));
      if (data?.error) throw new Error(String(data.error));

      const snapshot = data as TaxSnapshot & { message?: string };
      setTaxSnapshot(snapshot);
      setTaxAddressForm(deriveTaxAddressForm(snapshot));
      toast.success(snapshot.message ?? "Stripe Tax address saved.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save Stripe Tax address.";
      console.error("Failed to save Stripe Tax address:", message);
      setTaxError(message);
      toast.error(message);
    } finally {
      setTaxBusy(null);
    }
  };

  const addRegistration = async () => {
    if (!restaurantId || !stripeAccountId || !canManageBilling || !selectedRegistrationState) return;

    setTaxBusy("registration");
    setTaxError(null);
    try {
      const { data, error } = await supabase.functions.invoke("manage-tax-settings", {
        body: {
          action: "create_registration",
          restaurant_id: restaurantId,
          state: selectedRegistrationState,
        },
      });

      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(String(data.error));

      const snapshot = data as TaxSnapshot & { message?: string };
      setTaxSnapshot(snapshot);
      toast.success(snapshot.message ?? "Stripe Tax registration added.");

      const nextAvailableState = Object.keys(snapshot.us_states).find(
        (code) => !snapshot.registrations.some((registration) => registration.state === code),
      ) ?? "";
      setSelectedRegistrationState(nextAvailableState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add Stripe Tax registration.";
      console.error("Failed to add Stripe Tax registration:", message);
      setTaxError(message);
      toast.error(message);
    } finally {
      setTaxBusy(null);
    }
  };

  return (
    <div className="space-y-6 border-t border-white/5 pt-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-zinc-100">
            <CreditCard size={16} strokeWidth={1.5} className="text-amber-500/70" />
            Billing
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            Stripe payouts run on the restaurant&apos;s connected account. Checkout tax uses the fixed rate configured for this restaurant.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 bg-zinc-800/40 p-4">
        {loading ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/5 bg-zinc-700/60">
              <Loader2 size={18} strokeWidth={1.5} className="animate-spin text-zinc-500" />
            </div>
            <div className="space-y-1.5">
              <div className="h-3 w-28 rounded bg-zinc-700/60 animate-pulse" />
              <div className="h-2.5 w-44 rounded bg-zinc-700/40 animate-pulse" />
            </div>
          </div>
        ) : !canManageBilling ? (
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-zinc-700/60">
              <Landmark size={18} strokeWidth={1.5} className="text-zinc-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-zinc-200">Owner Access Required</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Only the restaurant owner or a platform admin can change payouts, the restaurant tax address, and checkout tax settings.
              </p>
            </div>
          </div>
        ) : stripeAccountId && payoutsEnabled ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <CheckCircle2 size={18} strokeWidth={1.5} className="text-emerald-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-100">Payouts Active</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Your connected account can accept card charges and receive restaurant payouts.
              </p>
              {requirementsCurrentlyDue.length > 0 ? (
                <p className="mt-1 text-[11px] text-zinc-500">
                  Stripe still has open requirements: {requirementsCurrentlyDue.slice(0, 3).join(", ")}.
                </p>
              ) : null}
            </div>
            <span className="flex flex-shrink-0 items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              <CheckCircle2 size={11} strokeWidth={2.5} />
              Active
            </span>
          </div>
        ) : stripeAccountId ? (
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10">
              <AlertTriangle size={18} strokeWidth={1.5} className="text-amber-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">Action Required</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                {detailsSubmitted
                  ? "Stripe is still reviewing this account."
                  : "Finish Stripe onboarding before accepting live card payments."}
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleConnectClick}
              disabled={actionLoading}
              className="flex min-w-[146px] flex-shrink-0 items-center justify-center gap-1.5 rounded-lg bg-orange-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-orange-500"
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/8 bg-zinc-700/60">
              <CreditCard size={18} strokeWidth={1.5} className="text-zinc-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-zinc-200">No Stripe Account Connected</p>
              <p className="mt-0.5 text-xs text-zinc-500">
                Connect Stripe first so this restaurant can receive payouts and collect its own tax.
              </p>
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
              onClick={handleConnectClick}
              disabled={actionLoading}
              className={cn(
                "flex min-w-[146px] flex-shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold shadow-lg transition-colors dark:shadow-amber-500/20",
                DASH_BTN_ADD,
              )}
            >
              {actionLoading ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <ExternalLink size={12} strokeWidth={2.5} />
                  Connect Stripe
                </>
              )}
            </motion.button>
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-xl border border-white/8 bg-zinc-900/40 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
              <ReceiptText size={15} strokeWidth={1.5} className="text-amber-500/70" />
              Sales Tax
            </h4>
            <p className="mt-0.5 text-xs text-zinc-500">
              Checkout uses a fixed tax rate configured for the restaurant&apos;s location. Customer billing or shipping addresses do not change the tax charged.
            </p>
          </div>
          {canManageBilling && stripeAccountId ? (
            <button
              type="button"
              onClick={() => void refreshTaxSnapshot(true)}
              disabled={taxLoading || taxBusy !== null}
              className="rounded-lg border border-white/10 bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {taxLoading ? "Refreshing..." : "Refresh"}
            </button>
          ) : null}
        </div>

        {!canManageBilling ? (
          <p className="text-xs text-zinc-500">
            Owners and platform admins can manage the restaurant tax address, fixed checkout tax rate, and optional Stripe Tax records here.
          </p>
        ) : !stripeAccountId ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-zinc-800/40 p-4 text-xs text-zinc-500">
            Connect Stripe first. Tax settings become available after the restaurant has a connected Stripe account.
          </div>
        ) : taxLoading && !taxSnapshot ? (
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/40 p-4 text-sm text-zinc-400">
            <Loader2 size={15} className="animate-spin" />
            Loading restaurant tax settings...
          </div>
        ) : (
          <>
            {taxSnapshot ? (
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                    taxSnapshot.tax_enabled
                      ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                      : "border-amber-500/25 bg-amber-500/10 text-amber-300",
                  )}
                >
                  {taxStatusLabel(taxSnapshot.tax_status, taxSnapshot.tax_enabled)}
                </span>
                {taxSnapshot.registrations.length > 0 ? (
                  <span className="text-[11px] text-zinc-500">
                    {taxSnapshot.registrations.length} registration{taxSnapshot.registrations.length === 1 ? "" : "s"} on file
                  </span>
                ) : null}
                <span className="text-[11px] text-zinc-500">
                  Checkout tax: {taxSnapshot.sales_tax_rate_percent}%
                </span>
              </div>
            ) : null}

            {taxError ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                <AlertTriangle size={13} strokeWidth={1.5} className="mt-0.5 flex-shrink-0" />
                {taxError}
              </div>
            ) : null}

            <div className="space-y-3 rounded-lg border border-white/10 bg-zinc-800/40 p-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Checkout Tax Rate</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Set the exact sales tax rate to charge for this restaurant&apos;s location. Rasvia applies this fixed rate at checkout regardless of the customer&apos;s address.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,220px)_auto] md:items-end">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Sales Tax Rate (%)
                  </label>
                  <Input
                    value={salesTaxRateForm.percent}
                    onChange={(event) =>
                      setSalesTaxRateForm({ percent: event.target.value })
                    }
                    placeholder="8.25"
                    inputMode="decimal"
                    className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void saveSalesTaxRate()}
                  disabled={taxBusy !== null}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                    DASH_BTN_ADD,
                  )}
                >
                  {taxBusy === "rate" ? <Loader2 size={13} className="animate-spin" /> : <ReceiptText size={13} strokeWidth={1.8} />}
                  Save Tax Rate
                </button>
              </div>

              <p className="text-[11px] text-zinc-500">
                Enter the restaurant&apos;s exact combined rate for its location. Use `0` to disable checkout tax.
              </p>
            </div>

            {taxSnapshot && !taxSnapshot.tax_enabled ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100/90">
                <p className="font-semibold text-amber-300">Stripe Tax records still need attention.</p>
                {taxSnapshot.tax_missing_fields.length > 0 ? (
                  <p className="mt-1 text-amber-100/80">
                    Missing fields: {taxSnapshot.tax_missing_fields.map(formatMissingField).join(", ")}.
                  </p>
                ) : (
                  <p className="mt-1 text-amber-100/80">
                    Save the business address and add each state where this restaurant is already registered to collect tax.
                  </p>
                )}
              </div>
            ) : null}

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1.5 md:col-span-2">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <MapPin size={12} strokeWidth={1.5} />
                  Restaurant Tax Address
                </label>
                <Input
                  value={taxAddressForm.streetAddress}
                  onChange={(event) =>
                    setTaxAddressForm((current) => ({ ...current, streetAddress: event.target.value }))
                  }
                  placeholder="123 Main St"
                  className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">City</label>
                <Input
                  value={taxAddressForm.city}
                  onChange={(event) => setTaxAddressForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="Dallas"
                  className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">State</label>
                <Input
                  value={taxAddressForm.state}
                  onChange={(event) =>
                    setTaxAddressForm((current) => ({ ...current, state: event.target.value.toUpperCase().slice(0, 2) }))
                  }
                  placeholder="TX"
                  className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Postal Code</label>
                <Input
                  value={taxAddressForm.postalCode}
                  onChange={(event) =>
                    setTaxAddressForm((current) => ({ ...current, postalCode: event.target.value }))
                  }
                  placeholder="75201"
                  className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Country</label>
                <Input
                  value={taxAddressForm.country}
                  onChange={(event) =>
                    setTaxAddressForm((current) => ({ ...current, country: event.target.value.toUpperCase().slice(0, 2) }))
                  }
                  placeholder="US"
                  className="h-10 border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void saveTaxAddress()}
                disabled={taxBusy !== null}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  DASH_BTN_ADD,
                )}
              >
                {taxBusy === "address" ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} strokeWidth={1.8} />}
                Save Tax Address
              </button>
              <p className="text-[11px] text-zinc-500">
                Use the legal business address tied to this restaurant&apos;s tax registrations and fixed checkout rate.
              </p>
            </div>

            <div className="space-y-3 rounded-lg border border-white/10 bg-zinc-800/40 p-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Stripe Tax Registrations</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Optional Stripe Tax recordkeeping. These registrations do not change the fixed checkout rate above.
                </p>
              </div>

              <div className="flex flex-col gap-3 md:flex-row">
                <div className="min-w-0 flex-1">
                  <Select value={selectedRegistrationState} onValueChange={setSelectedRegistrationState}>
                    <SelectTrigger className="h-10 border-white/10 bg-zinc-800/80 text-zinc-100">
                      <SelectValue placeholder="Choose a state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-80">
                      {availableRegistrationStates.length > 0 ? (
                        availableRegistrationStates.map(([code, label]) => (
                          <SelectItem key={code} value={code}>
                            {label} ({code})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="__none__" disabled>
                          No more states available
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <button
                  type="button"
                  onClick={() => void addRegistration()}
                  disabled={taxBusy !== null || !selectedRegistrationState || availableRegistrationStates.length === 0}
                  className="rounded-lg border border-white/10 bg-zinc-100 px-4 py-2 text-xs font-semibold text-zinc-900 transition-colors hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {taxBusy === "registration" ? "Adding..." : "Add Registration"}
                </button>
              </div>

              {taxSnapshot?.registrations.length ? (
                <div className="space-y-2">
                  {taxSnapshot.registrations
                    .slice()
                    .sort((a, b) => (a.state ?? "").localeCompare(b.state ?? ""))
                    .map((registration) => (
                      <div
                        key={registration.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium text-zinc-100">
                            {registration.state ? `${registration.state} Sales Tax` : "Registration"}
                          </p>
                          <p className="mt-0.5 text-[11px] text-zinc-500">
                            {registration.type ?? "state_sales_tax"}
                            {formatUnixDate(registration.active_from) ? ` · active ${formatUnixDate(registration.active_from)}` : ""}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide",
                            registration.status === "active"
                              ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
                              : "border-amber-500/25 bg-amber-500/10 text-amber-300",
                          )}
                        >
                          {registration.status ?? "unknown"}
                        </span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-500">
                  No Stripe Tax registrations on file yet. Checkout can still charge the fixed restaurant rate you configured above.
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {!loading && canManageBilling ? (
        <p className="px-1 text-[11px] leading-relaxed text-zinc-600">
          Stripe processes payouts securely. Rasvia stores the restaurant&apos;s business address, optional Stripe Tax registrations, and the fixed checkout sales tax rate used for customer charges.
        </p>
      ) : null}
    </div>
  );
}
