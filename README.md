# Rasvia Web

Rasvia Web is the browser experience for the Rasvia restaurant platform. It combines the public marketing site, restaurant partner dashboard, platform administration tools, live waitlist/order views, kiosk mode, and guest group-dining/table-service flows in one Vite + React application.

## Product surfaces

- Public landing, product, contact, privacy, and terms pages.
- Restaurant owner and staff dashboard with role-aware access.
- Menu, modifier, tag, media, hours, tables/floor plan, waitlist, team, and settings management.
- Live order operations, manual order entry, voids, comps, discounts, splits, merges, transfers, refunds, and shift/cash-drawer workflows.
- Restaurant analytics, notifications, reviews, and Stripe Connect onboarding/tax settings.
- Guest login, email verification, restaurant sharing, live wait-time display, kiosk mode, and tableside QR joining.
- Group dining sessions with shared items, host/member actions, checkout, and real-time updates.

## Stack

- Vite 8, React 19, TypeScript, and React Router.
- Tailwind CSS, Radix UI primitives, Framer Motion, and Recharts.
- Supabase Auth, PostgreSQL, Storage, Realtime, and Edge Functions.
- Stripe Connect and Checkout through server-side Supabase Edge Functions.
- React Hook Form + Zod for validated form flows.

## Repository layout

| Path | Purpose |
| --- | --- |
| `src/pages/` | Route-level public, dashboard, kiosk, join, and account pages |
| `src/components/` | Shared UI and dashboard feature components |
| `src/context/` | Authentication and dashboard state, realtime subscriptions, and operations |
| `src/lib/` | Supabase, orders, parties, QR flows, PDFs, refunds, and utilities |
| `src/types/` | Dashboard permission models and generated Supabase types |
| `src/stories/` | UI component examples and interaction fixtures |
| `supabase/` | Edge Functions and database migrations used by the application |
| `public/` | Static assets |

## Requirements

- Node.js 22 or newer.
- npm 11 or newer.
- A Supabase project for authenticated/data-backed features.

## Local setup

```bash
npm install
cp .env.example .env
```

Set the local Supabase URL and public anon key in `.env`. The file is ignored by Git and must never be committed.

Start development with `npm run dev`. Other commands are `npm run build` (type-check and production build), `npm run lint`, and `npm run preview`.

If Supabase configuration is absent, the app renders boot diagnostics rather than throwing during module import. This is useful for developing public pages without a backend, but authenticated and operational flows require valid local configuration.

## Application architecture

`src/main.tsx` initializes the React application and `src/App.tsx` defines routes. `AuthContext` resolves the current user and role; `DashboardContext` owns restaurant selection, operational state, CRUD actions, and realtime subscriptions. Role access is derived from platform profiles and restaurant staff/role permissions.

Supabase is the browser data layer. Sensitive actions such as Stripe operations, refunds, account provisioning, tax configuration, email delivery, and service-role database work run in Edge Functions. The browser may use only the public anon key and user session.

## Environment and deployment

The browser build needs:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

Edge Function secrets are configured separately in Supabase and must not be copied into this repository or exposed through `VITE_*` variables. This includes service-role, Stripe, SMTP, and other provider credentials. Deploy migrations and functions with the Supabase CLI after linking the intended project.

## Security checklist

- Never commit `.env`, service-role keys, Stripe secret/webhook keys, SMTP passwords, Twilio tokens, private keys, or access tokens.
- Treat `VITE_*` values as browser-visible; only public, least-privilege values belong there.
- Validate authorization and restaurant scope in both the client and Edge Functions; database policies are authoritative.
- Use parsed URL allowlists for payment redirects and verify webhook signatures server-side.
- Rotate credentials immediately if they appear in source, history, logs, screenshots, or build artifacts.

## Related repositories

- [`Rasvia1`](https://github.com/RasviaOrg/Rasvia1) — Expo mobile client.
- [`RasviaAPI`](https://github.com/RasviaOrg/RasviaAPI) — FastAPI service.

## Contributing

Keep changes focused, update migrations and generated types together when needed, run `npm run lint` and `npm run build`, and include operational/configuration notes in the pull request. Never include real secrets in commits or examples.
