import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

type ThemeIconToggleProps = {
  className?: string;
  /** Marketing header — avoids zinc bg classes that break under light-theme remaps */
  variant?: "default" | "marketing";
};

export function ThemeIconToggle({ className, variant = "default" }: ThemeIconToggleProps) {
  const { resolvedTheme, setMode } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setMode(isDark ? "light" : "dark")}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-[background-color,box-shadow] duration-150",
        variant === "marketing"
          ? "border-zinc-300 bg-white text-zinc-800 dark:border-white/15 dark:bg-[#27272a] dark:text-[#f4f4f5]"
          : "border-zinc-300 bg-white text-zinc-800 dark:border-white/15 dark:bg-zinc-900/85 dark:text-zinc-100 dark:hover:bg-zinc-800/90",
        className,
      )}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun size={16} strokeWidth={1.9} /> : <Moon size={16} strokeWidth={1.9} />}
    </button>
  );
}

