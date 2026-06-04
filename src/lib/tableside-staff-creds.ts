import type { SupabaseClient } from "@supabase/supabase-js";
import {
  cancelSession,
  completeJoinCredentials,
  reissuePartyMemberToken,
  staffJoinTableside,
  TABLESIDE_STAFF_DISPLAY_NAME,
  type PartyCreds,
} from "@/lib/party-session";

const STORAGE_PREFIX = "rasvia.tableside.staff.creds.";

/** One in-flight join per session (React Strict Mode / double mount). */
const joinInflight = new Map<string, Promise<PartyCreds>>();

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}${sessionId}`;
}

export function loadTablesideStaffCreds(sessionId: string): PartyCreds | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartyCreds;
    if (parsed.sessionId !== sessionId || !parsed.memberId || !parsed.memberToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveTablesideStaffCreds(creds: PartyCreds): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(creds.sessionId), JSON.stringify(creds));
  } catch {
    // ignore
  }
}

export function clearTablesideStaffCreds(sessionId: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(sessionId));
  } catch {
    // ignore
  }
}

function isDuplicateMembershipError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("uniq_party_members_session_user") || msg.includes("duplicate key");
}

async function joinTablesideStaffOnce(
  supabase: SupabaseClient,
  sessionId: string,
  staffDisplayName: string,
): Promise<PartyCreds> {
  const existing = loadTablesideStaffCreds(sessionId);

  const reissued = await reissuePartyMemberToken(supabase, sessionId);
  if (reissued) {
    saveTablesideStaffCreds(reissued);
    return reissued;
  }

  try {
    const join = await staffJoinTableside(
      supabase,
      sessionId,
      TABLESIDE_STAFF_DISPLAY_NAME,
    );
    const creds = await completeJoinCredentials(supabase, sessionId, join, existing);
    saveTablesideStaffCreds(creds);
    return creds;
  } catch (err) {
    if (isDuplicateMembershipError(err)) {
      const retry = await reissuePartyMemberToken(supabase, sessionId);
      if (retry) {
        saveTablesideStaffCreds(retry);
        return retry;
      }
    }
    throw err instanceof Error
      ? err
      : new Error("Could not join this table as staff. Sign in and try again.");
  }
}

/** Join or rejoin as staff for dashboard tableside controls. */
export async function ensureTablesideStaffCreds(
  supabase: SupabaseClient,
  sessionId: string,
  staffDisplayName: string,
): Promise<PartyCreds> {
  const pending = joinInflight.get(sessionId);
  if (pending) return pending;

  const work = joinTablesideStaffOnce(supabase, sessionId, staffDisplayName);
  joinInflight.set(sessionId, work);
  try {
    return await work;
  } finally {
    if (joinInflight.get(sessionId) === work) {
      joinInflight.delete(sessionId);
    }
  }
}

/** End an active tableside party session using staff dashboard credentials. */
export async function cancelTablesideSessionAsStaff(
  supabase: SupabaseClient,
  sessionId: string,
  staffDisplayName: string,
  options?: { reason?: string | null },
): Promise<void> {
  const creds = await ensureTablesideStaffCreds(supabase, sessionId, staffDisplayName);
  await cancelSession(supabase, creds, options);
}
