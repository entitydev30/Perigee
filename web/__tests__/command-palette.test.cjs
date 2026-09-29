// command-palette.test.cjs — unit tests for the WEB-52 / #185 command palette
//
// Covers the pure helpers in lib/command-palette.ts (mirrored below, following
// the repo's convention in upload-zone.test.cjs) and asserts that the palette
// component is wired into the app: cmdk dialog, ⌘K hotkey, global mount, and
// header triggers.
//
// Runs with: node --test ./__tests__/command-palette.test.cjs

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WEB_ROOT = path.join(__dirname, '..');

function readWebFile(relPath) {
  return fs.readFileSync(path.join(WEB_ROOT, relPath), 'utf8');
}

// ── Mirror helpers (lib/command-palette.ts) ──────────────────────────────────

const RECENT_VAULTS_LIMIT = 5;
const VAULT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{3,63}$/;

/** Mirrors isVaultIdLike() */
function isVaultIdLike(query) {
  return VAULT_ID_PATTERN.test(query.trim());
}

/** Mirrors vaultHref() */
function vaultHref(id) {
  return `/vault/${encodeURIComponent(id.trim())}`;
}

/** Mirrors parseRecentVaults() */
function parseRecentVaults(raw) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => typeof entry === 'string' && entry.length > 0);
  } catch {
    return [];
  }
}

/** Mirrors upsertRecentVault() */
function upsertRecentVault(recent, id) {
  const normalized = id.trim();
  if (!normalized) return recent.slice(0, RECENT_VAULTS_LIMIT);
  const withoutDuplicate = recent.filter((entry) => entry !== normalized);
  return [normalized, ...withoutDuplicate].slice(0, RECENT_VAULTS_LIMIT);
}

// ── isVaultIdLike ─────────────────────────────────────────────────────────────

test('isVaultIdLike accepts vault-style identifiers', () => {
  assert.equal(isVaultIdLike('vault-101'), true);
  assert.equal(isVaultIdLike('v_789abc'), true);
  assert.equal(isVaultIdLike('GBRPYHIL2CI3FNQ4BXLFMNDLFJUNPU2HY3ZMFSHONUCEOASW7QC7OX2H'), true);
  assert.equal(isVaultIdLike('  vault-101  '), true); // trimmed input
});

test('isVaultIdLike rejects ordinary search text', () => {
  assert.equal(isVaultIdLike(''), false);
  assert.equal(isVaultIdLike('ab'), false); // too short
  assert.equal(isVaultIdLike('my vault'), false); // spaces
  assert.equal(isVaultIdLike('/vault/x'), false); // path characters
  assert.equal(isVaultIdLike('vault id?'), false); // punctuation
});

// ── vaultHref ─────────────────────────────────────────────────────────────────

test('vaultHref routes to the Pages Router vault detail page', () => {
  assert.equal(vaultHref('vault-101'), '/vault/vault-101');
  assert.equal(vaultHref(' id with space '), '/vault/id%20with%20space');
});

// ── parseRecentVaults ─────────────────────────────────────────────────────────

test('parseRecentVaults reads a well-formed payload', () => {
  assert.deepEqual(parseRecentVaults('["a","b"]'), ['a', 'b']);
});

test('parseRecentVaults tolerates corrupt or missing storage', () => {
  assert.deepEqual(parseRecentVaults(null), []);
  assert.deepEqual(parseRecentVaults(undefined), []);
  assert.deepEqual(parseRecentVaults('not json'), []);
  assert.deepEqual(parseRecentVaults('{"not":"an array"}'), []);
  assert.deepEqual(parseRecentVaults('[1, null, "", "keep"]'), ['keep']);
});

// ── upsertRecentVault ─────────────────────────────────────────────────────────

test('upsertRecentVault moves an id to the front and de-duplicates', () => {
  assert.deepEqual(upsertRecentVault(['a', 'b'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(upsertRecentVault(['a', 'b', 'c'], 'b'), ['b', 'a', 'c']);
});

test('upsertRecentVault caps the list and trims ids', () => {
  const recent = ['1', '2', '3', '4', '5'];
  const result = upsertRecentVault(recent, '  6  ');
  assert.equal(result.length, RECENT_VAULTS_LIMIT);
  assert.equal(result[0], '6');
  assert.equal(upsertRecentVault(recent, '').length, RECENT_VAULTS_LIMIT);
});

// ── Component wiring ──────────────────────────────────────────────────────────

test('CommandPalette component is built on cmdk with the ⌘K/Ctrl+K hotkey', () => {
  const source = readWebFile(path.join('components', 'CommandPalette.tsx'));

  assert.match(source, /from "cmdk"/, 'palette must import cmdk');
  assert.match(source, /Command\.Dialog/, 'palette must render a cmdk dialog');
  assert.match(source, /event\.metaKey \|\| event\.ctrlKey/, 'hotkey must support Cmd and Ctrl');
  assert.match(source, /=== "k"/, 'hotkey listener must match the K key');
  assert.match(
    source,
    /PALETTE_OPEN_EVENT/,
    'palette must listen for the trigger window event',
  );
  assert.ok(
    source.includes('isVaultIdLike'),
    'palette must offer open-vault-by-ID for vault-like queries',
  );
  assert.ok(
    source.includes('parseRecentVaults') && source.includes('upsertRecentVault'),
    'palette must surface recently opened vaults',
  );
});

test('palette is mounted globally from pages/_app.tsx', () => {
  const source = readWebFile(path.join('pages', '_app.tsx'));
  assert.ok(
    source.includes('import { CommandPalette }'),
    '_app.tsx must import the palette',
  );
  assert.match(
    source,
    /<CommandPalette \/>/,
    '_app.tsx must render the palette once for every route',
  );
});

test('home and vault pages expose a visible palette trigger', () => {
  for (const page of [path.join('pages', 'index.tsx'), path.join('pages', 'vault', '[id].tsx')]) {
    const source = readWebFile(page);
    assert.ok(
      source.includes('CommandPaletteTrigger'),
      `${page} must render the palette trigger`,
    );
  }
});

test('cmdk is declared as a dependency', () => {
  const pkg = JSON.parse(readWebFile('package.json'));
  assert.ok(pkg.dependencies && pkg.dependencies.cmdk, 'cmdk must be in dependencies');
});
