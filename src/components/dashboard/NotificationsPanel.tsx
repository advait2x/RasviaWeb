import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserPlus, UserMinus, Inbox } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { AppNotification } from "@/types/dashboard";
import { ScrollArea } from "@/components/ui/scroll-area";


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
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${isJoined ? "bg-emerald-500/5 border-emerald-500/15" : "bg-red-500/5 border-red-500/10"
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

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-24 gap-3"
    >
      <div className="w-14 h-14 rounded-2xl bg-zinc-800/60 border border-white/5 flex items-center justify-center mb-1">
        <Inbox size={24} strokeWidth={1} className="text-zinc-600" />
      </div>
      <p className="text-sm font-medium text-zinc-500">No notifications yet</p>
      <p className="text-xs text-zinc-600">
        New and departed waitlist guests will appear here
      </p>
    </motion.div>
  );
}

export default function NotificationsPanel() {
  const { notifications, markNotificationsRead } = useDashboard();

  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  const displayed = notifications.filter((n) => n.type === "joined" || n.type === "left");

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <Bell size={20} strokeWidth={1.5} className="text-amber-500/70" />
        <h2 className="text-xl font-bold text-zinc-100 tracking-tight">Notifications</h2>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="px-5 pb-4 space-y-2">
          <AnimatePresence initial={false}>
            {displayed.length === 0 ? (
              <EmptyState />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-2"
              >
                {displayed.map((n) => <PartyNotif key={n.id} notif={n} />)}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
