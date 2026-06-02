import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Copy,
  ExternalLink,
  GripVertical,
  Loader2,
  Lock,
  Pencil,
  QrCode,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";
import { DASH_BTN_ADD, DASH_BTN_ADD_SM } from "@/lib/dashboardUi";
import {
  DEFAULT_MENU_TAGS,
  normalizeMenuItemTags,
  parseRestaurantMenuTags,
  serializeMenuTags,
  type MenuTagConfig,
} from "@/lib/menu-tags";
import {
  buildPublicMenuShareUrl,
  buildMenuQrCodesPdfBlob,
  downloadMenuQrCodesPdf,
} from "@/lib/menu-share-pdf";
import {
  DEFAULT_MENU_QR_PDF_SETTINGS,
  loadMenuQrPdfSettings,
  type MenuQrPdfCodesPerPage,
  type MenuQrPdfPageFormat,
  type MenuQrPdfSettings,
} from "@/lib/menu-qr-pdf-settings";
import {
  cancelTableQrBinding,
  defaultMenuQrSlots,
  fetchActiveTableBindings,
  fetchMenuQrConfig,
  migrateLocalMenuQrSettings,
  saveMenuQrConfig,
  type MenuQrConfig,
  type MenuQrSlot,
  type MenuQrSlotMode,
  type TableQrBinding,
} from "@/lib/menu-qr-bindings";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import MenuTagDialog from "./MenuTagDialog";

type SettingsSubTab = "tags" | "qr";

function TagRow({
  tag,
  index,
  canEdit,
  savingTags,
  isLight,
  onEdit,
  onDelete,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  tag: MenuTagConfig;
  index: number;
  canEdit: boolean;
  savingTags: boolean;
  isLight: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (idx: number) => void;
  onDragOver: (e: React.DragEvent, idx: number) => void;
  onDrop: (idx: number) => void;
}) {
  return (
    <div
      draggable={canEdit && !savingTags}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDrop={() => onDrop(index)}
      className={cn(
        "rounded-xl border p-2.5 transition-opacity",
        isLight ? "border-slate-300/80 bg-slate-50/98" : "border-white/12 bg-zinc-950/90",
      )}
    >
      <div className="flex items-center gap-2">
        {canEdit ? (
          <button
            type="button"
            className="cursor-grab text-zinc-500 hover:text-zinc-300 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <GripVertical size={14} />
          </button>
        ) : null}
        <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center text-[11px] font-semibold text-zinc-400">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold truncate" style={{ color: tag.color }}>
            {tag.label}
          </p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(DASH_BTN_ADD, "inline-flex h-7 w-7 items-center justify-center rounded-md p-0")}
              onClick={onEdit}
              title="Edit tag"
            >
              <Pencil size={12} />
            </button>
            <button
              type="button"
              className="w-7 h-7 rounded-md border border-red-500/30 bg-red-500/10 text-red-300 grid place-items-center disabled:opacity-40 hover:bg-red-500/20"
              disabled={savingTags}
              onClick={onDelete}
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const MemoTagRow = memo(TagRow);

function MenuSettingsPanel() {
  const { hasPermission, restaurantId } = useAuth();
  const { resolvedTheme } = useTheme();
  const isLight = resolvedTheme === "light";
  const canEdit = hasPermission("manage_menu");

  const [subTab, setSubTab] = useState<SettingsSubTab>("tags");
  const [menuTags, setMenuTags] = useState<MenuTagConfig[]>(DEFAULT_MENU_TAGS);
  const [savingTags, setSavingTags] = useState(false);
  const [tagError, setTagError] = useState<string | null>(null);
  const [pendingTagDelete, setPendingTagDelete] = useState<{ index: number; label: string } | null>(null);
  const [tagDialogMode, setTagDialogMode] = useState<"create" | "edit" | null>(null);
  const [tagDialogTarget, setTagDialogTarget] = useState<MenuTagConfig | null>(null);
  const dragIndexRef = useRef<number | null>(null);

  const [restaurantDisplayName, setRestaurantDisplayName] = useState("Menu");
  const [qrConfig, setQrConfig] = useState<MenuQrConfig | null>(null);
  const [bindings, setBindings] = useState<TableQrBinding[]>([]);
  const [qrLoading, setQrLoading] = useState(true);
  const [qrSaving, setQrSaving] = useState(false);
  const [qrPdfLoading, setQrPdfLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

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

  const loadQr = useCallback(async () => {
    if (!restaurantId) return;
    setQrLoading(true);
    try {
      const local = loadMenuQrPdfSettings(restaurantId);
      await migrateLocalMenuQrSettings(supabase, Number(restaurantId), local);
      const [config, activeBindings] = await Promise.all([
        fetchMenuQrConfig(supabase, Number(restaurantId)),
        fetchActiveTableBindings(supabase, Number(restaurantId)),
      ]);
      setQrConfig(config);
      setBindings(activeBindings);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load QR settings.");
      setQrConfig({
        guestCanOrder: false,
        pdfSettings: { ...DEFAULT_MENU_QR_PDF_SETTINGS },
        slots: defaultMenuQrSlots(6),
      });
    } finally {
      setQrLoading(false);
    }
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    void supabase
      .from("restaurants")
      .select("name")
      .eq("id", restaurantId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.name && String(data.name).trim()) {
          setRestaurantDisplayName(String(data.name).trim());
        }
      });
  }, [restaurantId]);

  useEffect(() => {
    if (!restaurantId) return;
    let mounted = true;
    fetchMenuTags().catch((err: unknown) => {
      if (!mounted) return;
      setMenuTags(DEFAULT_MENU_TAGS);
      setTagError(err instanceof Error ? err.message : "Unable to load menu tags.");
    });
    const tagSub = supabase
      .channel(`restaurant-menu-tags:settings:${restaurantId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurant_menu_tags", filter: `restaurant_id=eq.${restaurantId}` },
        () => { void fetchMenuTags(); },
      )
      .subscribe();
    return () => {
      mounted = false;
      supabase.removeChannel(tagSub);
    };
  }, [restaurantId, fetchMenuTags]);

  useEffect(() => {
    if (subTab === "qr") void loadQr();
  }, [subTab, loadQr]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

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
      const { error } = await supabase.rpc("set_restaurant_menu_tags", {
        p_restaurant_id: Number(restaurantId),
        p_tags: serialized as never,
      });
      if (error) throw error;
      await fetchMenuTags();
      return true;
    } catch (err) {
      setMenuTags(previous);
      setTagError(err instanceof Error ? err.message : "Unable to save tag changes.");
      return false;
    } finally {
      setSavingTags(false);
    }
  };

  const persistQrConfig = useCallback(
    async (next: MenuQrConfig) => {
      if (!restaurantId) return;
      setQrSaving(true);
      try {
        await saveMenuQrConfig(supabase, Number(restaurantId), next);
        setQrConfig(next);
        const activeBindings = await fetchActiveTableBindings(supabase, Number(restaurantId));
        setBindings(activeBindings);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Could not save QR settings.");
      } finally {
        setQrSaving(false);
      }
    },
    [restaurantId],
  );

  const updateQrPdf = useCallback(
    (patch: Partial<MenuQrPdfSettings>) => {
      if (!qrConfig) return;
      const next: MenuQrConfig = {
        ...qrConfig,
        pdfSettings: { ...qrConfig.pdfSettings, ...patch },
        slots:
          patch.codesPerPage != null
            ? resizeSlots(qrConfig.slots, patch.codesPerPage)
            : qrConfig.slots,
      };
      void persistQrConfig(next);
    },
    [qrConfig, persistQrConfig],
  );

  const updateSlot = useCallback(
    (slotIndex: number, patch: Partial<MenuQrSlot>) => {
      if (!qrConfig) return;
      const slots = qrConfig.slots.map((s) =>
        s.slotIndex === slotIndex ? { ...s, ...patch } : s,
      );
      void persistQrConfig({ ...qrConfig, slots });
    },
    [qrConfig, persistQrConfig],
  );

  const handleTagDragStart = (idx: number) => {
    dragIndexRef.current = idx;
  };

  const handleTagDragOver = (e: React.DragEvent, _idx: number) => {
    e.preventDefault();
  };

  const handleTagDrop = (targetIdx: number) => {
    const from = dragIndexRef.current;
    dragIndexRef.current = null;
    if (from == null || from === targetIdx) return;
    const next = [...menuTags];
    const [moved] = next.splice(from, 1);
    next.splice(targetIdx, 0, moved);
    void persistMenuTags(next);
  };

  const handlePreviewPdf = async () => {
    if (!restaurantId || !qrConfig) return;
    setQrPdfLoading(true);
    try {
      const { blob } = await buildMenuQrCodesPdfBlob({
        restaurantId: Number(restaurantId),
        restaurantName: restaurantDisplayName,
        settings: qrConfig.pdfSettings,
        slots: qrConfig.slots,
      });
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate preview.");
    } finally {
      setQrPdfLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (!restaurantId || !qrConfig) return;
    setQrPdfLoading(true);
    try {
      await downloadMenuQrCodesPdf({
        restaurantId: Number(restaurantId),
        restaurantName: restaurantDisplayName,
        settings: qrConfig.pdfSettings,
        slots: qrConfig.slots,
      });
      toast.success("Menu QR PDF downloaded.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate PDF.");
    } finally {
      setQrPdfLoading(false);
    }
  };

  const settingsPanelClass = isLight
    ? "rounded-xl border border-zinc-300 bg-white/95 p-4 shadow-sm"
    : "rounded-xl border border-white/10 bg-zinc-800/35 p-4";

  const settingsInputClass = cn(
    "h-10 w-full rounded-lg border px-3 text-sm focus:outline-none focus:border-amber-500/50",
    isLight
      ? "border-zinc-300 bg-white text-zinc-900 placeholder:text-zinc-400"
      : "border-white/10 bg-zinc-800/60 text-zinc-100 placeholder:text-zinc-600",
  );

  const settingsLabelClass = cn(
    "text-xs font-semibold uppercase tracking-wider",
    isLight ? "text-zinc-600" : "text-zinc-400",
  );

  const subTabClass = (tab: SettingsSubTab) =>
    cn(
      "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
      subTab === tab
        ? isLight
          ? "bg-zinc-200 text-zinc-900"
          : "bg-zinc-700 text-zinc-100"
        : "text-zinc-500 hover:text-zinc-300",
    );

  const publicMenuUrl = restaurantId ? buildPublicMenuShareUrl(Number(restaurantId), 0) : "";

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 pb-3">
        <h2 className={cn("text-xl font-bold tracking-tight", isLight ? "text-zinc-900" : "text-zinc-100")}>
          Menu Settings
        </h2>
        <p className={cn("text-xs mt-0.5", isLight ? "text-zinc-600" : "text-zinc-500")}>
          Tags for filtering and printable QR codes for tables.
        </p>
        <div
          className={cn(
            "mt-3 flex gap-1 p-1 rounded-xl w-fit",
            isLight ? "bg-zinc-100 border border-zinc-300/80" : "bg-zinc-800/60 border border-white/5",
          )}
        >
          <button type="button" className={subTabClass("tags")} onClick={() => setSubTab("tags")}>
            Tags
          </button>
          <button type="button" className={subTabClass("qr")} onClick={() => setSubTab("qr")}>
            QR Codes
          </button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-5 pb-5">
          {subTab === "tags" ? (
            <div className={settingsPanelClass}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className={settingsLabelClass}>Menu Tag Setup</p>
                {savingTags && <Loader2 size={13} className="animate-spin text-amber-400" />}
              </div>
              {!canEdit && (
                <p className="mb-2 text-[11px] text-zinc-500">You do not have permission to edit tags.</p>
              )}
              {tagError && <p className="mb-2 text-[11px] text-red-400">{tagError}</p>}
              <p className="mb-2 text-[11px] text-zinc-500">Drag the handle to reorder. Pinned default filter stays on top.</p>
              <div className="space-y-2 mb-2">
                <div
                  className={cn(
                    "rounded-xl border p-2.5",
                    isLight ? "border-slate-300/80 bg-white" : "border-white/16 bg-zinc-900/95",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full border border-zinc-700 flex items-center justify-center text-[11px] font-semibold text-zinc-400">
                      *
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">All Menu Items</p>
                      <p className="text-[11px] text-zinc-500">Pinned default filter</p>
                    </div>
                    <div className="w-7 h-7 rounded-md border border-white/15 bg-zinc-900 text-zinc-500 grid place-items-center">
                      <Lock size={12} />
                    </div>
                  </div>
                </div>
                {menuTags.map((tag, idx) => (
                  <MemoTagRow
                    key={tag.key}
                    tag={tag}
                    index={idx}
                    canEdit={canEdit}
                    savingTags={savingTags}
                    isLight={isLight}
                    onEdit={() => {
                      setTagError(null);
                      setTagDialogTarget(tag);
                      setTagDialogMode("edit");
                    }}
                    onDelete={() => setPendingTagDelete({ index: idx, label: tag.label })}
                    onDragStart={handleTagDragStart}
                    onDragOver={handleTagDragOver}
                    onDrop={handleTagDrop}
                  />
                ))}
              </div>
              {canEdit && (
                <button
                  type="button"
                  className={cn(DASH_BTN_ADD_SM, "rounded-md px-2.5 py-1.5 font-semibold")}
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
          ) : (
            <div className="space-y-5">
              {qrLoading || !qrConfig ? (
                <div className="flex items-center justify-center py-16 text-zinc-500">
                  <Loader2 size={20} className="animate-spin mr-2" /> Loading QR settings…
                </div>
              ) : (
                <>
                  <div className={settingsPanelClass}>
                    <p className={settingsLabelClass}>Guest ordering</p>
                    <p className={cn("mt-1 mb-3 text-[11px]", isLight ? "text-zinc-600" : "text-zinc-500")}>
                      Default for table-linked QRs. Off = menu view only; staff adds items in Tableside.
                    </p>
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn("text-sm font-medium", isLight ? "text-zinc-900" : "text-zinc-200")}>
                        Guests can self-order
                      </span>
                      <Switch
                        checked={qrConfig.guestCanOrder}
                        disabled={!canEdit || qrSaving}
                        onCheckedChange={(v) => void persistQrConfig({ ...qrConfig, guestCanOrder: v })}
                      />
                    </div>
                  </div>

                  <div className={settingsPanelClass}>
                    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className={settingsLabelClass}>PDF layout</p>
                        <p className={cn("mt-1 text-[11px]", isLight ? "text-zinc-600" : "text-zinc-500")}>
                          Sheet title, grid size, and page format. Use Preview before assigning QR slots below.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={qrPdfLoading}
                          onClick={() => void handlePreviewPdf()}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50",
                            isLight ? "border-zinc-300 bg-zinc-50 text-zinc-800" : "border-white/10 bg-zinc-800/80 text-zinc-300",
                          )}
                        >
                          {qrPdfLoading ? <Loader2 size={12} className="animate-spin" /> : <QrCode size={12} />}
                          Preview PDF
                        </button>
                        <button
                          type="button"
                          disabled={qrPdfLoading}
                          onClick={() => void handleDownloadPdf()}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium disabled:opacity-50",
                            isLight ? "border-zinc-300 bg-zinc-50 text-zinc-800" : "border-white/10 bg-zinc-800/80 text-zinc-300",
                          )}
                        >
                          Download PDF
                        </button>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className={settingsLabelClass}>Sheet title</label>
                        <input
                          type="text"
                          value={qrConfig.pdfSettings.sheetTitle}
                          onChange={(e) => updateQrPdf({ sheetTitle: e.target.value })}
                          placeholder={restaurantDisplayName}
                          className={settingsInputClass}
                          disabled={!canEdit}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className={settingsLabelClass}>Codes per page</label>
                        <select
                          value={String(qrConfig.pdfSettings.codesPerPage)}
                          onChange={(e) =>
                            updateQrPdf({ codesPerPage: Number(e.target.value) as MenuQrPdfCodesPerPage })
                          }
                          className={settingsInputClass}
                          disabled={!canEdit}
                        >
                          <option value="4">4 (2×2)</option>
                          <option value="6">6 (2×3)</option>
                          <option value="9">9 (3×3)</option>
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className={settingsLabelClass}>Page size</label>
                        <select
                          value={qrConfig.pdfSettings.pageFormat}
                          onChange={(e) =>
                            updateQrPdf({ pageFormat: e.target.value as MenuQrPdfPageFormat })
                          }
                          className={settingsInputClass}
                          disabled={!canEdit}
                        >
                          <option value="a4">A4</option>
                          <option value="letter">US Letter</option>
                        </select>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(publicMenuUrl);
                            toast.success("Public menu link copied.");
                          } catch {
                            toast.error("Could not copy link.");
                          }
                        }}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                          isLight ? "border-zinc-300 bg-zinc-50 text-zinc-800" : "border-white/10 bg-zinc-800/80 text-zinc-300",
                        )}
                      >
                        <Copy size={12} /> Copy menu link
                      </button>
                      <a
                        href={publicMenuUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium",
                          isLight ? "border-zinc-300 bg-zinc-50 text-zinc-800" : "border-white/10 bg-zinc-800/80 text-zinc-300",
                        )}
                      >
                        <ExternalLink size={12} /> Preview menu
                      </a>
                    </div>
                  </div>

                  <div className={settingsPanelClass}>
                    <p className={settingsLabelClass}>QR slots on PDF</p>
                    <p className={cn("mt-1 mb-4 text-[11px]", isLight ? "text-zinc-600" : "text-zinc-500")}>
                      Choose menu-only or table-linked per slot. Table slots print the table label on the PDF.
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {qrConfig.slots.map((slot) => (
                        <SlotEditor
                          key={slot.slotIndex}
                          slot={slot}
                          canEdit={canEdit}
                          qrSaving={qrSaving}
                          isLight={isLight}
                          settingsInputClass={settingsInputClass}
                          onChange={(patch) => updateSlot(slot.slotIndex, patch)}
                        />
                      ))}
                    </div>
                  </div>

                  {bindings.length > 0 && (
                    <div className={settingsPanelClass}>
                      <p className={settingsLabelClass}>Active table links</p>
                      <p className={cn("mt-1 mb-3 text-[11px]", isLight ? "text-zinc-600" : "text-zinc-500")}>
                        Cancelling clears the table binding and ends the linked session. Floor stays occupied until cleared.
                      </p>
                      <ul className="space-y-2">
                        {bindings.map((b) => (
                          <li
                            key={b.id}
                            className={cn(
                              "flex items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm",
                              isLight ? "border-zinc-200" : "border-white/10",
                            )}
                          >
                            <span className="font-medium text-zinc-200">{b.tableLabel}</span>
                            {canEdit && (
                              <button
                                type="button"
                                className="text-xs text-red-400 hover:text-red-300"
                                onClick={async () => {
                                  if (!window.confirm(`Cancel QR link for ${b.tableLabel}?`)) return;
                                  try {
                                    await cancelTableQrBinding(supabase, b.id);
                                    toast.success("Table QR link cancelled.");
                                    await loadQr();
                                  } catch (err) {
                                    toast.error(err instanceof Error ? err.message : "Could not cancel.");
                                  }
                                }}
                              >
                                Cancel link
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>

      <Dialog open={!!previewUrl} onOpenChange={(open) => !open && setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4">
            <DialogTitle>Menu QR PDF preview</DialogTitle>
          </DialogHeader>
          {previewUrl ? (
            <iframe title="Menu QR PDF preview" src={previewUrl} className="w-full flex-1 min-h-[70vh] border-0" />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!pendingTagDelete} onOpenChange={(open) => !open && setPendingTagDelete(null)}>
        <DialogContent hideClose className="glass-modal max-w-sm p-6">
          <DialogHeader className="p-0">
            <DialogTitle>Delete Menu Tag?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-300 mt-3">
            Delete <span className="font-semibold">{pendingTagDelete?.label}</span>?
          </p>
          <div className="flex justify-end gap-2 pt-4">
            <button type="button" className="px-3 py-1.5 text-xs rounded-md border border-white/15" onClick={() => setPendingTagDelete(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="px-3 py-1.5 text-xs rounded-md border border-red-500/30 text-red-300"
              disabled={savingTags}
              onClick={() => {
                if (!pendingTagDelete) return;
                const next = menuTags.filter((_, i) => i !== pendingTagDelete.index);
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
        onClose={() => {
          setTagDialogMode(null);
          setTagDialogTarget(null);
        }}
        onSubmit={async (next) => persistMenuTags(next)}
      />
    </div>
  );
}

function SlotEditor({
  slot,
  canEdit,
  qrSaving,
  isLight,
  settingsInputClass,
  onChange,
}: {
  slot: MenuQrSlot;
  canEdit: boolean;
  qrSaving: boolean;
  isLight: boolean;
  settingsInputClass: string;
  onChange: (patch: Partial<MenuQrSlot>) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-2",
        isLight ? "border-zinc-200 bg-zinc-50" : "border-white/10 bg-zinc-900/50",
      )}
    >
      <p className="text-xs font-semibold text-zinc-400">Slot {slot.slotIndex + 1}</p>
      <select
        value={slot.mode}
        disabled={!canEdit || qrSaving}
        onChange={(e) => onChange({ mode: e.target.value as MenuQrSlotMode })}
        className={settingsInputClass}
      >
        <option value="menu">Menu-only QR</option>
        <option value="table">Table-linked QR</option>
      </select>
      {slot.mode === "table" && (
        <input
          type="text"
          value={slot.tableLabel}
          disabled={!canEdit || qrSaving}
          onChange={(e) => onChange({ tableLabel: e.target.value })}
          placeholder='e.g. Table 5, Patio 4'
          className={settingsInputClass}
        />
      )}
      <p className="text-[10px] text-zinc-500 font-mono truncate">
        {buildPublicMenuShareUrl(0, slot.slotIndex).replace("restaurantId=0", "restaurantId=…")}
      </p>
    </div>
  );
}

function resizeSlots(slots: MenuQrSlot[], codesPerPage: MenuQrPdfCodesPerPage): MenuQrSlot[] {
  const count = Math.max(6, codesPerPage);
  const byIndex = new Map(slots.map((s) => [s.slotIndex, s]));
  return Array.from({ length: count }, (_, i) =>
    byIndex.get(i) ?? { slotIndex: i, mode: "menu", tableLabel: "" },
  );
}

export default memo(MenuSettingsPanel);
