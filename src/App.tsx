import { Suspense, lazy, useEffect, useState } from "react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
/** Lazy so the marketing shell does not load the partner dashboard (and react-qr-code) on first paint. */
const Home = lazy(() => import("./components/home"));
import JoinBridge from "./pages/JoinBridge";
import TableJoin from "./pages/TableJoin";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import RestaurantSharePreview from "./pages/RestaurantSharePreview";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import ProductPage from "./pages/ProductPage";
import ProductsHubPage from "./pages/ProductsHubPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import AdminPortalPage from "./pages/AdminPortalPage";
import { AppShell } from "./components/layout/AppShell";
import { Toaster } from "sonner";
import { useTheme } from "./context/ThemeContext";

function DarkThemeLock() {
  useEffect(() => {
    const root = document.documentElement;
    const prevLock = root.getAttribute("data-theme-lock");
    root.setAttribute("data-theme-lock", "dark");
    root.setAttribute("data-theme", "dark");
    root.setAttribute("data-theme-mode", "dark");
    root.style.colorScheme = "dark";
    root.classList.add("dark");
    return () => {
      if (prevLock) root.setAttribute("data-theme-lock", prevLock);
      else root.removeAttribute("data-theme-lock");
      // Do not restore data-theme / mode / colorScheme here: clearing (or restoring) the lock
      // triggers ThemeProvider's MutationObserver, which reapplies the user's real preference.
      // Restoring prev attributes after that was wiping light mode and causing a flash.
    };
  }, []);
  return null;
}

function AdminPortalApp() {
  const { session, loading, isAdmin } = useAuth();
  const { resolvedTheme } = useTheme();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
            </div>
            <span className="text-sm font-medium tracking-wide text-zinc-500">Loading…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (!isAdmin) {
    return (
      <AppShell>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-white px-6">
        <div className="text-center space-y-3 max-w-md">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Admin only</h1>
          <p className="text-sm text-zinc-400">
            This page is for Rasvia platform administrators. Sign in with an account that has the{" "}
            <code className="text-amber-400/90">admin</code> role in Supabase.
          </p>
        </div>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="hover-red-override px-6 py-2.5 bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white font-medium text-sm rounded-xl transition-colors border border-white/10 hover:border-red-600"
        >
          Sign Out
        </button>
      </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell>
        <AdminPortalPage />
      </AppShell>
      <Toaster
        theme={resolvedTheme}
        position="top-center"
        toastOptions={{
          style: {
            background:
              resolvedTheme === "dark" ? "rgba(24,24,27,0.95)" : "rgba(255,255,255,0.96)",
            border:
              resolvedTheme === "dark"
                ? "1px solid rgba(255,255,255,0.08)"
                : "1px solid rgba(15,23,42,0.12)",
            color: resolvedTheme === "dark" ? "#e4e4e7" : "#0f172a",
          },
        }}
      />
    </>
  );
}

function PartnerPortalApp() {
  const { session, restaurantId, loading, userRole, isAdmin } = useAuth();

  if (loading) {
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
              <div
                className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-2 border-b-zinc-700/40 border-transparent"
                style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
              />
            </div>
            <span className="text-sm font-medium tracking-wide text-zinc-500">Loading Rasvia…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return <Login />;
  }

  // Platform admins always have access (even if userRole was mis-read as "user" during a race).
  if (userRole === "user" && !isAdmin) {
    return (
      <AppShell>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-white">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Access Denied (Role Mismatch)</h1>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto">
            This dashboard is for restaurant staff and owners only. Please contact your administrator.
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="hover-red-override px-6 py-2.5 bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white font-medium text-sm rounded-xl transition-colors border border-white/10 hover:border-red-600"
        >
          Sign Out
        </button>
      </div>
      </AppShell>
    );
  }

  if (!restaurantId && !isAdmin) {
    return (
      <AppShell>
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 text-white">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Access Denied (No Restaurant Linked)</h1>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto">
            You&apos;re logged in, but your account isn&apos;t linked to a restaurant yet. Contact your administrator.
          </p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="hover-red-override px-6 py-2.5 bg-zinc-800 hover:bg-red-600 text-zinc-200 hover:text-white font-medium text-sm rounded-xl transition-colors border border-white/10 hover:border-red-600"
        >
          Sign Out
        </button>
      </div>
      </AppShell>
    );
  }

  return (
    <Suspense fallback={
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-800 border-t-zinc-400" />
            </div>
            <span className="text-sm font-medium tracking-wide text-zinc-500">Loading dashboard…</span>
          </div>
        </div>
      </AppShell>
    }>
      <Home />
    </Suspense>
  );
}

function AppContent() {
  // Re-render on browser back/forward (Safari popstate fix)
  const [, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    // Handle Safari bfcache restore (persisted pageshow)
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) setPath(window.location.pathname);
    };
    window.addEventListener("pageshow", onPageShow);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, []);

  // Some Supabase email links can arrive on "/" with token params; treat them as verify flow.
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const hasVerifyToken = Boolean(searchParams.get("token_hash") || hashParams.get("token_hash"));
  const hasVerifyType = Boolean(searchParams.get("type") || hashParams.get("type"));
  if (hasVerifyToken && hasVerifyType) {
    return <VerifyEmailPage />;
  }

  if (window.location.pathname.startsWith('/join')) {
    return <JoinBridge />;
  }

  // Fixed per-table QR resolver (`/t?r=<id>&table=<label>`). Matched precisely
  // so it doesn't swallow `/terms` and friends.
  if (
    window.location.pathname === "/t" ||
    window.location.pathname.startsWith("/t/")
  ) {
    return <TableJoin />;
  }

  if (window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmailPage />;
  }

  if (window.location.pathname.startsWith('/share')) {
    return <RestaurantSharePreview />;
  }

  if (window.location.pathname.startsWith('/kiosk')) {
    try {
      sessionStorage.setItem("rasvia:partner_initial_view", "kiosk");
    } catch {
      /* ignore */
    }
    window.location.replace("/partner-portal");
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
            <span className="text-sm font-medium tracking-wide text-zinc-500">Redirecting to kiosk…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (window.location.pathname.startsWith("/admin")) {
    return <AdminPortalApp />;
  }

  if (window.location.pathname.startsWith('/partner-portal')) {
    return <PartnerPortalApp />;
  }

  if (window.location.pathname.startsWith("/partner-profile")) {
    try {
      sessionStorage.setItem("rasvia:open_settings_panel", "partner");
    } catch {
      /* ignore */
    }
    window.location.replace("/partner-portal");
    return (
      <AppShell>
        <div className="flex min-h-screen items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-500/30 border-t-amber-500" />
            <span className="text-sm font-medium tracking-wide text-zinc-500">Opening settings…</span>
          </div>
        </div>
      </AppShell>
    );
  }

  if (window.location.pathname.startsWith('/support')) {
    return (
      <AppShell>
        <ContactPage />
      </AppShell>
    );
  }

  if (window.location.pathname.startsWith('/privacy')) {
    return (
      <AppShell>
        <PrivacyPage />
      </AppShell>
    );
  }

  if (window.location.pathname.startsWith('/terms')) {
    return (
      <AppShell>
        <TermsPage />
      </AppShell>
    );
  }

  const pathNoTrailing = window.location.pathname.replace(/\/$/, "") || "/";
  if (pathNoTrailing === "/products") {
    return (
      <AppShell>
        <ProductsHubPage />
      </AppShell>
    );
  }

  if (window.location.pathname.startsWith("/products/")) {
    return (
      <AppShell>
        <ProductPage />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <LandingPage />
    </AppShell>
  );
}

export default function App() {
  return <AppContent />;
}
