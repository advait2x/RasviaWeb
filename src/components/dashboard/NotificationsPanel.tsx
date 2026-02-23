import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, UserPlus, UserMinus, Inbox } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { ScrollArea } from "@/components/ui/scroll-area";

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

export default function NotificationsPanel() {
  const { notifications, markNotificationsRead } = useDashboard();

  // Mark all as read when this panel is mounted
  useEffect(() => {
    markNotificationsRead();
  }, [markNotificationsRead]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <Bell size={20} strokeWidth={1.5} className="text-zinc-400" />
        <h2 className="text-lg font-semibold text-zinc-100 tracking-tight">Notifications</h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="px-4 pb-4 space-y-2">
          <AnimatePresence initial={false}>
            {notifications.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-zinc-600 gap-3"
              >
                <Inbox size={36} strokeWidth={1} />
                <p className="text-sm">No notifications yet</p>
                <p className="text-xs text-zinc-700">New and departed waitlist guests will appear here</p>
              </motion.div>
            )}

            {notifications.map((notif) => {
              const isJoined = notif.type === "joined";
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 12 }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors ${
                    isJoined
                      ? "bg-emerald-500/5 border-emerald-500/15"
                      : "bg-red-500/5 border-red-500/10"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isJoined ? "bg-emerald-500/15" : "bg-red-500/15"
                    }`}
                  >
                    {isJoined ? (
                      <UserPlus size={15} strokeWidth={1.5} className="text-emerald-400" />
                    ) : (
                      <UserMinus size={15} strokeWidth={1.5} className="text-red-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-100">{notif.guestName}</p>
                    <p className={`text-xs mt-0.5 ${isJoined ? "text-emerald-400" : "text-red-400"}`}>
                      {isJoined ? "Joined" : "Left"} the waitlist · Party of {notif.partySize}
                    </p>
                  </div>

                  <span className="text-[11px] text-zinc-600 flex-shrink-0 mt-0.5">
                    {formatTime(notif.timestamp)}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </ScrollArea>
    </div>
  );
}
