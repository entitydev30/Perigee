/**
 * Pure helpers for the global command palette (WEB-52 / #185).
 *
 * Deliberately free of React/DOM so the logic can be unit tested directly.
 */

/** Window event dispatched by palette triggers to open the global palette. */
export const PALETTE_OPEN_EVENT = "perigee:open-command-palette";

/** localStorage key holding the vault IDs recently opened from the palette. */
export const RECENT_VAULTS_KEY = "perigee_recent_vaults";

/** Maximum number of recent vaults surfaced in the palette. */
export const RECENT_VAULTS_LIMIT = 5;

/**
 * Vault IDs are URL-safe identifiers (alphanumerics plus `-`/`_`). Anything
 * shorter than 4 characters or containing spaces/path characters is treated
 * as ordinary search text instead of a vault ID.
 */
const VAULT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$/;

/** True when a palette query looks like a vault ID worth opening directly. */
export function isVaultIdLike(query: string): boolean {
  return VAULT_ID_PATTERN.test(query.trim());
}

/** Route for the vault detail page (`pages/vault/[id].tsx`). */
export function vaultHref(id: string): string {
  return `/vault/${encodeURIComponent(id.trim())}`;
}

/** Parses the recent-vaults storage payload, tolerating corrupt values. */
export function parseRecentVaults(raw: string | null | undefined): string[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is string =>
        typeof entry === "string" && entry.length > 0,
    );
  } catch {
    return [];
  }
}

/**
 * Moves `id` to the front of the recent list, de-duplicates, and caps the
 * result at `RECENT_VAULTS_LIMIT` entries.
 */
export function upsertRecentVault(recent: string[], id: string): string[] {
  const normalized = id.trim();
  if (!normalized) return recent.slice(0, RECENT_VAULTS_LIMIT);

  const withoutDuplicate = recent.filter((entry) => entry !== normalized);
  return [normalized, ...withoutDuplicate].slice(0, RECENT_VAULTS_LIMIT);
}
