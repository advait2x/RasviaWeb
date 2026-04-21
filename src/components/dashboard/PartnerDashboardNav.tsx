import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  ClipboardList,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  ChefHat,
  BarChart3,
  Shield,
  Tablet,
  QrCode,
  LogOut,
} from "lucide-react";
import { NavView, Permission } from "@/types/dashboard";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { getRestaurantFallback } from "@/lib/fallbackImages";
import { DASH_NAV_COUNT_BADGE } from "@/lib/dashboardUi";
import RestaurantSwitcher from "./RestaurantSwitcher";
import { ThemeIconToggle } from "@/components/ThemeToggle";
import { useTheme } from "@/context/ThemeContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const navItems: {
  icon: typeof LayoutDashboard;
  label: string;
  view: NavView;
  requiredPermission: Permission;
}[] = [
  { icon: LayoutDashboard, label: "Dashboard", view: "dashboard", requiredPermission: "view_dashboard" },
  { icon: Tablet, label: "Kiosk", view: "kiosk", requiredPermission: "access_kiosk" },
  { icon: ClipboardList, label: "Waitlist", view: "waitlist", requiredPermission: "manage_waitlist" },
  { icon: ShoppingBag, label: "Orders", view: "orders", requiredPermission: "view_orders" },
  { icon: QrCode, label: "Tableside QR", view: "tableside", requiredPermission: "manage_orders" },
  { icon: ChefHat, label: "Kitchen", view: "kds", requiredPermission: "access_kds" },
  { icon: UtensilsCrossed, label: "Menu", view: "menu", requiredPermission: "view_menu" },
  { icon: BarChart3, label: "Reports", view: "reports", requiredPermission: "view_reports" },
  { icon: Settings, label: "Settings", view: "settings", requiredPermission: "view_settings" },
];

export default function PartnerDashboardNav() {
  const { activeView, setActiveView, preorderCount, waitlist } = useDashboard();
  const waitingCount = waitlist.filter((w) => w.status === "waiting").length;
  const { hasPermission, isAdmin, restaurantId } = useAuth();
  const { resolvedTheme } = useTheme();
  const [restaurantBranding, setRestaurantBranding] = useState<{
    name: string;
    image_url: string | null;
  } | null>(null);
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);

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

  const visibleNavItems = navItems.filter((item) => hasPermission(item.requiredPermission));

  const renderNavButton = (icon: typeof LayoutDashboard, label: string, view: NavView) => {
    const Icon = icon;
    const isActive = activeView === view;
    return (
      <Tooltip key={view}>
        <TooltipTrigger asChild>
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveView(view)}
            className={`relative flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold tracking-tight transition-colors sm:px-3 ${
              isActive
                ? "border border-white/[0.1] bg-white/[0.06] text-zinc-100"
                : "border border-transparent text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-300"
            }`}
          >
            <Icon size={16} strokeWidth={1.5} className="shrink-0" />
            <span className="max-[380px]:sr-only">{label}</span>
            {view === "orders" && preorderCount > 0 && (
              <span className={DASH_NAV_COUNT_BADGE}>
                {preorderCount > 99 ? "99+" : preorderCount}
              </span>
            )}
            {view === "waitlist" && waitingCount > 0 && (
              <span className={DASH_NAV_COUNT_BADGE}>
                {waitingCount > 99 ? "99+" : waitingCount}
              </span>
            )}
          </motion.button>
        </TooltipTrigger>
        <TooltipContent
          side="bottom"
          className="border border-white/[0.08] bg-zinc-800 text-[11px] font-medium tracking-tight text-zinc-100 shadow-xl"
        >
          {label}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex w-full min-w-0 flex-col gap-2 px-3 py-2 sm:px-4 sm:py-2.5">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {isAdmin && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <a
                    href="/admin"
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/[0.07] px-2.5 py-2 text-[11px] font-semibold text-amber-300 transition-colors hover:border-amber-500/50 hover:bg-amber-500/12 sm:text-xs"
                  >
                    <Shield size={16} strokeWidth={1.75} className="shrink-0" />
                    <span className="hidden sm:inline">Admin</span>
                  </a>
                </TooltipTrigger>
                <TooltipContent className="border border-white/[0.08] bg-zinc-800 text-[11px] text-zinc-100">
                  Platform admin
                </TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={`flex max-w-[200px] shrink-0 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 ${
                    resolvedTheme === "light"
                      ? "border border-amber-500/45 bg-amber-50/90"
                      : "border border-amber-500/30 bg-amber-500/[0.07]"
                  }`}
                  style={{ boxShadow: resolvedTheme === "light" ? "0 0 0 1px rgba(245,158,11,0.15)" : "0 0 12px rgba(245,158,11,0.08)" }}
                >
                  {restaurantId && restaurantBranding ? (
                    <>
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-900">
                        <img
                          src={restaurantBranding.image_url || getRestaurantFallback(restaurantId)}
                          alt=""
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = getRestaurantFallback(restaurantId);
                          }}
                        />
                      </div>
                      <span
                        className={`min-w-0 truncate text-[11px] font-semibold sm:text-xs ${
                          resolvedTheme === "light" ? "text-amber-950" : "text-amber-200/95"
                        }`}
                      >
                        {restaurantBranding.name}
                      </span>
                    </>
                  ) : (
                    <span className={`px-1 text-xs font-semibold ${resolvedTheme === "light" ? "text-amber-950" : "text-amber-300"}`}>Restaurant</span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent className="border border-white/[0.08] bg-zinc-800 text-[11px] text-zinc-100">
                {restaurantBranding?.name ?? "Restaurant"}
              </TooltipContent>
            </Tooltip>

            <ThemeIconToggle
              className={
                resolvedTheme === "light"
                  ? "border-amber-500/45 bg-amber-50 text-amber-700 hover:bg-amber-100"
                  : ""
              }
            />

            {isAdmin && <RestaurantSwitcher />}
          </div>

          <nav className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-1 sm:justify-start md:justify-center">
            {visibleNavItems.map(({ icon, label, view }) => renderNavButton(icon, label, view))}
          </nav>

          {activeView === "settings" && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={() => setSignOutConfirmOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-zinc-800/90 px-2.5 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-red-500/25 hover:bg-zinc-800 hover:text-red-300/95 sm:px-3"
            >
              <LogOut size={15} strokeWidth={1.75} className="shrink-0 text-red-400/80" />
              <span className="max-[380px]:sr-only">Sign out</span>
            </motion.button>
          )}
        </div>
      </div>

      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent className="border-white/10 bg-zinc-900 text-zinc-100">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-zinc-400">
              You will need to sign in again to access the partner dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 bg-zinc-800 text-zinc-200 hover:bg-zinc-700">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-950/70 text-red-100 hover:bg-red-950 hover:text-white focus:ring-red-900"
              onClick={(e) => {
                e.preventDefault();
                setSignOutConfirmOpen(false);
                void (async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                })();
              }}
            >
              Sign out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
