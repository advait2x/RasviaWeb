// src/pages/TableJoin.tsx
// Fixed per-table QR resolver. A table's QR encodes
//   https://rasvia.com/t?r=<restaurantId>&table=<label>
// This page calls the `tableside-session` edge function to find-or-create the
// table's shared self-serve group order, then redirects to the standard
// /join?id=<sessionId> bridge. Public route - no auth required.
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { supabase } from "@/lib/supabase";

function parseRestaurantId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

export default function TableJoin() {
  const params = new URLSearchParams(window.location.search);
  const restaurantId = parseRestaurantId(params.get("r"));
  const tableLabel = (params.get("table") ?? "").trim();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (restaurantId === null || !tableLabel) {
      setError("This table link is missing or invalid. Please rescan the QR code on your table.");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("tableside-session", {
          body: { restaurant_id: restaurantId, table_label: tableLabel },
        });
        if (cancelled) return;
        if (fnError) {
          throw new Error(fnError.message || "Could not open this table.");
        }
        const sessionId = (data as { sessionId?: string } | null)?.sessionId;
        if (!sessionId) {
          throw new Error("Could not open this table. Please try again or ask your server.");
        }
        window.location.replace(`/join?id=${encodeURIComponent(sessionId)}`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not open this table. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [restaurantId, tableLabel]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-zinc-950 p-6 text-center">
        <AlertCircle className="h-8 w-8 text-red-400" />
        <h1 className="text-xl font-bold text-zinc-100">Can&apos;t open this table</h1>
        <p className="max-w-sm text-sm text-zinc-400">{error}</p>
        <a href="/" className={cn("mt-3 rounded-xl px-5 py-2.5 text-sm font-bold", DASH_PRIMARY_CTA)}>
          Back to home
        </a>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950 p-6 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15"
      >
        <QrCode className="h-7 w-7 text-amber-400" />
      </motion.div>
      <div className="flex items-center gap-2 text-sm font-medium text-zinc-400">
        <Loader2 className="h-4 w-4 animate-spin" />
        Opening your table…
      </div>
      {tableLabel ? (
        <p className="text-xs text-zinc-600">{tableLabel}</p>
      ) : null}
    </div>
  );
}
