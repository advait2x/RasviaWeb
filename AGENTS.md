# AGENTS.md — RasviaWeb (Restaurant Dashboard & Website)

## Project Overview

RasviaWeb is the **web dashboard and public website** for Rasvia — a restaurant management platform. It includes a public landing page, restaurant owner partner portal, admin dashboard with floor plan management, order management, menu editing, team/role management, Stripe Connect for payouts, and real-time order feeds. It also hosts the kiosk/join flow for group dining sessions.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Vite + React 18 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS 3.4 + shadcn/ui (Radix primitives) |
| **Routing** | React Router DOM v6 |
| **Backend** | Supabase (PostgreSQL, Auth, Storage, Edge Functions, Realtime) |
| **Payments** | Stripe Connect (via Supabase Edge Functions) |
| **Animations** | Framer Motion |
| **Charts** | Recharts |
| **Forms** | React Hook Form + Zod validation |
| **State** | React Context (`AuthContext`, `DashboardContext`) |

## Project Structure

```
RasviaWeb/
├── src/
│   ├── App.tsx                   # Route definitions
│   ├── main.tsx                  # App entry, providers
│   ├── index.css                 # Global styles
│   ├── pages/                    # Route-level page components
│   │   ├── LandingPage.tsx       # Public homepage (navbar, pricing, about/founders)
│   │   ├── Login.tsx             # Dashboard login
│   │   ├── AdminPortalPage.tsx   # Main dashboard (owner/admin)
│   │   ├── JoinBridge.tsx        # Group order join flow
│   │   ├── KioskPage.tsx         # In-restaurant kiosk mode
│   │   ├── PartnerProfilePage.tsx  # Restaurant partner profile
│   │   ├── RestaurantSharePreview.tsx  # Social sharing preview
│   │   ├── VerifyEmailPage.tsx   # Email verification landing
│   │   ├── ContactPage.tsx       # Contact form
│   │   ├── PrivacyPage.tsx       # Privacy policy
│   │   └── TermsPage.tsx         # Terms of service
│   ├── components/
│   │   ├── dashboard/            # Dashboard-specific components
│   │   │   ├── DashboardLayout.tsx     # Main layout with sidebar
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   ├── DashboardOverview.tsx   # Analytics overview
│   │   │   ├── OrdersPanel.tsx         # Order management
│   │   │   ├── FloorPlan.tsx           # Interactive floor plan
│   │   │   ├── MenuManager.tsx         # Menu CRUD
│   │   │   ├── SettingsPanel.tsx       # Restaurant settings
│   │   │   ├── TeamRolesPanel.tsx      # Staff & role management
│   │   │   ├── StripeConnect.tsx       # Stripe payout onboarding
│   │   │   ├── WaitlistFeed.tsx        # Live waitlist
│   │   │   ├── StatusBar.tsx           # Top status indicators
│   │   │   ├── RestaurantSwitcher.tsx  # Admin restaurant selector
│   │   │   ├── NotificationsPanel.tsx  # Notification center
│   │   │   ├── TakeOrderModal.tsx      # Manual order entry
│   │   │   ├── AddWalkInModal.tsx      # Walk-in guest registration
│   │   │   ├── SeatPartyModal.tsx      # Assign party to table
│   │   │   ├── UnseatModal.tsx         # Close table / collect tip
│   │   │   └── DebugPanel.tsx          # Admin debugging tools
│   │   ├── ui/                   # shadcn/ui component library (~55 components)
│   │   ├── LiveGroupWidget.tsx   # Real-time group order widget
│   │   ├── LiveWaitlist.tsx      # Public waitlist display
│   │   ├── WaitTimeWidget.tsx    # Wait time estimator
│   │   └── home.tsx              # Homepage hero section
│   ├── context/
│   │   ├── AuthContext.tsx       # Auth state, roles, permissions
│   │   └── DashboardContext.tsx  # Dashboard state (orders, tables, menu, realtime)
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client initialization
│   │   ├── utils.ts             # cn() utility for class merging
│   │   └── fallbackImages.ts    # Default fallback image URLs
│   ├── hooks/
│   │   └── use-mobile.tsx       # Mobile viewport detection
│   ├── types/
│   │   ├── dashboard.ts         # Permission types, role definitions
│   │   └── supabase.ts          # (auto-generated Supabase types)
│   └── data/
│       └── mock-data.ts         # Initial table layout for floor plan
├── supabase/
│   └── functions/               # Supabase Edge Functions (Deno)
│       ├── create-checkout/     # Stripe checkout session
│       ├── payment-redirect/    # Post-payment redirect handler
│       ├── stripe-webhook/      # Stripe webhook handler
│       ├── create-stripe-account/  # Stripe Connect onboarding
│       └── check-stripe-status/ # Check Stripe account status
├── public/                      # Static assets
├── index.html                   # HTML entry point
├── vite.config.ts               # Vite configuration
├── tailwind.config.js           # Tailwind CSS configuration
└── package.json
```

## Key Architecture Decisions

### Authentication & Authorization

The auth system uses a **three-tier role hierarchy**:

1. **Admin** (`profiles.role = 'admin'`) — Full access to all restaurants via a restaurant switcher
2. **Restaurant Owner** (`profiles.role = 'restaurant_owner'`) — Scoped to their owned restaurant
3. **Staff** (via `restaurant_staff` table) — Scoped to their linked restaurant with per-operation permissions

Permissions are granular and defined in `types/dashboard.ts`:
- `manage_menu`, `manage_orders`, `manage_tables`, `manage_waitlist`
- `manage_staff`, `manage_roles`, `view_analytics`, `manage_settings`

The `AuthContext` cascade:
1. Checks `profiles.role` for platform-level admin/owner
2. Falls back to `restaurant_staff` → `restaurant_roles` → `role_permissions` for staff members
3. Uses `fetchSeqRef` to prevent race conditions from overlapping auth state changes

### Dashboard State (DashboardContext)

`DashboardContext.tsx` (~79KB) is the central state manager for the entire dashboard. It provides:
- Real-time Supabase subscriptions for orders, waitlist, and tables
- CRUD operations for menu items, orders, tables, and waitlist entries
- Floor plan table state management
- Order lifecycle management (pending → preparing → ready → served → completed)

### Stripe Integration

- **Stripe Connect** for restaurant payouts (Express accounts)
- `create-stripe-account` — Creates Express account + generates onboarding link
- `check-stripe-status` — Checks payout capability by `restaurant_id` (server resolves Stripe account id)
- `create-checkout` — Creates Checkout Sessions for customer payments
- `stripe-webhook` — Handles `checkout.session.completed` events
- `payment-redirect` — Post-checkout 302 redirect to app/web

### Edge Function Security

All edge functions that modify data or access sensitive APIs:
- Verify JWT identity with `supabase.auth.getUser(token)` when the endpoint requires authenticated access
- Use `SUPABASE_SERVICE_ROLE_KEY` for admin database operations
- Restrict `create-stripe-account` and `check-stripe-status` by restaurant scope (admin or owner)
- `create-checkout` must compute payout destination and totals server-side (never trust client amount/account/user fields)
- `create-checkout` guest path is limited to valid open `party_session_id` flows only
- `payment-redirect` must use parsed URL allowlisting (`rasvia://`, rasvia.com, localhost) to prevent open redirects
- The Stripe webhook **requires** `STRIPE_WEBHOOK_SECRET` for signature verification

## Environment Variables

```
VITE_SUPABASE_URL=<Supabase project URL>
VITE_SUPABASE_ANON_KEY=<Supabase anon key>
```

Edge functions use these secrets (configured in Supabase Dashboard):
- `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`

## Node.js, npm, and lockfile (CI / deploy)

`package.json` pins **`engines.node`** and **`engines.npm`** so Heroku / DigitalOcean Node buildpacks install a Node + npm combo that matches how the lockfile was produced. That keeps `npm ci` on the server aligned with local tooling (especially when the buildpack would otherwise default to an older npm).

When you need to **refresh `package-lock.json`**, regenerate it with the Linux deploy target in mind. A plain `npm install` on macOS may skip optional platform packages (for example Tailwind’s `@tailwindcss/oxide-wasm32-wasi` and its bundled `@emnapi/*` tree). The deploy image is **linux-x64**; if those entries are missing, `npm ci` on the server can fail with “missing from lock file” for `@emnapi/core` / `@emnapi/runtime`.

Run:

```bash
npm install --package-lock-only --os=linux --cpu=x64 --libc=glibc --include=optional
```

Then commit the updated `package-lock.json`. That keeps the lockfile valid for both local development (e.g. darwin-arm64) and **linux-x64** production builds.

## Deploying Edge Functions (JWT Flags)

Use this flow for any edge function deployment:

1. Authenticate + link project:
   ```bash
   supabase login
   supabase link --project-ref <PROJECT_REF>
   ```
2. Set JWT behavior in `supabase/config.toml` **before** deploy:
   - Default should be `verify_jwt = true`.
   - Use `verify_jwt = false` only for intentionally public callbacks/endpoints.
   - If `verify_jwt = false`, the function must enforce its own security controls (manual bearer validation, webhook signature checks, origin/redirect allowlists, etc.).
3. Deploy:
   ```bash
   supabase functions deploy <function_name> --project-ref <PROJECT_REF>
   # deploy all functions
   supabase functions deploy --project-ref <PROJECT_REF>
   ```
4. Verify:
   ```bash
   supabase functions list --project-ref <PROJECT_REF>
   ```

JWT flag rules:
- Prefer committing `verify_jwt` in `supabase/config.toml` instead of relying on ad-hoc CLI flags.
- Avoid deploying with `--no-verify-jwt` unless this is an emergency local test; if used, mirror the setting in `config.toml` and commit it.
- Changing `verify_jwt` requires redeploying that function.
- Keep shared function JWT settings synchronized with Rasvia1.

Current repo defaults:
- `create-checkout`: `verify_jwt = false` (guest + session checkout support; must keep manual auth/validation in code)
- `payment-redirect`: `verify_jwt = false` (Stripe/browser redirect callback endpoint)

## Conventions

- **UI Components**: Use shadcn/ui components from `src/components/ui/`. These are Radix-based and styled with Tailwind.
- **Class merging**: Always use `cn()` from `lib/utils.ts` for conditional Tailwind classes
- **Color palette**: Dark theme — bg-zinc-900/950, text-zinc-100, accent amber-500/orange-500
- **File naming**: PascalCase for components, kebab-case for utils/hooks
- **Error display**: Use `toast` from `sonner` — never use `alert()` or `window.alert()`
- **No `console.log` in production**: Use `console.error` for actual errors only
- **State updates**: Use `fetchSeqRef` pattern to prevent stale data from overwriting fresh fetches
- **Supabase queries**: Always use `.maybeSingle()` instead of `.single()` when the row might not exist

## Common Gotchas

1. **`DashboardContext` is large** (~79KB) — it manages the entire dashboard state. Be careful with changes.
2. **Auth event `SIGNED_IN` fires on tab focus** — the `AuthContext` prevents unnecessary refetches by comparing user IDs
3. **`localStorage` is used for admin restaurant selection** — key is `rasvia_admin_active_restaurant_id`
4. **Types in `data/mock-data.ts`** — provides initial table layout data for the floor plan
5. **The `stories/` directory** contains Storybook stories for UI testing — not part of production
6. **Edge functions share code between Rasvia1 and RasviaWeb** — `create-checkout` and `payment-redirect` exist in both repos and should be kept in sync
7. **Receipt print HTML must be escaped** — never inject unsanitized order/user fields into the print window markup
8. **`chart.tsx` uses `dangerouslySetInnerHTML`** — this is the standard shadcn/ui pattern for injecting CSS variables into a `<style>` tag; the values come from the config object, not user input
9. **Broken remote refs can block `git fetch` / `git pull`** — if Git reports `fatal: bad object refs/remotes/origin/HEAD 2`, inspect `.git/refs/remotes/origin/` and `.git/logs/refs/remotes/origin/` for a stray malformed `HEAD 2` ref, remove only that local bookkeeping file, then rerun `git fetch origin`

## Landing Page Navigation & Content

The landing page (`LandingPage.tsx`) includes a top navbar, hero section, feature gallery, pricing section, about/founders section, and footer. All navigation categories and content data are defined as constants at the top of the file for easy editing.

### Navbar Categories

| Category | Type | Content |
|----------|------|---------|
| **Products** | Hover dropdown | Waitlists, Group Carts, Fast Payouts (matches footer) |
| **Pricing** | Anchor link | Scrolls to `#pricing` section |
| **About** | Anchor link | Scrolls to `#about` section |

The navbar includes a mobile hamburger menu that mirrors the desktop navigation.

### Pricing Tiers (`PRICING_TIERS`)

| Tier | Price | Highlighted |
|------|-------|-------------|
| Starter | $49/mo | No |
| Professional | $99/mo | Yes ("Most Popular") |
| Enterprise | $149/mo | No |

Edit the `PRICING_TIERS` array at the top of `LandingPage.tsx` to update tier names, prices, descriptions, and feature lists.

### Founder Data (`FOUNDERS`)

The `FOUNDERS` array contains 3 entries with these fields:
- `name` — display name
- `role` — title (e.g. "CEO & Co-Founder")
- `bio` — short biography
- `initials` — 2-letter initials for the avatar fallback
- `gradient` — Tailwind gradient classes for the avatar background
- `imageSrc` — set to a real image path (e.g. `"/founders/arjun.jpg"`) to replace the initials avatar

### Footer Structure

| Column | Links |
|--------|-------|
| **Product** | Waitlists, Group Carts, Fast Payouts, Pricing |
| **About** | Our Mission, Team, Contact Sales, Partner Login |
| **Legal** | Privacy Policy, Terms of Service |

## Database Hygiene & RLS (April 2026)

The `20260419180000_db_hygiene_rls_cleanup.sql` migration normalised RLS
policies across the shared Supabase project. Highlights:

- **`waitlist_entries`** — RLS is now enabled (was previously off despite
  policies being present). Owners / staff / platform admins can read & manage
  rows. Existing INSERT policies preserved. `KioskPage.tsx` continues to work
  via the anon `allow_kiosk_walkin_insert` policy.
- **`system_config`** — RLS on. Authenticated read for everyone, write for
  platform admins only.
- **`group_orders`** — DEPRECATED. Read by no one; written only by the
  legacy `party_settle_payment()` mirror path. The dashboard should not query
  this table; use `party_payments` / `party_members` / `orders` instead.
- **`party_items`** — All client mutations must go through `party_*`
  SECURITY DEFINER RPCs. Direct `.from('party_items').insert/update/delete`
  from the dashboard will be rejected by RLS.
- **`order_item_modifiers`** — DROPPED. The POS modifier feature uses
  `item_modifiers` only. If modifier-per-line-item snapshots become a
  requirement again, design a new table (and use it from the start).
- Trigger / utility functions now have a pinned `search_path = public`.

### Standardised Supabase call patterns

- Always use `.maybeSingle()` for select-by-id queries. The codebase has been
  swept for the obvious cases; please follow this convention going forward.
  Reserve `.single()` for `INSERT … select().single()` (where exactly one row
  is expected) or where you have already validated existence.
- The `supabase` client in `src/lib/supabase.ts` falls back to placeholder
  credentials so `BootDiagnostics` can render in dev. `flowType: 'pkce'` and
  `detectSessionInUrl: true` are explicitly set for the JoinBridge / verify
  email flows.
- Never throw at module-import time from `lib/supabase.ts` — it's imported
  before `BootDiagnostics` mounts.

## Unused / deprecated tables

| Table              | Status                                    |
|--------------------|-------------------------------------------|
| `group_orders`     | Legacy mirror, not read anywhere          |
| `menu_categories`  | Defined but only the text `category`      |
|                    | column on `menu_items` is used in code    |

### After finishing
Once you finish your work after a prompt, modify this file with any relevant information to aid future agents.

## Connected Account Tax (Seller-of-Record) — April 2026

Rasvia uses a **seller-of-record** model where the **connected restaurant account**
is responsible for collecting and remitting sales tax. The platform does NOT act
as a marketplace facilitator for tax purposes. The platform only collects a
platform fee via `application_fee_amount`.

### Architecture invariants

- **The restaurant's connected Stripe account handles tax.** The platform does
  NOT use `automatic_tax`, `tax_code`, or `tax_behavior` on checkout sessions.
- `transfer_data.destination = stripeAccountId` with NO explicit `amount` — the
  full charge (minus `application_fee_amount`) goes to the connected account.
- `application_fee_amount = subtotal * platform_fee_bps / 10000` (currently 0
  by default; plumbed for future activation).
- The `calculate-tax` edge function has been **removed** — it was only needed
  for the marketplace facilitator model.
- POS/cash orders use `FALLBACK_TAX_RATE = 0.0825` in `DashboardContext.tsx`,
  `POSTerminal.tsx`, and `TakeOrderModal.tsx` for display only. Restaurants
  should configure their own tax rates in their Stripe dashboard.

### Database columns added (`seller_of_record_tax` migration)

| Table | Column | Purpose |
|-------|--------|---------|
| `restaurants` | `street_address`, `city`, `state`, `postal_code`, `country` | Restaurant address for display/search |
| `restaurants` | `platform_fee_bps` (default 0) | Per-restaurant platform fee in basis points |
| `orders` | `platform_fee_cents` | Application fee recorded from webhook |
| `orders` | `transfer_amount_cents` | Transfer amount audit |
| `party_payments` | `platform_fee_cents` | Group-order platform fee audit |

### Edge function behavior

- `create-stripe-account` — requests `card_payments` + `transfers` capabilities.
  Does NOT request `tax_reporting_us_1099_k`.
- `check-stripe-status` — returns `charges_enabled`, `payouts_enabled`,
  `details_submitted`, and `requirements_currently_due`.
- `create-checkout` — simple line items (no tax_code, no tax_behavior, no
  automatic_tax). Uses `transfer_data.destination` with `application_fee_amount`.
- `stripe-webhook` — persists `platform_fee_cents` only. No tax transaction
  booking.
- `calculate-tax` — **REMOVED** (was marketplace facilitator only).

### Restaurant setup

For tax to work correctly:
1. Each restaurant must configure **Stripe Tax** within their own connected
   Stripe account dashboard.
2. `platform_fee_bps` defaults to 0 (no platform take). Update per-restaurant
   as needed.
3. Deploy all edge functions and run the migration.

