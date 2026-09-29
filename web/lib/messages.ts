/**
 * Message-tree helpers (WEB-52 follow-up / build hygiene).
 *
 * `messages/en.json` stores keys in flat dotted form (`"home.title": "…"`),
 * but the installed `use-intl@4` resolves keys as NESTED paths
 * (`messages.home.title`) — a flat lookup raises `MISSING_MESSAGE` and renders
 * the raw key. `nestMessages` converts the flat file to the nested shape at
 * the two boundaries that feed messages into next-intl (`pages/_app.tsx` and
 * `lib/i18n.ts`), so the JSON file itself stays flat (and testable).
 */

/** Nested message tree understood by use-intl (`AbstractIntlMessages`). */
export interface NestedMessages {
  [key: string]: NestedMessages | string;
}

/**
 * Converts flat dotted keys into a nested tree.
 *
 * `messages/en.json` guarantees every value is a string and that no key is a
 * dotted prefix of another, so no leaf/branch collisions occur; the guard
 * below still degrades gracefully if a future edit violates that.
 */
export function nestMessages(flat: Record<string, string>): NestedMessages {
  const nested: NestedMessages = {};

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let node = nested;

    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      const existing = node[part];
      if (typeof existing !== "object" || existing === null) {
        node[part] = {};
      }
      node = node[part] as NestedMessages;
    }

    node[parts[parts.length - 1]] = value;
  }

  return nested;
}
