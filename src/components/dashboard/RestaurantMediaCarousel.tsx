import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Images,
  Link2,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { DASH_BTN_ADD, DASH_BTN_ADD_SM } from "@/lib/dashboardUi";
import { cn } from "@/lib/utils";

type MenuItemOption = { id: number; name: string; image_url: string | null };
type SlideDraft = { localId: string; imageUrl: string; menuItemId: number | null; useLink: boolean };

function toPublicImageUrl(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return supabase.storage.from("restaurant-images").getPublicUrl(raw).data.publicUrl;
}

/**
 * Guest-facing hero carousel for the restaurant profile - lives under Settings → Restaurant.
 */
export default function RestaurantMediaCarousel() {
  const { restaurantId } = useAuth();
  const [menuItems, setMenuItems] = useState<MenuItemOption[]>([]);
  const [slides, setSlides] = useState<SlideDraft[]>([]);
  const [carouselSaving, setCarouselSaving] = useState(false);
  const [uploadingSlideId, setUploadingSlideId] = useState<string | null>(null);
  const [includeDefaultStarter, setIncludeDefaultStarter] = useState(true);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!restaurantId) {
        setLoading(false);
        return;
      }
      const rid = Number(restaurantId);
      if (!Number.isFinite(rid) || rid <= 0) {
        setLoading(false);
        return;
      }

      try {
        const [restRes, menuRes, slidesRes] = await Promise.all([
          supabase.from("restaurants").select("use_regular_image_as_first_slide").eq("id", rid).maybeSingle(),
          supabase.from("menu_items").select("id, name, image_url").eq("restaurant_id", rid).order("name", { ascending: true }),
          supabase
            .from("restaurant_media_slides")
            .select("id, image_url, menu_item_id, position")
            .eq("restaurant_id", rid)
            .order("position", { ascending: true }),
        ]);

        if (!active) return;
        if (!restRes.error && restRes.data) {
          setIncludeDefaultStarter((restRes.data as { use_regular_image_as_first_slide?: boolean }).use_regular_image_as_first_slide !== false);
        }
        if (!menuRes.error) setMenuItems((menuRes.data ?? []) as MenuItemOption[]);
        if (!slidesRes.error) {
          const next = ((slidesRes.data ?? []) as Record<string, unknown>[]).map((row) => {
            const u = String(row.image_url ?? "").trim();
            return {
              localId: String(row.id),
              imageUrl: u,
              menuItemId: row.menu_item_id ? Number(row.menu_item_id) : null,
              useLink: /^https?:\/\//i.test(u),
            } satisfies SlideDraft;
          });
          setSlides(next);
        }
      } catch {
        // ignore
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const addSlide = () =>
    setSlides((prev) => [
      ...prev,
      { localId: `new-${Date.now()}-${Math.random().toString(16).slice(2)}`, imageUrl: "", menuItemId: null, useLink: false },
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
      updateSlide(localId, { imageUrl: data.path, useLink: false });
      setStatusMessage("Image uploaded.");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not upload image.";
      setStatusMessage(msg);
    } finally {
      setUploadingSlideId(null);
    }
  };

  const saveCarousel = async () => {
    const rid = Number(restaurantId);
    if (!Number.isFinite(rid) || rid <= 0) return;
    const validSlides = slides.filter((s) => s.imageUrl.trim().length > 0 || !!s.menuItemId);
    setCarouselSaving(true);
    setStatusMessage("");
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
        const { error: insError } = await supabase.from("restaurant_media_slides").insert(payload as Record<string, unknown>[]);
        if (insError) throw insError;
      }
      const { data: reloaded } = await supabase
        .from("restaurant_media_slides")
        .select("id, image_url, menu_item_id, position")
        .eq("restaurant_id", rid)
        .order("position", { ascending: true });
      if (reloaded) {
        setSlides(
          (reloaded as Record<string, unknown>[]).map((row) => {
            const u = String(row.image_url ?? "").trim();
            return {
              localId: String(row.id),
              imageUrl: u,
              menuItemId: row.menu_item_id ? Number(row.menu_item_id) : null,
              useLink: /^https?:\/\//i.test(u),
            } satisfies SlideDraft;
          }),
        );
      }
      setStatusMessage("Carousel saved.");
      setTimeout(() => setStatusMessage(""), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not save carousel.";
      setStatusMessage(msg);
    } finally {
      setCarouselSaving(false);
    }
  };

  if (!restaurantId) return null;

  const openLightbox = (url: string) => {
    const u = toPublicImageUrl(url);
    if (u) setLightbox(u);
  };

  const lightboxEl =
    lightbox && typeof document !== "undefined"
      ? createPortal(
          <div
            role="button"
            tabIndex={0}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4"
            onClick={() => setLightbox(null)}
            onKeyDown={(e) => {
              if (e.key === "Escape" || e.key === "Enter") setLightbox(null);
            }}
          >
            <button
              type="button"
              className="absolute right-4 top-4 rounded-lg border border-white/15 bg-zinc-900/90 p-2 text-zinc-200 hover:bg-zinc-800"
              onClick={() => setLightbox(null)}
              aria-label="Close"
            >
              <X size={22} />
            </button>
            <img
              src={lightbox}
              alt=""
              className="max-h-[min(90vh,900px)] max-w-full rounded-xl object-contain shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="space-y-4 border-t border-white/5 pt-6">
      {lightboxEl}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10">
            <Images size={18} strokeWidth={1.5} className="text-amber-400/90" />
          </div>
          <div>
            <h3 className="text-base font-bold tracking-tight text-zinc-100">Guest media carousel</h3>
            <p className="mt-0.5 text-xs text-zinc-500">Hero images in the Rasvia app. Reorder slides, link menu items, or upload new artwork.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (editing) setEditing(false);
            else setEditing(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/12 bg-zinc-800/90 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition-colors hover:border-amber-500/30 hover:bg-zinc-800"
        >
          <Pencil size={14} />
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={22} strokeWidth={1.5} className="animate-spin text-zinc-500" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/[0.08] bg-zinc-800/30 p-4">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-zinc-100">Use profile photo as first slide</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {includeDefaultStarter ? "Custom slides are shown after your main restaurant image." : "Only custom slides are shown."}
                </p>
              </div>
              <input
                type="checkbox"
                checked={includeDefaultStarter}
                onChange={(e) => setIncludeDefaultStarter(e.target.checked)}
                disabled={!editing}
                className="h-4 w-4 shrink-0 rounded accent-amber-500 disabled:opacity-50"
              />
            </label>
          </div>

          <div className="space-y-3">
            {slides.map((slide, index) => {
              const imgSrc = slide.imageUrl.trim() ? toPublicImageUrl(slide.imageUrl) : "";
              const linked = slide.menuItemId ? menuItems.find((m) => m.id === slide.menuItemId) : null;
              if (!editing) {
                return (
                  <div
                    key={slide.localId}
                    className="flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4"
                  >
                    <p className="w-full text-sm font-semibold text-zinc-200">
                      Slide {index + (includeDefaultStarter ? 2 : 1)}
                      {linked ? <span className="font-normal text-zinc-500"> · {linked.name}</span> : null}
                    </p>
                    {imgSrc ? (
                      <button
                        type="button"
                        onClick={() => openLightbox(slide.imageUrl)}
                        className="overflow-hidden rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <img src={imgSrc} alt={linked ? `${linked.name} menu slide preview` : `Slide ${index + (includeDefaultStarter ? 2 : 1)} preview`} className="h-24 w-24 object-cover" />
                      </button>
                    ) : (
                      <div className="flex h-24 w-24 items-center justify-center rounded-lg border border-dashed border-white/10 bg-zinc-950/80 text-xs text-zinc-600">No image</div>
                    )}
                  </div>
                );
              }
              return (
                <motion.div
                  key={slide.localId}
                  layout
                  className="space-y-3 rounded-xl border border-white/[0.08] bg-zinc-900/40 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-200">
                      Slide {index + (includeDefaultStarter ? 2 : 1)}
                      {index === 0 ? (includeDefaultStarter ? " · first custom" : " · leads") : ""}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => moveSlide(index, -1)}
                        disabled={index === 0}
                        className="rounded-lg border border-white/10 bg-zinc-800/80 p-2 text-zinc-300 transition-colors hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Move up"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSlide(index, 1)}
                        disabled={index === slides.length - 1}
                        className="rounded-lg border border-white/10 bg-zinc-800/80 p-2 text-zinc-300 transition-colors hover:bg-zinc-700/80 disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Move down"
                      >
                        <ChevronDown size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(slide.localId)}
                        className="rounded-lg border border-red-500/30 bg-red-950/55 p-2 text-red-200/95 transition-colors hover:border-red-500/45 hover:bg-red-950/75 hover:text-red-100"
                        aria-label="Remove slide"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => updateSlide(slide.localId, { useLink: false })}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        !slide.useLink
                          ? "border-amber-800/45 bg-amber-100/90 text-amber-950/90 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200"
                          : "border-zinc-200 bg-zinc-100/90 text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:border-white/20",
                      )}
                    >
                      <Upload size={13} />
                      Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSlide(slide.localId, { useLink: true })}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                        slide.useLink
                          ? "border-amber-800/45 bg-amber-100/90 text-amber-950/90 dark:border-amber-500/50 dark:bg-amber-500/15 dark:text-amber-200"
                          : "border-zinc-200 bg-zinc-100/90 text-zinc-700 hover:border-zinc-300 dark:border-white/10 dark:bg-zinc-800/80 dark:text-zinc-400 dark:hover:border-white/20",
                      )}
                    >
                      <Link2 size={13} />
                      Use link
                    </button>
                  </div>

                  {slide.useLink ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Image URL or storage path</label>
                      <input
                        value={slide.imageUrl}
                        onChange={(e) => updateSlide(slide.localId, { imageUrl: e.target.value })}
                        placeholder="https://… or storage path"
                        className="h-10 w-full rounded-lg border border-white/10 bg-zinc-800/60 px-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-amber-500/40 focus:outline-none"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
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
                        className={cn(
                          "inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors",
                          DASH_BTN_ADD_SM,
                          "text-xs",
                          uploadingSlideId === slide.localId && "pointer-events-none opacity-60",
                        )}
                      >
                        {uploadingSlideId === slide.localId ? (
                          <>
                            <Loader2 size={13} className="animate-spin" /> Uploading…
                          </>
                        ) : (
                          "Choose image to upload"
                        )}
                      </label>
                    </div>
                  )}

                  {!!slide.imageUrl.trim() && (
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => openLightbox(slide.imageUrl)}
                        className="shrink-0 overflow-hidden rounded-lg border border-white/10 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                      >
                        <img src={toPublicImageUrl(slide.imageUrl)} alt={`Slide ${index + (includeDefaultStarter ? 2 : 1)} preview`} className="h-20 w-20 object-cover" />
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Linked menu item</label>
                    <select
                      value={slide.menuItemId ?? ""}
                      onChange={(e) => updateSlide(slide.localId, { menuItemId: e.target.value ? Number(e.target.value) : null })}
                      className="h-10 w-full rounded-lg border border-white/10 bg-zinc-800/60 px-3 text-sm text-zinc-100 focus:border-amber-500/40 focus:outline-none"
                    >
                      <option value="">None</option>
                      {menuItems.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </motion.div>
              );
            })}
          </div>

          {slides.length === 0 && (
            <p className="rounded-lg border border-dashed border-white/10 bg-zinc-900/30 px-4 py-6 text-center text-sm text-zinc-500">
              {editing ? "No custom slides yet. Add a slide to show extra photos in the guest app." : "No custom slides configured."}
            </p>
          )}

          {editing && (
            <div className="flex flex-wrap gap-2 pt-1">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={addSlide}
                className={`${DASH_BTN_ADD} px-4 py-2.5`}
              >
                <Plus size={15} strokeWidth={2} /> Add slide
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={() => void saveCarousel()}
                disabled={carouselSaving}
                className={cn(
                  "inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                  DASH_BTN_ADD,
                )}
              >
                {carouselSaving ? <RefreshCw size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2} />}
                {carouselSaving ? "Saving…" : "Save carousel"}
              </motion.button>
            </div>
          )}

          {statusMessage ? <p className="text-xs text-amber-300/95">{statusMessage}</p> : null}
        </div>
      )}
    </div>
  );
}
