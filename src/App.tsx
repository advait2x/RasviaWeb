import { Suspense } from "react";
import { Routes, Route } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Home from "./components/home";
import JoinBridge from "./pages/JoinBridge";

function AppContent() {
  if (window.location.pathname.startsWith('/join')) {
    return <JoinBridge />;
  }

  const { session, restaurantId, loading } = useAuth();

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

  // 2. Logged in but NO restaurant linked? -> Show Error
  if (!restaurantId) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#09090b] text-white">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-red-400">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-100">Access Denied</h1>
          <p className="text-sm text-zinc-400 max-w-xs mx-auto">
            You're logged in, but your account isn't linked to a restaurant yet. Contact your administrator.
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

  // 3. Logged in AND linked? -> Show the Dashboard!
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
