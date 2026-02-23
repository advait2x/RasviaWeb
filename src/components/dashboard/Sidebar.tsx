import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Map,
  UtensilsCrossed,
  Settings,
  Bell,
} from "lucide-react";
import { NavView } from "@/types/dashboard";
import { useDashboard } from "@/context/DashboardContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems: { icon: typeof LayoutDashboard; label: string; view: NavView }[] = [
  { icon: LayoutDashboard, label: "Dashboard",     view: "dashboard" },
  { icon: ClipboardList,   label: "Waitlist",      view: "waitlist" },
  { icon: Map,             label: "Floor Plan",    view: "floorplan" },
  { icon: UtensilsCrossed, label: "Menu Editor",   view: "menu" },
  { icon: Bell,            label: "Notifications", view: "notifications" },
  { icon: Settings,        label: "Settings",      view: "settings" },
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
            className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-colors duration-200 ${
              isActive ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-amber-500/10 border border-amber-500/20"
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            <Icon size={24} strokeWidth={1.5} className="relative z-10" />
            {isActive && (
              <motion.div
                layoutId="sidebar-indicator"
                className="absolute -left-[1.5px] top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-r-full bg-amber-500"
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            {/* Unread badge for notifications */}
            {view === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <aside className="fixed left-0 top-0 h-screen w-20 glass-card flex flex-col items-center py-6 z-50">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <span className="text-amber-500 font-bold text-lg tracking-tight">R</span>
          </div>
        </div>

        {/* Nav — evenly distributed across remaining height */}
        <nav className="flex-1 flex flex-col items-center justify-evenly w-full">
          {navItems.map(({ icon, label, view }) => renderNavItem(icon, label, view))}
        </nav>

        {/* Status dot */}
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
      </aside>
    </TooltipProvider>
  );
}
