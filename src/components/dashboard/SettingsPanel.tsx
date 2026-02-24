import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Store, MapPin, Phone, UtensilsCrossed, FileText,
  Check, X, Loader2, AlertTriangle, Plus, Pencil,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

interface RestaurantProfile {
  name: string;
  address: string;
  phone: string;
  cuisineTags: string[];
  description: string;
}

const empty = (): RestaurantProfile => ({
  name: "",
  address: "",
  phone: "",
  cuisineTags: [],
  description: "",
});


export default function SettingsPanel() {
  const { restaurantId } = useAuth();
  const [profile, setProfile] = useState<RestaurantProfile>(empty());
  const [draft, setDraft] = useState<RestaurantProfile>(empty());
  const [loading, setLoading] = useState(true);
  const [cuisineOptions, setCuisineOptions] = useState<string[]>([]);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherValue, setOtherValue] = useState("");
  const otherInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!restaurantId) return;

    // Fetch this restaurant's data and all distinct cuisines in parallel
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
    };
    setProfile(p);
    setDraft(p);

    // Flatten all cuisine_tags arrays from all restaurants into unique sorted options
    if (!cuisinesRes.error && cuisinesRes.data) {
      const allTags = (cuisinesRes.data as { cuisine_tags: unknown }[])
        .flatMap((r) => Array.isArray(r.cuisine_tags) ? (r.cuisine_tags as string[]) : [])
        .map((t) => t?.trim())
        .filter(Boolean);
      const unique = [...new Set(allTags)].sort();
      setCuisineOptions(unique);
    }

    setLoading(false);
  }, [restaurantId]);

  // Focus the custom input when it opens
  useEffect(() => {
    if (showOtherInput) otherInputRef.current?.focus();
  }, [showOtherInput]);

  const commitOther = () => {
    const val = otherValue.trim();
    if (val) {
      setCuisineOptions((prev) =>
        prev.includes(val) ? prev : [...prev, val].sort()
      );
      setDraft((d) => ({
        ...d,
        cuisineTags: d.cuisineTags.includes(val) ? d.cuisineTags : [...d.cuisineTags, val],
      }));
    }
    setOtherValue("");
    setShowOtherInput(false);
  };

  const toggleTag = (tag: string) => {
    setDraft((d) => ({
      ...d,
      cuisineTags: d.cuisineTags.includes(tag)
        ? d.cuisineTags.filter((t) => t !== tag)
        : [...d.cuisineTags, tag],
    }));
  };

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    // Only include phone if the user actually entered something
    if (draft.phone.trim()) patch.phone = draft.phone.trim();

    const { error } = await supabase
      .from("restaurants")
      .update(patch)
      .eq("id", restaurantId);

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
      <div className="max-w-lg mx-auto w-full space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Restaurant Profile</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              This info is shown to guests in the Rasvia mobile app
            </p>
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
            {/* Text fields */}
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

            {/* Cuisine tags picker — multi-select */}
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
                <p className="text-xs text-zinc-600 py-1">
                  No tags found in Supabase yet — use "Other" to add yours.
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {cuisineOptions.map((c) => {
                    const active = draft.cuisineTags.includes(c);
                    // In view mode, only show selected tags
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
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
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
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400"
                >
                  <Check size={13} strokeWidth={2} />
                  Profile saved successfully
                </motion.div>
              )}
            </AnimatePresence>

            {/* Action buttons — only shown in edit mode */}
            <AnimatePresence>
              {editing && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
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

      {/* Confirmation dialog */}
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

            {/* Preview changed fields */}
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
