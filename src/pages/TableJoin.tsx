// src/pages/TableJoin.tsx
// Fixed per-table QR resolver.
// New: https://rasvia.com/t/{code}
// Legacy: https://rasvia.com/t?r=<restaurantId>&table=<label>
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, QrCode } from "lucide-react";
import { cn } from "@/lib/utils";
import { DASH_PRIMARY_CTA } from "@/lib/dashboardUi";
import { supabase } from "@/lib/supabase";
import { resolveTablesideSession } from "@/lib/tableside-session-resolve";

const TABLE_CODE_RE = /^[A-Za-z0-9]{6,8}$/;

function parseRestaurantId(raw: string | null): number | null {
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) return null;
  return n;
}

/** Path `/t/{code}` — single segment, not legacy query form. */
function parseTableCodeFromPath(): string | null {
  const parts = window.location.pathname.split("/").filter(Boolean);
  if (parts.length !== 2 || parts[0].toLowerCase() !== "t") return null;
  let code = parts[1].trim();
  try {
    code = decodeURIComponent(code);
  } catch {
    // use raw segment
  }
  if (!TABLE_CODE_RE.test(code)) return null;
  return code;
}

export default function TableJoin() {
  const tableCode = useMemo(() => parseTableCodeFromPath(), []);
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const restaurantId = useMemo(() => parseRestaurantId(params.get("r")), [params]);
  const tableLabel = useMemo(() => (params.get("table") ?? "").trim(), [params]);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const useCode = Boolean(tableCode);
    const useLegacy = restaurantId !== null && Boolean(tableLabel);
    if (!useCode && !useLegacy) {
      setError("This table link is missing or invalid. Please rescan the QR code on your table.");
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const input = useCode
          ? { table_code: tableCode! }
          : { restaurant_id: restaurantId!, table_label: tableLabel };

        const sessionId = await resolveTablesideSession(supabase, input);
        if (cancelled) return;
        window.location.replace(`/join?id=${encodeURIComponent(sessionId)}`);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Could not open this table. Please try again.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tableCode, restaurantId, tableLabel]);

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
        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        Opening your table…
      </div>
    </div>
  );
}
