import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Inbox, UserPlus, UserMinus, UsersRound } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { useAuth } from "@/context/AuthContext";
import type { AppNotification } from "@/types/dashboard";
import NotificationsPanel from "./NotificationsPanel";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  DASH_BADGE_UNREAD,
  DASH_HEADER_DOT,
  DASH_HEADER_DOT_PING,
  DASH_NOTIF_ICON,
} from "@/lib/dashboardUi";

function formatTime(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return date.toLocaleDateString();
}

function previewLine(n: AppNotification): string {
  if (n.type === "group_created") return `${n.guestName} · group session`;
  if (n.type === "joined") return `${n.guestName} joined · party ${n.partySize}`;
  return `${n.guestName} left · party ${n.partySize}`;
}

export default function NotificationsPreviewWidget() {
  const { notifications, unreadCount } = useDashboard();
  const { hasPermission } = useAuth();
  const [open, setOpen] = useState(false);
  const canView = hasPermission("view_notifications");

  const preview = useMemo(() => {
    const list = [...notifications].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    return list.slice(0, 3);
  }, [notifications]);

  if (!canView) {
    return null;
  }

  return (
    <>
      <div className="card-premium flex h-full min-h-[200px] flex-col rounded-xl p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
            <span className="relative flex h-2 w-2">
              <span className={DASH_HEADER_DOT_PING} />
              <span className={DASH_HEADER_DOT} />
            </span>
            Notifications
          </h3>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
              {preview.length} recent
            </span>
            <span
              className={
                unreadCount > 0
                  ? DASH_BADGE_UNREAD
                  : "rounded-full border border-white/[0.1] bg-white/[0.04] px-2 py-0.5 text-[10px] font-semibold tabular-nums text-zinc-400"
              }
            >
              {unreadCount} unread
            </span>
          </div>
        </div>

        {preview.length === 0 ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex flex-1 flex-col items-center justify-center py-8 text-center"
          >
            <Inbox size={28} strokeWidth={1.5} className="mb-3 text-zinc-600" />
            <p className="text-sm text-zinc-500">No notifications yet</p>
            <p className="mt-1 text-xs text-zinc-600">Waitlist and group activity will appear here</p>
          </button>
        ) : (
          <div className="space-y-2">
            {preview.map((n, i) => (
              <motion.button
                key={n.id}
                type="button"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setOpen(true)}
                className="flex w-full items-start gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-colors hover:border-white/[0.1] hover:bg-white/[0.04]"
              >
                <div className="mt-0.5 shrink-0">
                  {n.type === "group_created" ? (
                    <UsersRound size={14} strokeWidth={1.5} className={DASH_NOTIF_ICON} />
                  ) : n.type === "joined" ? (
                    <UserPlus size={14} strokeWidth={1.5} className={DASH_NOTIF_ICON} />
                  ) : (
                    <UserMinus size={14} strokeWidth={1.5} className={DASH_NOTIF_ICON} />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-zinc-200">{previewLine(n)}</p>
                  <p className="text-[11px] text-zinc-500">{formatTime(n.timestamp)}</p>
                </div>
              </motion.button>
            ))}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full pt-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-500 transition-colors hover:text-zinc-300"
            >
              View all
            </button>
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="glass-modal flex h-[min(560px,85vh)] w-[min(100vw-2rem,440px)] max-h-[85vh] flex-col gap-0 overflow-hidden border-white/10 bg-zinc-900/95 p-0 backdrop-blur-xl">
          <NotificationsPanel active={open} />
        </DialogContent>
      </Dialog>
    </>
  );
}
