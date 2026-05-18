import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, LogOut, Mail, Phone, Save, Shield, User, Building2, Clock3, BellRing } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DASH_BTN_ADD } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

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

/** Partner account UI - used inside Settings (embedded) or standalone page. */
export default function PartnerProfilePanel({ embedded = false }: { embedded?: boolean }) {
  const { session, restaurantId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [fullNameDraft, setFullNameDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs>({ orderAlerts: true, waitlistAlerts: true, productUpdates: false });

  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  const formatPhone = (val: string) => {
    const digits = val.replace(/\D/g, "").slice(0, 10);
    if (digits.length === 0) return "";
    if (digits.length <= 3) return `(${digits}`;
    if (digits.length <= 6) return `(${digits.slice(0, 3)})-${digits.slice(3)}`;
    return `(${digits.slice(0, 3)})-${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const savePhone = async () => {
    if (!session?.user?.id) return;
    setSavingPhone(true);
    setStatusMessage("");
    const { error } = await supabase
      .from("profiles")
      .update({ phone_number: phoneDraft.trim() || null })
      .eq("id", session.user.id);
    setSavingPhone(false);

    if (error) {
      setStatusMessage(error.message || "Could not save phone number.");
      return;
    }

    setProfile((p) => (p ? { ...p, phone_number: phoneDraft.trim() || null } : p));
    setEditingPhone(false);
    setStatusMessage("Phone number updated.");
  };

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

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" as any });
    window.location.assign("/partner-portal");
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center px-6 py-12 text-zinc-100">
        <div className="space-y-3 text-center">
          <h1 className="text-xl font-semibold">Sign in required</h1>
          <button
            type="button"
            onClick={() => window.location.assign("/partner-portal")}
            className="rounded-lg border border-amber-500/30 bg-amber-500/15 px-5 py-2 text-amber-300"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const shell = embedded ? "min-h-0 w-full max-w-none space-y-4 text-zinc-100" : "min-h-screen px-4 py-6 text-zinc-100 sm:px-8";
  const inner = embedded ? "w-full space-y-5" : "mx-auto w-full max-w-3xl space-y-5";
  const cardClass = embedded
    ? "space-y-4 rounded-xl border border-white/[0.08] bg-zinc-900/45 p-5 backdrop-blur-sm sm:p-6"
    : "space-y-4 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6";
  const sectionCard = embedded
    ? "space-y-3 rounded-xl border border-white/[0.08] bg-zinc-900/45 p-5 backdrop-blur-sm sm:p-6"
    : "space-y-3 rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6";

  return (
    <div className={shell}>
      <div className={inner}>
        {!embedded && (
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => window.location.assign("/partner-portal")}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/60"
            >
              <ArrowLeft size={15} /> Back to Dashboard
            </button>
          </div>
        )}

        <div className={cardClass}>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">My Profile</h1>
          <p className="text-sm text-zinc-400">Manage your account details, security actions, and preferences.</p>

          <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[1fr_auto]">
            <div className="space-y-1.5">
              <label className="text-xs uppercase tracking-wider text-zinc-500">Full name</label>
              <input
                value={fullNameDraft}
                onChange={(e) => setFullNameDraft(e.target.value)}
                placeholder="Your full name"
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-800/70 px-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-amber-500/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={saveName}
              disabled={!canSaveName || saving}
              className={cn(
                "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors disabled:opacity-45",
                DASH_BTN_ADD,
              )}
            >
              <Save size={15} /> {saving ? "Saving..." : "Save Name"}
            </button>
          </div>

          {statusMessage && <p className="text-xs text-amber-300">{statusMessage}</p>}
        </div>

        <div className={sectionCard}>
          <h2 className="text-base font-semibold">Account Details</h2>
          {loading ? (
            <p className="text-sm text-zinc-500">Loading account details...</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {infoRows.map(({ label, value, icon: Icon }) => {
                if (label === "Phone") {
                  return (
                    <div key={label} className="rounded-xl border border-white/8 bg-zinc-800/50 px-3 py-2.5 flex flex-col justify-center relative min-h-[56px]">
                      <div className="flex items-center justify-between mb-1">
                        <p className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
                          <Icon size={12} /> {label}
                        </p>
                        {!editingPhone ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPhoneDraft(value === "-" ? "" : value);
                              setEditingPhone(true);
                            }}
                            className="text-[10px] uppercase font-semibold text-amber-500 hover:text-amber-400"
                          >
                            Edit
                          </button>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingPhone(false)}
                              className="text-[10px] uppercase font-semibold text-zinc-400 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={savePhone}
                              disabled={savingPhone}
                              className="text-[10px] uppercase font-semibold text-amber-500 hover:text-amber-400 disabled:opacity-50"
                            >
                              {savingPhone ? "..." : "Save"}
                            </button>
                          </div>
                        )}
                      </div>
                      {!editingPhone ? (
                        <p className="break-all text-sm text-zinc-100">{value}</p>
                      ) : (
                        <input
                          autoFocus
                          value={phoneDraft}
                          onChange={(e) => setPhoneDraft(formatPhone(e.target.value))}
                          placeholder="(xxx)-xxx-xxxx"
                          className="h-6 w-full rounded border-none bg-zinc-900 px-2 text-sm text-zinc-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                      )}
                    </div>
                  );
                }
                return (
                  <div key={label} className="rounded-xl border border-white/8 bg-zinc-800/50 px-3 py-2.5 min-h-[56px]">
                    <p className="mb-1 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-zinc-500">
                      <Icon size={12} /> {label}
                    </p>
                    <p className="break-all text-sm text-zinc-100">{value}</p>
                  </div>
                );
              })}
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

        <div className={sectionCard}>
          <h2 className="text-base font-semibold">Security</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={signOutAll}
              className="hover-red-override group inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm text-red-300 transition-colors hover:border-red-600 hover:bg-red-600 hover:text-white"
            >
              <LogOut size={14} className="group-hover:text-white" /> Sign Out All Sessions
            </button>
          </div>
        </div>

        <div className={sectionCard}>
          <h2 className="text-base font-semibold">Preferences</h2>
          <div className="space-y-2">
            {[
              { key: "orderAlerts", label: "Order alerts" },
              { key: "waitlistAlerts", label: "Waitlist alerts" },
              { key: "productUpdates", label: "Product updates" },
            ].map((pref) => (
              <label key={pref.key} className="flex items-center justify-between rounded-lg border border-white/8 bg-zinc-800/50 px-3 py-2.5">
                <span className="inline-flex items-center gap-2 text-sm text-zinc-200">
                  <BellRing size={14} /> {pref.label}
                </span>
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

        <p
          className={
            embedded
              ? "rounded-xl border border-white/[0.08] bg-zinc-900/35 px-4 py-3 text-xs text-zinc-500"
              : "rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 text-xs text-zinc-500"
          }
        >
          Guest hero carousel is configured under Settings → <span className="text-zinc-400">Restaurant</span>.
        </p>
      </div>
    </div>
  );
}
