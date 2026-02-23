import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserPlus, UserMinus, Inbox, ShoppingBag, Users } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { AppNotification } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";

type Tab = "party" | "order";

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function PartyNotif({ notif }: { notif: AppNotification }) {
  const isJoined = notif.type === "joined";
  return (
    <motion.div
      key={notif.id}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12 }}
      transition={{ duration: 0.2 }}
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${
        isJoined ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/10"
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isJoined ? "bg-emerald-500/15" : "bg-red-500/15"}`}>
        {isJoined
          ? <UserPlus size={15} strokeWidth={1.5} className="text-emerald-400" />
          : <UserMinus size={15} strokeWidth={1.5} className="text-red-400" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-zinc-100">{notif.guestName}</p>
        <p className={`text-xs mt-0.5 ${isJoined ? "text-emerald-400" : "text-red-400"}`}>
          {isJoined ? "Joined" : "Left"} the waitlist · Party of {notif.partySize}
        </p>
      </div>
      <span className="text-[11px] text-zinc-600 flex-shrink-0 mt-0.5">{formatTime(notif.timestamp)}</span>
    </motion.div>
  );
}

function EmptyState({ tab }: { tab: Tab }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3"
    >
      <Inbox size={36} strokeWidth={1} />
      <p className="text-sm">No {tab} notifications yet</p>
      <p className="text-xs text-zinc-700">
        {tab === "party"
          ? "New and departed waitlist guests will appear here"
          : "Incoming orders will appear here"}
      </p>
    </motion.div>
  );
}

export default function NotificationsPanel() {
  const { notifications, markNotificationsRead } = useDashboard();
  const [activeTab, setActiveTab] = useState<Tab>("party");

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  const partyNotifs = notifications.filter((n) => n.type === "joined" || n.type === "left");
  // order notifications would filter for n.type === "order" when that type exists
  const orderNotifs: AppNotification[] = [];

  const tabs: { id: Tab; label: string; icon: typeof Users; count: number }[] = [
    { id: "party", label: "Party",  icon: Users,        count: partyNotifs.length },
    { id: "order", label: "Orders", icon: ShoppingBag,  count: orderNotifs.length },
  ];

  const displayed = activeTab === "party" ? partyNotifs : orderNotifs;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Bell size={20} strokeWidth={1.5} className="text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Notifications</h2>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-3">
        <div className="flex gap-1 p-1 rounded-xl bg-zinc-800/60 border border-white/5">
          {tabs.map(({ id, label, icon: Icon, count }) => {
            const isActive = activeTab === id;
            return (
              <motion.button
                key={id}
                whileTap={{ scale: 0.97 }}
                onClick={() => setActiveTab(id)}
                className={`relative flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  isActive ? "text-zinc-100" : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="notif-tab"
                    className="absolute inset-0 rounded-lg bg-zinc-700/80 border border-white/8"
                    transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
                  />
                )}
                <Icon size={13} strokeWidth={1.5} className="relative z-10" />
                <span className="relative z-10">{label}</span>
                {count > 0 && (
                  <span className="relative z-10 ml-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {count}
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          <AnimatePresence mode="wait">
            {displayed.length === 0 ? (
              <EmptyState key={activeTab} tab={activeTab} />
            ) : (
              <motion.div
                key={activeTab}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {activeTab === "party" && partyNotifs.map((n) => <PartyNotif key={n.id} notif={n} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
