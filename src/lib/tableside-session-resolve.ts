import type { SupabaseClient } from "@supabase/supabase-js";
import { extractFunctionError } from "@/lib/order-refund";

export type TablesideResolveInput =
  | { table_code: string }
  | { restaurant_id: number; table_label: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_table_code: "This table link is invalid. Please rescan the QR code.",
  table_not_found: "This table is not set up yet. Ask your server or scan the QR on your table.",
  restaurant_not_found: "This restaurant could not be found.",
  restaurant_inactive: "This restaurant is not accepting orders right now.",
  invalid_restaurant_id: "This table link is invalid. Please rescan the QR code.",
  invalid_table_label: "This table link is invalid. Please rescan the QR code.",
  rate_limited: "Too many attempts. Please wait a moment and try again.",
  resolve_failed:
    "Could not start your table order. Make sure the latest database migration and tableside-session edge function are deployed.",
  lookup_failed: "Could not look up this table. Please try again in a moment.",
  server_misconfigured: "Table ordering is temporarily unavailable. Please ask your server.",
};

function messageForErrorCode(code: string | undefined, fallback: string): string {
  if (!code) return fallback;
  return ERROR_MESSAGES[code] ?? fallback;
}

async function extractEdgeError(err: unknown): Promise<{ message: string; code?: string }> {
  const raw = await extractFunctionError(err);
  let code: string | undefined;
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed?.error) code = String(parsed.error);
  } catch {
    if (raw in ERROR_MESSAGES) code = raw;
  }
  if (raw.includes("non-2xx")) {
    return {
      message:
        "Could not reach the table ordering service. Redeploy the tableside-session edge function or run migration 20260604130000_tableside_resolve_by_code_anon.sql.",
      code: "edge_unreachable",
    };
  }
  return { message: messageForErrorCode(code, raw), code };
}

/** Resolve via edge function (rate-limited; supports legacy label URLs). */
async function resolveViaEdge(
  supabase: SupabaseClient,
  input: TablesideResolveInput,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("tableside-session", { body: input });
  if (error) {
    const shaped = await extractEdgeError(error);
    throw new Error(shaped.message);
  }
  const sessionId = (data as { sessionId?: string; error?: string } | null)?.sessionId;
  if (sessionId) return sessionId;
  const errCode = (data as { error?: string } | null)?.error;
  throw new Error(messageForErrorCode(errCode, "Could not open this table."));
}

/** Fallback for /t/{code} when edge returns non-2xx (e.g. not redeployed). */
async function resolveViaRpc(
  supabase: SupabaseClient,
  tableCode: string,
): Promise<string> {
  const { data, error } = await supabase.rpc("tableside_resolve_by_code", { p_code: tableCode });
  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("table_not_found") || msg.includes("invalid_table_code")) {
      throw new Error(ERROR_MESSAGES.table_not_found);
    }
    if (msg.includes("Could not find the function")) {
      throw new Error(
        "Table ordering is not fully set up yet. Run migrations 20260604120000_tableside_tables.sql and 20260604130000_tableside_resolve_by_code_anon.sql, then redeploy tableside-session.",
      );
    }
    throw new Error(msg || "Could not open this table.");
  }
  const sessionId = (data as { session_id?: string } | null)?.session_id;
  if (!sessionId) {
    throw new Error("Could not open this table. Please try again.");
  }
  return sessionId;
}

export async function resolveTablesideSession(
  supabase: SupabaseClient,
  input: TablesideResolveInput,
): Promise<string> {
  if ("table_code" in input) {
    try {
      return await resolveViaEdge(supabase, input);
    } catch (edgeErr) {
      try {
        return await resolveViaRpc(supabase, input.table_code);
      } catch (rpcErr) {
        throw rpcErr instanceof Error ? rpcErr : edgeErr;
      }
    }
  }
  return resolveViaEdge(supabase, input);
}
