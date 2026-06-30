import { useEffect, useRef, useState } from "react";
import { Check, Palette } from "lucide-react";
import { useCloveTheme } from "@/clove/CloveThemeContext";
import { themeSwatch } from "@/clove/themes";
import type { CloveTheme } from "@/clove/themes";

type CloveThemeSwitcherProps = {
  className?: string;
  variant?: "dropdown" | "inline";
};

function ThemeOptionList({
  themes,
  themeId,
  onSelect,
}: {
  themes: CloveTheme[];
  themeId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <>
      {themes.map((t) => {
        const swatch = themeSwatch(t);
        const active = t.id === themeId;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onSelect(t.id)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
              active ? "bg-secondary" : "hover:bg-secondary/60"
            }`}
          >
            <span className="flex flex-shrink-0 items-center -space-x-1.5">
              <span
                className="h-6 w-6 rounded-full ring-2 ring-popover"
                style={{ background: swatch.primary }}
              />
              <span
                className="h-6 w-6 rounded-full ring-2 ring-popover"
                style={{ background: swatch.accent }}
              />
              <span
                className="h-6 w-6 rounded-full ring-2 ring-popover"
                style={{ background: swatch.highlight }}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-bold text-popover-foreground">
                {t.label}
              </span>
              <span className="block truncate text-[11px] text-muted-foreground">
                {t.description}
              </span>
            </span>
            {active ? <Check size={16} className="flex-shrink-0 text-primary" /> : null}
          </button>
        );
      })}
    </>
  );
}

/**
 * Live theme switcher for the microsite. Lets a prospect (or us, during a
 * sales demo) flip the entire restaurant identity in one tap so they can see
 * how drastically the same template re-skins per client.
 */
export function CloveThemeSwitcher({
  className = "",
  variant = "dropdown",
}: CloveThemeSwitcherProps) {
  const { themes, themeId, setThemeId, theme } = useCloveTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (variant !== "dropdown" || !open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, variant]);

  const activeSwatch = themeSwatch(theme);

  const handleSelect = (id: string) => {
    setThemeId(id);
    setOpen(false);
  };

  if (variant === "inline") {
    return (
      <div className={className}>
        <div className="rounded-2xl border-2 border-border bg-card">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-foreground">Restaurant theme</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Each preset is a different client identity — same template, new look.
            </p>
          </div>
          <div className="flex max-h-[40vh] flex-col overflow-y-auto p-1.5">
            <ThemeOptionList themes={themes} themeId={themeId} onSelect={handleSelect} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Change restaurant theme"
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-foreground transition-colors hover:bg-secondary"
      >
        <Palette size={15} />
        <span className="hidden text-xs font-semibold sm:inline">Theme</span>
        <span
          className="h-3.5 w-3.5 rounded-full ring-1 ring-border"
          style={{ background: activeSwatch.primary }}
        />
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border-2 border-border bg-popover shadow-2xl">
          <div className="border-b border-border px-4 py-3">
            <p className="text-sm font-bold text-popover-foreground">Restaurant theme</p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
              Each preset is a different client identity — same template, new look.
            </p>
          </div>
          <div className="flex max-h-[60vh] flex-col overflow-y-auto p-1.5">
            <ThemeOptionList themes={themes} themeId={themeId} onSelect={handleSelect} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
