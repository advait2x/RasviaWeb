import { useEffect } from "react";
import { motion } from "framer-motion";
import { Printer, DollarSign, AlertCircle, Ban, Keyboard } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import { toast } from "sonner";

interface QuickActionsProps {
  onNewOrder: () => void;
  onHold: () => void;
  onSendToKitchen: () => void;
  onPrint: () => void;
  hasCurrentOrder: boolean;
}

export default function QuickActions({ onNewOrder, onHold, onSendToKitchen, onPrint, hasCurrentOrder }: QuickActionsProps) {
  const { menuItems, toggleMenuItem } = useDashboard();

  const eightySixedCount = menuItems.filter((m) => !m.inStock).length;

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key.toLowerCase()) {
        case "n":
          if (!e.metaKey && !e.ctrlKey) { e.preventDefault(); onNewOrder(); }
          break;
        case "h":
          if (!e.metaKey && !e.ctrlKey && hasCurrentOrder) { e.preventDefault(); onHold(); }
          break;
        case "s":
          if (!e.metaKey && !e.ctrlKey && hasCurrentOrder) { e.preventDefault(); onSendToKitchen(); }
          break;
        case "p":
          if (!e.metaKey && !e.ctrlKey && hasCurrentOrder) { e.preventDefault(); onPrint(); }
          break;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNewOrder, onHold, onSendToKitchen, onPrint, hasCurrentOrder]);

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-zinc-800/30 border border-white/5">
      <div className="flex items-center gap-1 text-zinc-600">
        <Keyboard size={12} strokeWidth={1.5} />
        <span className="text-[10px] font-medium">Shortcuts:</span>
      </div>
      <div className="flex items-center gap-2">
        {[
          { key: "N", label: "New", action: onNewOrder, always: true },
          { key: "H", label: "Hold", action: onHold, always: false },
          { key: "S", label: "Send", action: onSendToKitchen, always: false },
          { key: "P", label: "Print", action: onPrint, always: false },
        ].map(({ key, label, action, always }) => (
          <button
            key={key}
            onClick={action}
            disabled={!always && !hasCurrentOrder}
            className="flex items-center gap-1 text-[10px] text-zinc-500 hover:text-zinc-300 disabled:opacity-30 transition-colors"
          >
            <kbd className="px-1 py-0.5 rounded bg-zinc-700/50 border border-white/5 text-[9px] font-mono font-bold text-zinc-400">
              {key}
            </kbd>
            <span>{label}</span>
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {eightySixedCount > 0 && (
          <span className="flex items-center gap-1 text-[10px] text-red-400">
            <Ban size={10} strokeWidth={1.5} />
            {eightySixedCount} 86'd
          </span>
        )}
      </div>
    </div>
  );
}
