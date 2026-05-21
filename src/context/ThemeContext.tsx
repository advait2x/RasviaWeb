import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
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

const ThemeContext = createContext<Omit<ThemeContextValue, "resolvedTheme"> | null>(null);

function readResolvedThemeFromDom(): ResolvedTheme {
  if (typeof document === "undefined") return "dark";
  const locked = document.documentElement.getAttribute("data-theme-lock");
  if (locked === "dark" || locked === "light") return locked;
  const dataTheme = document.documentElement.getAttribute("data-theme");
  if (dataTheme === "dark" || dataTheme === "light") return dataTheme;
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function subscribeResolvedTheme(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "data-theme-lock"],
  });
  return () => observer.disconnect();
}

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

const PAGE_OVERSCROLL: Record<ResolvedTheme, string> = {
  light: "#fafafa",
  dark: "#050505",
};

function syncPageCanvas(resolved: ResolvedTheme) {
  const color = PAGE_OVERSCROLL[resolved];
  const root = document.documentElement;
  root.style.backgroundColor = color;
  if (document.body) document.body.style.backgroundColor = color;

  let meta = document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null;
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "theme-color";
    document.head.appendChild(meta);
  }
  meta.content = color;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === "undefined") return "system";
    const saved = window.localStorage.getItem(THEME_MODE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
    return "system";
  });
  const modeRef = useRef(mode);
  modeRef.current = mode;

  /** Keep <html> class + CSS vars aligned with mode, route-level locks, and system preference. */
  useLayoutEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      root.classList.add("theme-switching");
      const lockedTheme = root.getAttribute("data-theme-lock");
      const nextResolved: ResolvedTheme =
        lockedTheme === "dark" || lockedTheme === "light"
          ? (lockedTheme as ResolvedTheme)
          : resolveTheme(modeRef.current);
      root.setAttribute("data-theme-mode", modeRef.current);
      root.setAttribute("data-theme", nextResolved);
      root.style.colorScheme = nextResolved;
      root.classList.toggle("dark", nextResolved === "dark");
      syncPageCanvas(nextResolved);
      root.classList.add("theme-ready");
      window.localStorage.setItem(THEME_MODE_KEY, modeRef.current);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => root.classList.remove("theme-switching"));
      });
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
      root.setAttribute("data-theme", next);
      root.style.colorScheme = next;
      root.classList.toggle("dark", next === "dark");
      syncPageCanvas(next);
    };
    media.addEventListener?.("change", handler);
    return () => media.removeEventListener?.("change", handler);
  }, [mode]);

  const value = useMemo<Omit<ThemeContextValue, "resolvedTheme">>(() => {
    return {
      mode,
      setMode: setModeState,
      cycleMode: () => {
        setModeState((prev) => (prev === "system" ? "light" : prev === "light" ? "dark" : "system"));
      },
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
  const resolvedTheme = useSyncExternalStore(
    subscribeResolvedTheme,
    readResolvedThemeFromDom,
    () => resolveTheme(ctx.mode),
  );
  return { ...ctx, resolvedTheme };
}
