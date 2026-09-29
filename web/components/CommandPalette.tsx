"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Command } from "cmdk";
import {
  CornerDownLeft,
  History,
  Home,
  Search,
  UserPlus,
  Users,
  Vault,
  type LucideIcon,
} from "lucide-react";
import {
  PALETTE_OPEN_EVENT,
  RECENT_VAULTS_KEY,
  isVaultIdLike,
  parseRecentVaults,
  upsertRecentVault,
  vaultHref,
} from "../lib/command-palette";

/**
 * Global command palette (WEB-52 / #185).
 *
 * Opened with ⌘K / Ctrl+K anywhere in the app, or by dispatching
 * `PALETTE_OPEN_EVENT` (see `CommandPaletteTrigger`). Lets power users jump
 * between pages and open vaults by ID without touching the mouse.
 *
 * Labels are intentionally plain English: the palette is mounted from
 * `_app.tsx`, where next-intl messages are not guaranteed to be loaded for
 * every route yet.
 */

interface NavCommand {
  id: string;
  label: string;
  hint: string;
  href: string;
  /** Filterable value — keywords are matched by cmdk's fuzzy filter. */
  value: string;
  Icon: LucideIcon;
}

const NAV_COMMANDS: NavCommand[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    hint: "contract analyzer",
    href: "/",
    value: "dashboard home contract analyzer soroban simulate",
    Icon: Home,
  },
  {
    id: "admin-managers",
    label: "Admin · Managers",
    hint: "white-label",
    href: "/admin/managers",
    value: "admin managers white-label approvals",
    Icon: Users,
  },
  {
    id: "onboarding",
    label: "Manager onboarding",
    hint: "register",
    href: "/managers/onboarding",
    value: "manager onboarding register signup",
    Icon: UserPlus,
  },
];

const ITEM_CLASSES =
  "flex cursor-pointer select-none items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-300 outline-none aria-selected:bg-slate-800 aria-selected:text-slate-50";

const GROUP_CLASSES =
  "[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-slate-500";

/** "⌘" on Apple platforms, "Ctrl" elsewhere. Resolved after mount for SSR. */
function useModKeyLabel(): string {
  const [label, setLabel] = useState("⌘");

  useEffect(() => {
    const platform = navigator.platform || navigator.userAgent;
    if (!/Mac|iPhone|iPad|iPod/.test(platform)) setLabel("Ctrl");
  }, []);

  return label;
}

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recentVaults, setRecentVaults] = useState<string[]>([]);
  const modKey = useModKeyLabel();

  // ⌘K / Ctrl+K toggles the palette; triggers open it via a window event.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    };
    const onOpenRequest = () => setOpen(true);

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(PALETTE_OPEN_EVENT, onOpenRequest);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(PALETTE_OPEN_EVENT, onOpenRequest);
    };
  }, []);

  // Reset the query and refresh recent vaults each time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    try {
      setRecentVaults(
        parseRecentVaults(window.localStorage.getItem(RECENT_VAULTS_KEY)),
      );
    } catch {
      setRecentVaults([]);
    }
  }, [open]);

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      void router.push(href);
    },
    [router],
  );

  const openVault = useCallback(
    (id: string) => {
      try {
        const recent = parseRecentVaults(
          window.localStorage.getItem(RECENT_VAULTS_KEY),
        );
        window.localStorage.setItem(
          RECENT_VAULTS_KEY,
          JSON.stringify(upsertRecentVault(recent, id)),
        );
      } catch {
        // Storage may be unavailable (private mode) — navigation still works.
      }
      navigate(vaultHref(id));
    },
    [navigate],
  );

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) setQuery("");
  }, []);

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Global command palette"
      overlayClassName="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-2rem)] max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/50"
      className="flex max-h-[70vh] flex-col"
    >
      <div className="flex items-center gap-3 border-b border-slate-800 px-4">
        <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <Command.Input
          onValueChange={setQuery}
          placeholder="Search pages and vaults…"
          className="h-12 w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
          aria-label="Search pages and vaults"
        />
        <kbd className="hidden shrink-0 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">
          esc
        </kbd>
      </div>

      <Command.List className="max-h-[50vh] overflow-y-auto p-2">
        <Command.Empty className="px-3 py-8 text-center text-sm text-slate-500">
          No results found.
        </Command.Empty>

        <Command.Group heading="Navigate" className={GROUP_CLASSES}>
          {NAV_COMMANDS.map(({ id, label, hint, href, value, Icon }) => (
            <Command.Item
              key={id}
              value={value}
              onSelect={() => navigate(href)}
              className={ITEM_CLASSES}
            >
              <Icon className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
              <span>{label}</span>
              <span className="ml-auto text-xs text-slate-500">{hint}</span>
            </Command.Item>
          ))}
        </Command.Group>

        {(recentVaults.length > 0 || isVaultIdLike(query)) && (
          <Command.Group heading="Vaults" className={GROUP_CLASSES}>
            {recentVaults.map((id) => (
              <Command.Item
                key={id}
                value={`recent vault ${id}`}
                keywords={["vault", "recent", id]}
                onSelect={() => openVault(id)}
                className={ITEM_CLASSES}
              >
                <History className="h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="truncate font-mono text-xs">{id}</span>
                <span className="ml-auto text-[10px] uppercase tracking-wide text-slate-500">
                  recent
                </span>
              </Command.Item>
            ))}

            {isVaultIdLike(query) && (
              <Command.Item
                key={`open-${query}`}
                value={`open vault ${query}`}
                keywords={["vault", "open", query.trim()]}
                onSelect={() => openVault(query)}
                className={ITEM_CLASSES}
              >
                <Vault className="h-4 w-4 shrink-0 text-cyan-400" aria-hidden="true" />
                <span>
                  Open vault{" "}
                  <span className="font-mono text-cyan-300">{query.trim()}</span>
                </span>
                <CornerDownLeft
                  className="ml-auto h-3.5 w-3.5 text-slate-500"
                  aria-hidden="true"
                />
              </Command.Item>
            )}
          </Command.Group>
        )}
      </Command.List>

      <div className="flex items-center justify-between border-t border-slate-800 px-4 py-2 text-[11px] text-slate-500">
        <span>↑↓ to navigate · ↵ to select</span>
        <span>
          press{" "}
          <kbd className="rounded border border-slate-700 px-1 py-0.5 text-[10px]">
            {modKey} K
          </kbd>{" "}
          anywhere
        </span>
      </div>
    </Command.Dialog>
  );
}

/** Header button that opens the global palette. */
export function CommandPaletteTrigger() {
  const modKey = useModKeyLabel();

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(PALETTE_OPEN_EVENT))}
      className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm text-slate-400 transition-colors hover:border-cyan-700 hover:text-slate-200"
      aria-label="Open command palette"
    >
      <Search className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Search…</span>
      <kbd className="rounded border border-slate-700 bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-400">
        {modKey} K
      </kbd>
    </button>
  );
}
