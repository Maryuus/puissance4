// ─── Shared utilities used across all games ───────────────────────────────────

/** Fisher-Yates shuffle — generic, works with any card type */
export function shuffleDeck<T>(deck: T[]): T[] {
  const d = [...deck];
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

/** Generate a random alphanumeric room code (no ambiguous chars O/0/I/1) */
export function generateRoomCode(length = 4): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

/**
 * Get or create a persistent player ID stored in sessionStorage.
 * Each game uses its own key so a player can participate in multiple games simultaneously.
 */
export function createPlayerId(storageKey: string): string {
  let id = sessionStorage.getItem(storageKey);
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem(storageKey, id);
  }
  return id;
}
