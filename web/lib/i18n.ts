/**
 * i18n / white-label translation layer.
 *
 * Built on next-intl.  The default English messages live in
 * `messages/en.json`.  Wealth managers can override every visible string
 * by setting the `NEXT_PUBLIC_MANAGER_LABEL` environment variable to a
 * key that maps to a custom messages file (e.g. `messages/acme.json`).
 *
 * Resolves WEB-17 (#103): Navigation/metadata not localized for white-label.
 */
import { getRequestConfig } from "next-intl/server";
import { nestMessages, type NestedMessages } from "./messages";

async function loadMessages(locale: string): Promise<NestedMessages> {
  const defaultMessages: Record<string, string> = (
    await import(`../messages/${locale}.json`)
  ).default;

  const managerLabel = process.env.NEXT_PUBLIC_MANAGER_LABEL?.trim();
  if (!managerLabel) return nestMessages(defaultMessages);

  try {
    const managerOverrides: Partial<Record<string, string>> = (
      await import(`../messages/${managerLabel}.json`)
    ).default;
    const merged: Record<string, string> = { ...defaultMessages };
    for (const [key, value] of Object.entries(managerOverrides)) {
      // Partial<Record<…>> spreads as `string | undefined`; skip absent keys so
      // a missing override never shadows the default message with `undefined`.
      if (value !== undefined) merged[key] = value;
    }
    return nestMessages(merged);
  } catch {
    console.warn(
      `[i18n] Manager override "${managerLabel}" messages file not found. Using defaults.`,
    );
    return nestMessages(defaultMessages);
  }
}

export default getRequestConfig(async ({ requestLocale }) => {
  // next-intl v4 resolves the locale asynchronously (and it can be undefined
  // for routes outside a [locale] segment) — fall back to English.
  const locale = (await requestLocale) ?? "en";
  return {
    locale,
    messages: await loadMessages(locale),
    timeZone: "UTC",
  };
});
