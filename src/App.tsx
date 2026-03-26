import { Suspense } from "react";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Home from "./components/home";
import JoinBridge from "./pages/JoinBridge";
import KioskPage from "./pages/KioskPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import RestaurantSharePreview from "./pages/RestaurantSharePreview";
import LandingPage from "./pages/LandingPage";
import ContactPage from "./pages/ContactPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";

function PartnerPortalApp() {
  const { session, restaurantId, loading, userRole, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <div
              className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-b-amber-500/20 animate-spin"
              style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
            />
          </div>
          <span className="text-amber-500/80 font-medium text-sm tracking-wide">Loading Rasvia…</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  if (userRole === "user") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#09090b] text-white">
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
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-xl transition-colors border border-white/10 hover:border-white/15"
        >
          Sign Out
        </button>
      </div>
    );
  }

  if (!restaurantId && !isAdmin) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#09090b] text-white">
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
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm rounded-xl transition-colors border border-white/10 hover:border-white/15"
        >
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
          </div>
          <span className="text-amber-500/80 font-medium text-sm tracking-wide">Loading Dashboard…</span>
        </div>
      </div>
    }>
      <Home />
    </Suspense>
  );
}

function AppContent() {
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

  if (window.location.pathname.startsWith('/verify-email')) {
    return <VerifyEmailPage />;
  }

  if (window.location.pathname.startsWith('/share')) {
    return <RestaurantSharePreview />;
  }

  if (window.location.pathname.startsWith('/kiosk')) {
    const params = new URLSearchParams(window.location.search);
    const rawId = params.get('r') ?? params.get('restaurantId');
    const restaurantId = rawId ? Number(rawId) : NaN;
    if (!isNaN(restaurantId) && restaurantId > 0) {
      return <KioskPage restaurantId={restaurantId} />;
    }
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="text-center space-y-3 p-8">
          <p className="text-2xl font-bold text-zinc-100">Kiosk Setup Required</p>
          <p className="text-zinc-400 text-base">
            Add <code className="text-amber-400 font-mono">?r=YOUR_RESTAURANT_ID</code> to this URL.
          </p>
          <p className="text-zinc-500 text-sm">
            Example: <span className="font-mono text-zinc-400">/kiosk?r=27</span>
          </p>
        </div>
      </div>
    );
  }

  if (window.location.pathname.startsWith('/partner-portal')) {
    return <PartnerPortalApp />;
  }

  if (window.location.pathname.startsWith('/contact')) {
    return <ContactPage />;
  }

  if (window.location.pathname.startsWith('/privacy')) {
    return <PrivacyPage />;
  }

  if (window.location.pathname.startsWith('/terms')) {
    return <TermsPage />;
  }

  return <LandingPage />;
}

export default function App() {
  return <AppContent />;
}
