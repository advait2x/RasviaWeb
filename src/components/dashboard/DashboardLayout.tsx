import { useMemo, useRef, useEffect, useState, lazy, Suspense } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { Permission } from "@/types/dashboard";
import { ShieldX, Loader2 } from "lucide-react";
import PartnerDashboardChrome from "./PartnerDashboardChrome";
import WaitlistFeed from "./WaitlistFeed";
import FloorPlan from "./FloorPlan";
import OrdersPanel from "./OrdersPanel";
import TablesidePanel from "./TablesidePanel";
import MenuManager from "./MenuManager";
import DashboardOverview from "./DashboardOverview";
import SettingsPanel from "./SettingsPanel";
import KioskPage from "@/pages/KioskPage";

const POSTerminal = lazy(() => import("@/components/pos/POSTerminal"));
const KitchenDisplay = lazy(() => import("@/components/pos/KitchenDisplay"));
const SalesReports = lazy(() => import("@/components/pos/SalesReports"));

function LazyFallback() {
  return (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={24} className="animate-spin text-zinc-600" />
    </div>
  );
}

function LazyPOS() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <POSTerminal />
    </Suspense>
  );
}
function LazyKDS() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <KitchenDisplay />
    </Suspense>
  );
}
function LazyReports() {
  return (
    <Suspense fallback={<LazyFallback />}>
      <SalesReports />
    </Suspense>
  );
}

const VIEW_COMPONENTS: Record<string, React.FC> = {
  dashboard: DashboardOverview,
  waitlist: WaitlistFeed,
  floorplan: FloorPlan,
  orders: OrdersPanel,
  tableside: TablesidePanel,
  menu: MenuManager,
  settings: SettingsPanel,
  pos: LazyPOS,
  kds: LazyKDS,
  reports: LazyReports,
  kiosk: KioskPage,
};

const VIEW_PERMISSIONS: Record<string, Permission> = {
  dashboard: "view_dashboard",
  waitlist: "manage_waitlist",
  floorplan: "view_floorplan",
  orders: "view_orders",
  tableside: "manage_orders",
  menu: "view_menu",
  settings: "view_settings",
  pos: "access_pos",
  kds: "access_kds",
  reports: "view_reports",
  kiosk: "access_kiosk",
};

function AccessDenied() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <ShieldX size={28} strokeWidth={1.5} className="text-red-400" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-zinc-100">Access Denied</h2>
        <p className="max-w-xs text-sm text-zinc-500">
          You don&apos;t have permission to access this section. Contact your restaurant owner to update your role.
        </p>
      </div>
    </div>
  );
}

function FullScreenAccessDenied() {
  const handleSignOut = async () => {
    const { supabase } = await import("@/lib/supabase");
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-4 text-center"
      style={{ background: "hsl(var(--background))" }}
    >
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
        <ShieldX size={28} strokeWidth={1.5} className="text-red-400" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-zinc-100">Access Denied</h2>
        <p className="max-w-xs text-sm text-zinc-500">
          You don&apos;t have permission to access any section of this dashboard. Contact your restaurant owner to update
          your role.
        </p>
      </div>
      <button
        type="button"
        onClick={handleSignOut}
        className="mt-2 rounded-lg border border-white/10 bg-zinc-800 px-5 py-2 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700"
      >
        Sign Out
      </button>
    </div>
  );
}

export default function DashboardLayout() {
  const { activeView, replaceActiveView, kioskFullscreen } = useDashboard();
  const { hasPermission, permissions, loading } = useAuth();
  const [fadeIn, setFadeIn] = useState(false);
  const prevView = useRef(activeView);
  const hasSetInitialView = useRef(false);

  useEffect(() => {
    if (hasSetInitialView.current || permissions.length === 0) return;
    hasSetInitialView.current = true;

    const requiredPerm = VIEW_PERMISSIONS[activeView];
    if (requiredPerm && hasPermission(requiredPerm)) return;

    const viewOrder = [
      "dashboard",
      "kiosk",
      "pos",
      "waitlist",
      "floorplan",
      "orders",
      "kds",
      "menu",
      "reports",
      "settings",
    ];
    const firstAllowed = viewOrder.find((v) => {
      const perm = VIEW_PERMISSIONS[v];
      return perm && hasPermission(perm);
    });
    if (firstAllowed) replaceActiveView(firstAllowed as typeof activeView);
  }, [permissions, activeView, replaceActiveView, hasPermission]);

  useEffect(() => {
    if (prevView.current !== activeView) {
      setFadeIn(false);
      const raf = requestAnimationFrame(() => setFadeIn(true));
      prevView.current = activeView;
      return () => cancelAnimationFrame(raf);
    }
    setFadeIn(true);
  }, [activeView]);

  const mountedViews = useRef(new Set<string>());
  mountedViews.current.add(activeView);

  const views = useMemo(
    () => Array.from(mountedViews.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeView],
  );

  if (!loading && permissions.length === 0) {
    return <FullScreenAccessDenied />;
  }

  const showChrome = !activeView.includes("kiosk") || !kioskFullscreen;

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden bg-background">
      {showChrome ? <PartnerDashboardChrome /> : null}

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1 overflow-hidden">
          {views.map((view) => {
            const isActive = view === activeView;
            const requiredPerm = VIEW_PERMISSIONS[view];
            const allowed = requiredPerm ? hasPermission(requiredPerm) : true;
            const Component = allowed ? (VIEW_COMPONENTS[view] ?? WaitlistFeed) : AccessDenied;

            return (
              <div
                key={view}
                className="absolute inset-0 transition-opacity duration-100 ease-out"
                style={{
                  opacity: isActive && fadeIn ? 1 : 0,
                  pointerEvents: isActive ? "auto" : "none",
                  zIndex: isActive ? 1 : 0,
                  visibility: isActive ? "visible" : "hidden",
                }}
              >
                <Component />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
