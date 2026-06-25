import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useTheme } from "@/context/ThemeContext";
import {
  CLOVE_THEMES,
  DEFAULT_CLOVE_THEME_ID,
  getCloveTheme,
  tokensToCssVars,
  type CloveTheme,
} from "@/clove/themes";

const STORAGE_KEY = "clove:theme:v1";

type CloveThemeContextValue = {
  /** Active preset id. */
  themeId: string;
  /** Active preset object. */
  theme: CloveTheme;
  /** All available presets (for the switcher). */
  themes: CloveTheme[];
  setThemeId: (id: string) => void;
  /** CSS custom properties for the active preset + resolved light/dark mode. */
  cssVars: CSSProperties;
};

const CloveThemeContext = createContext<CloveThemeContextValue | null>(null);

function readInitialThemeId(): string {
  if (typeof window === "undefined") return DEFAULT_CLOVE_THEME_ID;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && CLOVE_THEMES.some((t) => t.id === saved)) return saved;
  } catch {
    /* ignore storage errors */
  }
  return DEFAULT_CLOVE_THEME_ID;
}

export function CloveThemeProvider({ children }: { children: ReactNode }) {
  // resolvedTheme flips when the visitor toggles light/dark in the nav.
  const { resolvedTheme } = useTheme();
  const [themeId, setThemeIdState] = useState<string>(readInitialThemeId);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    try {
      window.localStorage.setItem(STORAGE_KEY, id);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const theme = getCloveTheme(themeId);
  const tokens = resolvedTheme === "light" ? theme.light : theme.dark;
  const cssVars = useMemo(() => tokensToCssVars(tokens), [tokens]);

  const value = useMemo<CloveThemeContextValue>(
    () => ({ themeId, theme, themes: CLOVE_THEMES, setThemeId, cssVars }),
    [themeId, theme, setThemeId, cssVars],
  );

  return <CloveThemeContext.Provider value={value}>{children}</CloveThemeContext.Provider>;
}

export function useCloveTheme(): CloveThemeContextValue {
  const ctx = useContext(CloveThemeContext);
  if (!ctx) throw new Error("useCloveTheme must be used inside CloveThemeProvider");
  return ctx;
}
