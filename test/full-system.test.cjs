// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { buildMemoryFragmentContext } = require('../src/memory-fragment-utils.cjs');
const { createLiveMemoryStore } = require('../src/server/live-memory-store.cjs');
const { createExistingHttpMemoryStore } = require('../examples/server/use-existing-http-store.cjs');

test('browser editor requires an adopter-supplied authenticated storage route', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/browser/memfrags-editor.js'), 'utf8');
  assert.match(source, /textContent: 'Ellivien MemFrags'/);
  assert.match(source, /textContent: 'Powered by Ellivien ✨'/);
  assert.match(source, /requires the portal\\'s authenticated memory-fragment API URL/);
  assert.match(source, /Array\.isArray\(data\.fragments\).*submitted/);
  assert.doesNotMatch(source, /MEMFRAGS_(?:WORKER|SYNC|KV)/);
});

test('generic HTTP adapter supports stores that acknowledge saves without repeating rows', async () => {
  const calls = [];
  const stored = [{ category: 'pets', triggers: ['Juniper'], definition: 'Juniper is a fictional fox.' }];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });
    if ((options.method || 'GET') === 'GET') {
      return { ok: true, status: 200, json: async () => ({ fragments: stored }) };
    }
    return { ok: true, status: 200, json: async () => ({ success: true, count: 1 }) };
  };
  const store = createExistingHttpMemoryStore({
    storeUrl: 'https://private-store.example/api/memory-fragments',
    getHeaders: () => ({ Authorization: 'Bearer synthetic-test-token' }),
    fetchImpl,
    cacheTtlMs: 0
  });

  assert.deepEqual(await store.load(), stored);
  assert.deepEqual(await store.save(stored), stored);
  assert.equal(calls[0].url, 'https://private-store.example/api/memory-fragments');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer synthetic-test-token');
  assert.equal(calls[1].options.method, 'POST');
  assert.deepEqual(JSON.parse(calls[1].options.body), { fragments: stored });
});

test('live store reads the existing portal library and injects a matching fragment', async () => {
  let saved = [{
    category: 'people',
    triggers: ['Juniper', 'little fox'],
    definition: 'Juniper is a fictional fox.'
  }];
  const store = createLiveMemoryStore({
    loadFragments: async () => saved,
    saveFragments: async fragments => {
      saved = fragments;
      return saved;
    },
    cacheTtlMs: 60_000
  });

  const result = buildMemoryFragmentContext(
    [{ role: 'user', content: 'Where is Juniper?' }],
    await store.load()
  );
  assert.equal(result.used, true);
  assert.match(result.systemBlock, /Juniper is a fictional fox/);
});

test('live store saves through the supplied existing storage adapter', async () => {
  let saved = [];
  const store = createLiveMemoryStore({
    loadFragments: async () => saved,
    saveFragments: async fragments => {
      saved = fragments;
      return saved;
    }
  });
  const next = [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
  assert.deepEqual(await store.save(next), next);
  assert.deepEqual(await store.load(), next);
});

test('live store retains submitted rows when storage acknowledges without repeating them', async () => {
  const rows = [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
  const store = createLiveMemoryStore({
    loadFragments: async () => [],
    saveFragments: async () => ({ success: true, count: 1 })
  });
  assert.deepEqual(await store.save(rows), rows);
  assert.deepEqual(await store.load(), rows);
});

test('live store falls back to its cached library during a temporary failure', async () => {
  let fail = false;
  const store = createLiveMemoryStore({
    cacheTtlMs: 0,
    loadFragments: async () => {
      if (fail) throw new Error('temporary outage');
      return [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
    }
  });
  assert.equal((await store.load()).length, 1);
  fail = true;
  assert.equal((await store.load({ force: true })).length, 1);
});

test('repository contains no dedicated MemFrags backend package', () => {
  const deployDirectory = path.join(__dirname, '../deploy');
  function listFiles(directory) {
    if (!fs.existsSync(directory)) return [];
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
      const target = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(target) : [target];
    });
  }
  assert.deepEqual(listFiles(deployDirectory), []);
  assert.deepEqual(
    fs.readdirSync(path.join(__dirname, '../src/server')).sort(),
    ['live-memory-store.cjs']
  );

  const docs = ['README.md', 'INSTALL-WITH-AI.md', 'FULL-SYSTEM-INSTALL.md', 'SECURITY.md']
    .map(filename => fs.readFileSync(path.join(__dirname, '..', filename), 'utf8'))
    .join('\n');
  assert.doesNotMatch(docs, /MEMFRAGS_(?:KV|WORKER|SYNC)/);
});
