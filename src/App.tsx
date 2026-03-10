import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Home from "./components/home";
import JoinBridge from "./pages/JoinBridge";
import KioskPage from "./pages/KioskPage";

function AppContent() {
  if (window.location.pathname.startsWith('/join')) {
    return <JoinBridge />;
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

  const { session, restaurantId, loading, userRole, isAdmin, isRestaurantOwner } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full border-2 border-amber-500/30 border-t-amber-500 animate-spin" />
            <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-transparent border-b-amber-500/20 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
          </div>
          <span className="text-amber-500/80 font-medium text-sm tracking-wide">Loading Rasvia…</span>
        </div>
      </div>
    );
  }

  // 1. Not logged in? -> Show Login
  if (!session) {
    return <Login />;
  }

  // 2. Platform-level 'user' role — no dashboard access
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
          <div className="mt-4 p-3 bg-zinc-900 rounded border border-white/5 text-xs text-zinc-500 font-mono text-left space-y-1">
            <p>Debug Diagnostics:</p>
            <p>- Session: {session ? "Active" : "None"}</p>
            <p>- Role: "{userRole}"</p>
            <p>- isAdmin: {isAdmin ? "true" : "false"}</p>
            <p>- isRestaurantOwner: {isRestaurantOwner ? "true" : "false"}</p>
            <p>- restaurantId: {restaurantId || "null"}</p>
          </div>
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

  // 3. Logged in but NO restaurant selected
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
            You're logged in, but your account isn't linked to a restaurant yet. Contact your administrator.
          </p>
          <div className="mt-4 p-3 bg-zinc-900 rounded border border-white/5 text-xs text-zinc-500 font-mono text-left space-y-1">
            <p>Debug Diagnostics:</p>
            <p>- Session: {session ? "Active" : "None"}</p>
            <p>- Role: "{userRole}"</p>
            <p>- isAdmin: {isAdmin ? "true" : "false"}</p>
            <p>- isRestaurantOwner: {isRestaurantOwner ? "true" : "false"}</p>
            <p>- restaurantId: {restaurantId || "null"}</p>
          </div>
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

  // 4. Logged in AND linked -> Show Dashboard
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
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </Suspense>
  );
}

export default function App() {
  return <AppContent />;
}
