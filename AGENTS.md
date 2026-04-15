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
│   │   ├── LandingPage.tsx       # Public homepage
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
