import { motion } from "framer-motion";
import { Printer, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Order } from "@/types/dashboard";

interface ReceiptProps {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  restaurantName?: string;
  restaurantAddress?: string;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function Receipt({ order, open, onClose, restaurantName = "Restaurant", restaurantAddress }: ReceiptProps) {
  if (!order) return null;

  const now = new Date();
  const activeItems = order.items.filter((i) => !i.voided);
  const discountTotal = order.discountTotal ?? 0;

  const handlePrint = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=300,height=600");
    if (!printWindow) return;

    printWindow.opener = null;

    const itemRows = activeItems
      .map((item) => {
        const lineName = `${item.quantity}x ${item.menuItemName}${item.comped ? " (COMP)" : ""}`;
        const linePrice = item.comped ? "$0.00" : `$${(item.unitPrice * item.quantity).toFixed(2)}`;
        return `
          <div class="row">
            <span class="item-name">${escapeHtml(lineName)}</span>
            <span class="item-price">${escapeHtml(linePrice)}</span>
          </div>
        `;
      })
      .join("");

    const discountRow =
      discountTotal > 0
        ? `
          <div class="row small">
            <span>Discount</span>
            <span>-$${escapeHtml(discountTotal.toFixed(2))}</span>
          </div>
        `
        : "";

    const tipRow =
      order.tipAmount != null && order.tipAmount > 0
        ? `
          <div class="row small">
            <span>Tip</span>
            <span>$${escapeHtml(order.tipAmount.toFixed(2))}</span>
          </div>
        `
        : "";

    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,200..800&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Bricolage Grotesque', sans-serif; font-size: 12px; width: 80mm; padding: 4mm; color: #000; }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { border-top: 1px dashed #000; margin: 6px 0; }
            .row { display: flex; justify-content: space-between; margin: 2px 0; }
            .item-name { flex: 1; }
            .item-price { text-align: right; min-width: 60px; }
            .total-row { font-weight: bold; font-size: 14px; }
            .small { font-size: 10px; color: #666; }
            h1 { font-size: 16px; margin-bottom: 4px; }
            .spacer { margin: 8px 0; }
            @media print { body { width: 80mm; } }
          </style>
        </head>
        <body>
          <div class="center">
            <h1>${escapeHtml(restaurantName)}</h1>
            ${restaurantAddress ? `<p class="small">${escapeHtml(restaurantAddress)}</p>` : ""}
            <div class="line"></div>
            <p class="small">${escapeHtml(now.toLocaleDateString())} ${escapeHtml(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</p>
          </div>

          <div class="spacer"></div>
          <div class="row small">
            <span>Order #${escapeHtml(order.id.slice(-6))}</span>
            <span>Table ${escapeHtml(order.tableNumber)}</span>
          </div>
          <div class="small">Guest: ${escapeHtml(order.guestName)} · Party of ${escapeHtml(order.partySize)}</div>
          <div class="line"></div>

          ${itemRows}

          <div class="line"></div>
          <div class="row">
            <span>Subtotal</span>
            <span>$${escapeHtml(order.subtotal.toFixed(2))}</span>
          </div>
          ${discountRow}
          <div class="row">
            <span>Tax (8.25%)</span>
            <span>$${escapeHtml(order.tax.toFixed(2))}</span>
          </div>
          <div class="line"></div>
          <div class="row total-row">
            <span>TOTAL</span>
            <span>$${escapeHtml(order.total.toFixed(2))}</span>
          </div>
          ${tipRow}
          <div class="line"></div>

          <div class="center small">
            <p>Tip _______________</p>
            <p>Total _______________</p>
            <p>Signature _______________</p>
          </div>

          <div class="line"></div>
          <div class="center small">
            <p>Thank you for dining with us!</p>
            <p>Powered by Rasvia</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="glass-modal max-w-sm border-white/10 bg-zinc-900/95 backdrop-blur-xl p-0 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/5">
          <h3 className="text-sm font-semibold text-zinc-100">Receipt Preview</h3>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/15 transition-colors"
            >
              <Printer size={12} strokeWidth={1.5} />
              Print
            </motion.button>
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300"><X size={16} /></button>
          </div>
        </div>

        {/* Receipt content - styled to look like thermal printer output */}
        <div className="p-5">
          <div className="bg-white text-black p-4 rounded-lg font-mono text-xs leading-relaxed">
            <div className="text-center mb-3">
              <h1 className="text-sm font-bold">{restaurantName}</h1>
              {restaurantAddress && <p className="text-[10px] text-gray-500">{restaurantAddress}</p>}
              <div className="border-t border-dashed border-gray-300 mt-2 mb-2" />
              <p className="text-[10px] text-gray-500">
                {now.toLocaleDateString()} {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </p>
            </div>

            <div className="flex justify-between text-[10px] text-gray-500 mb-2">
              <span>Order #{order.id.slice(-6)}</span>
              <span>Table {order.tableNumber}</span>
            </div>
            <div className="text-[10px] text-gray-500 mb-1">
              Guest: {order.guestName} · Party of {order.partySize}
            </div>

            <div className="border-t border-dashed border-gray-300 my-2" />

            {activeItems.map((item) => (
              <div key={item.id} className="flex justify-between mb-1">
                <span className="flex-1">
                  {item.quantity}x {item.menuItemName}
                  {item.comped && <span className="text-[9px]"> (COMP)</span>}
                </span>
                <span className="text-right min-w-[50px]">
                  {item.comped ? "$0.00" : `$${(item.unitPrice * item.quantity).toFixed(2)}`}
                </span>
              </div>
            ))}

            <div className="border-t border-dashed border-gray-300 my-2" />

            <div className="flex justify-between mb-0.5">
              <span>Subtotal</span>
              <span>${order.subtotal.toFixed(2)}</span>
            </div>
            {discountTotal > 0 && (
              <div className="flex justify-between mb-0.5 text-gray-500">
                <span>Discount</span>
                <span>-${discountTotal.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between mb-0.5">
              <span>Tax (8.25%)</span>
              <span>${order.tax.toFixed(2)}</span>
            </div>

            <div className="border-t border-dashed border-gray-300 my-2" />

            <div className="flex justify-between font-bold text-sm">
              <span>TOTAL</span>
              <span>${order.total.toFixed(2)}</span>
            </div>

            {order.tipAmount != null && order.tipAmount > 0 && (
              <div className="flex justify-between mt-1 text-gray-500">
                <span>Tip</span>
                <span>${order.tipAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="border-t border-dashed border-gray-300 my-3" />

            <div className="text-center">
              <p className="text-[10px] text-gray-400 mb-1">Tip _______________</p>
              <p className="text-[10px] text-gray-400 mb-3">Total _______________</p>
              <p className="text-[10px] text-gray-400">Signature _______________</p>
            </div>

            <div className="border-t border-dashed border-gray-300 my-3" />

            <div className="text-center text-[10px] text-gray-400">
              <p>Thank you for dining with us!</p>
              <p className="mt-1">Powered by Rasvia</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
