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
const {
  createEllivienCloudflareKvMemoryStore
} = require('../examples/server/use-ellivien-cloudflare-kv-store.cjs');

test('browser editor requires an adopter-supplied authenticated storage route', () => {
  const source = fs.readFileSync(path.join(__dirname, '../src/browser/memfrags-editor.js'), 'utf8');
  assert.match(source, /textContent: 'Ellivien MemFrags'/);
  assert.match(source, /textContent: 'Powered by Ellivien ✨'/);
  assert.match(source, /requires the portal\\'s authenticated memory-fragment API URL/);
  assert.match(source, /if \(method === 'GET'\)/);
  assert.match(source, /if \(data\.success === true\) return submitted/);
  assert.match(source, /did not confirm that the library was saved/);
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

test('generic HTTP adapter rejects malformed loads and unconfirmed saves', async () => {
  let malformed = false;
  const cached = [{ category: '', triggers: ['synthetic'], definition: 'Synthetic.' }];
  const malformedLoad = createExistingHttpMemoryStore({
    storeUrl: 'https://private-store.example/api/memory-fragments',
    cacheTtlMs: 0,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => malformed ? ({}) : ({ fragments: cached })
    })
  });
  assert.deepEqual(await malformedLoad.load({ force: true }), cached);
  malformed = true;
  assert.deepEqual(await malformedLoad.load({ force: true }), cached);

  const unconfirmedSave = createExistingHttpMemoryStore({
    storeUrl: 'https://private-store.example/api/memory-fragments',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false })
    })
  });
  await assert.rejects(
    unconfirmedSave.save([{ category: '', triggers: ['synthetic'], definition: 'Synthetic.' }]),
    /did not confirm/
  );

  const contradictorySave = createExistingHttpMemoryStore({
    storeUrl: 'https://private-store.example/api/memory-fragments',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: false, fragments: [] })
    })
  });
  await assert.rejects(
    contradictorySave.save([{ category: '', triggers: ['synthetic'], definition: 'Synthetic.' }]),
    /did not confirm/
  );

  const malformedSave = createExistingHttpMemoryStore({
    storeUrl: 'https://private-store.example/api/memory-fragments',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        fragments: [{ definition: 'Existing row', triggers: 'legacy-trigger' }]
      })
    })
  });
  await assert.rejects(
    malformedSave.save([{ category: '', triggers: ['synthetic'], definition: 'Synthetic.' }]),
    /invalid fragment library/
  );
});

test('primary Ellivien adapter reuses the existing Worker URL and sync token', async () => {
  const calls = [];
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library'],
    definition: 'A fictional library used in a synthetic test.'
  }];
  const store = createEllivienCloudflareKvMemoryStore({
    workerUrl: 'https://existing-worker.example',
    syncToken: 'synthetic-existing-sync-token',
    cacheTtlMs: 0,
    fetchImpl: async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ fragments })
      };
    }
  });

  assert.deepEqual(await store.load(), fragments);
  assert.equal(calls[0].url, 'https://existing-worker.example/api/memory-fragments');
  assert.equal(
    calls[0].options.headers.Authorization,
    'Bearer synthetic-existing-sync-token'
  );
});

test('Ellivien integration adds one key and route to existing PORTAL_STORAGE', () => {
  const integrationRoot = path.join(__dirname, '../integrations/ellivien-portal');
  const route = fs.readFileSync(
    path.join(integrationRoot, 'cloudflare-worker-memory-fragments-route.txt'),
    'utf8'
  );
  const hook = fs.readFileSync(
    path.join(integrationRoot, 'browser-editor-hook.txt'),
    'utf8'
  );
  const guide = fs.readFileSync(path.join(integrationRoot, 'README.md'), 'utf8');

  assert.match(route, /env\.PORTAL_STORAGE\.get\('memory-fragments'\)/);
  assert.match(route, /env\.PORTAL_STORAGE\.put\('memory-fragments'/);
  assert.doesNotMatch(route, /namespace_id|account_id|MEMFRAGS_(?:WORKER|SYNC|KV)/);
  assert.match(hook, /CLOUDFLARE_WORKER_BASE_URL/);
  assert.match(hook, /buildPortalAuthHeaders/);
  assert.match(guide, /Do not create a second Worker, KV namespace/);
});

test('supplied Ellivien Worker route persists and reloads a live fragment library', async () => {
  const routeFile = fs.readFileSync(
    path.join(
      __dirname,
      '../integrations/ellivien-portal/cloudflare-worker-memory-fragments-route.txt'
    ),
    'utf8'
  );
  const routeSource = routeFile.slice(routeFile.indexOf("if (url.pathname === '/api/memory-fragments')"));
  const runRoute = new Function(
    'url',
    'request',
    'env',
    'jsonResponse',
    `return (async () => { ${routeSource} })();`
  );
  const values = new Map();
  const env = {
    PORTAL_STORAGE: {
      async get(key) { return values.get(key) ?? null; },
      async put(key, value) { values.set(key, value); }
    }
  };
  const jsonResponse = (body, status = 200) => ({ body, status });
  const url = { pathname: '/api/memory-fragments' };
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library', 'the lantern library'],
    definition: 'A fictional library used in a synthetic test.'
  }];

  assert.deepEqual(
    await runRoute(url, { method: 'GET' }, env, jsonResponse),
    { body: { fragments: [] }, status: 200 }
  );
  assert.deepEqual(
    await runRoute(url, {
      method: 'POST',
      async json() { return { fragments }; }
    }, env, jsonResponse),
    { body: { success: true, count: 1 }, status: 200 }
  );
  assert.deepEqual(
    await runRoute(url, { method: 'GET' }, env, jsonResponse),
    { body: { fragments }, status: 200 }
  );
  assert.deepEqual(
    await runRoute(url, {
      method: 'POST',
      async json() { return {}; }
    }, env, jsonResponse),
    {
      body: { error: 'Memory fragments request must contain a fragments array.' },
      status: 400
    }
  );
  assert.deepEqual(JSON.parse(values.get('memory-fragments')), { fragments });
});

test('primary documentation identifies Ellivien as the supported fit', () => {
  const readme = fs.readFileSync(path.join(__dirname, '../README.md'), 'utf8');
  const installer = fs.readFileSync(path.join(__dirname, '../INSTALL-WITH-AI.md'), 'utf8');
  const advanced = fs.readFileSync(path.join(__dirname, '../FULL-SYSTEM-INSTALL.md'), 'utf8');

  assert.match(readme, /Best fit: an existing Ellivien portal/);
  assert.match(installer, /Default supported target/);
  assert.match(installer, /existing Ellivien Cloudflare Worker/);
  assert.match(advanced, /Advanced: adapt Ellivien MemFrags to another portal/);
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

test('live store rejects a failed save acknowledgement without replacing its cache', async () => {
  const rows = [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
  const store = createLiveMemoryStore({
    loadFragments: async () => rows,
    saveFragments: async () => ({ success: false })
  });
  assert.deepEqual(await store.load(), rows);
  await assert.rejects(store.save([]), /did not confirm/);
  assert.deepEqual(await store.load(), rows);
});

test('live store rejects malformed returned rows without replacing its cache', async () => {
  const rows = [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
  const store = createLiveMemoryStore({
    loadFragments: async () => rows,
    saveFragments: async () => ({
      fragments: [{ definition: 'Existing row', triggers: 'legacy-trigger' }]
    })
  });
  assert.deepEqual(await store.load(), rows);
  await assert.rejects(store.save([]), /invalid fragment library/);
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

test('live store falls back to its cached library when a later load is malformed', async () => {
  const rows = [{ category: 'places', triggers: ['Harbour Room'], definition: 'A quiet reading room.' }];
  let loaded = rows;
  const store = createLiveMemoryStore({
    cacheTtlMs: 0,
    loadFragments: async () => loaded
  });
  assert.deepEqual(await store.load(), rows);
  loaded = [{ definition: 'Existing row', triggers: 'legacy-trigger' }];
  assert.deepEqual(await store.load({ force: true }), rows);
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
