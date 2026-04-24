import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DASH_BTN_ADD_SM } from "@/lib/dashboardUi";
import { DEFAULT_MENU_TAGS, MenuTagConfig, slugifyTag } from "@/lib/menu-tags";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const TAG_COLOR_PRESETS = DEFAULT_MENU_TAGS.map((tag) => ({
  color: tag.color,
  bg: tag.bg,
  border: tag.border,
}));

type Mode = "create" | "edit";

export interface MenuTagDialogProps {
  open: boolean;
  mode: Mode;
  tags: MenuTagConfig[];
  /** The tag being edited (mode="edit") — used to seed state. */
  editingTag?: MenuTagConfig;
  onClose: () => void;
  /** Called with the full next list of tags (already including the add/edit). */
  onSubmit: (next: MenuTagConfig[]) => Promise<boolean>;
}

export default function MenuTagDialog({
  open, mode, tags, editingTag, onClose, onSubmit,
}: MenuTagDialogProps) {
  const [label, setLabel] = useState("");
  const [colorIdx, setColorIdx] = useState(0);
  const [position, setPosition] = useState(1);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setBusy(false);

    if (mode === "edit" && editingTag) {
      setLabel(editingTag.label);
      const matched = TAG_COLOR_PRESETS.findIndex(
        (preset) => preset.color === editingTag.color && preset.bg === editingTag.bg && preset.border === editingTag.border
      );
      setColorIdx(matched >= 0 ? matched : 0);
      const existingIdx = tags.findIndex((t) => t.key === editingTag.key);
      setPosition(existingIdx >= 0 ? existingIdx + 1 : tags.length);
      setEnabled(editingTag.enabled !== false);
    } else {
      setLabel("");
      setColorIdx((tags.length) % TAG_COLOR_PRESETS.length);
      setPosition(tags.length + 1);
      setEnabled(true);
    }
  }, [open, mode, editingTag, tags]);

  const existingList = useMemo(() => tags, [tags]);

  const handleSubmit = async () => {
    const trimmed = label.trim();
    if (!trimmed) {
      setError("Tag name cannot be empty.");
      return;
    }
    const key = slugifyTag(trimmed);
    if (!key) {
      setError("Tag name is invalid.");
      return;
    }

    const preset = TAG_COLOR_PRESETS[colorIdx] ?? TAG_COLOR_PRESETS[0];

    // Build the next list.
    const maxPos = mode === "create" ? tags.length + 1 : tags.length;
    const minPos = 1;
    const clampedPos = Math.min(Math.max(Math.floor(position) || 1, minPos), maxPos);

    let working: MenuTagConfig[];

    if (mode === "edit" && editingTag) {
      const existingIdx = tags.findIndex((t) => t.key === editingTag.key);
      if (existingIdx < 0) {
        setError("Tag to edit was not found.");
        return;
      }
      // Disallow key collisions with other tags.
      if (key !== editingTag.key && tags.some((t) => t.key === key)) {
        setError("Another tag already uses this name.");
        return;
      }
      const updated: MenuTagConfig = {
        ...editingTag,
        key,
        label: trimmed,
        color: preset.color,
        bg: preset.bg,
        border: preset.border,
        enabled,
      };
      const without = tags.filter((_, i) => i !== existingIdx);
      const insertAt = Math.min(Math.max(clampedPos - 1, 0), without.length);
      working = [...without];
      working.splice(insertAt, 0, updated);
    } else {
      if (tags.some((t) => t.key === key)) {
        setError("This tag already exists.");
        return;
      }
      const newTag: MenuTagConfig = {
        key,
        label: trimmed,
        color: preset.color,
        bg: preset.bg,
        border: preset.border,
        enabled: true,
        position: clampedPos - 1,
      };
      const insertAt = Math.min(Math.max(clampedPos - 1, 0), tags.length);
      working = [...tags];
      working.splice(insertAt, 0, newTag);
    }

    // Re-normalize positions to be sequential (serializeMenuTags inside persistMenuTags handles this too).
    working = working.map((tag, idx) => ({ ...tag, position: idx }));

    setBusy(true);
    try {
      const ok = await onSubmit(working);
      if (ok) onClose();
    } finally {
      setBusy(false);
    }
  };

  const positionLabel =
    mode === "create"
      ? `1–${tags.length + 1}`
      : `1–${tags.length}`;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent hideClose className="glass-modal max-w-md border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
        <DialogHeader className="p-0 mb-4">
          <DialogTitle className="text-base font-semibold text-zinc-100">
            {mode === "create" ? "Add Menu Tag" : "Edit Menu Tag"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Name
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Gluten-Free"
              className="bg-zinc-800 border-white/10 text-zinc-100"
              autoFocus
            />
          </label>

          <div className="flex flex-col gap-1.5 text-xs text-zinc-400">
            Color
            <div className="flex flex-wrap gap-2">
              {TAG_COLOR_PRESETS.map((preset, idx) => (
                <button
                  key={`${preset.color}-${idx}`}
                  type="button"
                  onClick={() => setColorIdx(idx)}
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    background: preset.color,
                    borderColor: colorIdx === idx ? "#f5f5f5" : "#27272a",
                  }}
                  aria-label={`Color option ${idx + 1}`}
                />
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Position ({positionLabel})
            <Input
              type="number"
              min={1}
              max={mode === "create" ? tags.length + 1 : tags.length}
              value={position}
              onChange={(e) => setPosition(Number(e.target.value))}
              className="bg-zinc-800 border-white/10 text-zinc-100"
            />
            {existingList.length > 0 && (
              <div className="mt-2 rounded-md border border-white/5 bg-zinc-900/70 p-2 max-h-28 overflow-y-auto text-[11px] text-zinc-400 space-y-0.5">
                {existingList.map((t, i) => (
                  <div key={t.key} className="flex items-center gap-2">
                    <span className="tabular-nums w-5 text-zinc-500">{i + 1}.</span>
                    <span className="truncate" style={{ color: t.color }}>{t.label}</span>
                    {mode === "edit" && editingTag?.key === t.key && (
                      <span className="text-[10px] text-zinc-600 ml-auto">(editing)</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </label>

          {mode === "edit" && (
            <label className="flex items-center gap-2 text-xs text-zinc-400">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="accent-amber-600 dark:accent-amber-500"
              />
              Enabled (shown in filters)
            </label>
          )}

          {error && <p className="text-xs text-red-400">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 pt-5">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-white/15 bg-zinc-800 text-zinc-300 text-xs font-semibold disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            className={cn(DASH_BTN_ADD_SM, "flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold disabled:opacity-60")}
          >
            {busy && <Loader2 size={12} className="animate-spin" />}
            {mode === "create" ? "Add Tag" : "Save"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
