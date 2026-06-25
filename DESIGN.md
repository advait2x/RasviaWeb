---
name: Rasvia
description: Built for restaurants. Loved by guests.
colors:
  operator-amber: "#f59e0b"
  operator-amber-deep: "#92400e"
  operator-amber-bright: "#d97706"
  canvas-dark: "#0a0a0a"
  canvas-light: "#fafafa"
  surface-dark: "#171719"
  surface-light: "#ffffff"
  ink-primary: "#18181b"
  ink-on-dark: "#f2f2f2"
  ink-muted: "#71717a"
  border-subtle: "#ffffff1a"
  destructive: "#ef4444"
  light-ink: "#0f172a"
  light-canvas: "#f8fafc"
  light-border: "#0f172a24"
typography:
  display:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 5vw, 3rem)"
    fontWeight: 900
    lineHeight: 1.05
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "clamp(1.875rem, 4vw, 2.25rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  title:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  body:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "normal"
  label:
    fontFamily: "'Bricolage Grotesque', system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.01em"
rounded:
  sm: "4px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.operator-amber-deep}"
    textColor: "#fffbeb"
    rounded: "{rounded.md}"
    padding: "10px 32px"
  button-primary-hover:
    backgroundColor: "{colors.operator-amber-bright}"
    textColor: "#09090b"
    rounded: "{rounded.md}"
    padding: "10px 32px"
  button-marketing-cta:
    backgroundColor: "{colors.operator-amber}"
    textColor: "#ffffff"
    rounded: "{rounded.lg}"
    padding: "14px 24px"
  card-default:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-on-dark}"
    rounded: "{rounded.lg}"
    padding: "24px"
---

# Design System: Rasvia

## 1. Overview

**Creative North Star: "The Operator's Briefing"**

Rasvia looks like the interface a serious restaurant operator would trust at 4pm before dinner service: dark, legible, amber where action lives, no decorative noise. Marketing pages lead with the same voice as the partner dashboard — one brand, not a glossy landing site bolted onto a utilitarian admin panel.

The system supports light and dark themes (`data-theme` on `:root`, persisted as `rasvia:web:theme-mode`). Marketing defaults to light surfaces with dark-mode variants; the partner dashboard and kiosk lean dark-first. Typography is single-family (Bricolage Grotesque) for display through body — tight tracking on headlines, normal body rhythm, no secondary sans pairing.

This system explicitly rejects generic SaaS landing scaffolding: warm cream body backgrounds, uppercase eyebrow kickers on every section, identical icon-card grids, and gradient hero metrics that could belong to any ordering startup.

**Key Characteristics:**

- Amber accent used sparingly for CTAs, badges, and operational emphasis — not as wallpaper
- Zinc neutrals with hairline borders (`white/10` dark, `zinc-200/80` light) instead of heavy drop shadows
- 8px base radius (`--radius: 0.5rem`); cards at 12px (`rounded-xl`); marketing CTAs at 12–16px
- shadcn/ui primitives (Button, Card, Dialog) extended with dashboard tokens in `lib/dashboardUi.ts`
- Product mockups on marketing pages stay dark-themed inside their shells even on light pages

## 2. Colors

A restrained operator palette: near-black canvas, zinc surfaces, one amber accent family.

### Primary

- **Service Amber** (#f59e0b / hsl(38 92% 50%)): Primary accent — marketing gradient CTAs, focus rings, active nav emphasis, dashboard notification dots. Used on ≤10% of any screen.
- **Deep Operator Amber** (#92400e / amber-800): Primary solid CTAs in dashboard and forms (`DASH_PRIMARY_CTA`). Reads serious in light mode without neon glare.
- **Bright Service Amber** (#d97706 / amber-600): Dark-mode primary CTA fill and hover states on deep amber buttons.

### Neutral

- **Canvas Dark** (#0a0a0a / hsl(0 0% 3.9%)): Default app background, marketing dark sections, mockup shells.
- **Canvas Light** (#fafafa): Marketing page overscroll and light-mode body (`--page-overscroll`).
- **Surface Dark** (#171719 / hsl(240 5% 9.5%)): Cards, popovers, sidebar in dark mode.
- **Surface Light** (#ffffff): Cards and marketing header in light mode.
- **Ink Primary** (#18181b / zinc-900): Headlines and body on light marketing surfaces.
- **Ink on Dark** (#f2f2f2 / hsl(0 0% 95%)): Primary text on dark backgrounds.
- **Ink Muted** (#71717a / zinc-500): Secondary copy, captions, helper text — never below 4.5:1 on its background.
- **Border Subtle** (rgba(255,255,255,0.1) dark / rgba(24,24,27,0.14) light): Dividers, card edges, input strokes.

### Light theme compatibility layer (`index.css`)

Dashboard and legacy surfaces use Tailwind `zinc-*` utilities in markup. In light mode, `:root[data-theme="light"]` remaps those classes to **slate ink** values so dark-first components remain legible without rewriting every file:

- **Light Ink** (#0f172a / slate-900): Remapped `text-zinc-900`, `text-white` on light backgrounds
- **Light Canvas** (#f8fafc / slate-50): Remapped `bg-black`, `bg-zinc-950` fills
- **Light Border** (rgba(15,23,42,0.12–0.18)): Remapped `border-white/*` and `border-zinc-*` hairlines

**Marketing surfaces** (`lib/marketingUi.ts`) use zinc tokens directly and do not depend on this remap. New UI should prefer `marketingUi` / CSS variables over the compatibility layer.

**The Compatibility Rule.** Do not add new hard-coded slate hex values outside `index.css`. Extend this block or migrate the surface to `marketingUi` tokens.

### Tertiary

- **Status hues** (semantic, not brand): Order/waitlist pills use tinted emerald, sky, rose, violet backgrounds at ~10% opacity in dark mode — operational color coding, not decorative.

**The One Accent Rule.** Amber is the only brand chroma on marketing and dashboard chrome. Status colors appear only on operational badges (orders, waitlist, diet tags). Never introduce a second brand accent (purple gradients, teal heroes) on Rasvia-owned surfaces. Partner microsites (e.g. `.clove-scope`) may override tokens locally.

## 3. Typography

**Display Font:** Bricolage Grotesque (Google Fonts, variable 200–800)
**Body Font:** Bricolage Grotesque (same stack — no secondary pairing)
**Label/Mono Font:** Bricolage Grotesque at smaller weights/sizes (no dedicated mono)

**Character:** Grotesque with personality — black weights for marketing headlines, semibold for UI labels. Feels direct and contemporary without startup-thin aesthetic.

### Hierarchy

- **Display** (900, clamp(2.25rem–3rem), lh 1.05, tracking -0.03em): Landing hero (`h1`), product page heroes. Max one per viewport.
- **Headline** (900, clamp(1.875rem–2.25rem), lh 1.1, tracking -0.025em): Section titles (`h2`) on marketing pages.
- **Title** (700, 1.125rem, lh 1.3): Card titles, feature names, dashboard panel headers.
- **Body** (400–500, 0.875rem, lh 1.6, max ~65ch in prose): Descriptions, form help, dashboard row detail.
- **Label** (600, 0.75rem): Badges, nav items, table headers, filter chips.

**The Tracking Floor Rule.** Display and headline letter-spacing never tighter than -0.04em. Current marketing uses `-0.025em` to `-0.03em` — do not go to `-0.05em` or headlines will feel cramped.

## 4. Elevation

Flat-by-default with tonal layering. Depth comes from background stepping (canvas → card → inset panel) and hairline borders, not floating shadows.

Marketing CTAs are the exception: a warm amber glow shadow (`0 8px 30px rgba(245,158,11,0.3)`) on gradient primary buttons — intentional emphasis, not a global card pattern.

### Shadow Vocabulary

- **Card default** (`shadow` / Tailwind sm): shadcn Card at rest — subtle, ≤8px blur. Do not pair with a second decorative border+wide-shadow on the same element.
- **Marketing CTA glow** (`0 8px 30px rgba(245,158,11,0.3)`): Primary conversion buttons only; hover intensifies to 40px spread.
- **Dashboard panels**: No shadow — `border border-white/[0.08] bg-white/[0.03]` or zinc-800 fills.

**The No Ghost-Card Rule.** Never combine `border: 1px solid` with a wide soft drop shadow (blur ≥16px) on the same element. Pick border OR defined shadow, not both as decoration.

## 5. Components

Operator-tactile: clear hit targets, visible focus rings, state communicated by border/background shift.

### Buttons

- **Shape:** 8px radius default (`rounded-md`); marketing primary CTAs 12px (`rounded-xl`).
- **Primary (dashboard):** Deep amber fill (`DASH_PRIMARY_CTA`), amber-50 text light / zinc-950 text dark, shadow-sm in light only.
- **Primary (marketing):** Gradient `from-amber-500 to-orange-500`, white text, amber glow shadow, bold 14px label.
- **Secondary / Add:** Muted amber surface — `border-amber-800/30 bg-amber-50/95` light, `bg-amber-500/10 border-amber-500/30` dark (`DASH_BTN_ADD`).
- **Ghost / Outline:** shadcn `outline` and `ghost` variants — border-input, hover accent fill.
- **Hover / Focus:** `transition-colors` 150–300ms; `focus-visible:ring-1 ring-ring` (amber). No bounce or elastic easing.

### Chips

- **Style:** Rounded-full or rounded-lg pills with tinted semantic backgrounds (order status, diet, meal period) — see `ORDER_STATUS_PILL`, `ORDER_DIET_PILL` in `dashboardUi.ts`.
- **Filter off-state:** `bg-zinc-200/55 border-zinc-300/45` light; `bg-zinc-800/40 border-white/[0.08]` dark.

### Cards / Containers

- **Corner Style:** 12px (`rounded-xl`) for marketing and dashboard cards.
- **Background:** `bg-card` token; marketing pricing cards also use white/zinc-900 with `border-zinc-200/80` or `border-white/[0.08]`.
- **Shadow Strategy:** shadcn default shadow OR border-only — not both wide.
- **Internal Padding:** 24px (`p-6`) standard; dense dashboard rows 12–16px.

### Inputs / Fields

- **Style:** shadcn Input — `border-input bg-background`, 8px radius, 36px height default.
- **Focus:** Amber ring (`--ring: 38 92% 50%`), no glow blur.
- **Error / Disabled:** Destructive border/text; 50% opacity disabled.

### Navigation

- **Marketing header:** Fixed, `backdrop-blur-xl`, white/90 light or black/80 dark, hairline bottom border. Logo swaps light/dark asset. Nav links 14px medium, zinc-600 → zinc-900 on hover.
- **Dashboard sidebar:** Dark zinc shell, amber active indicator and count badges (`DASH_NAV_COUNT_BADGE`). Collapsible on mobile via drawer pattern.
- **Products dropdown:** Radix-style panel, no side-stripe accents.

### Marketing Product Mockup Shell

- **Style:** Dark phone/browser chrome (`bg-zinc-950`, rounded-2xl) embedded in light marketing sections — product UI preview stays authentic dark even on light pages.

## 6. Do's and Don'ts

### Do:

- **Do** use amber for primary actions and operational emphasis only — CTAs, active nav, notification dots, money highlights.
- **Do** keep body copy at WCAG AA contrast; bump `text-zinc-500` to `text-zinc-600` on light backgrounds when in doubt.
- **Do** use Bricolage Grotesque at weight 900 for marketing headlines with tracking ≥ -0.04em.
- **Do** respect `prefers-reduced-motion` — crossfade or instant state changes for Framer Motion and CSS transitions.
- **Do** reuse `DASH_*` tokens from `lib/dashboardUi.ts` for dashboard actions instead of inventing one-off amber classes.
- **Do** show real product UI in marketing mockups (orders, waitlist, menu) — not abstract placeholder blocks.
- **Do** document light-theme slate remaps in `index.css` when touching dashboard zinc utilities — marketing uses `marketingUi.ts` instead.

### Don't:

- **Don't** use generic SaaS landing patterns: cream/beige body backgrounds, small uppercase eyebrow kickers above every section, identical icon + heading + text card grids.
- **Don't** add gradient text (`background-clip: text`) for headlines — solid ink only.
- **Don't** use side-stripe borders (`border-left` >1px colored accent) on cards, alerts, or list items.
- **Don't** exceed 16px border-radius on cards and sections — reserve full pills for tags and icon buttons.
- **Don't** pair 1px borders with wide soft shadows on the same element (ghost-card pattern).
- **Don't** introduce numbered section markers (01 / 02 / 03) unless the section is a genuine ordered sequence.
- **Don't** use glassmorphism decoratively — marketing header blur is the only approved frosted surface.
