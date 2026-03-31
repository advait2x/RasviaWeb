import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  Map,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  Bell,
  LogOut,
  AlertTriangle,
  Users,
  Monitor,
  ChefHat,
  BarChart3,
  ChevronsLeft,
  ChevronsRight,
  Shield,
} from "lucide-react";
import { NavView, Permission } from "@/types/dashboard";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getRestaurantFallback } from "@/lib/fallbackImages";
import RestaurantSwitcher from "./RestaurantSwitcher";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

/** Maps each nav view to the permission required to see it */
const navItems: { icon: typeof LayoutDashboard; label: string; view: NavView; requiredPermission: Permission }[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard", requiredPermission: "view_dashboard" },
  { icon: Monitor, label: "POS Terminal", view: "pos", requiredPermission: "access_pos" },
  { icon: ClipboardList, label: "Waitlist", view: "waitlist", requiredPermission: "manage_waitlist" },
  { icon: Map, label: "Floor Plan", view: "floorplan", requiredPermission: "view_floorplan" },
  { icon: ShoppingBag, label: "Orders", view: "orders", requiredPermission: "view_orders" },
  { icon: ChefHat, label: "Kitchen Display", view: "kds", requiredPermission: "access_kds" },
  { icon: UtensilsCrossed, label: "Menu Editor", view: "menu", requiredPermission: "view_menu" },
  { icon: BarChart3, label: "Reports", view: "reports", requiredPermission: "view_reports" },
  { icon: Users, label: "Team & Roles", view: "team", requiredPermission: "manage_team" },
  { icon: Bell, label: "Notifications", view: "notifications", requiredPermission: "view_notifications" },
  { icon: Settings, label: "Settings", view: "settings", requiredPermission: "view_settings" },
];

export default function Sidebar({
  expanded,
  onExpandedChange,
}: {
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const { activeView, setActiveView, unreadCount, preorderCount, waitlist } = useDashboard();
  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const { hasPermission, isAdmin, restaurantId } = useAuth();
  const [restaurantBranding, setRestaurantBranding] = useState<{
    name: string;
    image_url: string | null;
  } | null>(null);

  useEffect(() => {
    if (!restaurantId) {
      setRestaurantBranding(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("restaurants")
        .select("name, image_url")
        .eq("id", restaurantId)
        .maybeSingle();
      if (!cancelled && data) {
        setRestaurantBranding({
          name: (data as { name: string }).name,
          image_url: (data as { image_url: string | null }).image_url,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId]);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const touchStartXRef = useRef<number | null>(null);

  // Filter nav items to only those the user has permission for
  const visibleNavItems = navItems.filter((item) => hasPermission(item.requiredPermission));

  const handleSignOut = async () => {
    setSigningOut(true);
    await supabase.auth.signOut();
    setSigningOut(false);
    setShowSignOutConfirm(false);
  };

  const handleTouchStart = (e: any) => {
    touchStartXRef.current = e.changedTouches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: any) => {
    if (touchStartXRef.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartXRef.current;
    const deltaX = endX - touchStartXRef.current;
    touchStartXRef.current = null;
    if (deltaX < -40 && expanded) onExpandedChange(false);
    if (deltaX > 40 && !expanded) onExpandedChange(true);
  };

  const renderNavItem = (icon: typeof LayoutDashboard, label: string, view: NavView) => {
    const Icon = icon;
    const isActive = activeView === view;
    return (
      <Tooltip key={view}>
        <TooltipTrigger asChild>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setActiveView(view)}
            className={`relative rounded-xl flex items-center justify-center transition-colors duration-200 ${
              expanded ? "w-full py-2 min-h-[62px] flex-col" : "w-12 h-12"
            } ${isActive ? "text-amber-500" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            {isActive && (
              <motion.div
                layoutId="sidebar-active"
                className="absolute inset-0 rounded-xl bg-amber-500/10 border border-amber-500/20"
                style={{ boxShadow: "0 0 12px rgba(245,158,11,0.08)" }}
                transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
              />
            )}
            {expanded && (
              <span className={`relative z-10 text-[10px] font-semibold leading-none mb-1 ${isActive ? "text-amber-400" : "text-zinc-400"}`}>
                {label}
              </span>
            )}
            <Icon size={20} strokeWidth={1.5} className="relative z-10" />
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
            {/* Pre-order badge for orders */}
            {view === "orders" && preorderCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-lg shadow-red-500/30">
                {preorderCount > 99 ? "99+" : preorderCount}
              </span>
            )}
            {/* Waiting parties — waitlist nav */}
            {view === "waitlist" && waitingCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center tabular-nums shadow-lg shadow-red-500/30">
                {waitingCount > 99 ? "99+" : waitingCount}
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
      <aside
        className="fixed inset-y-0 left-0 z-50 flex min-h-0 flex-col items-center pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] sm:pt-6 sm:pb-6 transition-[width] duration-200"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          width: expanded ? 196 : 72,
          background: "rgba(14,14,16,0.95)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "1px 0 20px rgba(0,0,0,0.4)",
        }}
      >
        {/* Top: fixed height — does not steal flex space from nav incorrectly */}
        <div className="flex w-full shrink-0 flex-col items-center">
          {/* Platform admin — full DB / restaurant management (separate route) */}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href="/admin"
                  className={`mb-2 flex items-center justify-center rounded-xl border border-amber-500/35 bg-amber-500/[0.07] text-amber-400 transition-colors hover:border-amber-500/55 hover:bg-amber-500/12 ${
                    expanded ? "w-[150px] h-11 gap-2 px-2" : "w-11 h-11"
                  }`}
                >
                  <Shield size={18} strokeWidth={1.75} className="shrink-0" />
                  {expanded && (
                    <span className="text-[11px] font-semibold leading-tight text-amber-300">Admin panel</span>
                  )}
                </a>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
                Open platform admin (restaurants & owners)
              </TooltipContent>
            </Tooltip>
          )}

          {/* Active restaurant image — display only (settings via sidebar nav) */}
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`mb-2 flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-amber-500/25 bg-amber-500/10 ${
                  expanded ? "h-12 w-[150px] gap-2 px-2" : "h-11 w-11"
                }`}
                style={{ boxShadow: "0 0 16px rgba(245,158,11,0.1)" }}
                aria-label={
                  restaurantBranding?.name
                    ? `Current restaurant: ${restaurantBranding.name}`
                    : "Current restaurant"
                }
              >
                {restaurantId && restaurantBranding ? (
                  <>
                    <div
                      className={`relative shrink-0 overflow-hidden border border-white/10 bg-zinc-900 ${
                        expanded ? "h-9 w-9 rounded-lg" : "h-full w-full rounded-[10px] border-0"
                      }`}
                    >
                      <img
                        src={restaurantBranding.image_url || getRestaurantFallback(restaurantId)}
                        alt=""
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = getRestaurantFallback(restaurantId);
                        }}
                      />
                    </div>
                    {expanded && (
                      <span className="min-w-0 flex-1 truncate text-left text-[11px] font-semibold text-amber-200/95">
                        {restaurantBranding.name}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-lg font-bold tracking-tight text-amber-500/90">R</span>
                )}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
              {restaurantBranding?.name ?? "Restaurant"}
            </TooltipContent>
          </Tooltip>

          {/* Restaurant Switcher — admins only */}
          {isAdmin && <RestaurantSwitcher />}
        </div>

        {/* Nav — grows to fill space between header and footer; min-h-0 lets flex shrink for overflow */}
        <nav className="flex min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div
            className={`flex flex-col items-center w-full ${
              expanded ? "gap-1.5 px-3 py-2 pb-4" : "gap-2 py-2 pb-4"
            }`}
          >
            {visibleNavItems.map(({ icon, label, view }) => renderNavItem(icon, label, view))}
          </div>
        </nav>

        {/* Bottom: sign out + status + collapse */}
        <div className="flex w-full shrink-0 flex-col items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowSignOutConfirm(true)}
                className={`mt-1 mb-3 rounded-xl flex items-center justify-center text-red-400 bg-red-500/10 hover:text-red-300 hover:bg-red-500/20 transition-colors duration-200 ${
                  expanded ? "w-[150px] h-11 gap-2" : "w-10 h-10"
                }`}
              >
                <LogOut size={18} strokeWidth={1.5} />
                {expanded && <span className="text-xs font-semibold">Sign Out</span>}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right" className="bg-zinc-800 text-zinc-100 border-zinc-700 text-xs font-medium shadow-xl">
              Sign Out
            </TooltipContent>
          </Tooltip>

          {/* Status dot */}
          <div className={`relative ${expanded ? "mb-1" : ""}`}>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping opacity-50" />
          </div>

          {/* Collapse / Expand toggle */}
          <button
            onClick={() => onExpandedChange(!expanded)}
            className={`mt-3 rounded-lg border border-white/10 bg-zinc-800/60 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/60 transition-colors ${
              expanded ? "w-[150px] h-8 flex items-center justify-center" : "w-9 h-8 flex items-center justify-center"
            }`}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            title={expanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {expanded ? <ChevronsLeft size={14} /> : <ChevronsRight size={14} />}
          </button>
        </div>
      </aside>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={showSignOutConfirm} onOpenChange={(o) => !o && setShowSignOutConfirm(false)}>
        <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-6">
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
              <AlertTriangle size={22} strokeWidth={1.5} className="text-red-400" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base font-semibold text-zinc-100">Sign out?</h3>
              <p className="text-sm text-zinc-400">
                You'll be returned to the login screen.
              </p>
            </div>
            <div className="flex gap-3 w-full pt-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowSignOutConfirm(false)}
                className="flex-1 py-2.5 rounded-lg bg-zinc-800 border border-white/10 text-zinc-300 text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                disabled={signingOut}
                className="flex-1 py-2.5 rounded-lg bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-semibold hover:bg-red-500/25 transition-colors disabled:opacity-60"
              >
                {signingOut ? "Signing out..." : "Sign Out"}
              </motion.button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
