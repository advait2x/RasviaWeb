import { AnimatePresence, motion } from "framer-motion";
import { useDashboard } from "@/context/DashboardContext";
import Sidebar from "./Sidebar";
import StatusBar from "./StatusBar";
import WaitlistFeed from "./WaitlistFeed";
import FloorPlan from "./FloorPlan";
import MenuManager from "./MenuManager";
import DashboardOverview from "./DashboardOverview";
import SettingsPanel from "./SettingsPanel";

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
      default:
        return <WaitlistFeed />;
    }
  };

  return (
    <div className="h-screen w-screen bg-[#09090b] overflow-hidden flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 flex flex-col ml-20 h-full">
        {/* Status Bar */}
        <StatusBar />

        {/* View Content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
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
