// src/lib/party-credentials.ts
// localStorage-backed persistence for a browser's party_session credentials.
import type { PartyCreds } from './party-session';

function key(sessionId: string): string {
  return `rasvia_party_creds_${sessionId}`;
}

export function savePartyCreds(creds: PartyCreds): void {
  try {
    localStorage.setItem(key(creds.sessionId), JSON.stringify(creds));
  } catch {
    // localStorage may be unavailable (private mode); ignore.
  }
}

export function loadPartyCreds(sessionId: string): PartyCreds | null {
  try {
    const raw = localStorage.getItem(key(sessionId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartyCreds;
    if (!parsed?.memberId || !parsed.memberToken || !parsed.sessionId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearPartyCreds(sessionId: string): void {
  try {
    localStorage.removeItem(key(sessionId));
  } catch {
    // ignore
  }
}
