import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, LogOut, Mail, Phone, Save, Shield, User, Building2, Clock3, BellRing, RefreshCw, Plus, ChevronUp, ChevronDown, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  phone_number: string | null;
  role: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  use_regular_image_as_first_slide?: boolean | null;
};

type Prefs = {
  orderAlerts: boolean;
  waitlistAlerts: boolean;
  productUpdates: boolean;
};

type MenuItemOption = { id: number; name: string; image_url: string | null };
type SlideDraft = { localId: string; imageUrl: string; menuItemId: number | null };

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

function toPublicImageUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return supabase.storage.from("restaurant-images").getPublicUrl(raw).data.publicUrl;
}

export default function PartnerProfilePage() {
  const { session, restaurantId, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [restaurantName, setRestaurantName] = useState<string>("");
  const [fullNameDraft, setFullNameDraft] = useState("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [prefs, setPrefs] = useState<Prefs>({ orderAlerts: true, waitlistAlerts: true, productUpdates: false });
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [carouselSaving, setCarouselSaving] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const [includeDefaultStarter, setIncludeDefaultStarter] = useState(true);

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
            ? supabase.from("restaurants").select("name, use_regular_image_as_first_slide").eq("id", restaurantId).maybeSingle()
            : Promise.resolve({ data: null as any }),
        ]);

        if (!active) return;
        const row = (profileData as ProfileRow | null) ?? null;
        setProfile(row);
        setFullNameDraft(row?.full_name ?? "");
        setRestaurantName(String((restResult as any)?.data?.name ?? ""));
        setIncludeDefaultStarter((restResult as any)?.data?.use_regular_image_as_first_slide !== false);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id, restaurantId]);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!restaurantId) return;
      const rid = Number(restaurantId);
      if (!Number.isFinite(rid) || rid <= 0) return;

      try {
        const [menuRes, slidesRes] = await Promise.all([
          supabase
            .from("menu_items")
            .select("id, name, image_url")
            .eq("restaurant_id", rid)
            .order("name", { ascending: true }),
          supabase
            .from("restaurant_media_slides")
            .select("id, image_url, menu_item_id, position")
            .eq("restaurant_id", rid)
            .order("position", { ascending: true }),
        ]);

        if (!active) return;
        if (!menuRes.error) setMenuItems((menuRes.data ?? []) as MenuItemOption[]);
        if (!slidesRes.error) {
          const next = ((slidesRes.data ?? []) as any[]).map((row) => ({
            localId: String(row.id),
            imageUrl: String(row.image_url ?? ""),
            menuItemId: row.menu_item_id ? Number(row.menu_item_id) : null,
          }));
          setSlides(next);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      active = false;
    };
  }, [restaurantId]);

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

  const addSlide = () =>
    setSlides((prev) => [
      ...prev,
      { localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`, imageUrl: "", menuItemId: null },
    ]);

  const updateSlide = (localId: string, patch: Partial<SlideDraft>) =>
    setSlides((prev) => prev.map((s) => (s.localId === localId ? { ...s, ...patch } : s)));

  const removeSlide = (localId: string) => setSlides((prev) => prev.filter((s) => s.localId !== localId));

  const moveSlide = (index: number, dir: -1 | 1) => {
    setSlides((prev) => {
      const target = index + dir;
      if (target < 0 || target >= prev.length) return prev;
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const uploadImageForSlide = async (localId: string, file: File | null) => {
    if (!file) return;
    const rid = Number(restaurantId);
    if (!Number.isFinite(rid) || rid <= 0) {
      setStatusMessage("No restaurant selected.");
      return;
    }
    try {
      setUploadingSlideId(localId);
      const extFromName = file.name.split(".").pop()?.toLowerCase();
      const ext = extFromName && /^[a-z0-9]+$/.test(extFromName) ? extFromName : "jpg";
      const path = `${rid}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;
      const { data, error } = await supabase.storage
        .from("restaurant-images")
        .upload(path, file, { upsert: false, contentType: file.type || "image/jpeg" });
      if (error) throw error;
      updateSlide(localId, { imageUrl: data.path });
      setStatusMessage("Image uploaded.");
    } catch (err: any) {
      setStatusMessage(err?.message || "Could not upload image.");
    } finally {
      setUploadingSlideId(null);
    }
  };

  const saveCarousel = async () => {
    const rid = Number(restaurantId);
    if (!Number.isFinite(rid) || rid <= 0) return;
    const validSlides = slides.filter((s) => s.imageUrl.trim().length > 0 || !!s.menuItemId);
    setCarouselSaving(true);
    try {
      const { error: restUpdateErr } = await supabase
        .from("restaurants")
        .update({ use_regular_image_as_first_slide: includeDefaultStarter })
        .eq("id", rid);
      if (restUpdateErr) throw restUpdateErr;

      const { error: delError } = await supabase.from("restaurant_media_slides").delete().eq("restaurant_id", rid);
      if (delError) throw delError;
      if (validSlides.length > 0) {
        const payload = validSlides.map((s, idx) => ({
          restaurant_id: rid,
          position: idx,
          image_url: s.imageUrl.trim() || null,
          menu_item_id: s.menuItemId,
        }));
        const { error: insError } = await supabase.from("restaurant_media_slides").insert(payload as any);
        if (insError) throw insError;
      }
      setStatusMessage("Carousel settings saved.");
    } catch (err: any) {
      setStatusMessage(err?.message || "Could not save carousel settings.");
    } finally {
      setCarouselSaving(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 flex items-center justify-center px-6">
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
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 px-4 py-6 sm:px-8">
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
              onClick={signOutAll}
              className="inline-flex items-center gap-2 rounded-lg border border-red-500/35 bg-red-500/12 px-3 py-2 text-sm text-red-300"
            >
              <LogOut size={14} /> Sign Out All Sessions
            </button>
          </div>

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

        <div className="rounded-2xl border border-white/10 bg-zinc-900/70 p-5 sm:p-6 space-y-3">
          <h2 className="text-base font-semibold">Restaurant Media Carousel</h2>
          <p className="text-xs text-zinc-500">
            First slide is the starting image. Add image URLs, optional linked menu items, and reorder.
          </p>

          <div className="rounded-xl border border-white/10 bg-zinc-800/55 p-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Use regular restaurant image as slide 1</p>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {includeDefaultStarter ? "Custom slides start at Slide 2." : "Custom slides start at Slide 1."}
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeDefaultStarter}
                onChange={(e) => setIncludeDefaultStarter(e.target.checked)}
                className="h-4 w-4 accent-amber-500"
              />
            </label>
          </div>

          <div className="space-y-2">
            {slides.map((slide, index) => (
              <div key={slide.localId} className="rounded-xl border border-white/10 bg-zinc-800/55 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-zinc-100">
                    Slide {index + (includeDefaultStarter ? 2 : 1)}
                    {index === 0 ? (includeDefaultStarter ? " (First custom slide)" : " (Starts first)") : ""}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveSlide(index, -1)}
                      disabled={index === 0}
                      className="rounded-md border border-white/10 bg-zinc-900/60 p-1.5 text-zinc-300 disabled:opacity-40"
                    >
                      <ChevronUp size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSlide(index, 1)}
                      disabled={index === slides.length - 1}
                      className="rounded-md border border-white/10 bg-zinc-900/60 p-1.5 text-zinc-300 disabled:opacity-40"
                    >
                      <ChevronDown size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSlide(slide.localId)}
                      className="rounded-md border border-red-500/30 bg-red-500/10 p-1.5 text-red-300"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <input
                  value={slide.imageUrl}
                  onChange={(e) => updateSlide(slide.localId, { imageUrl: e.target.value })}
                  placeholder="Storage path or https://image-url..."
                  className="w-full h-10 rounded-lg border border-white/10 bg-zinc-900/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-500"
                />

                {!!slide.imageUrl.trim() && (
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wide text-zinc-500">Preview</p>
                    <img
                      src={toPublicImageUrl(slide.imageUrl)}
                      alt="Slide preview"
                      className="h-16 w-16 rounded-lg border border-white/10 bg-zinc-900/40 object-cover"
                    />
                  </div>
                )}

                <div>
                  <input
                    id={`carousel-upload-${slide.localId}`}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0] ?? null;
                      void uploadImageForSlide(slide.localId, file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <label
                    htmlFor={`carousel-upload-${slide.localId}`}
                    className={`inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-900/60 px-3 py-2 text-sm text-zinc-200 ${uploadingSlideId === slide.localId ? "opacity-60 pointer-events-none" : "cursor-pointer"}`}
                  >
                    {uploadingSlideId === slide.localId ? "Uploading..." : "Upload from Computer"}
                  </label>
                </div>

                <select
                  value={slide.menuItemId ?? ""}
                  onChange={(e) => updateSlide(slide.localId, { menuItemId: e.target.value ? Number(e.target.value) : null })}
                  className="w-full h-10 rounded-lg border border-white/10 bg-zinc-900/60 px-3 text-sm text-zinc-100"
                >
                  <option value="">No linked menu item</option>
                  {menuItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={addSlide}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-zinc-800/60 px-3 py-2 text-sm text-zinc-200"
            >
              <Plus size={14} /> Add Slide
            </button>
            <button
              type="button"
              onClick={saveCarousel}
              disabled={carouselSaving}
              className="inline-flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/12 px-3 py-2 text-sm text-amber-300 disabled:opacity-50"
            >
              {carouselSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />} Save Carousel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
