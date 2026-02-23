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
        <div className="text-amber-500 font-medium tracking-tight animate-pulse">Loading Rasvia...</div>
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-red-400">Access Denied</h1>
          <p className="text-zinc-400">You are logged in, but not linked to a restaurant.</p>
        </div>
        <button
          onClick={() => supabase.auth.signOut()}
          className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-medium rounded-md transition-colors border border-white/10"
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
        <div className="text-amber-500 font-medium tracking-tight animate-pulse">Loading Dashboard...</div>
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
