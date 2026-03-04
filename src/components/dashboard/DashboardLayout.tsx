import { useMemo, useRef, useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { Permission } from "@/types/dashboard";
import { ShieldX } from "lucide-react";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import WaitlistFeed from "./WaitlistFeed";
import FloorPlan from "./FloorPlan";
import OrdersPanel from "./OrdersPanel";
import MenuManager from "./MenuManager";
import DashboardOverview from "./DashboardOverview";
import SettingsPanel from "./SettingsPanel";
import NotificationsPanel from "./NotificationsPanel";

const VIEW_COMPONENTS: Record<string, React.FC> = {
  dashboard: DashboardOverview,
  waitlist: WaitlistFeed,
  floorplan: FloorPlan,
  orders: OrdersPanel,
  menu: MenuManager,
  settings: SettingsPanel,
  notifications: NotificationsPanel,
};

/** Maps each view to the permission needed to access it */
const VIEW_PERMISSIONS: Record<string, Permission> = {
  dashboard: "view_dashboard",
  waitlist: "manage_waitlist",
  floorplan: "view_floorplan",
  orders: "view_orders",
  menu: "view_menu",
  settings: "view_settings",
  notifications: "view_notifications",
};

function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
        <ShieldX size={28} strokeWidth={1.5} className="text-red-400" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-bold text-zinc-100">Access Denied</h2>
        <p className="text-sm text-zinc-500 max-w-xs">
          You don't have permission to access this section. Contact your restaurant owner to update your role.
        </p>
      </div>
    </div>
  );
}

export default function DashboardLayout() {
  const { activeView, setActiveView } = useDashboard();
  const { hasPermission, permissions } = useAuth();
  const [fadeIn, setFadeIn] = useState(false);
  const prevView = useRef(activeView);
  const hasSetInitialView = useRef(false);

  // On first load, set the active view to the first one the user has permission for
  useEffect(() => {
    if (hasSetInitialView.current || permissions.length === 0) return;
    hasSetInitialView.current = true;

    const requiredPerm = VIEW_PERMISSIONS[activeView];
    if (requiredPerm && hasPermission(requiredPerm)) return; // current view is fine

    // Find the first permitted view
    const viewOrder = ["dashboard", "waitlist", "floorplan", "orders", "menu", "notifications", "settings"];
    const firstAllowed = viewOrder.find((v) => {
      const perm = VIEW_PERMISSIONS[v];
      return perm && hasPermission(perm);
    });
    if (firstAllowed) setActiveView(firstAllowed as typeof activeView);
  }, [permissions, activeView, setActiveView, hasPermission]);

  useEffect(() => {
    if (prevView.current !== activeView) {
      setFadeIn(false);
      const raf = requestAnimationFrame(() => setFadeIn(true));
      prevView.current = activeView;
      return () => cancelAnimationFrame(raf);
    } else {
      setFadeIn(true);
    }
  }, [activeView]);

  const mountedViews = useRef(new Set<string>());
  mountedViews.current.add(activeView);

  const views = useMemo(
    () => Array.from(mountedViews.current),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeView]
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex" style={{ background: "#09090b" }}>
      {/* Ambient background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/3 w-[600px] h-[400px] rounded-full opacity-30"
          style={{ background: "radial-gradient(ellipse, rgba(120,53,15,0.15) 0%, transparent 70%)" }}
        />
        <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full opacity-20"
          style={{ background: "radial-gradient(ellipse, rgba(245,158,11,0.06) 0%, transparent 70%)" }}
        />
      </div>

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-[72px] h-full relative z-10">
        {/* Status Bar */}
        <StatusBar />

        {/* View Content — keep-alive: each view stays mounted once visited */}
        <div className="flex-1 overflow-hidden relative">
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
