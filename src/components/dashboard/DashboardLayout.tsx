import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import WaitlistFeed from "./WaitlistFeed";
import FloorPlan from "./FloorPlan";
import MenuManager from "./MenuManager";
import DashboardOverview from "./DashboardOverview";
import SettingsPanel from "./SettingsPanel";
import NotificationsPanel from "./NotificationsPanel";

export default function DashboardLayout() {
  const { activeView } = useDashboard();

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <DashboardOverview />;
      case "waitlist":
        return <WaitlistFeed />;
      case "floorplan":
        return <FloorPlan />;
      case "menu":
        return <MenuManager />;
      case "settings":
        return <SettingsPanel />;
      case "notifications":
        return <NotificationsPanel />;
      default:
        return <WaitlistFeed />;
    }
  };

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

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="h-full"
            >
              {renderView()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
