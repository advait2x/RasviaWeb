import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, MapPin, Phone, UtensilsCrossed, FileText,
  Check, X, Loader2, AlertTriangle, Plus, Pencil, Clock,
  ImageIcon, Upload, Trash2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import TeamRolesPanel from "@/components/dashboard/TeamRolesPanel";
import PartnerProfilePanel from "@/components/dashboard/PartnerProfilePanel";
import RestaurantMediaCarousel from "@/components/dashboard/RestaurantMediaCarousel";
import { useDashboard } from "@/context/DashboardContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import StripeConnect from "@/components/dashboard/StripeConnect";
import { getRestaurantFallback } from "@/lib/fallbackImages";
import FallbackImage from "@/components/ui/FallbackImage";
import { cn } from "@/lib/utils";
import { DASH_BTN_ADD_XS } from "@/lib/dashboardUi";

// ── Phone formatting ─────────────────────────────────────────────────────────

function formatPhoneForDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length <= 3) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function stripPhoneDigits(s: string): string {
  return s.replace(/\D/g, "").slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantProfile {
  name: string;
  address: string;
  phone: string;
  cuisineTags: string[];
  description: string;
  imageUrl: string;
  chainGroupKey: string;
}

const DEFAULT_CUISINE_OPTIONS = [
  "North Indian",
  "South Indian",
  "Mughlai",
  "Punjabi",
  "Bengali",
  "Rajasthani",
  "Gujarati",
  "Kerala",
  "Hyderabadi",
  "Goan",
  "Chettinad",
  "Awadhi",
  "Kashmiri",
  "Maharashtrian",
  "Street Food",
  "Chaat",
  "Tandoori",
  "Biryani",
  "Dosa & Idli",
  "Indo-Chinese",
  "Coastal",
  "Vegetarian",
  "Vegan",
  "Jain",
  "Thali",
  "Mithai & Desserts",
];

interface TimePeriod {
  open: string;   // "09:00"
  close: string;  // "22:00"
}

interface DayHours {
  closed: boolean;
  periods: TimePeriod[];
}

type OperatingHours = Record<string, DayHours>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultDayHours = (): DayHours => ({ closed: false, periods: [{ open: "09:00", close: "22:00" }] });

const defaultHours = (): OperatingHours =>
  Object.fromEntries(DAYS.map((d) => [d, defaultDayHours()]));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const empty = (): RestaurantProfile => ({
  name: "",
  address: "",
  phone: "",
  cuisineTags: [],
  description: "",
  imageUrl: "",
  chainGroupKey: "",
});

function parseHoursRows(rows: Record<string, unknown>[]): OperatingHours {
  const result = defaultHours();
  const grouped = new Map<number, TimePeriod[]>();
  for (const row of rows) {
    const idx = row.day_of_week as number; // 0=Sun, 1=Mon … 6=Sat
    const openRaw = (row.open_time as string | null) ?? "";
    const closeRaw = (row.close_time as string | null) ?? "";
    if (!DAYS[idx] || !openRaw || !closeRaw) continue;
    const next = grouped.get(idx) ?? [];
    next.push({
      open: openRaw.slice(0, 5),
      close: closeRaw.slice(0, 5),
    });
    grouped.set(idx, next);
  }
  for (let idx = 0; idx < DAYS.length; idx += 1) {
    const day = DAYS[idx];
    const periods = (grouped.get(idx) ?? []).sort((a, b) => a.open.localeCompare(b.open));
    result[day] = periods.length > 0
      ? { closed: false, periods }
      : { closed: true, periods: [] };
  }
  return result;
}
function fmt12(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

type SettingsTab = "restaurant" | "partner" | "hours" | "team";

export default function SettingsPanel() {
  const { restaurantId, isAdmin, isRestaurantOwner } = useAuth();
  const { setActiveView } = useDashboard();
  const showTeamSection = isAdmin || isRestaurantOwner;

  const [activeTab, setActiveTab] = useState<SettingsTab>("restaurant");
  const [showRemoveImageConfirm, setShowRemoveImageConfirm] = useState(false);

  useEffect(() => {
    try {
      const v = sessionStorage.getItem("rasvia:open_settings_panel");
      if (v) {
        sessionStorage.removeItem("rasvia:open_settings_panel");
        setActiveView("settings");
        if (v === "partner") {
          setActiveTab("partner");
        }
      }
    } catch {
      /* ignore */
    }
  }, [setActiveView]);

  // Profile
  const [profile, setProfile] = useState<RestaurantProfile>(empty());
  const [draft, setDraft] = useState<RestaurantProfile>(empty());
  const [loading, setLoading] = useState(true);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showWaitlistSettingsDialog, setShowWaitlistSettingsDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [communityImagesEnabled, setCommunityImagesEnabled] = useState(true);
  const [savedCommunityImagesEnabled, setSavedCommunityImagesEnabled] = useState(true);
  const [communityImagesSettingAvailable, setCommunityImagesSettingAvailable] = useState(true);
  const [phoneEditing, setPhoneEditing] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState("");

  // Operating hours
  const [hours, setHours] = useState<OperatingHours | null>(null);
  const [hoursDraft, setHoursDraft] = useState<OperatingHours>(defaultHours());
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const [waitlistEarlyEnabled, setWaitlistEarlyEnabled] = useState(false);
  const [waitlistEarlyMinutes, setWaitlistEarlyMinutes] = useState(30);
  const [savedWaitlistEarlyEnabled, setSavedWaitlistEarlyEnabled] = useState(false);
  const [savedWaitlistEarlyMinutes, setSavedWaitlistEarlyMinutes] = useState(30);
  const [maxWaitlistSize, setMaxWaitlistSize] = useState(15);
  const [savedMaxWaitlistSize, setSavedMaxWaitlistSize] = useState(15);

  const fetchProfile = useCallback(async () => {
    if (!restaurantId) return;

    const [profileRes, cuisinesRes] = await Promise.all([
      supabase.from("restaurants").select("*").eq("id", restaurantId).maybeSingle(),
      supabase.from("restaurants").select("cuisine_tags").not("cuisine_tags", "is", null),
    ]);

    if (profileRes.error) {
      console.error("fetchProfile failed:", profileRes.error.message);
      setLoading(false);
      return;
    }

    const row = profileRes.data as Record<string, unknown> | null;
    const p: RestaurantProfile = {
      name: String(row?.name ?? row?.restaurant_name ?? ""),
      address: String(row?.address ?? row?.location ?? ""),
      phone: String(row?.phone ?? row?.phone_number ?? ""),
      cuisineTags: Array.isArray(row?.cuisine_tags) ? (row.cuisine_tags as string[]) : [],
      description: String(row?.description ?? row?.bio ?? ""),
      imageUrl: String(row?.image_url ?? ""),
      chainGroupKey: String(row?.chain_group_key ?? ""),
    };
    setProfile(p);
    setDraft(p);
    setPhoneDraft(formatPhoneForDisplay(p.phone));
    const hasCommunitySetting = !!(row && Object.prototype.hasOwnProperty.call(row, "accept_community_image_contributions"));
    setCommunityImagesSettingAvailable(hasCommunitySetting);
    if (hasCommunitySetting) {
      const enabled = row?.accept_community_image_contributions !== false;
      setCommunityImagesEnabled(enabled);
      setSavedCommunityImagesEnabled(enabled);
    }

    const earlyEn = row?.waitlist_early_open_enabled === true;
    const earlyM = Math.max(0, Math.min(24 * 60, Number(row?.waitlist_early_open_minutes) || 30));
    setWaitlistEarlyEnabled(earlyEn);
    setWaitlistEarlyMinutes(earlyM);
    setSavedWaitlistEarlyEnabled(earlyEn);
    setSavedWaitlistEarlyMinutes(earlyM);
    const maxWait = Math.max(1, Math.min(200, Number(row?.max_waitlist_size) || 15));
    setMaxWaitlistSize(maxWait);
    setSavedMaxWaitlistSize(maxWait);

    const dbTags: string[] = [];
    if (!cuisinesRes.error && cuisinesRes.data) {
      const allTags = (cuisinesRes.data as { cuisine_tags: unknown }[])
        .flatMap((r) => Array.isArray(r.cuisine_tags) ? (r.cuisine_tags as string[]) : [])
        .map((t) => t?.trim())
        .filter(Boolean);
      dbTags.push(...allTags);
    }
    const merged = [...new Set([...DEFAULT_CUISINE_OPTIONS, ...dbTags])].sort();
    setCuisineOptions(merged);

    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { if (showOtherInput) otherInputRef.current?.focus(); }, [showOtherInput]);

  const commitOther = () => {
    const val = otherValue.trim();
    if (val) {
      setCuisineOptions((prev) => prev.includes(val) ? prev : [...prev, val].sort());
      setDraft((d) => ({ ...d, cuisineTags: d.cuisineTags.includes(val) ? d.cuisineTags : [...d.cuisineTags, val] }));
    }
    setOtherValue("");
    setShowOtherInput(false);
  };

  const toggleTag = (tag: string) => {
    setDraft((d) => ({
      ...d,
      cuisineTags: d.cuisineTags.includes(tag) ? d.cuisineTags.filter((t) => t !== tag) : [...d.cuisineTags, tag],
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;

    setImageUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `restaurants/${restaurantId}/profile.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("restaurant-images")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("restaurant-images")
        .getPublicUrl(path);

      const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from("restaurants")
        .update({ image_url: publicUrl })
        .eq("id", restaurantId);

      if (updateError) throw updateError;

      setProfile((p) => ({ ...p, imageUrl: publicUrl }));
      setDraft((d) => ({ ...d, imageUrl: publicUrl }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const performImageRemove = async () => {
    if (!restaurantId) return;
    setShowRemoveImageConfirm(false);
    setImageUploading(true);
    try {
      const { error } = await supabase
        .from("restaurants")
        .update({ image_url: null })
        .eq("id", restaurantId);
      if (error) throw error;

      setProfile((p) => ({ ...p, imageUrl: "" }));
      setDraft((d) => ({ ...d, imageUrl: "" }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove image";
      setSaveError(msg);
      setTimeout(() => setSaveError(null), 4000);
    } finally {
      setImageUploading(false);
    }
  };

  // ── Fetch operating hours from restaurant_hours table ────────────────────
  const fetchHours = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurant_hours")
      .select("*")
      .eq("restaurant_id", restaurantId);
    if (error) {
      console.error("fetchHours failed:", error.message);
      setHoursLoaded(true);
      return;
    }
    const rows = (data ?? []) as Record<string, unknown>[];
    const parsed = parseHoursRows(rows);
    setHours(rows.length > 0 ? parsed : null);
    setHoursDraft(parsed);
    setHoursLoaded(true);
  }, [restaurantId]);

  useEffect(() => { fetchProfile(); fetchHours(); }, [fetchProfile, fetchHours]);

  const isDirty =
    JSON.stringify(draft) !== JSON.stringify(profile) ||
    (communityImagesSettingAvailable && communityImagesEnabled !== savedCommunityImagesEnabled);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    setSaveError(null);
    const patch: Record<string, unknown> = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      cuisine_tags: draft.cuisineTags,
      description: draft.description.trim(),
      chain_group_key: draft.chainGroupKey.trim() || null,
      phone_number: stripPhoneDigits(phoneDraft) || null,
    };
    if (communityImagesSettingAvailable) {
      patch.accept_community_image_contributions = communityImagesEnabled;
    }
    const { error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId);
    setSaving(false);
    setShowConfirm(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setProfile({ ...draft, phone: stripPhoneDigits(phoneDraft) });
      setSavedCommunityImagesEnabled(communityImagesEnabled);
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDiscard = () => {
    setDraft({ ...profile });
    setPhoneDraft(formatPhoneForDisplay(profile.phone));
    setCommunityImagesEnabled(savedCommunityImagesEnabled);
    setEditing(false);
    setShowOtherInput(false);
    setOtherValue("");
  };

  // Operating hours handlers
  const setDayClosed = (day: string, closed: boolean) => {
    setHoursDraft((prev) => {
      const current = prev[day] ?? defaultDayHours();
      return {
        ...prev,
        [day]: {
          closed,
          periods: closed
            ? []
            : (current.periods.length > 0 ? current.periods : [{ open: "09:00", close: "22:00" }]),
        },
      };
    });
  };

  const setPeriodField = (day: string, idx: number, field: keyof TimePeriod, value: string) => {
    setHoursDraft((prev) => {
      const current = prev[day] ?? defaultDayHours();
      const nextPeriods = [...current.periods];
      nextPeriods[idx] = { ...nextPeriods[idx], [field]: value };
      return { ...prev, [day]: { ...current, periods: nextPeriods } };
    });
  };

  const addPeriod = (day: string) => {
    setHoursDraft((prev) => {
      const current = prev[day] ?? defaultDayHours();
      const tail = current.periods[current.periods.length - 1];
      const nextOpen = tail?.close || "13:00";
      const nextClose = "22:00";
      return {
        ...prev,
        [day]: {
          closed: false,
          periods: [...current.periods, { open: nextOpen, close: nextClose }],
        },
      };
    });
  };

  const removePeriod = (day: string, idx: number) => {
    setHoursDraft((prev) => {
      const current = prev[day] ?? defaultDayHours();
      const nextPeriods = current.periods.filter((_, pIdx) => pIdx !== idx);
      return {
        ...prev,
        [day]: {
          closed: nextPeriods.length === 0,
          periods: nextPeriods,
        },
      };
    });
  };

  const handleSaveHours = async () => {
    if (!restaurantId) return;
    setHoursSaving(true);
    setHoursError(null);

    // Step 1: delete all existing rows for this restaurant
    const { error: deleteError } = await supabase
      .from("restaurant_hours")
      .delete()
      .eq("restaurant_id", restaurantId);

    if (deleteError) {
      setHoursError(deleteError.message);
      setHoursSaving(false);
      return;
    }

    // Step 2: insert one row per open period
    const insertRows: Record<string, unknown>[] = [];
    DAYS.forEach((day, idx) => {
      const d = hoursDraft[day];
      if (d.closed) return;
      for (const period of d.periods) {
        if (!period.open || !period.close) continue;
        insertRows.push({
          restaurant_id: restaurantId,
          day_of_week: idx,
          open_time: period.open,
          close_time: period.close,
        });
      }
    });

    if (insertRows.length > 0) {
      const { error: insertError } = await supabase
        .from("restaurant_hours")
        .insert(insertRows);
      if (insertError) {
        setHoursError(insertError.message);
        setHoursSaving(false);
        return;
      }
    }

    const earlyM = Math.max(0, Math.min(24 * 60, Number(waitlistEarlyMinutes) || 0));
    const maxWait = Math.max(1, Math.min(200, Number(maxWaitlistSize) || 15));
    const { error: earlyErr } = await supabase
      .from("restaurants")
      .update({
        waitlist_early_open_enabled: waitlistEarlyEnabled,
        waitlist_early_open_minutes: earlyM,
        max_waitlist_size: maxWait,
      })
      .eq("id", restaurantId);
    if (earlyErr) {
      setHoursError(earlyErr.message);
      setHoursSaving(false);
      return;
    }
    setSavedWaitlistEarlyEnabled(waitlistEarlyEnabled);
    setSavedWaitlistEarlyMinutes(earlyM);
    setSavedMaxWaitlistSize(maxWait);

    setHours({ ...hoursDraft });
    setEditingHours(false);
    setHoursSaving(false);
    setHoursSuccess(true);
    setTimeout(() => setHoursSuccess(false), 3000);

  };

  const handleDiscardHours = () => {
    setHoursDraft(hours ?? defaultHours());
    setWaitlistEarlyEnabled(savedWaitlistEarlyEnabled);
    setWaitlistEarlyMinutes(savedWaitlistEarlyMinutes);
    setMaxWaitlistSize(savedMaxWaitlistSize);
    setEditingHours(false);
    setHoursError(null);
  };

  const saveWaitlistSettingsModal = async () => {
    if (!restaurantId) return;
    setHoursSaving(true);
    setHoursError(null);
    const maxWait = Math.max(1, Math.min(200, Number(maxWaitlistSize) || 15));
    const earlyM = Math.max(0, Math.min(24 * 60, Number(waitlistEarlyMinutes) || 0));
    const { error } = await supabase
      .from("restaurants")
      .update({
        max_waitlist_size: maxWait,
        waitlist_early_open_enabled: waitlistEarlyEnabled,
        waitlist_early_open_minutes: earlyM,
      })
      .eq("id", restaurantId);
    setHoursSaving(false);
    if (error) {
      setHoursError(error.message);
      return;
    }
    setSavedMaxWaitlistSize(maxWait);
    setMaxWaitlistSize(maxWait);
    setSavedWaitlistEarlyEnabled(waitlistEarlyEnabled);
    setSavedWaitlistEarlyMinutes(earlyM);
    setShowWaitlistSettingsDialog(false);
    setHoursSuccess(true);
    setTimeout(() => setHoursSuccess(false), 3000);
  };

  const resetWaitlistSettingsDialog = () => {
    setMaxWaitlistSize(savedMaxWaitlistSize);
    setWaitlistEarlyEnabled(savedWaitlistEarlyEnabled);
    setWaitlistEarlyMinutes(savedWaitlistEarlyMinutes);
  };

  const fields: {
    key: keyof RestaurantProfile;
    label: string;
    icon: typeof Store;
    placeholder: string;
    multiline?: boolean;
  }[] = [
      { key: "name", label: "Restaurant Name", icon: Store, placeholder: "e.g. The Golden Fork" },
      { key: "address", label: "Address", icon: MapPin, placeholder: "123 Main St, City, State ZIP" },
      { key: "chainGroupKey", label: "Chain Group Key", icon: Store, placeholder: "e.g. saravanaa-bhavan" },
      { key: "description", label: "Description", icon: FileText, placeholder: "Brief description of your restaurant...", multiline: true },
    ];

  const tabBtn = (active: boolean) =>
    `rounded-lg px-3 py-2 text-[11px] font-semibold tracking-tight transition-colors sm:text-xs ${
      active ? "border border-white/15 bg-white/[0.08] text-zinc-100" : "border border-transparent text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300"
    }`;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="sticky top-0 z-20 shrink-0 border-b border-white/[0.08] bg-background/95 px-3 py-2 backdrop-blur-md sm:px-4">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-1.5 sm:gap-1">
          <button type="button" onClick={() => setActiveTab("restaurant")} className={tabBtn(activeTab === "restaurant")}>
            Restaurant
          </button>
          <button type="button" onClick={() => setActiveTab("partner")} className={tabBtn(activeTab === "partner")}>
            Partner
          </button>
          <button type="button" onClick={() => setActiveTab("hours")} className={tabBtn(activeTab === "hours")}>
            Hours
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("team")}
            disabled={!showTeamSection}
            className={cn(tabBtn(activeTab === "team"), !showTeamSection && "cursor-not-allowed opacity-40")}
          >
            Team
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5">
          <div className={activeTab === "restaurant" ? "space-y-8" : "hidden"}>
            <div className="mx-auto w-full space-y-8">
        {/* ── Restaurant Profile ─────────────────────────────────────── */}
        <div className="space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Restaurant Profile</h2>
              <p className="text-xs text-zinc-500 mt-0.5">This info is shown to guests in the Rasvia mobile app</p>
            </div>
            {!loading && !editing && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                <Pencil size={12} strokeWidth={1.5} />
                Edit
              </motion.button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={24} strokeWidth={1.5} className="text-zinc-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Restaurant Image */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <ImageIcon size={12} strokeWidth={1.5} />
                  Restaurant Image
                </label>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                />
                <div className="relative group">
                  {draft.imageUrl ? (
                    <div className="relative isolate overflow-hidden rounded-xl border border-white/10">
                      <FallbackImage
                        src={draft.imageUrl}
                        fallbackSrc={restaurantId ? getRestaurantFallback(restaurantId) : ""}
                        alt="Restaurant"
                        className="relative z-0 block h-48 w-full object-cover"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/45 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100"
                      >
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-white/25 bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-900 shadow-md backdrop-blur-sm transition-colors hover:bg-white dark:border-zinc-500/40 dark:bg-zinc-800/95 dark:text-zinc-50 dark:hover:bg-zinc-700"
                        >
                          <Upload size={13} strokeWidth={1.5} />
                          Replace
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={() => setShowRemoveImageConfirm(true)}
                          disabled={imageUploading}
                          className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-red-500/50 bg-red-600 px-3 py-2 text-xs font-semibold text-white shadow-md transition-colors hover:bg-red-500"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                          Remove
                        </motion.button>
                      </div>
                      {imageUploading && (
                        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
                          <Loader2 size={24} strokeWidth={1.5} className="text-amber-500 animate-spin" />
                        </div>
                      )}
                    </div>
                  ) : (
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => imageInputRef.current?.click()}
                      disabled={imageUploading}
                      className="w-full h-40 rounded-xl border-2 border-dashed border-white/10 bg-zinc-900/40 flex flex-col items-center justify-center gap-2 hover:border-amber-500/30 hover:bg-zinc-800/30 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {imageUploading ? (
                        <Loader2 size={24} strokeWidth={1.5} className="text-amber-500 animate-spin" />
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-white/8 flex items-center justify-center">
                            <Upload size={18} strokeWidth={1.5} className="text-zinc-500" />
                          </div>
                          <p className="text-xs font-medium text-zinc-500">Click to upload restaurant photo</p>
                          <p className="text-[10px] text-zinc-600">JPG, PNG, or WebP · Max 5 MB</p>
                        </>
                      )}
                    </motion.button>
                  )}
                </div>
              </div>

              {fields.map(({ key, label, icon: Icon, placeholder, multiline }) => {
                const val = draft[key] as string;
                return (
                  <div key={key} className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                      <Icon size={12} strokeWidth={1.5} />
                      {label}
                    </label>
                    {multiline ? (
                      <textarea
                        value={val}
                        onChange={(e) => editing && setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        readOnly={!editing}
                        placeholder={editing ? placeholder : "—"}
                        rows={3}
                        className={`w-full rounded-lg border text-sm px-3 py-2 focus:outline-none resize-none transition-colors ${editing
                          ? "bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                          : "bg-zinc-900/40 border-white/5 text-zinc-400 cursor-default select-none"
                          }`}
                      />
                    ) : (
                      <Input
                        value={val}
                        onChange={(e) => editing && setDraft((d) => ({ ...d, [key]: e.target.value }))}
                        readOnly={!editing}
                        placeholder={editing ? placeholder : "—"}
                        className={`h-10 transition-colors ${editing
                          ? "bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                          : "bg-zinc-900/40 border-white/5 text-zinc-500 cursor-default"
                          }`}
                      />
                    )}
                  </div>
                );
              })}

              {/* Phone number — inline edit button */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <Phone size={12} strokeWidth={1.5} />
                    Phone Number
                  </label>
                  {!editing && !phoneEditing && !loading && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setPhoneDraft(formatPhoneForDisplay(profile.phone)); setPhoneEditing(true); }}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800 border border-white/10 text-zinc-400 text-[10px] font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
                    >
                      <Pencil size={10} strokeWidth={1.5} />
                      Edit
                    </motion.button>
                  )}
                </div>
                {phoneEditing ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={phoneDraft}
                      onChange={(e) => setPhoneDraft(formatPhoneForDisplay(e.target.value))}
                      placeholder="(555) 000-0000"
                      maxLength={14}
                      className="h-10 flex-1 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                      autoFocus
                    />
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={async () => {
                        if (!restaurantId) return;
                        const { error } = await supabase.from("restaurants").update({ phone_number: stripPhoneDigits(phoneDraft) || null }).eq("id", restaurantId);
                        if (error) {
                          setSaveError(error.message);
                          setTimeout(() => setSaveError(null), 4000);
                          return;
                        }
                        setProfile((p) => ({ ...p, phone: stripPhoneDigits(phoneDraft) }));
                        setPhoneEditing(false);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 2500);
                      }}
                      className="h-10 px-3 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors"
                    >
                      <Check size={14} strokeWidth={2} />
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setPhoneEditing(false)}
                      className="h-10 px-3 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
                    >
                      <X size={14} strokeWidth={2} />
                    </motion.button>
                  </div>
                ) : (
                  <p className={`text-sm px-3 py-2 rounded-lg border ${profile.phone ? "text-zinc-300 bg-zinc-900/40 border-white/5" : "text-zinc-600 bg-zinc-900/40 border-white/5 italic"}`}>
                    {profile.phone ? formatPhoneForDisplay(profile.phone) : "No phone number set"}
                  </p>
                )}
              </div>

              {/* Cuisine tags */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    <UtensilsCrossed size={12} strokeWidth={1.5} />
                    Cuisine Tags
                  </label>
                  {draft.cuisineTags.length > 0 && (
                    <span className="text-[10px] text-zinc-500">{draft.cuisineTags.length} selected</span>
                  )}
                </div>
                {cuisineOptions.length === 0 && !showOtherInput ? (
                  <p className="text-xs text-zinc-600 py-1">No tags found in Supabase yet — use "Other" to add yours.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {cuisineOptions.map((c) => {
                      const active = draft.cuisineTags.includes(c);
                      if (!editing && !active) return null;
                      return (
                        <motion.button
                          key={c}
                          whileTap={editing ? { scale: 0.95 } : undefined}
                          onClick={() => editing && toggleTag(c)}
                          className={`px-2.5 py-1 rounded-lg border text-xs font-medium transition-all ${active
                            ? "bg-amber-500/15 border-amber-500/40 text-amber-400"
                            : "bg-zinc-800/60 border-white/8 text-zinc-500 hover:text-zinc-300 hover:border-white/15"
                            } ${!editing ? "cursor-default" : ""}`}
                        >
                          {c}
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                <AnimatePresence>
                  {editing && showOtherInput ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 overflow-hidden"
                    >
                      <Input
                        ref={otherInputRef}
                        value={otherValue}
                        onChange={(e) => setOtherValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitOther();
                          if (e.key === "Escape") { setShowOtherInput(false); setOtherValue(""); }
                        }}
                        placeholder="Type a cuisine..."
                        className="h-8 text-xs bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
                      />
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={commitOther}
                        disabled={!otherValue.trim()}
                        className="h-8 px-3 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40"
                      >
                        Add
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.9 }}
                        onClick={() => { setShowOtherInput(false); setOtherValue(""); }}
                        className="h-8 w-8 rounded-lg bg-zinc-800 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        <X size={12} strokeWidth={2} />
                      </motion.button>
                    </motion.div>
                  ) : editing ? (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowOtherInput(true)}
                      className="flex items-center gap-1.5 rounded-lg border border-dashed border-amber-500/25 px-2.5 py-1 text-xs font-medium text-amber-400/90 transition-colors hover:border-amber-500/40 hover:bg-amber-500/10"
                    >
                      <Plus size={11} strokeWidth={2} />
                      Other
                    </motion.button>
                  ) : null}
                </AnimatePresence>
              </div>

              {/* Community image contributions toggle */}
              <div className="space-y-2">
                <label className="flex items-center justify-between rounded-lg border border-white/10 bg-zinc-900/40 px-3 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Community Menu Photos</p>
                    <p className="text-xs text-zinc-500">
                      {communityImagesSettingAvailable
                        ? (communityImagesEnabled ? "Accepting user photo submissions" : "Submissions are disabled")
                        : "Setting unavailable. Run latest mobile migration to enable."}
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={communityImagesEnabled}
                    disabled={!editing || !communityImagesSettingAvailable}
                    onChange={(e) => setCommunityImagesEnabled(e.target.checked)}
                    className="w-4 h-4 rounded accent-amber-500 disabled:opacity-50"
                  />
                </label>
              </div>

              {/* Error */}
              <AnimatePresence>
                {saveError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
                  >
                    <AlertTriangle size={13} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
                    {saveError}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Success */}
              <AnimatePresence>
                {saveSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
                  >
                    <Check size={13} strokeWidth={2} />
                    Profile saved successfully
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Edit action buttons */}
              <AnimatePresence>
                {editing && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDiscard}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                      <X size={14} strokeWidth={1.5} />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowConfirm(true)}
                      disabled={!isDirty}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Check size={14} strokeWidth={2} />
                      Save Changes
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        <RestaurantMediaCarousel />

        <div className="border-t border-white/5 pt-6">
          <StripeConnect />
        </div>
          </div>
          </div>

          <div className={activeTab === "partner" ? "" : "hidden"}>
            <PartnerProfilePanel embedded />
          </div>

          <div className={activeTab === "hours" ? "space-y-8" : "hidden"}>

        {/* ── Operating Hours ────────────────────────────────────────── */}
        <div id="settings-hours" className="scroll-mt-28 space-y-4 border-t border-white/5 pt-6 first:border-t-0 first:pt-0">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                <Clock size={16} strokeWidth={1.5} className="text-amber-500/70" />
                Operating Hours
              </h3>
              <p className="text-xs text-zinc-500 mt-0.5">
                {hoursLoaded && hours === null
                  ? "No hours set yet — add your hours and save them to the app"
                  : "Shown to guests in the Rasvia mobile app"}
              </p>
            </div>
            {hoursLoaded && !editingHours && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditingHours(true)}
                className="flex shrink-0 items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                {hours === null ? <Plus size={12} strokeWidth={2} /> : <Pencil size={12} strokeWidth={1.5} />}
                {hours === null ? "Add Hours" : "Edit"}
              </motion.button>
            )}
          </div>

          {hoursLoaded && (
            <div className="rounded-xl border border-white/[0.08] bg-zinc-900/35 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1 text-sm">
                  <p className="text-zinc-200">
                    <span className="text-zinc-500">Max parties </span>
                    <span className="font-semibold tabular-nums text-zinc-100">{savedMaxWaitlistSize}</span>
                  </p>
                  <p className="text-xs text-zinc-500">
                    Early waitlist window:{" "}
                    {savedWaitlistEarlyEnabled ? (
                      <span className="font-medium text-zinc-300">{savedWaitlistEarlyMinutes} min before open</span>
                    ) : (
                      <span className="text-zinc-500">Off</span>
                    )}
                  </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="button"
                  onClick={() => setShowWaitlistSettingsDialog(true)}
                  className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/80 px-3 py-2 text-xs font-semibold text-zinc-200 transition-colors hover:bg-zinc-700"
                >
                  <Pencil size={12} strokeWidth={1.5} />
                  Edit waitlist rules
                </motion.button>
              </div>
            </div>
          )}

          {!hoursLoaded ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} strokeWidth={1.5} className="text-zinc-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {DAYS.map((day) => {
                const dayData = hoursDraft[day];
                const isEditing = editingHours;
                const isClosed = dayData.closed;

                return (
                  <div
                    key={day}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${isClosed
                      ? "bg-zinc-900/30 border-white/5 opacity-60"
                      : "bg-zinc-800/40 border-white/8"
                      }`}
                  >
                    {/* Day name */}
                    <span className="text-sm font-medium text-zinc-300 w-24 flex-shrink-0">{day}</span>

                    {isClosed && !isEditing ? (
                      <span className="text-xs text-zinc-600 flex-1">Closed</span>
                    ) : isEditing ? (
                      <div className="flex flex-col gap-2 flex-1">
                        {!isClosed && dayData.periods.map((period, idx) => (
                          <div key={`${day}-period-${idx}`} className="flex items-center gap-2 flex-wrap">
                            <input
                              type="time"
                              value={period.open}
                              onChange={(e) => setPeriodField(day, idx, "open", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-white/10 bg-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500/50"
                            />
                            <span className="text-zinc-600 text-xs">to</span>
                            <input
                              type="time"
                              value={period.close}
                              onChange={(e) => setPeriodField(day, idx, "close", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-white/10 bg-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500/50"
                            />
                            {dayData.periods.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removePeriod(day, idx)}
                                className="h-8 px-2 rounded-lg border border-red-500/30 bg-red-500/10 text-red-300 text-[11px]"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        <div className="flex items-center gap-2">
                          {!isClosed && (
                            <button
                              type="button"
                              onClick={() => addPeriod(day)}
                              className={`${DASH_BTN_ADD_XS} h-8 px-2`}
                            >
                              + Add Period
                            </button>
                          )}
                          <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none ml-auto">
                            <input
                              type="checkbox"
                              checked={isClosed}
                              onChange={(e) => setDayClosed(day, e.target.checked)}
                              className="w-3.5 h-3.5 rounded accent-amber-500"
                            />
                            Closed
                          </label>
                        </div>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 flex-1">
                        {dayData.periods.map((period) => `${fmt12(period.open)} - ${fmt12(period.close)}`).join(", ")}
                      </span>
                    )}
                  </div>
                );
              })}

              {/* Hours error/success */}
              <AnimatePresence>
                {hoursError && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400"
                  >
                    <AlertTriangle size={13} strokeWidth={1.5} className="flex-shrink-0 mt-0.5" />
                    {hoursError}
                  </motion.div>
                )}
              </AnimatePresence>
              <AnimatePresence>
                {hoursSuccess && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
                  >
                    <Check size={13} strokeWidth={2} />
                    Operating hours saved
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Hours action buttons */}
              <AnimatePresence>
                {editingHours && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
                    className="flex items-center gap-3 pt-2"
                  >
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleDiscardHours}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
                    >
                      <X size={14} strokeWidth={1.5} />
                      Cancel
                    </motion.button>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveHours}
                      disabled={hoursSaving}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-60"
                    >
                      <Check size={14} strokeWidth={2} />
                      {hoursSaving ? "Saving..." : "Save Hours"}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
          </div>

          <div className={activeTab === "team" ? "" : "hidden"}>
            {/* ── Team & Roles (restaurant owners & platform admins) ───── */}
            <div className="space-y-4 border-t border-white/5 pt-6 first:border-t-0 first:pt-0">
              {showTeamSection ? (
                <TeamRolesPanel />
              ) : (
                <p className="text-sm text-zinc-500">
                  Team management is available to restaurant owners and platform admins.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Confirmation Dialog */}
      <Dialog
        open={showWaitlistSettingsDialog}
        onOpenChange={(open) => {
          if (!open) {
            resetWaitlistSettingsDialog();
            setShowWaitlistSettingsDialog(false);
          }
        }}
      >
        <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-zinc-100">Waitlist rules</h3>
              <p className="text-sm text-zinc-400">
                Set max capacity and when guests can join before the first open (same day).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Max active parties</label>
              <Input
                type="number"
                min={1}
                max={200}
                value={maxWaitlistSize}
                onChange={(e) => setMaxWaitlistSize(Math.max(1, Math.min(200, Number(e.target.value) || 1)))}
                className="h-10 bg-zinc-900 border-white/10 text-zinc-100 text-sm"
              />
              <p className="text-xs text-zinc-500">Guests above this limit are asked to call the restaurant.</p>
            </div>

            <div className="space-y-3 rounded-xl border border-white/[0.08] bg-zinc-800/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-zinc-200">Early waitlist window</p>
                  <p className="mt-0.5 text-xs text-zinc-500">Open the waitlist this many minutes before the first scheduled open.</p>
                </div>
                <label className="flex shrink-0 cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={waitlistEarlyEnabled}
                    onChange={(e) => setWaitlistEarlyEnabled(e.target.checked)}
                    className="h-4 w-4 rounded accent-amber-500"
                  />
                  <span className="text-xs text-zinc-400">Enable</span>
                </label>
              </div>
              {waitlistEarlyEnabled && (
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Minutes before open</label>
                  <Input
                    type="number"
                    min={0}
                    max={1440}
                    value={waitlistEarlyMinutes}
                    onChange={(e) => setWaitlistEarlyMinutes(Math.max(0, Math.min(1440, Number(e.target.value) || 0)))}
                    className="h-10 max-w-[140px] bg-zinc-900 border-white/10 text-zinc-100 text-sm"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => {
                  resetWaitlistSettingsDialog();
                  setShowWaitlistSettingsDialog(false);
                }}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="button"
                onClick={() => void saveWaitlistSettingsModal()}
                disabled={hoursSaving}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-60"
              >
                {hoursSaving ? "Saving..." : "Save"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirm} onOpenChange={(o) => !o && setShowConfirm(false)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Store size={22} strokeWidth={1.5} className="text-amber-500" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-100">Save restaurant profile?</h3>
              <p className="text-sm text-zinc-400">
                These details will be visible to guests in the Rasvia app. Make sure everything looks correct.
              </p>
            </div>
            <div className="w-full text-left space-y-1.5 py-2 border-t border-b border-white/5">
              {(Object.keys(draft) as (keyof RestaurantProfile)[]).map((key) => {
                const dVal = Array.isArray(draft[key]) ? (draft[key] as string[]).join(", ") : draft[key] as string;
                const pVal = Array.isArray(profile[key]) ? (profile[key] as string[]).join(", ") : profile[key] as string;
                if (dVal === pVal) return null;
                const label = key === "cuisineTags" ? "Cuisine Tags" : key.charAt(0).toUpperCase() + key.slice(1);
                return (
                  <div key={key} className="text-xs">
                    <span className="text-zinc-500">{label}: </span>
                    <span className="text-zinc-200">{dVal || "(empty)"}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3 w-full pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSave}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Confirm"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showRemoveImageConfirm} onOpenChange={setShowRemoveImageConfirm}>
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove restaurant image?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              Guests will see your fallback photo until you upload a new image.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 text-white hover:bg-red-500 focus:ring-red-600"
              onClick={(e) => {
                e.preventDefault();
                void performImageRemove();
              }}
            >
              Remove image
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
