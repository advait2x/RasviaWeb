import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, LogOut, Mail, Phone, Save, Shield, User, Building2, Clock3, BellRing, Lock, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type Prefs = {
  orderAlerts: boolean;
  waitlistAlerts: boolean;
  productUpdates: boolean;
};

const PREFS_KEY = "rasvia:web:profile-prefs:v1";

function formatDate(value?: string | null) {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString([], { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
}

function prettyRole(role: string | null) {
  if (!role) return "Staff";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PartnerProfilePage() {
  const { session, restaurantId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [fullNameDraft, setFullNameDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [resetStep, setResetStep] = useState<"idle" | "enter-code" | "new-password" | "done">("idle");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetError, setResetError] = useState("");
  const [prefs, setPrefs] = useState<Prefs>({ orderAlerts: true, waitlistAlerts: true, productUpdates: false });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PREFS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Prefs>;
        setPrefs((prev) => ({
          orderAlerts: parsed.orderAlerts ?? prev.orderAlerts,
          waitlistAlerts: parsed.waitlistAlerts ?? prev.waitlistAlerts,
          productUpdates: parsed.productUpdates ?? prev.productUpdates,
        }));
      }
    } catch {
      // noop
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  }, [prefs]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!session?.user?.id) {
        setLoading(false);
        return;
      }
      try {
        const [{ data: profileData }, restResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("full_name, email, phone_number, role, created_at, updated_at")
            .eq("id", session.user.id)
            .maybeSingle(),
          restaurantId
            ? supabase.from("restaurants").select("name").eq("id", restaurantId).maybeSingle()
            : Promise.resolve({ data: null as any }),
        ]);

        if (!active) return;
        const row = (profileData as ProfileRow | null) ?? null;
        setProfile(row);
        setFullNameDraft(row?.full_name ?? "");
        setRestaurantName(String((restResult as any)?.data?.name ?? ""));
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id, restaurantId]);

  const accountId = session?.user?.id ?? "";
  const email = profile?.email || session?.user?.email || "-";
  const role = prettyRole(userRole || profile?.role || null);
  const createdAt = profile?.created_at || session?.user?.created_at || null;
  const lastSignInAt = session?.user?.last_sign_in_at || null;
  const canSaveName = fullNameDraft.trim() !== (profile?.full_name ?? "").trim();

  const infoRows = useMemo(
    () => [
      { label: "Role", value: role, icon: Shield },
      { label: "Email", value: email, icon: Mail },
      { label: "Phone", value: profile?.phone_number || "-", icon: Phone },
      { label: "Restaurant", value: restaurantName || "Not linked", icon: Building2 },
      { label: "Restaurant ID", value: restaurantId ? String(restaurantId) : "-", icon: Building2 },
      { label: "Account Created", value: formatDate(createdAt), icon: Clock3 },
      { label: "Last Sign-In", value: formatDate(lastSignInAt), icon: Clock3 },
      { label: "Account ID", value: accountId || "-", icon: User },
    ],
    [role, email, profile?.phone_number, restaurantName, restaurantId, createdAt, lastSignInAt, accountId]
  );

  const copyAccountId = async () => {
    if (!accountId) return;
    try {
      await navigator.clipboard.writeText(accountId);
      setStatusMessage("Account ID copied.");
    } catch {
      setStatusMessage("Could not copy account ID.");
    }
  };

  const saveName = async () => {
    if (!session?.user?.id) return;
    setSaving(true);
    setStatusMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullNameDraft.trim() || null })
      .eq("id", session.user.id);
    setSaving(false);

    if (error) {
      setStatusMessage(error.message || "Could not save name.");
      return;
    }

    setProfile((p) => (p ? { ...p, full_name: fullNameDraft.trim() || null } : p));
    setStatusMessage("Profile updated.");
  };

  const sendPasswordReset = async () => {
    if (!email || email === "-") return;
    setSendingReset(true);
    setResetError("");
    setStatusMessage("Sending reset code…");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/partner-profile`,
    });
    setSendingReset(false);
    if (error) {
      setStatusMessage("");
      setResetError(error.message || "Could not send reset email.");
      return;
    }
    setResetStep("enter-code");
    setStatusMessage("Reset code sent. Check your email.");
  };

  const verifyResetCode = async () => {
    if (!email || email === "-") return;
    const token = resetCode.replace(/\D/g, "");
    if (token.length !== 7) {
      setResetError("Please enter the full 7-digit code.");
      return;
    }
    setVerifyingCode(true);
    setResetError("");
    setStatusMessage("Verifying code…");
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });
    setVerifyingCode(false);
    if (error) {
      setStatusMessage("");
      setResetError(error.message || "Invalid code.");
      return;
    }
    setResetStep("new-password");
    setStatusMessage("Code verified. Set your new password.");
  };

  const updatePassword = async () => {
    if (newPassword.length < 6) {
      setResetError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setResetError("Passwords do not match.");
      return;
    }
    setUpdatingPassword(true);
    setResetError("");
    setStatusMessage("Updating password…");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setUpdatingPassword(false);
    if (error) {
      setStatusMessage("");
      setResetError(error.message || "Could not update password.");
      return;
    }
    setResetStep("done");
    setStatusMessage("Password updated successfully.");
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" as any });
    window.location.assign("/partner-portal");
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 flex items-center justify-center px-6">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <button
            type="button"
            onClick={() => window.location.assign("/partner-portal")}
            className="px-5 py-2 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 px-4 py-6 sm:px-8">
      <div className="mx-auto w-full max-w-3xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => window.location.assign("/partner-portal")}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/60"
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-sm text-zinc-400">Manage your account details, security actions, and preferences.</p>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3 items-end">
            <div className="space-y-1.5">
              <label className="text-xs text-zinc-500 uppercase tracking-wider">Full name</label>
              <input
                value={fullNameDraft}
                onChange={(e) => setFullNameDraft(e.target.value)}
                placeholder="Your full name"
                className="w-full h-11 rounded-xl border border-white/10 bg-zinc-800/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>
            <button
              type="button"
              onClick={saveName}
              disabled={!canSaveName || saving}
              className="h-11 px-4 rounded-xl border border-amber-500/40 bg-amber-500/15 text-amber-300 text-sm font-semibold disabled:opacity-45 inline-flex items-center justify-center gap-2"
            >
              <Save size={15} /> {saving ? "Saving..." : "Save Name"}
            </button>
          </div>

          {statusMessage && <p className="text-xs text-amber-300">{statusMessage}</p>}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-semibold">Account Details</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading account details...</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {infoRows.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-xl border border-white/8 bg-zinc-800/50 px-3 py-2.5">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider mb-1 inline-flex items-center gap-1.5">
                    <Icon size={12} /> {label}
                  </p>
                  <p className="text-sm text-zinc-100 break-all">{value}</p>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={copyAccountId}
            className="mt-1 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-700/60"
          >
            <Copy size={13} /> Copy Account ID
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-semibold">Security</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={sendPasswordReset}
              disabled={sendingReset}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"
            >
              <Lock size={14} /> {sendingReset ? "Sending..." : "Change Password"}
            </button>
            <button
              type="button"
              onClick={signOutAll}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm text-red-300"
            >
              <LogOut size={14} /> Sign Out All Sessions
            </button>
          </div>

          {resetStep !== "idle" && (
            <div className="mt-2 rounded-xl border border-white/10 bg-zinc-800/55 p-4 space-y-3">
              {resetStep === "enter-code" && (
                <>
                  <p className="text-sm text-zinc-300">Enter the 7-digit code sent to <span className="text-zinc-100 font-semibold">{email}</span>.</p>
                  <input
                    value={resetCode}
                    onChange={(e) => setResetCode(e.target.value.replace(/\\D/g, "").slice(0, 7))}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="sr-only"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const active = document.activeElement as HTMLElement | null;
                      if (active) active.blur();
                      const hidden = document.querySelector<HTMLInputElement>('input[autocomplete=\"one-time-code\"]');
                      hidden?.focus();
                    }}
                    className="w-full"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {Array.from({ length: 7 }).map((_, i) => {
                        const filled = i < resetCode.length;
                        return (
                          <div
                            key={i}
                            className={`h-11 flex-1 rounded-xl border text-center flex items-center justify-center text-base font-semibold ${
                              filled ? "border-amber-500/45 bg-amber-500/10 text-amber-300" : "border-white/12 bg-zinc-900/50 text-zinc-500"
                            }`}
                          >
                            {filled ? resetCode[i] : ""}
                          </div>
                        );
                      })}
                    </div>
                  </button>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={verifyResetCode}
                      disabled={verifyingCode || resetCode.length !== 7}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"
                    >
                      {verifyingCode ? <RefreshCw size={14} className="animate-spin" /> : <Shield size={14} />} Verify Code
                    </button>
                    <button
                      type="button"
                      onClick={sendPasswordReset}
                      disabled={sendingReset}
                      className="rounded-lg border border-white/10 bg-zinc-700/50 px-3 py-2 text-sm text-zinc-300 disabled:opacity-50"
                    >
                      Resend
                    </button>
                  </div>
                </>
              )}

              {resetStep === "new-password" && (
                <>
                  <p className="text-sm text-zinc-300">Code verified. Enter your new password.</p>
                  <div className="space-y-2">
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password"
                        className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/60 px-3 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full h-11 rounded-xl border border-white/10 bg-zinc-900/60 px-3 pr-10 text-sm text-zinc-100 placeholder:text-zinc-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={updatePassword}
                    disabled={updatingPassword}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/15 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"
                  >
                    {updatingPassword ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
                    Update Password
                  </button>
                </>
              )}

              {resetStep === "done" && (
                <div className="rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300 inline-flex items-center gap-2">
                  <CheckCircle2 size={15} /> Password updated.
                </div>
              )}

              {resetError && (
                <p className="text-xs text-red-400">{resetError}</p>
              )}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-semibold">Preferences</h2>
          <div className="space-y-2">
            {[
              { key: "orderAlerts", label: "Order alerts" },
              { key: "waitlistAlerts", label: "Waitlist alerts" },
              { key: "productUpdates", label: "Product updates" },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2.5">
                <span className="text-sm text-zinc-200 inline-flex items-center gap-2"><BellRing size={14} /> {pref.label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(prefs[pref.key as keyof Prefs])}
                  onChange={(e) => setPrefs((p) => ({ ...p, [pref.key]: e.target.checked }))}
                  className="h-4 w-4 accent-amber-500"
                />
              </label>
            ))}
          </div>
          <p className="text-xs text-zinc-500">Preferences are saved on this browser for now.</p>
        </div>
      </div>
    </div>
  );
}
