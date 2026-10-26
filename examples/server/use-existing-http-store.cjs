// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { createLiveMemoryStore } = require('../../src/server/live-memory-store.cjs');

function createExistingHttpMemoryStore(options = {}) {
  const storeUrl = String(options.storeUrl || '').replace(/\/+$/, '');
  const getHeaders = options.getHeaders || (() => ({}));
  const fetchImpl = options.fetchImpl || globalThis.fetch;

  if (!storeUrl) throw new Error('The portal\'s existing private memory-store URL is required.');
  if (typeof getHeaders !== 'function') throw new Error('getHeaders must be a function.');
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');

  async function request(method, fragments) {
    const response = await fetchImpl(storeUrl, {
      method,
      headers: {
        ...getHeaders(),
        ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {})
      },
      body: method === 'POST' ? JSON.stringify({ fragments }) : undefined
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `Existing memory store returned ${response.status}`);

    // Some stores acknowledge a successful save without repeating the rows.
    // In that case, retain the canonical rows that were just submitted.
    return Array.isArray(data.fragments) ? data.fragments : fragments || [];
  }

  return createLiveMemoryStore({
    loadFragments: () => request('GET'),
    saveFragments: fragments => request('POST', fragments),
    cacheTtlMs: options.cacheTtlMs,
    onLoadError: options.onLoadError
  });
}

module.exports = { createExistingHttpMemoryStore };
