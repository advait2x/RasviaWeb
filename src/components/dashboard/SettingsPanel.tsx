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
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import StripeConnect from "@/components/dashboard/StripeConnect";

// ─── Types ────────────────────────────────────────────────────────────────────

interface RestaurantProfile {
  name: string;
  address: string;
  phone: string;
  cuisineTags: string[];
  description: string;
  imageUrl: string;
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

interface DayHours {
  open: string;   // "09:00"
  close: string;  // "22:00"
  closed: boolean;
}

type OperatingHours = Record<string, DayHours>;

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const defaultDayHours = (): DayHours => ({ open: "09:00", close: "22:00", closed: false });

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
});

function parseHoursRows(rows: Record<string, unknown>[]): OperatingHours {
  const result = defaultHours();
  for (const row of rows) {
    const idx = row.day_of_week as number; // 0=Sun, 1=Mon … 6=Sat
    const day = DAYS[idx];
    if (!day) continue;
    const openRaw = (row.open_time as string | null) ?? "";
    const closeRaw = (row.close_time as string | null) ?? "";
    // Supabase time type comes back as "HH:MM:SS" — trim to "HH:MM"
    result[day] = {
      open: openRaw.slice(0, 5),
      close: closeRaw.slice(0, 5),
      closed: !openRaw,
    };
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

export default function SettingsPanel() {
  const { restaurantId } = useAuth();

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
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Operating hours
  const [hours, setHours] = useState<OperatingHours | null>(null);
  const [hoursDraft, setHoursDraft] = useState<OperatingHours>(defaultHours());
  const [hoursLoaded, setHoursLoaded] = useState(false);
  const [editingHours, setEditingHours] = useState(false);
  const [hoursSaving, setHoursSaving] = useState(false);
  const [hoursSuccess, setHoursSuccess] = useState(false);
  const [hoursError, setHoursError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!restaurantId) return;

    const [profileRes, cuisinesRes] = await Promise.all([
      supabase.from("restaurants").select("*").eq("id", restaurantId).single(),
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
    };
    setProfile(p);
    setDraft(p);

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

  const handleImageRemove = async () => {
    if (!restaurantId) return;
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

  const isDirty = JSON.stringify(draft) !== JSON.stringify(profile);

  const handleSave = async () => {
    if (!restaurantId) return;
    setSaving(true);
    setSaveError(null);
    const patch: Record<string, unknown> = {
      name: draft.name.trim(),
      address: draft.address.trim(),
      cuisine_tags: draft.cuisineTags,
      description: draft.description.trim(),
    };
    if (draft.phone.trim()) patch.phone = draft.phone.trim();
    const { error } = await supabase.from("restaurants").update(patch).eq("id", restaurantId);
    setSaving(false);
    setShowConfirm(false);
    if (error) {
      setSaveError(error.message);
    } else {
      setProfile({ ...draft });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  };

  const handleDiscard = () => {
    setDraft({ ...profile });
    setEditing(false);
    setShowOtherInput(false);
    setOtherValue("");
  };

  // Operating hours handlers
  const setDayField = (day: string, field: keyof DayHours, value: string | boolean) => {
    setHoursDraft((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
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

    // Step 2: insert a row for each open day (skip closed days)
    const insertRows: Record<string, unknown>[] = [];
    DAYS.forEach((day, idx) => {
      const d = hoursDraft[day];
      if (!d.closed) {
        insertRows.push({
          restaurant_id: restaurantId,
          day_of_week: idx,
          open_time: d.open,
          close_time: d.close,
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

    setHours({ ...hoursDraft });
    setEditingHours(false);
    setHoursSaving(false);
    setHoursSuccess(true);
    setTimeout(() => setHoursSuccess(false), 3000);

  };

  const handleDiscardHours = () => {
    setHoursDraft(hours ?? defaultHours());
    setEditingHours(false);
    setHoursError(null);
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
      { key: "phone", label: "Phone Number", icon: Phone, placeholder: "(555) 000-0000" },
      { key: "description", label: "Description", icon: FileText, placeholder: "Brief description of your restaurant...", multiline: true },
    ];

  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto">
      <div className="max-w-lg mx-auto w-full space-y-8">

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
                    <div className="relative rounded-xl overflow-hidden border border-white/10">
                      <img
                        src={draft.imageUrl}
                        alt="Restaurant"
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/90 border border-white/15 text-zinc-200 text-xs font-medium hover:bg-zinc-700 transition-colors"
                        >
                          <Upload size={13} strokeWidth={1.5} />
                          Replace
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleImageRemove}
                          disabled={imageUploading}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-medium hover:bg-red-500/25 transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                          Remove
                        </motion.button>
                      </div>
                      {imageUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
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
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-dashed border-white/15 text-xs font-medium text-zinc-600 hover:text-zinc-300 hover:border-white/30 transition-colors"
                    >
                      <Plus size={11} strokeWidth={2} />
                      Other
                    </motion.button>
                  ) : null}
                </AnimatePresence>
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

        {/* ── Operating Hours ────────────────────────────────────────── */}
        <div className="space-y-4 border-t border-white/5 pt-6">
          <div className="flex items-start justify-between">
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
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-xs font-medium hover:bg-zinc-700 transition-colors"
              >
                {hours === null ? <Plus size={12} strokeWidth={2} /> : <Pencil size={12} strokeWidth={1.5} />}
                {hours === null ? "Add Hours" : "Edit"}
              </motion.button>
            )}
          </div>

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
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        {!isClosed && (
                          <>
                            <input
                              type="time"
                              value={dayData.open}
                              onChange={(e) => setDayField(day, "open", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-white/10 bg-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500/50"
                            />
                            <span className="text-zinc-600 text-xs">to</span>
                            <input
                              type="time"
                              value={dayData.close}
                              onChange={(e) => setDayField(day, "close", e.target.value)}
                              className="h-8 px-2 rounded-lg border border-white/10 bg-zinc-800 text-zinc-100 text-xs focus:outline-none focus:border-amber-500/50"
                            />
                          </>
                        )}
                        <label className="flex items-center gap-1.5 text-xs text-zinc-400 cursor-pointer select-none ml-auto">
                          <input
                            type="checkbox"
                            checked={isClosed}
                            onChange={(e) => setDayField(day, "closed", e.target.checked)}
                            className="w-3.5 h-3.5 rounded accent-amber-500"
                          />
                          Closed
                        </label>
                      </div>
                    ) : (
                      <span className="text-xs text-zinc-400 flex-1">
                        {fmt12(dayData.open)} – {fmt12(dayData.close)}
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

        {/* ── Payouts / Stripe Connect ─────────────────────────────── */}
        <StripeConnect />

      </div>

      {/* Profile Confirmation Dialog */}
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
    </div>
  );
}
