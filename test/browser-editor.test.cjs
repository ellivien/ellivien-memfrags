// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName;
    this.children = [];
    this.style = {};
    this.isConnected = true;
    this.disabled = false;
  }

  append(...children) { this.children.push(...children); }
  appendChild(child) { this.children.push(child); return child; }
  remove() { this.isConnected = false; }
  set innerHTML(value) { if (value === '') this.children = []; }
  get innerHTML() { return ''; }
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function createEditorHarness(fetchImpl) {
  const body = new FakeElement('body');
  const document = {
    body,
    createElement: tagName => new FakeElement(tagName),
    getElementById(id) {
      return descendants(body).find(node => node.id === id) || null;
    }
  };
  const window = {
    document,
    fetch: fetchImpl,
    confirm: () => true,
    addEventListener() {}
  };
  window.window = window;
  const source = fs.readFileSync(
    path.join(__dirname, '../src/browser/memfrags-editor.js'),
    'utf8'
  );
  vm.runInNewContext(source, window);
  const find = predicate => descendants(body).find(predicate);
  return { window, find };
}

test('editor cannot erase the library after its initial load fails', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: false, status: 503, json: async () => ({ error: 'Store unavailable' }) };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  const add = harness.find(node => node.textContent === '+ add memory fragment');
  assert.equal(save.disabled, true);
  assert.equal(add.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
});

test('editor treats a successful HTTP response without a fragment array as a failed load', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return { ok: true, status: 200, json: async () => ({}) };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  assert.equal(save.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
});

test('editor keeps saving locked when the loaded library contains malformed rows', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({
        fragments: [{ definition: 'Existing row', triggers: 'legacy-trigger' }]
      })
    };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  assert.equal(save.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
});

test('editor accepts an explicit empty fragment library', async () => {
  const harness = createEditorHarness(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ fragments: [] })
  }));

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  assert.equal(harness.find(node => node.textContent === 'Save live').disabled, false);
  assert.equal(harness.find(node => node.textContent === '+ add memory fragment').disabled, false);
});

test('editor freezes every mutating control while a save is pending', async () => {
  let resolveSave;
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library'],
    definition: 'A fictional library used in a synthetic test.'
  }];
  const harness = createEditorHarness(async (url, options = {}) => {
    if (options.method === 'POST') {
      return new Promise(resolve => { resolveSave = resolve; });
    }
    return { ok: true, status: 200, json: async () => ({ fragments }) };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  const pending = save.onclick();

  assert.equal(harness.find(node => node.textContent === '+ add memory fragment').disabled, true);
  assert.equal(harness.find(node => node.ariaLabel === 'Category').disabled, true);
  assert.equal(harness.find(node => node.ariaLabel === 'Triggers').disabled, true);
  assert.equal(harness.find(node => node.ariaLabel === 'Definition').disabled, true);
  assert.equal(harness.find(node => node.ariaLabel === 'Delete memory fragment').disabled, true);

  resolveSave({ ok: true, status: 200, json: async () => ({ success: true, count: 1 }) });
  await pending;
  assert.equal(harness.find(node => node.textContent === '+ add memory fragment').disabled, false);
  assert.equal(harness.find(node => node.ariaLabel === 'Definition').disabled, false);
});

test('editor rejects an unconfirmed save without replacing the loaded rows', async () => {
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library'],
    definition: 'A fictional library used in a synthetic test.'
  }];
  const harness = createEditorHarness(async (url, options = {}) => {
    if (options.method === 'POST') {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: false, fragments: [] })
      };
    }
    return { ok: true, status: 200, json: async () => ({ fragments }) };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  await harness.find(node => node.textContent === 'Save live').onclick();
  assert.equal(
    harness.find(node => node.ariaLabel === 'Definition').value,
    fragments[0].definition
  );
  assert.equal(harness.find(node => node.ariaLabel === 'Definition').disabled, false);
});
