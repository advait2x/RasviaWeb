import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Pencil, Trash2, Check, X, Upload, ImageOff,
  Coffee, Sun, Moon, Star, Clock, ArrowUpDown,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { MenuItem, MealTime } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

// ── Meal time config ──────────────────────────────────────────────────────────

const MEAL_TIMES: { value: MealTime; label: string; icon: typeof Coffee; color: string }[] = [
  { value: "breakfast", label: "Breakfast", icon: Coffee, color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { value: "lunch", label: "Lunch", icon: Sun, color: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" },
  { value: "dinner", label: "Dinner", icon: Moon, color: "bg-indigo-500/10 border-indigo-500/30 text-indigo-400" },
  { value: "specials", label: "Specials", icon: Star, color: "bg-amber-500/10 border-amber-500/30 text-amber-400" },
  { value: "all_day", label: "All Day", icon: Clock, color: "bg-sky-500/10 border-sky-500/30 text-sky-400" },
];

function getMealTimeConfig(value: MealTime) {
  return MEAL_TIMES.find((m) => m.value === value) ?? MEAL_TIMES[4];
}

// ── Form state ────────────────────────────────────────────────────────────────

interface FormState {
  name: string;
  description: string;
  price: string;
  imageUrl: string;
  mealTimes: MealTime[];
  inStock: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  mealTimes: ["all_day"],
  inStock: true,
});

// The three specific times that together equal "all day"
const SPECIFIC_TIMES: MealTime[] = ["breakfast", "lunch", "dinner"];

function itemToForm(item: MenuItem): FormState {
  return {
    name: item.name,
    description: item.description,
    price: item.price != null ? String(item.price) : "",
    imageUrl: item.imageUrl ?? "",
    mealTimes: item.mealTimes,
    inStock: item.inStock,
  };
}

// ── Item Form Dialog ──────────────────────────────────────────────────────────

function ItemFormDialog({
  open,
  item,
  onClose,
  onSave,
}: {
  open: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onSave: (data: Omit<MenuItem, "id">, force?: boolean) => Promise<void>;
}) {
  const { restaurantId } = useAuth();
  const [form, setForm] = useState<FormState>(() => item ? itemToForm(item) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [priceError, setPriceError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Custom Duplicate Confirmation State
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  const fileRef = useRef<HTMLInputElement>(null);


  const toggleMealTime = (mt: MealTime) => {
    setForm((f) => {
      const cur = f.mealTimes;

      // "All Day" button clicked — just ensure all_day is set
      if (mt === "all_day") return { ...f, mealTimes: ["all_day"] };

      // Specials is exclusive — clicking it clears everything else
      if (mt === "specials") {
        if (cur.includes("specials")) return f; // already only specials, keep it (enforce at-least-one)
        return { ...f, mealTimes: ["specials"] };
      }

      // Clicking a specific time while in all_day or specials mode → switch to specific mode
      if (cur.includes("all_day") || cur.includes("specials")) {
        return { ...f, mealTimes: [mt] };
      }

      // Already in specific mode — toggle the time
      let next: MealTime[];
      if (cur.includes(mt)) {
        next = cur.filter((x) => x !== mt);
        if (next.length === 0) return f; // enforce at-least-one
      } else {
        next = [...cur, mt];
      }

      // If all three specific times selected → auto-switch back to all_day
      if (SPECIFIC_TIMES.every((t) => next.includes(t))) {
        return { ...f, mealTimes: ["all_day"] };
      }

      return { ...f, mealTimes: next };
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !restaurantId) return;
    setUploading(true);
    setUploadError(null);

    const ext = file.name.split(".").pop();
    const path = `${restaurantId}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage.from("menu-images").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

    if (error) {
      setUploadError("Upload failed — paste a URL instead, or create the 'menu-images' bucket in Supabase Storage.");
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from("menu-images").getPublicUrl(path);
    setForm((f) => ({ ...f, imageUrl: publicUrl }));
    setUploading(false);
  };

  const handleSave = async (force: boolean = false) => {
    let hasError = false;
    if (!form.name.trim()) {
      setNameError(true);
      hasError = true;
    } else {
      setNameError(false);
    }

    if (!form.price || isNaN(parseFloat(form.price))) {
      setPriceError(true);
      hasError = true;
    } else {
      setPriceError(false);
    }

    if (hasError) return;

    setSaveError(null);
    setSaving(true);
    setShowDuplicateConfirm(false);
    try {
      await onSave({
        name: form.name.trim(),
        description: form.description.trim(),
        price: form.price ? parseFloat(form.price) : null,
        imageUrl: form.imageUrl.trim() || null,
        mealTimes: form.mealTimes,
        inStock: form.inStock,
      }, force);
      onClose();
    } catch (err) {
      if (err instanceof Error && err.message === "Duplicate Item") {
        setShowDuplicateConfirm(true);
        return;
      }
      setSaveError("Something went wrong. Check the console for more details.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-white/5">
          <DialogTitle className="text-lg font-bold text-zinc-100 tracking-tight">
            {item ? "Edit Item" : "Add Menu Item"}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh]">
          <div className="p-6 space-y-5">
            {/* Image preview */}
            {form.imageUrl && (
              <div className="relative w-full h-32 rounded-xl overflow-hidden border border-white/10 bg-zinc-800">
                <img
                  src={form.imageUrl}
                  alt={form.name}
                  className="w-full h-full object-cover"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Name <span className="text-red-400">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); if (nameError) setNameError(false); }}
                placeholder="e.g. Wagyu Tartare"
                className={`h-10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 ${nameError ? "border-red-500/60 focus:border-red-500" : "border-white/10"
                  }`}
              />
              {nameError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <X size={11} strokeWidth={2} /> Item name is required
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Brief description of the dish..."
                rows={3}
                className="w-full rounded-lg bg-zinc-800/60 border border-white/10 text-zinc-100 placeholder:text-zinc-600 text-sm px-3 py-2 focus:outline-none focus:border-amber-500/50 resize-none"
              />
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Price <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${priceError ? "text-red-400" : "text-zinc-500"}`}>$</span>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.price}
                  onChange={(e) => { setForm((f) => ({ ...f, price: e.target.value })); if (priceError) setPriceError(false); }}
                  placeholder="0.00"
                  className={`h-10 pl-7 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50 ${priceError ? "border-red-500/50 focus:border-red-500" : "border-white/10"
                    }`}
                />
              </div>
              {priceError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <X size={11} strokeWidth={2} /> Price is required
                </p>
              )}
            </div>

            {/* Image */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Image</label>
              <Input
                value={form.imageUrl}
                onChange={(e) => setForm((f) => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://... (paste image URL)"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
              />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-white/5" />
                <span className="text-xs text-zinc-600">or</span>
                <div className="flex-1 h-px bg-white/5" />
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 hover:text-zinc-200 transition-colors disabled:opacity-50"
              >
                <Upload size={13} strokeWidth={1.5} />
                {uploading ? "Uploading..." : "Upload Image"}
              </motion.button>
              {uploadError && <p className="text-xs text-red-400">{uploadError}</p>}
            </div>

            {/* Meal Times */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Served During <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {MEAL_TIMES.map(({ value, label, icon: Icon, color }) => {
                  const active = form.mealTimes.includes(value);
                  const isAllDay = value === "all_day";
                  // Hide "All Day" button when user is in specific-times mode
                  const inSpecificMode = !form.mealTimes.includes("all_day");
                  if (isAllDay && inSpecificMode) return null;
                  return (
                    <motion.button
                      key={value}
                      layout
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMealTime(value)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${
                        active ? color : "bg-zinc-800/60 border-white/8 text-zinc-500 hover:text-zinc-300"
                      }`}
                    >
                      <Icon size={12} strokeWidth={1.5} />
                      {label}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* In Stock */}
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-zinc-200">In Stock</p>
                <p className="text-xs text-zinc-500">Toggle off to 86 this item</p>
              </div>
              <Switch
                checked={form.inStock}
                onCheckedChange={(v) => setForm((f) => ({ ...f, inStock: v }))}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
        </ScrollArea>

        {/* Save error */}
        <AnimatePresence>
          {saveError && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="mx-6 mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col items-center justify-center text-center gap-1.5"
            >
              <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                <X size={16} strokeWidth={2} />
              </div>
              <p className="text-xs font-medium text-red-200">Failed to save item</p>
              <p className="text-xs text-red-400/80">{saveError}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-white/5 flex items-center gap-3 justify-end">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-sm font-medium hover:bg-zinc-700 transition-colors"
          >
            <X size={14} strokeWidth={1.5} />
            Cancel
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => handleSave(false)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Check size={14} strokeWidth={2} />
            {saving ? "Saving..." : item ? "Save Changes" : "Add Item"}
          </motion.button>
        </div>
      </DialogContent>

      <Dialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <span className="text-2xl">🤔</span>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-zinc-100 tracking-tight">Duplicate Item</h3>
              <p className="text-sm text-zinc-400">
                You already have an item named <span className="font-semibold text-zinc-200">"{form.name}"</span> on your menu. Are you sure you want to add it again?
              </p>
            </div>
            <div className="flex items-center gap-3 w-full pt-2">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDuplicateConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleSave(true)}
                className="flex-1 py-2 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors"
              >
                Add Anyway
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

type SortKey = "name_asc" | "name_desc" | "price_asc" | "price_desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name_asc",   label: "Name A–Z" },
  { value: "name_desc",  label: "Name Z–A" },
  { value: "price_asc",  label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

export default function MenuManager() {
  const { menuItems, menuLoading, toggleMenuItem, addMenuItem, updateMenuItem, deleteMenuItem } = useDashboard();
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<MealTime[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const toggleFilter = (mt: MealTime) => {
    setActiveFilters((prev) =>
      prev.includes(mt) ? prev.filter((x) => x !== mt) : [...prev, mt]
    );
  };

  const filteredItems = useMemo(() => {
    let items = menuItems;
    if (activeFilters.length > 0) {
      items = items.filter((m) => activeFilters.some((f) => m.mealTimes.includes(f)));
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) => m.name.toLowerCase().includes(q) || m.description.toLowerCase().includes(q)
      );
    }
    return [...items].sort((a, b) => {
      switch (sortKey) {
        case "name_asc":   return a.name.localeCompare(b.name);
        case "name_desc":  return b.name.localeCompare(a.name);
        case "price_asc":  return (a.price ?? 0) - (b.price ?? 0);
        case "price_desc": return (b.price ?? 0) - (a.price ?? 0);
      }
    });
  }, [menuItems, search, activeFilters, sortKey]);

  const outOfStock = menuItems.filter((m) => !m.inStock).length;

  const handleSave = async (data: Omit<MenuItem, "id">, force?: boolean) => {
    if (editingItem) {
      // updateMenuItem takes (id, data), 'force' is not applicable for edits
      await updateMenuItem(editingItem.id, data);
    } else {
      // addMenuItem takes (data, force)
      await addMenuItem(data, force);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteMenuItem(id);
    setConfirmDelete(null);
  };

  const openAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">
            Menu Manager
          </h2>
          {outOfStock > 0 && (
            <p className="text-xs text-red-400 mt-0.5">
              {outOfStock} item{outOfStock > 1 ? "s" : ""} 86'd
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Sort */}
          <div className="relative">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowSortMenu((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-zinc-400 text-xs font-medium hover:bg-zinc-700 transition-colors"
            >
              <ArrowUpDown size={13} strokeWidth={1.5} />
              {SORT_OPTIONS.find((s) => s.value === sortKey)?.label}
            </motion.button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.96 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1.5 w-32 rounded-xl border border-white/10 bg-zinc-900/95 backdrop-blur-xl shadow-xl z-20 py-1"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortKey(opt.value); setShowSortMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                        sortKey === opt.value
                          ? "text-amber-400 bg-amber-500/10"
                          : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={openAdd}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
          >
            <Plus size={14} strokeWidth={2} />
            Add Item
          </motion.button>
        </div>
      </div>

      {/* Meal time filters */}
      <div className="px-4 pb-3 flex flex-wrap gap-1.5">
        {MEAL_TIMES.map(({ value, label, icon: Icon, color }) => {
          const active = activeFilters.includes(value);
          return (
            <motion.button
              key={value}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFilter(value)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${active ? color : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                }`}
            >
              <Icon size={11} strokeWidth={1.5} />
              {label}
            </motion.button>
          );
        })}
        {activeFilters.length > 0 && (
          <button
            onClick={() => setActiveFilters([])}
            className="px-2.5 py-1 rounded-md text-[11px] text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search size={15} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search menu items..."
            className="pl-9 h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Item List */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          {menuLoading && (
            <div className="text-center py-12 text-zinc-600">
              <p className="text-sm">Loading menu items...</p>
            </div>
          )}

          {!menuLoading && filteredItems.length === 0 && (
            <div className="text-center py-12 text-zinc-600">
              {menuItems.length === 0 ? (
                <div className="space-y-2">
                  <p className="text-sm">No menu items yet.</p>
                  <p className="text-xs">Click "Add Item" to get started.</p>
                </div>
              ) : (
                <p className="text-sm">No items match your search</p>
              )}
            </div>
          )}

          <AnimatePresence initial={false}>
            {filteredItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.97 }}
                transition={{ duration: 0.15, delay: index * 0.02 }}
                className={`rounded-xl border transition-all duration-200 ${item.inStock
                  ? "bg-zinc-800/40 border-white/5 hover:border-white/10"
                  : "bg-red-500/5 border-red-500/10"
                  }`}
              >
                <div className="flex items-start gap-3 p-3">
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-700/40 flex-shrink-0 border border-white/5">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                          e.currentTarget.nextElementSibling?.classList.remove("hidden");
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${item.imageUrl ? "hidden" : ""}`}>
                      <ImageOff size={18} strokeWidth={1.5} className="text-zinc-600" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className={`text-sm font-semibold ${item.inStock ? "text-zinc-100" : "text-zinc-500 line-through"}`}>
                          {item.name}
                        </span>
                        {item.price != null && (
                          <span className="ml-2 text-xs font-medium text-amber-400">
                            ${item.price.toFixed(2)}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => openEdit(item)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                        >
                          <Pencil size={13} strokeWidth={1.5} />
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => setConfirmDelete(item.id)}
                          className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </motion.button>
                        <Switch
                          checked={item.inStock}
                          onCheckedChange={() => toggleMenuItem(item.id)}
                          className={`ml-1 ${item.inStock ? "data-[state=checked]:bg-amber-500" : "data-[state=unchecked]:bg-zinc-700"}`}
                        />
                      </div>
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.description}</p>
                    )}

                    {/* Meal time badges */}
                    {item.mealTimes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {item.mealTimes.map((mt) => {
                          const cfg = getMealTimeConfig(mt);
                          const Icon = cfg.icon;
                          return (
                            <span
                              key={mt}
                              className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.color}`}
                            >
                              <Icon size={9} strokeWidth={1.5} />
                              {cfg.label}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Confirm delete */}
                <AnimatePresence>
                  {confirmDelete === item.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="px-3 pb-3"
                    >
                      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                        <p className="text-xs text-zinc-400 flex-1">Remove "{item.name}"?</p>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2.5 py-1 rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-xs px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </ScrollArea>

      {/* Add / Edit form dialog — key forces remount when switching items */}
      <ItemFormDialog
        key={editingItem?.id ?? "new"}
        open={showForm}
        item={editingItem}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={handleSave}
      />
    </div>
  );
}
