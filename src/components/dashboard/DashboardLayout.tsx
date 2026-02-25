import { useMemo, useRef, useEffect, useState } from "react";
import { useDashboard } from "@/context/DashboardContext";
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

export default function DashboardLayout() {
  const { activeView } = useDashboard();
  const [fadeIn, setFadeIn] = useState(false);
  const prevView = useRef(activeView);

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
            const Component = VIEW_COMPONENTS[view] ?? WaitlistFeed;
            const isActive = view === activeView;
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
