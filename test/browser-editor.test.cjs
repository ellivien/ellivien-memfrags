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
  remove() {
    const disconnect = node => {
      node.isConnected = false;
      node.children.forEach(disconnect);
    };
    disconnect(this);
  }
  set innerHTML(value) { if (value === '') this.children = []; }
  get innerHTML() { return ''; }
}

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function createEditorHarness(fetchImpl) {
  const body = new FakeElement('body');
  const listeners = new Map();
  const document = {
    body,
    createElement: tagName => new FakeElement(tagName),
    getElementById(id) {
      return descendants(body).find(node => node.isConnected && node.id === id) || null;
    }
  };
  const window = {
    document,
    fetch: fetchImpl,
    confirm: () => true,
    addEventListener(type, listener) {
      const registered = listeners.get(type) || new Set();
      registered.add(listener);
      listeners.set(type, registered);
    },
    removeEventListener(type, listener) {
      listeners.get(type)?.delete(listener);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) || []) listener(event);
    }
  };
  window.window = window;
  const source = fs.readFileSync(
    path.join(__dirname, '../src/browser/memfrags-editor.js'),
    'utf8'
  );
  vm.runInNewContext(source, window);
  const find = predicate => descendants(body).find(node => node.isConnected && predicate(node));
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

test('editor rejects an explicit failed load even when it includes an empty fragment array', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: false, error: 'Temporary load failure', fragments: [] })
    };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  assert.equal(save.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, 'GET');
});

test('editor rejects an error-bearing load without a success flag', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ error: 'Temporary load failure', fragments: [] })
    };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  assert.equal(save.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
});

test('editor rejects a contradictory count in a successful load', async () => {
  const calls = [];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    return {
      ok: true,
      status: 200,
      json: async () => ({ success: true, fragments: [], count: 1 })
    };
  });

  await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const save = harness.find(node => node.textContent === 'Save live');
  assert.equal(save.disabled, true);
  await save.onclick();
  assert.equal(calls.length, 1);
});

test('editor rejects non-boolean success flags on load', async () => {
  for (const success of ['false', 0, null]) {
    const calls = [];
    const harness = createEditorHarness(async (url, options = {}) => {
      calls.push({ url, options });
      return {
        ok: true,
        status: 200,
        json: async () => ({ success, fragments: [] })
      };
    });

    await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
    const save = harness.find(node => node.textContent === 'Save live');
    assert.equal(save.disabled, true);
    await save.onclick();
    assert.equal(calls.length, 1);
  }
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

test('editor cannot close and reopen the same endpoint around a pending save', async () => {
  let resolveSave;
  const calls = [];
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library'],
    definition: 'A fictional library used in a synthetic test.'
  }];
  const harness = createEditorHarness(async (url, options = {}) => {
    calls.push({ url, options });
    if (options.method === 'POST') {
      return new Promise(resolve => { resolveSave = resolve; });
    }
    return { ok: true, status: 200, json: async () => ({ fragments }) };
  });

  const first = await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  const pending = harness.find(node => node.textContent === 'Save live').onclick();
  harness.find(node => node.textContent === 'Close').onclick();
  assert.equal(first.isConnected, true);
  first.onclick({ target: first });
  assert.equal(first.isConnected, true);
  harness.window.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(first.isConnected, true);

  const reopened = await harness.window.EllivienMemFragsEditor.show({ apiUrl: '/private/memory-fragments' });
  assert.equal(reopened, first);
  assert.equal(calls.length, 2);
  assert.equal(calls.filter(call => call.options.method === 'POST').length, 1);

  resolveSave({ ok: true, status: 200, json: async () => ({ success: true, count: 1 }) });
  await pending;
  harness.window.dispatchEvent({ type: 'keydown', key: 'Escape' });
  assert.equal(first.isConnected, false);
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

test('editor rejects a malformed fragments field in a successful save response', async () => {
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
        json: async () => ({ success: true, fragments: 'invalid-library', count: 0 })
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
  assert.match(
    harness.find(node => node.role === 'status').textContent,
    /invalid fragment library/
  );
});

test('editor rejects non-boolean success flags on save without invoking onSaved', async () => {
  const fragments = [{
    category: 'places',
    triggers: ['Lantern Library'],
    definition: 'A fictional library used in a synthetic test.'
  }];

  for (const success of ['false', 0, null]) {
    let savedCalls = 0;
    const harness = createEditorHarness(async (url, options = {}) => {
      if (options.method === 'POST') {
        return { ok: true, status: 200, json: async () => ({ success, fragments: [] }) };
      }
      return { ok: true, status: 200, json: async () => ({ fragments }) };
    });

    await harness.window.EllivienMemFragsEditor.show({
      apiUrl: '/private/memory-fragments',
      onSaved: () => { savedCalls += 1; }
    });
    await harness.find(node => node.textContent === 'Save live').onclick();
    assert.equal(savedCalls, 0);
    assert.equal(
      harness.find(node => node.ariaLabel === 'Definition').value,
      fragments[0].definition
    );
  }
});
