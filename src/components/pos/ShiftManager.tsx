import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Clock, DollarSign, ArrowDownCircle, ArrowUpCircle, Coins, X } from "lucide-react";
import { useDashboard } from "@/context/DashboardContext";
import type { CashDrawerLog } from "@/types/dashboard";
import ManagerPinModal from "./ManagerPinModal";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

type DrawerAction = "pay_in" | "pay_out" | "tip_out";

export default function ShiftManager() {
  const { activeShift, openShift, closeShift, addCashDrawerLog, orders } = useDashboard();
  const { restaurantId } = useAuth();
  const [startingCash, setStartingCash] = useState("");
  const [logs, setLogs] = useState<CashDrawerLog[]>([]);
  const [actionDialog, setActionDialog] = useState<DrawerAction | null>(null);
  const [actionAmount, setActionAmount] = useState("");
  const [actionReason, setActionReason] = useState("");
  const [pinModal, setPinModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: DrawerAction; amount: number; reason: string } | null>(null);
  const [closeDialog, setCloseDialog] = useState(false);
  const [endingCash, setEndingCash] = useState("");

  const fetchLogs = useCallback(async () => {
    if (!activeShift) return;
    const { data } = await supabase
      .from("cash_drawer_logs")
      .select("*")
      .eq("shift_id", activeShift.id)
      .order("created_at", { ascending: false });
    if (data) {
      setLogs(data.map((r: Record<string, unknown>) => ({
        id: String(r.id),
        shiftId: String(r.shift_id),
        restaurantId: Number(r.restaurant_id),
        type: r.type as CashDrawerLog["type"],
        amount: Number(r.amount),
        reason: r.reason as string | undefined,
        performedBy: r.performed_by as string | undefined,
        approvedBy: r.approved_by as string | undefined,
        createdAt: new Date(r.created_at as string),
      })));
    }
  }, [activeShift]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const handleOpenShift = async () => {
    const cash = parseFloat(startingCash);
    if (isNaN(cash) || cash < 0) return;
    await openShift(cash);
    setStartingCash("");
  };

  const handleActionSubmit = () => {
    const amount = parseFloat(actionAmount);
    if (isNaN(amount) || amount <= 0) return;
    if (actionDialog === "pay_in") {
      addCashDrawerLog("pay_in", amount, actionReason);
      fetchLogs();
      resetAction();
    } else {
      setPendingAction({ type: actionDialog!, amount, reason: actionReason });
      setActionDialog(null);
      setPinModal(true);
    }
  };

  const handlePinVerified = async (approverStaffId: string) => {
    setPinModal(false);
    if (!pendingAction) return;
    await addCashDrawerLog(pendingAction.type, pendingAction.amount, pendingAction.reason, approverStaffId);
    await fetchLogs();
    setPendingAction(null);
    resetAction();
  };

  const resetAction = () => {
    setActionDialog(null);
    setActionAmount("");
    setActionReason("");
  };

  const payIns = logs.filter((l) => l.type === "pay_in").reduce((s, l) => s + l.amount, 0);
  const payOuts = logs.filter((l) => l.type === "pay_out").reduce((s, l) => s + l.amount, 0);
  const tipOuts = logs.filter((l) => l.type === "tip_out").reduce((s, l) => s + l.amount, 0);
  const cashSales = orders
    .filter((o) => o.shiftId === activeShift?.id && o.paymentMethod === "cash" && o.status === "completed")
    .reduce((s, o) => s + o.total, 0);
  const expectedCash = (activeShift?.startingCash ?? 0) + payIns - payOuts - tipOuts + cashSales;

  const handleCloseShift = async () => {
    const actual = parseFloat(endingCash);
    if (isNaN(actual) || actual < 0) return;
    await closeShift(actual);
    setCloseDialog(false);
    setEndingCash("");
  };

  const fmtTime = (d: Date) => new Date(d).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const fmtMoney = (n: number) => `$${Math.abs(n).toFixed(2)}`;
  const logColor: Record<string, string> = { pay_in: "text-emerald-400", pay_out: "text-red-400", tip_out: "text-amber-400", starting: "text-zinc-400", ending: "text-zinc-400" };

  if (!activeShift) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <div className="w-full max-w-sm rounded-xl border border-white/5 bg-zinc-900/80 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Clock size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Open Shift</h2>
              <p className="text-xs text-zinc-500">Count cash drawer and start</p>
            </div>
          </div>
          <Input
            type="number" min="0" step="0.01" placeholder="Starting cash amount"
            value={startingCash} onChange={(e) => setStartingCash(e.target.value)}
            className="h-12 bg-zinc-800/60 border-white/5 text-zinc-100 text-lg tabular-nums placeholder:text-zinc-600"
          />
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleOpenShift}
            className="w-full h-12 rounded-xl bg-amber-500 text-zinc-900 font-semibold text-sm hover:bg-amber-400 transition-colors">
            Start Shift
          </motion.button>
        </div>
      </div>
    );
  }

  const diff = parseFloat(endingCash) - expectedCash;
  const diffValid = !isNaN(parseFloat(endingCash));

  return (
    <div className="flex flex-col h-full overflow-auto p-4 space-y-3">
      {/* Shift Info */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/80 p-4 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-sm font-medium text-zinc-200">Shift Active</span>
          </div>
          <span className="text-xs text-zinc-500">Since {fmtTime(activeShift.startedAt)}</span>
        </div>
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span>Starting Cash</span>
          <span className="font-semibold text-zinc-200">{fmtMoney(activeShift.startingCash)}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {([["pay_in", "Pay In", ArrowDownCircle, "emerald"], ["pay_out", "Pay Out", ArrowUpCircle, "red"], ["tip_out", "Tip Out", Coins, "amber"]] as const).map(
          ([type, label, Icon, color]) => (
            <motion.button key={type} whileTap={{ scale: 0.95 }}
              onClick={() => setActionDialog(type as DrawerAction)}
              className={`h-12 rounded-xl border border-white/5 bg-zinc-800/60 flex items-center justify-center gap-1.5 text-sm font-medium text-${color}-400 hover:bg-zinc-800 transition-colors`}>
              <Icon size={16} strokeWidth={1.5} />
              {label}
            </motion.button>
          )
        )}
      </div>

      {/* Drawer Log */}
      <div className="rounded-xl border border-white/5 bg-zinc-900/80 p-3 flex-1 overflow-auto space-y-1">
        <h3 className="text-xs font-semibold text-zinc-400 mb-2">Cash Drawer Log</h3>
        {logs.length === 0 && <p className="text-xs text-zinc-600 text-center py-4">No activity yet</p>}
        {logs.map((log) => (
          <div key={log.id} className="flex items-center justify-between py-1.5 border-b border-white/[0.03] last:border-0">
            <div>
              <span className={`text-xs font-semibold ${logColor[log.type] ?? "text-zinc-400"}`}>
                {log.type.replace("_", " ").toUpperCase()}
              </span>
              {log.reason && <p className="text-[10px] text-zinc-500">{log.reason}</p>}
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold text-zinc-200">{fmtMoney(log.amount)}</span>
              <p className="text-[10px] text-zinc-600">{fmtTime(log.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Close Shift */}
      <motion.button whileTap={{ scale: 0.97 }} onClick={() => setCloseDialog(true)}
        className="w-full h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-semibold text-sm hover:bg-red-500/15 transition-colors">
        Close Shift
      </motion.button>

      {/* Action Dialog */}
      <Dialog open={!!actionDialog} onOpenChange={(o) => !o && resetAction()}>
        <DialogContent className="max-w-xs border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-100 capitalize">{actionDialog?.replace("_", " ")}</h3>
            <button onClick={resetAction} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
          <Input type="number" min="0" step="0.01" placeholder="Amount"
            value={actionAmount} onChange={(e) => setActionAmount(e.target.value)}
            className="h-12 bg-zinc-800/60 border-white/5 text-zinc-100 text-lg tabular-nums placeholder:text-zinc-600" />
          <Input placeholder="Reason (optional)" value={actionReason} onChange={(e) => setActionReason(e.target.value)}
            className="h-10 bg-zinc-800/60 border-white/5 text-zinc-100 text-sm placeholder:text-zinc-600" />
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleActionSubmit}
            className="w-full h-12 rounded-xl bg-amber-500 text-zinc-900 font-semibold text-sm hover:bg-amber-400 transition-colors">
            Confirm
          </motion.button>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={closeDialog} onOpenChange={(o) => !o && setCloseDialog(false)}>
        <DialogContent className="max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-100">Close Shift</h3>
          <div className="space-y-1.5 text-xs">
            <Row label="Starting Cash" value={fmtMoney(activeShift.startingCash)} />
            <Row label="+ Cash Sales" value={fmtMoney(cashSales)} />
            <Row label="+ Pay Ins" value={fmtMoney(payIns)} />
            <Row label="– Pay Outs" value={fmtMoney(payOuts)} cls="text-red-400" />
            <Row label="– Tip Outs" value={fmtMoney(tipOuts)} cls="text-red-400" />
            <div className="border-t border-white/5 pt-1.5 flex justify-between font-semibold text-zinc-100">
              <span>Expected Cash</span><span>{fmtMoney(expectedCash)}</span>
            </div>
          </div>
          <Input type="number" min="0" step="0.01" placeholder="Actual cash in drawer"
            value={endingCash} onChange={(e) => setEndingCash(e.target.value)}
            className="h-12 bg-zinc-800/60 border-white/5 text-zinc-100 text-lg tabular-nums placeholder:text-zinc-600" />
          {diffValid && (
            <div className={`text-center text-sm font-semibold ${diff >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {diff >= 0 ? "Over" : "Short"}: {fmtMoney(diff)}
            </div>
          )}
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleCloseShift}
            className="w-full h-12 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-400 transition-colors">
            Close Shift
          </motion.button>
        </DialogContent>
      </Dialog>

      {/* Manager PIN Modal */}
      <ManagerPinModal open={pinModal} onClose={() => { setPinModal(false); setPendingAction(null); }}
        onVerified={handlePinVerified} actionDescription={`Approve ${pendingAction?.type.replace("_", " ")}: $${pendingAction?.amount.toFixed(2) ?? "0.00"}`} />
    </div>
  );
}

function Row({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex justify-between text-zinc-400">
      <span>{label}</span><span className={cls ?? "text-zinc-200"}>{value}</span>
    </div>
  );
}
