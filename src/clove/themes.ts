/**
 * Clove microsite theme presets.
 *
 * Each preset is a complete, self-contained restaurant visual identity. The
 * template structure (layout, components, copy slots) stays fixed while the
 * palette swaps wholesale — this is what lets us spin up a custom-looking site
 * per client in minutes instead of re-skinning by hand.
 *
 * Tokens are raw HSL triplets (e.g. "168 62% 42%") so they drop straight into
 * the shadcn-style `hsl(var(--token))` Tailwind bridge already wired in
 * `tailwind.config.js`. `border`/`input` may carry an alpha suffix
 * ("158 20% 60% / 0.14"). The provider sets these as inline CSS custom
 * properties on the `.clove-scope` element, overriding the static defaults in
 * `index.css` for the active preset + light/dark mode.
 */

import type { CSSProperties } from "react";

export type CloveThemeTokens = {
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  popover: string;
  popoverForeground: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  muted: string;
  mutedForeground: string;
  accent: string;
  accentForeground: string;
  destructive: string;
  destructiveForeground: string;
  border: string;
  input: string;
  ring: string;
  /** Brand "spark" highlight (maps to the legacy --clove-saffron utility). */
  highlight: string;
  highlightForeground: string;
};

export type CloveTheme = {
  id: string;
  /** Human label shown in the theme switcher. */
  label: string;
  /** One-line positioning shown under the label. */
  description: string;
  dark: CloveThemeTokens;
  light: CloveThemeTokens;
};

export const DEFAULT_CLOVE_THEME_ID = "clove-teal";

export const CLOVE_THEMES: CloveTheme[] = [
  {
    id: "clove-teal",
    label: "Clove Teal",
    description: "Modern Indian · teal & saffron",
    dark: {
      background: "160 8% 8%",
      foreground: "150 12% 94%",
      card: "165 7% 12%",
      cardForeground: "150 12% 94%",
      popover: "165 8% 11%",
      popoverForeground: "150 12% 94%",
      primary: "168 62% 42%",
      primaryForeground: "165 30% 7%",
      secondary: "165 7% 17%",
      secondaryForeground: "150 10% 85%",
      muted: "165 7% 17%",
      mutedForeground: "155 8% 60%",
      accent: "158 64% 44%",
      accentForeground: "165 30% 7%",
      destructive: "0 72% 55%",
      destructiveForeground: "0 0% 98%",
      border: "158 20% 60% / 0.14",
      input: "158 20% 60% / 0.16",
      ring: "168 62% 46%",
      highlight: "32 92% 52%",
      highlightForeground: "165 30% 7%",
    },
    light: {
      background: "150 30% 97%",
      foreground: "165 30% 14%",
      card: "0 0% 100%",
      cardForeground: "165 30% 14%",
      popover: "0 0% 100%",
      popoverForeground: "165 30% 14%",
      primary: "168 58% 38%",
      primaryForeground: "0 0% 100%",
      secondary: "150 22% 92%",
      secondaryForeground: "165 28% 22%",
      muted: "150 22% 92%",
      mutedForeground: "160 12% 40%",
      accent: "158 56% 40%",
      accentForeground: "0 0% 100%",
      destructive: "0 74% 52%",
      destructiveForeground: "0 0% 100%",
      border: "165 25% 25% / 0.14",
      input: "165 25% 25% / 0.16",
      ring: "168 58% 42%",
      highlight: "32 88% 46%",
      highlightForeground: "165 30% 10%",
    },
  },
  {
    id: "saffron-royale",
    label: "Saffron Royale",
    description: "Mughlai fine dining · gold & crimson",
    dark: {
      background: "24 12% 8%",
      foreground: "40 30% 94%",
      card: "24 12% 12%",
      cardForeground: "40 30% 94%",
      popover: "24 12% 11%",
      popoverForeground: "40 30% 94%",
      primary: "38 92% 52%",
      primaryForeground: "30 50% 8%",
      secondary: "24 10% 18%",
      secondaryForeground: "40 20% 85%",
      muted: "24 10% 18%",
      mutedForeground: "35 12% 62%",
      accent: "348 78% 52%",
      accentForeground: "0 0% 100%",
      destructive: "0 72% 55%",
      destructiveForeground: "0 0% 98%",
      border: "38 40% 60% / 0.14",
      input: "38 40% 60% / 0.16",
      ring: "38 92% 56%",
      highlight: "348 78% 56%",
      highlightForeground: "0 0% 100%",
    },
    light: {
      background: "40 44% 97%",
      foreground: "28 40% 16%",
      card: "0 0% 100%",
      cardForeground: "28 40% 16%",
      popover: "0 0% 100%",
      popoverForeground: "28 40% 16%",
      primary: "36 90% 46%",
      primaryForeground: "0 0% 100%",
      secondary: "40 40% 91%",
      secondaryForeground: "28 35% 24%",
      muted: "40 40% 91%",
      mutedForeground: "32 18% 42%",
      accent: "348 74% 48%",
      accentForeground: "0 0% 100%",
      destructive: "0 74% 52%",
      destructiveForeground: "0 0% 100%",
      border: "30 35% 28% / 0.14",
      input: "30 35% 28% / 0.16",
      ring: "36 90% 50%",
      highlight: "348 74% 48%",
      highlightForeground: "0 0% 100%",
    },
  },
  {
    id: "coastal-spice",
    label: "Coastal Spice",
    description: "South Indian coastal · cyan & coral",
    dark: {
      background: "200 18% 8%",
      foreground: "190 25% 94%",
      card: "200 16% 12%",
      cardForeground: "190 25% 94%",
      popover: "200 16% 11%",
      popoverForeground: "190 25% 94%",
      primary: "189 72% 46%",
      primaryForeground: "200 50% 7%",
      secondary: "200 14% 18%",
      secondaryForeground: "190 18% 85%",
      muted: "200 14% 18%",
      mutedForeground: "195 12% 62%",
      accent: "9 88% 64%",
      accentForeground: "9 40% 10%",
      destructive: "0 72% 55%",
      destructiveForeground: "0 0% 98%",
      border: "189 35% 60% / 0.14",
      input: "189 35% 60% / 0.16",
      ring: "189 72% 50%",
      highlight: "9 88% 64%",
      highlightForeground: "9 40% 10%",
    },
    light: {
      background: "190 44% 97%",
      foreground: "200 40% 15%",
      card: "0 0% 100%",
      cardForeground: "200 40% 15%",
      popover: "0 0% 100%",
      popoverForeground: "200 40% 15%",
      primary: "190 78% 38%",
      primaryForeground: "0 0% 100%",
      secondary: "190 35% 91%",
      secondaryForeground: "200 35% 24%",
      muted: "190 35% 91%",
      mutedForeground: "198 16% 42%",
      accent: "9 82% 56%",
      accentForeground: "0 0% 100%",
      destructive: "0 74% 52%",
      destructiveForeground: "0 0% 100%",
      border: "200 30% 26% / 0.14",
      input: "200 30% 26% / 0.16",
      ring: "190 78% 42%",
      highlight: "9 82% 56%",
      highlightForeground: "0 0% 100%",
    },
  },
  {
    id: "midnight-ember",
    label: "Midnight Ember",
    description: "Modern tandoor lounge · charcoal & ember",
    dark: {
      background: "20 14% 7%",
      foreground: "30 18% 93%",
      card: "20 12% 11%",
      cardForeground: "30 18% 93%",
      popover: "20 12% 10%",
      popoverForeground: "30 18% 93%",
      primary: "16 88% 56%",
      primaryForeground: "20 50% 8%",
      secondary: "20 10% 16%",
      secondaryForeground: "30 14% 84%",
      muted: "20 10% 16%",
      mutedForeground: "25 10% 60%",
      accent: "42 92% 56%",
      accentForeground: "30 50% 8%",
      destructive: "0 72% 55%",
      destructiveForeground: "0 0% 98%",
      border: "16 40% 58% / 0.14",
      input: "16 40% 58% / 0.16",
      ring: "16 88% 58%",
      highlight: "42 92% 56%",
      highlightForeground: "30 50% 8%",
    },
    light: {
      background: "30 30% 96%",
      foreground: "20 35% 14%",
      card: "0 0% 100%",
      cardForeground: "20 35% 14%",
      popover: "0 0% 100%",
      popoverForeground: "20 35% 14%",
      primary: "16 84% 48%",
      primaryForeground: "0 0% 100%",
      secondary: "28 30% 91%",
      secondaryForeground: "20 32% 22%",
      muted: "28 30% 91%",
      mutedForeground: "22 16% 42%",
      accent: "38 88% 44%",
      accentForeground: "0 0% 100%",
      destructive: "0 74% 52%",
      destructiveForeground: "0 0% 100%",
      border: "20 32% 26% / 0.14",
      input: "20 32% 26% / 0.16",
      ring: "16 84% 50%",
      highlight: "38 88% 44%",
      highlightForeground: "0 0% 100%",
    },
  },
  {
    id: "rose-cardamom",
    label: "Rose & Cardamom",
    description: "Contemporary · rose & emerald",
    dark: {
      background: "330 12% 8%",
      foreground: "340 20% 94%",
      card: "330 10% 12%",
      cardForeground: "340 20% 94%",
      popover: "330 10% 11%",
      popoverForeground: "340 20% 94%",
      primary: "340 72% 60%",
      primaryForeground: "340 40% 9%",
      secondary: "330 9% 18%",
      secondaryForeground: "340 14% 85%",
      muted: "330 9% 18%",
      mutedForeground: "335 10% 62%",
      accent: "158 64% 48%",
      accentForeground: "158 40% 8%",
      destructive: "0 72% 55%",
      destructiveForeground: "0 0% 98%",
      border: "340 35% 62% / 0.14",
      input: "340 35% 62% / 0.16",
      ring: "340 72% 62%",
      highlight: "158 64% 48%",
      highlightForeground: "158 40% 8%",
    },
    light: {
      background: "340 40% 98%",
      foreground: "330 30% 16%",
      card: "0 0% 100%",
      cardForeground: "330 30% 16%",
      popover: "0 0% 100%",
      popoverForeground: "330 30% 16%",
      primary: "340 68% 52%",
      primaryForeground: "0 0% 100%",
      secondary: "340 30% 93%",
      secondaryForeground: "330 28% 24%",
      muted: "340 30% 93%",
      mutedForeground: "335 14% 44%",
      accent: "158 58% 40%",
      accentForeground: "0 0% 100%",
      destructive: "0 74% 52%",
      destructiveForeground: "0 0% 100%",
      border: "330 28% 28% / 0.14",
      input: "330 28% 28% / 0.16",
      ring: "340 68% 54%",
      highlight: "158 58% 40%",
      highlightForeground: "0 0% 100%",
    },
  },
];

export function getCloveTheme(id: string): CloveTheme {
  return CLOVE_THEMES.find((t) => t.id === id) ?? CLOVE_THEMES[0];
}

/** Convenience accessor for swatch previews: `hsl(...)` of the dark primary. */
export function themeSwatch(theme: CloveTheme): { primary: string; accent: string; highlight: string } {
  return {
    primary: `hsl(${theme.dark.primary})`,
    accent: `hsl(${theme.dark.accent})`,
    highlight: `hsl(${theme.dark.highlight})`,
  };
}

/** Map a token set onto the CSS custom properties consumed by `.clove-scope`. */
export function tokensToCssVars(tokens: CloveThemeTokens): CSSProperties {
  return {
    "--background": tokens.background,
    "--foreground": tokens.foreground,
    "--card": tokens.card,
    "--card-foreground": tokens.cardForeground,
    "--popover": tokens.popover,
    "--popover-foreground": tokens.popoverForeground,
    "--primary": tokens.primary,
    "--primary-foreground": tokens.primaryForeground,
    "--secondary": tokens.secondary,
    "--secondary-foreground": tokens.secondaryForeground,
    "--muted": tokens.muted,
    "--muted-foreground": tokens.mutedForeground,
    "--accent": tokens.accent,
    "--accent-foreground": tokens.accentForeground,
    "--destructive": tokens.destructive,
    "--destructive-foreground": tokens.destructiveForeground,
    "--border": tokens.border,
    "--input": tokens.input,
    "--ring": tokens.ring,
    "--clove-saffron": tokens.highlight,
    "--clove-saffron-fg": tokens.highlightForeground,
  } as CSSProperties;
}
