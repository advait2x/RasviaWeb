import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Map,
  UtensilsCrossed,
  Settings,
  Bell,
  LogOut,
} from "lucide-react";
import { NavView } from "@/types/dashboard";
import { useDashboard } from "@/context/DashboardContext";
import { supabase } from "@/lib/supabase";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems: { icon: typeof LayoutDashboard; label: string; view: NavView }[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard" },
  { icon: ClipboardList, label: "Waitlist", view: "waitlist" },
  { icon: Map, label: "Floor Plan", view: "floorplan" },
  { icon: UtensilsCrossed, label: "Menu Editor", view: "menu" },
  { icon: Bell, label: "Notifications", view: "notifications" },
  { icon: Settings, label: "Settings", view: "settings" },
];

export default function Sidebar() {
  const { activeView, setActiveView, unreadCount } = useDashboard();

  const renderNavItem = (icon: typeof LayoutDashboard, label: string, view: NavView) => {
    const Icon = icon;
    const isActive = activeView === view;
    return (
      <Tooltip key={view}>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(view)}
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${isActive ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
              }`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-amber-500/10 border border-amber-500/20"
                style={{ boxShadow: "0 0 12px rgba(245,158,11,0.08)" }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            <Icon size={22} strokeWidth={1.5} className="relative z-10" />
            {isActive && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute -left-[1.5px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-amber-500"
                style={{ boxShadow: "0 0 8px rgba(245,158,11,0.4)" }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            {/* Unread badge for notifications */}
            {view === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-lg shadow-red-500/30">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed left-0 top-0 h-screen w-[72px] flex flex-col items-center py-6 z-50"
        style={{
          background: "rgba(14,14,16,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "1px 0 20px rgba(0,0,0,0.4)",
        }}
      >
        {/* Logo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.93 }}
              onClick={() => setActiveView("settings")}
              className="mb-8 relative group"
            >
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 ${activeView === "settings"
                  ? "bg-amber-500/20 border border-amber-500/50"
                  : "bg-amber-500/10 border border-amber-500/25 group-hover:bg-amber-500/15 group-hover:border-amber-500/40"
                  }`}
                style={{ boxShadow: "0 0 16px rgba(245,158,11,0.1)" }}
              >
                <span className="text-amber-500 font-bold text-lg tracking-tight">R</span>
              </div>
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
            Restaurant Profile
          </TooltipContent>
        </Tooltip>

        {/* Nav */}
        <nav className="flex-1 flex flex-col items-center justify-evenly w-full">
          {navItems.map(({ icon, label, view }) => renderNavItem(icon, label, view))}
        </nav>

        {/* Logout */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => supabase.auth.signOut()}
              className="mb-3 w-10 h-10 rounded-xl flex items-center justify-center text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition-colors duration-200"
            >
              <LogOut size={18} strokeWidth={1.5} />
            </motion.button>
          </TooltipTrigger>
          <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
            Sign Out
          </TooltipContent>
        </Tooltip>

        {/* Status dot */}
        <div className="relative">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-50" />
        </div>
      </aside>
    </TooltipProvider>
  );
}
