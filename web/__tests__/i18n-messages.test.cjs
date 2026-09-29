// i18n-messages.test.cjs — guards the flat→nested message conversion
//
// messages/en.json uses flat dotted keys ("home.title": "…"), while the
// installed use-intl v4 resolves dotted keys as NESTED paths. nestMessages()
// converts the file at the next-intl boundaries; without it every prerendered
// page logs MISSING_MESSAGE and ships raw keys as UI copy.
//
// Runs with: node --test ./__tests__/i18n-messages.test.cjs

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WEB_ROOT = path.join(__dirname, '..');

function readWebFile(relPath) {
  return fs.readFileSync(path.join(WEB_ROOT, relPath), 'utf8');
}

// ── Mirror of lib/messages.ts → nestMessages() ────────────────────────────────

function nestMessages(flat) {
  const nested = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split('.');
    let node = nested;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const part = parts[i];
      const existing = node[part];
      if (typeof existing !== 'object' || existing === null) {
        node[part] = {};
      }
      node = node[part];
    }
    node[parts[parts.length - 1]] = value;
  }
  return nested;
}

// ── Behaviour ─────────────────────────────────────────────────────────────────

test('nestMessages converts flat dotted keys into nested paths', () => {
  const nested = nestMessages({
    'home.title': 'Perigee',
    'home.description': 'Autonomous portfolio management',
    'app.name': 'Perigee',
  });
  assert.deepEqual(nested, {
    home: { title: 'Perigee', description: 'Autonomous portfolio management' },
    app: { name: 'Perigee' },
  });
});

test('nestMessages keeps siblings under shared namespaces', () => {
  const nested = nestMessages({
    'nav.home': 'Home',
    'nav.vaults': 'Vaults',
    'nav.admin': 'Admin',
  });
  assert.deepEqual(nested.nav, { home: 'Home', vaults: 'Vaults', admin: 'Admin' });
});

// ── en.json is safe to nest ───────────────────────────────────────────────────

test('en.json has no leaf/branch key collisions and only string values', () => {
  const flat = JSON.parse(readWebFile(path.join('messages', 'en.json')));
  const keys = Object.keys(flat);

  for (const key of keys) {
    assert.equal(typeof flat[key], 'string', `${key} must be a string value`);
    assert.ok(key.includes('.'), `${key} must be a dotted key`);
  }

  const collisions = keys.filter((key) =>
    keys.some((other) => other !== key && other.startsWith(`${key}.`)),
  );
  assert.deepEqual(collisions, [], 'no key may be a dotted prefix of another');
});

// ── Wiring: both next-intl boundaries nest before handing messages over ───────

test('pages/_app.tsx nests default messages before passing them to next-intl', () => {
  const source = readWebFile(path.join('pages', '_app.tsx'));
  assert.ok(
    source.includes('import { nestMessages } from "../lib/messages"'),
    '_app.tsx must import nestMessages',
  );
  assert.match(
    source,
    /const defaultMessages = nestMessages\(rawMessages\)/,
    '_app.tsx must nest the flat en.json payload',
  );
});

test('lib/i18n.ts nests messages (including manager overrides) for the server config', () => {
  const source = readWebFile(path.join('lib', 'i18n.ts'));
  assert.ok(
    source.includes('nestMessages'),
    'lib/i18n.ts must convert messages with nestMessages',
  );
  assert.match(
    source,
    /return nestMessages\(merged\)/,
    'manager overrides must be merged flat and then nested',
  );
});
