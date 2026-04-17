import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Plus, Pencil, Trash2, Check, X, Upload, ImageOff,
  ArrowUpDown, Settings2, Loader2, ChevronUp, ChevronDown, Lock,
} from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { MenuItem, MealTime, ItemModifier } from "@/types/dashboard";
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
import { getMenuItemFallback } from "@/lib/fallbackImages";
import FallbackImage from "@/components/ui/FallbackImage";
import { DEFAULT_MENU_TAGS, normalizeMenuItemTags, parseRestaurantMenuTags, serializeMenuTags, slugifyTag, type MenuTagConfig } from "@/lib/menu-tags";
import { toast } from "sonner";
import MenuTagDialog from "./MenuTagDialog";

// ── Meal time config ──────────────────────────────────────────────────────────

function getMealTimeConfig(value: MealTime, menuTags: MenuTagConfig[]) {
  const found = menuTags.find((m) => m.key === value);
  if (found) return found;
  return menuTags[0] ?? DEFAULT_MENU_TAGS[0];
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

const emptyForm = (menuTags: MenuTagConfig[]): FormState => ({
  name: "",
  description: "",
  price: "",
  imageUrl: "",
  mealTimes: [menuTags.find((t) => t.enabled)?.key ?? menuTags[0]?.key ?? "main_course"],
  inStock: true,
});

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
  menuTags,
  onClose,
  onSave,
}: {
  open: boolean;
  item: MenuItem | null;
  menuTags: MenuTagConfig[];
  onClose: () => void;
  onSave: (data: Omit<MenuItem, "id">, force?: boolean) => Promise<void>;
}) {
  const { restaurantId } = useAuth();
  const [form, setForm] = useState<FormState>(() =>
    item
      ? { ...itemToForm(item), mealTimes: normalizeMenuItemTags(item.mealTimes, menuTags) }
      : emptyForm(menuTags)
  );
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
      if (cur.includes(mt)) {
        const next = cur.filter((x) => x !== mt);
        if (next.length === 0) return f;
        return { ...f, mealTimes: next };
      }
      return { ...f, mealTimes: [...cur, mt] };
    });
  };

  useEffect(() => {
    setForm(
      item
        ? { ...itemToForm(item), mealTimes: normalizeMenuItemTags(item.mealTimes, menuTags) }
        : emptyForm(menuTags)
    );
  }, [item, open, menuTags]);

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
      setSaveError(err instanceof Error ? err.message : "Something went wrong. Check the console for more details.");
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
                Meal Type <span className="text-red-400">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {menuTags.filter((tag) => tag.enabled !== false).map((tag) => {
                  const active = form.mealTimes.includes(tag.key);
                  return (
                    <motion.button
                      key={tag.key}
                      layout
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleMealTime(tag.key)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors ${active ? "" : "bg-zinc-800/60 border-white/8 text-zinc-500 hover:text-zinc-300"
                        }`}
                      style={active ? { color: tag.color, backgroundColor: tag.bg, borderColor: tag.border } : undefined}
                    >
                      {tag.label}
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
  { value: "name_asc", label: "Name A–Z" },
  { value: "name_desc", label: "Name Z–A" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

// ── Modifier Management Sub-Panel ─────────────────────────────────────────────

function ModifiersManager() {
  const { restaurantId, hasPermission } = useAuth();
  const canManageMods = hasPermission("manage_modifiers") || hasPermission("manage_menu");
  const [modifiers, setModifiers] = useState<ItemModifier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<ItemModifier | null>(null);
  const [form, setForm] = useState({ name: "", priceAdjustment: "", category: "Extras" });
  const [saving, setSaving] = useState(false);

  const fetchMods = useCallback(async () => {
    if (!restaurantId) return;
    const { data } = await supabase.from("item_modifiers").select("*").eq("restaurant_id", restaurantId).order("category").order("name");
    setModifiers((data ?? []).map((m) => ({
      id: String(m.id), restaurantId: m.restaurant_id, name: m.name,
      priceAdjustment: Number(m.price_adjustment), category: m.category, active: m.active,
    })));
    setLoading(false);
  }, [restaurantId]);

  useEffect(() => { fetchMods(); }, [fetchMods]);

  const handleSave = async () => {
    if (!restaurantId || !form.name.trim()) return;
    setSaving(true);
    const payload = {
      restaurant_id: restaurantId,
      name: form.name.trim(),
      price_adjustment: parseFloat(form.priceAdjustment) || 0,
      category: form.category.trim() || "Extras",
      active: true,
    };
    if (editing) {
      await supabase.from("item_modifiers").update(payload).eq("id", Number(editing.id));
    } else {
      await supabase.from("item_modifiers").insert(payload);
    }
    await fetchMods();
    setShowForm(false);
    setEditing(null);
    setForm({ name: "", priceAdjustment: "", category: "Extras" });
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("item_modifiers").delete().eq("id", Number(id));
    await fetchMods();
  };

  const handleToggle = async (id: string, active: boolean) => {
    await supabase.from("item_modifiers").update({ active: !active }).eq("id", Number(id));
    setModifiers((prev) => prev.map((m) => m.id === id ? { ...m, active: !active } : m));
  };

  const categories = useMemo(() => {
    const cats = new Map<string, ItemModifier[]>();
    for (const mod of modifiers) {
      const list = cats.get(mod.category) ?? [];
      list.push(mod);
      cats.set(mod.category, list);
    }
    return cats;
  }, [modifiers]);

  if (loading) return <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin text-zinc-600" /></div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Item Modifiers</h2>
          <p className="text-xs text-zinc-500 mt-0.5">{modifiers.length} modifier{modifiers.length !== 1 ? "s" : ""}</p>
        </div>
        {canManageMods && (
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => { setEditing(null); setForm({ name: "", priceAdjustment: "", category: "Extras" }); setShowForm(true); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors">
            <Plus size={14} strokeWidth={2} />New Modifier
          </motion.button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 pb-4 space-y-4">
          {Array.from(categories.entries()).map(([cat, mods]) => (
            <div key={cat} className="space-y-1.5">
              <h3 className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{cat}</h3>
              {mods.map((mod) => (
                <div key={mod.id} className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${mod.active ? "border-white/5 bg-zinc-800/40" : "border-white/5 bg-zinc-800/20 opacity-50"}`}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-zinc-100">{mod.name}</p>
                    <p className="text-xs text-zinc-500">{mod.priceAdjustment > 0 ? "+" : ""}${mod.priceAdjustment.toFixed(2)}</p>
                  </div>
                  {canManageMods && <Switch checked={mod.active} onCheckedChange={() => handleToggle(mod.id, mod.active)} />}
                  {canManageMods && (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => { setEditing(mod); setForm({ name: mod.name, priceAdjustment: String(mod.priceAdjustment), category: mod.category }); setShowForm(true); }}
                      className="w-7 h-7 rounded-lg bg-zinc-700/50 border border-white/8 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
                      <Pencil size={12} strokeWidth={1.5} />
                    </motion.button>
                  )}
                  {canManageMods && (
                    <motion.button whileTap={{ scale: 0.9 }} onClick={() => handleDelete(mod.id)}
                      className="w-7 h-7 rounded-lg bg-red-500/8 border border-red-500/15 flex items-center justify-center text-red-400/60 hover:text-red-400 transition-colors">
                      <Trash2 size={12} strokeWidth={1.5} />
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          ))}
          {modifiers.length === 0 && (
            <div className="text-center py-16">
              <Settings2 size={32} strokeWidth={1} className="text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">No modifiers yet</p>
              <p className="text-xs text-zinc-600 mt-1">Add modifiers like "Extra Cheese", "Large", etc.</p>
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={showForm} onOpenChange={(o) => !o && setShowForm(false)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-100">{editing ? "Edit Modifier" : "New Modifier"}</h3>
            <div className="space-y-3">
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Modifier name"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50" />
              <Input value={form.priceAdjustment} onChange={(e) => setForm((f) => ({ ...f, priceAdjustment: e.target.value }))} placeholder="Price adjustment (e.g. 2.00)" type="number" step="0.01"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50" />
              <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} placeholder="Category (e.g. Size, Extras)"
                className="h-10 bg-zinc-800/60 border-white/10 text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/50" />
            </div>
            <div className="flex gap-3">
              <motion.button whileTap={{ scale: 0.95 }} onClick={() => setShowForm(false)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors">Cancel</motion.button>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleSave} disabled={saving || !form.name.trim()}
                className="flex-1 py-2.5 rounded-lg bg-amber-500 text-black text-sm font-semibold hover:bg-amber-400 transition-colors disabled:opacity-40">
                {saving ? <Loader2 size={16} className="animate-spin mx-auto" /> : editing ? "Save" : "Create"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Main MenuManager ──────────────────────────────────────────────────────────

export default function MenuManager() {
  const { menuItems, menuLoading, toggleMenuItem, addMenuItem, updateMenuItem, deleteMenuItem } = useDashboard();
  const { hasPermission, restaurantId } = useAuth();
  const canEdit = hasPermission("manage_menu");
  const [menuTab, setMenuTab] = useState<"items" | "modifiers" | "tags">("items");
  const [search, setSearch] = useState("");
  const [activeFilters, setActiveFilters] = useState<MealTime[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmStockItem, setConfirmStockItem] = useState<MenuItem | null>(null);
  const [menuTags, setMenuTags] = useState<MenuTagConfig[]>(DEFAULT_MENU_TAGS);
  const [savingTags, setSavingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [pendingTagDelete, setPendingTagDelete] = useState<{ index: number; label: string } | null>(null);
  const [tagDialogMode, setTagDialogMode] = useState<"create" | "edit" | null>(null);
  const [tagDialogTarget, setTagDialogTarget] = useState<MenuTagConfig | null>(null);
  const fetchMenuTags = useCallback(async () => {
    if (!restaurantId) return;
    const { data, error } = await supabase
      .from("restaurant_menu_tags")
      .select("key, label, color, bg, border, enabled, position")
      .eq("restaurant_id", Number(restaurantId))
      .order("position", { ascending: true });
    if (error) throw error;
    const parsed = parseRestaurantMenuTags((data ?? []) as unknown[]);
    setMenuTags(parsed.length > 0 ? parsed : DEFAULT_MENU_TAGS);
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    setTagError(null);
    fetchMenuTags().catch((err: any) => {
      if (!mounted) return;
      setMenuTags(DEFAULT_MENU_TAGS);
      setTagError(err?.message || "Unable to load menu tags right now.");
    });

    const tagSub = supabase
      .channel(`restaurant-menu-tags:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_menu_tags", filter: `restaurant_id=eq.${restaurantId}` },
        () => { void fetchMenuTags(); }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(tagSub);
    };
  }, [restaurantId, fetchMenuTags]);

  const persistMenuTags = async (next: MenuTagConfig[]) => {
    if (!restaurantId) return false;
    if (!Array.isArray(next) || next.length === 0) {
      setTagError("At least one menu tag is required.");
      return false;
    }
    const serialized = serializeMenuTags(next);
    const previous = menuTags;
    setTagError(null);
    setMenuTags(serialized);
    setSavingTags(true);
    try {
      const { error } = await supabase
        .rpc("set_restaurant_menu_tags", {
          p_restaurant_id: Number(restaurantId),
          p_tags: serialized as any,
        });
      if (error) throw error;
      await fetchMenuTags();
      return true;
    } catch (err) {
      setMenuTags(previous);
      setTagError((err as any)?.message || "Unable to save tag changes. Please try again.");
      return false;
    } finally {
      setSavingTags(false);
    }
  };

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
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "price_asc": return (a.price ?? 0) - (b.price ?? 0);
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
    try {
      await deleteMenuItem(id);
      setConfirmDelete(null);
      toast.success("Menu item deleted.");
    } catch (err: any) {
      toast.error(err?.message || "Unable to delete this menu item.");
    }
  };

  const openAdd = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const tabButtonClass = (tab: "items" | "modifiers" | "tags") =>
    `px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${menuTab === tab ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`;

  const renderTabBar = () => (
    <div className="px-5 pt-4 pb-2">
      <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/60 border border-white/5 w-fit">
        <button onClick={() => setMenuTab("items")} className={tabButtonClass("items")}>Menu Items</button>
        <button onClick={() => setMenuTab("modifiers")} className={tabButtonClass("modifiers")}>Modifiers</button>
        <button onClick={() => setMenuTab("tags")} className={tabButtonClass("tags")}>Menu Tags</button>
      </div>
    </div>
  );

  const TAG_COLOR_PRESETS = DEFAULT_MENU_TAGS.map((tag) => ({
    color: tag.color,
    bg: tag.bg,
    border: tag.border,
  }));

  if (menuTab === "modifiers") {
    return (
      <div className="flex flex-col h-full">
        {renderTabBar()}
        <ModifiersManager />
      </div>
    );
  }

  if (menuTab === "tags") {
    return (
      <div className="flex flex-col h-full">
        {renderTabBar()}
        <div className="px-5 pb-3">
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Menu Tag Setup</h2>
          <p className="text-xs text-zinc-500 mt-0.5">Manage menu tags shown in item editors and customer filtering.</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-5 pb-5">
            <div className="rounded-xl border border-white/10 bg-zinc-800/35 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Menu Tag Setup</p>
                {savingTags && <Loader2 size={13} className="text-amber-400 animate-spin" />}
              </div>
              {!canEdit && (
                <p className="mb-2 text-[11px] text-zinc-500">You do not have permission to edit tags.</p>
              )}
              {tagError && (
                <p className="mb-2 text-[11px] text-red-400">{tagError}</p>
              )}
              <p className="mb-2 text-[11px] text-zinc-500">Ordered top to bottom for display priority.</p>
              <div className="space-y-2 mb-2">
                <div
                  className="rounded-xl border p-2.5"
                  style={{ borderColor: "rgba(255,255,255,0.16)", background: "rgba(18,18,18,0.95)" }}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center text-[11px] font-semibold text-zinc-400">
                      *
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-zinc-100 truncate">All Menu Items</p>
                      <p className="text-[11px] text-zinc-500">Pinned default filter • cannot be removed</p>
                    </div>
                    <div className="w-7 h-7 rounded-md border border-white/15 bg-zinc-900 text-zinc-500 grid place-items-center">
                      <Lock size={12} />
                    </div>
                  </div>
                </div>
                {menuTags.map((tag, idx) => (
                  <div
                    key={tag.key}
                    className="rounded-xl border p-2.5"
                    style={{ borderColor: "rgba(255,255,255,0.12)", background: "rgba(10,10,10,0.9)" }}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center text-[11px] font-semibold text-zinc-400">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate" style={{ color: tag.color }}>{tag.label}</p>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1">
                          <button
                            className="w-7 h-7 rounded-md border border-amber-500/35 bg-amber-500/10 text-amber-400 grid place-items-center hover:bg-amber-500/20"
                            onClick={() => {
                              setTagError(null);
                              setTagDialogTarget(tag);
                              setTagDialogMode("edit");
                            }}
                            title="Edit tag"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            className="w-7 h-7 rounded-md border border-white/15 bg-zinc-900 text-zinc-400 grid place-items-center disabled:opacity-40 hover:text-zinc-200"
                            disabled={savingTags || idx === 0}
                            onClick={() => {
                              if (idx === 0) return;
                              const next = [...menuTags];
                              const temp = next[idx - 1];
                              next[idx - 1] = next[idx];
                              next[idx] = temp;
                              void persistMenuTags(next);
                            }}
                          >
                            <ChevronUp size={12} />
                          </button>
                          <button
                            className="w-7 h-7 rounded-md border border-white/15 bg-zinc-900 text-zinc-400 grid place-items-center disabled:opacity-40 hover:text-zinc-200"
                            disabled={savingTags || idx >= menuTags.length - 1}
                            onClick={() => {
                              if (idx >= menuTags.length - 1) return;
                              const next = [...menuTags];
                              const temp = next[idx + 1];
                              next[idx + 1] = next[idx];
                              next[idx] = temp;
                              void persistMenuTags(next);
                            }}
                          >
                            <ChevronDown size={12} />
                          </button>
                          <button
                            type="button"
                            className="w-7 h-7 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 grid place-items-center disabled:opacity-40 hover:bg-red-500/20"
                            disabled={savingTags}
                            onClick={() => setPendingTagDelete({ index: idx, label: tag.label })}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              {canEdit && (
                <button
                  className="px-2.5 py-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-400 text-xs font-semibold"
                  onClick={() => {
                    setTagError(null);
                    setTagDialogTarget(null);
                    setTagDialogMode("create");
                  }}
                >
                  + Add Tag
                </button>
              )}
            </div>
          </div>
        </ScrollArea>
        <Dialog open={!!pendingTagDelete} onOpenChange={(open) => !open && setPendingTagDelete(null)}>
          <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-semibold text-zinc-100">Delete Menu Tag?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-zinc-300 mt-3">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-zinc-100">"{pendingTagDelete?.label}"</span>?
            </p>
            <div className="flex items-center justify-end gap-2 pt-4">
              <button
                className="px-3 py-1.5 rounded-md border border-white/15 bg-zinc-800 text-zinc-300 text-xs font-semibold"
                onClick={() => setPendingTagDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 text-xs font-semibold disabled:opacity-50"
                disabled={savingTags}
                onClick={() => {
                  if (!pendingTagDelete) return;
                  const next = menuTags.filter((_, i) => i !== pendingTagDelete.index);
                  if (next.length === 0) {
                    setTagError("At least one menu tag is required.");
                    setPendingTagDelete(null);
                    return;
                  }
                  void persistMenuTags(next);
                  setPendingTagDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </DialogContent>
        </Dialog>

        <MenuTagDialog
          open={tagDialogMode !== null}
          mode={tagDialogMode ?? "create"}
          tags={menuTags}
          editingTag={tagDialogTarget ?? undefined}
          onClose={() => { setTagDialogMode(null); setTagDialogTarget(null); }}
          onSubmit={async (next) => {
            const ok = await persistMenuTags(next);
            return ok;
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {renderTabBar()}
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <h2 className="text-xl font-bold text-zinc-100 tracking-tight">
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
                      className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${sortKey === opt.value
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

          {canEdit && (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={openAdd}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium hover:bg-amber-500/20 transition-colors"
            >
              <Plus size={14} strokeWidth={2} />
              Add Item
            </motion.button>
          )}
        </div>
      </div>

      {/* Menu tag filters */}
      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        {menuTags.filter((tag) => tag.enabled !== false).map((tag) => {
          const active = activeFilters.includes(tag.key);
          return (
            <motion.button
              key={tag.key}
              whileTap={{ scale: 0.95 }}
              onClick={() => toggleFilter(tag.key)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md border text-[11px] font-semibold transition-all ${active ? "" : "bg-zinc-800/40 border-white/8 text-zinc-500 hover:text-zinc-300"
                }`}
              style={active ? { color: tag.color, backgroundColor: tag.bg, borderColor: tag.border } : undefined}
            >
              {tag.label}
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
      <div className="px-5 pb-3">
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
        <div className="px-5 pb-4 space-y-2">
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
                    <FallbackImage
                      src={item.imageUrl || ""}
                      fallbackSrc={getMenuItemFallback(item.id)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
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
                      {canEdit && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => openEdit(item)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                          >
                            <Pencil size={13} strokeWidth={1.5} />
                          </motion.button>
                          <motion.button
                            type="button"
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setConfirmDelete(item.id)}
                            className="w-7 h-7 rounded-md flex items-center justify-center text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 size={13} strokeWidth={1.5} />
                          </motion.button>
                          <Switch
                            checked={item.inStock}
                            onCheckedChange={() => {
                              setConfirmStockItem(item);
                            }}
                            className={`ml-1 ${item.inStock ? "data-[state=checked]:bg-amber-500" : "data-[state=unchecked]:bg-zinc-700"}`}
                          />
                        </div>
                      )}
                    </div>

                    {/* Description */}
                    {item.description && (
                      <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{item.description}</p>
                    )}

                    {/* Meal time badges — dedupe by tag label so legacy rows
                        that stored both "entree" and an equivalent tag key
                        don't render the same chip twice. */}
                    {item.mealTimes.length > 0 && (() => {
                      const seenLabels = new Set<string>();
                      const chips = item.mealTimes
                        .map((mt) => {
                          const cfg = getMealTimeConfig(mt, menuTags);
                          const labelKey = cfg.label.trim().toLowerCase();
                          if (seenLabels.has(labelKey)) return null;
                          seenLabels.add(labelKey);
                          return { mt, cfg };
                        })
                        .filter((c): c is { mt: MealTime; cfg: ReturnType<typeof getMealTimeConfig> } => !!c);
                      return (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {chips.map(({ mt, cfg }) => (
                            <span
                              key={mt}
                              className={`flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${cfg.bg} ${cfg.border}`}
                              style={{ color: cfg.color }}
                            >
                              {cfg.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}
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
                          type="button"
                          onClick={() => setConfirmDelete(null)}
                          className="text-xs px-2.5 py-1 rounded-md bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
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
        menuTags={menuTags}
        onClose={() => { setShowForm(false); setEditingItem(null); }}
        onSave={handleSave}
      />

      <Dialog open={!!confirmStockItem} onOpenChange={(o) => !o && setConfirmStockItem(null)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="space-y-4">
            <DialogHeader className="p-0">
              <DialogTitle className="text-base font-semibold text-zinc-100">
                {confirmStockItem?.inStock ? "Mark out of stock?" : "Mark back in stock?"}
              </DialogTitle>
            </DialogHeader>
            {confirmStockItem && (
              <p className="text-sm text-zinc-300">
                Are you sure you want to mark{" "}
                <span className="font-semibold text-zinc-100">{confirmStockItem.name}</span>{" "}
                {confirmStockItem.inStock ? "out of stock" : "back in stock"}?
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setConfirmStockItem(null)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  if (!confirmStockItem) return;
                  toggleMenuItem(confirmStockItem.id);
                  setConfirmStockItem(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-semibold hover:bg-amber-500/25 transition-colors"
              >
                Confirm
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
