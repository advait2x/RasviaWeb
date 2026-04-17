// src/lib/party-credentials.ts
// localStorage-backed persistence for a browser's party_session credentials.
import type { PartyCreds } from './party-session';

function key(sessionId: string): string {
  return `rasvia_party_creds_${sessionId}`;
}

const LAST_NAME_KEY = 'rasvia_party_last_display_name';

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

// Persist the display name a user last joined a party with so we can pre-fill
// it the next time they join a new group order. Stored device-wide, not
// session-scoped.
export function saveLastDisplayName(name: string): void {
  try {
    const trimmed = name.trim();
    if (!trimmed) return;
    localStorage.setItem(LAST_NAME_KEY, trimmed);
  } catch {
    // ignore
  }
}

export function loadLastDisplayName(): string | null {
  try {
    const raw = localStorage.getItem(LAST_NAME_KEY);
    if (!raw) return null;
    const trimmed = raw.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}
