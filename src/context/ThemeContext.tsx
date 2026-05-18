import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export type ThemeMode = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  cycleMode: () => void;
};

const THEME_MODE_KEY = "rasvia:web:theme-mode";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return "dark";
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "system") return getSystemTheme();
  return mode;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(THEME_MODE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveTheme(mode));
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /** Keep <html> class + CSS vars aligned with mode, route-level locks, and system preference. */
  useLayoutEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const lockedTheme = root.getAttribute("data-theme-lock");
      const nextResolved: ResolvedTheme =
        lockedTheme === "dark" || lockedTheme === "light"
          ? (lockedTheme as ResolvedTheme)
          : resolveTheme(modeRef.current);
      setResolvedTheme(nextResolved);
      root.setAttribute("data-theme-mode", modeRef.current);
      root.setAttribute("data-theme", nextResolved);
      root.style.colorScheme = nextResolved;
      root.classList.toggle("dark", nextResolved === "dark");
      root.classList.add("theme-ready");
      window.localStorage.setItem(THEME_MODE_KEY, modeRef.current);
    };

    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme-lock"] });
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      const root = document.documentElement;
      const locked = root.getAttribute("data-theme-lock");
      if (locked === "dark" || locked === "light") return;
      const next = resolveTheme("system");
      setResolvedTheme(next);
      root.setAttribute("data-theme", next);
      root.style.colorScheme = next;
      root.classList.toggle("dark", next === "dark");
    };
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [mode]);

  const value = useMemo<ThemeContextValue>(() => {
    return {
      mode,
      resolvedTheme,
      setMode: setModeState,
      cycleMode: () => {
        setModeState((prev) => (prev === "system" ? "light" : prev === "light" ? "dark" : "system"));
      },
    };
  }, [mode, resolvedTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  return ctx;
}
