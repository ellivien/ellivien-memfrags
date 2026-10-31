// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { createLiveMemoryStore } = require('../../src/server/live-memory-store.cjs');

function owns(value, key) {
  return Boolean(
    value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)
  );
}

function reportedError(value) {
  if (!owns(value, 'error')) return '';
  if (typeof value.error === 'string') return value.error.trim();
  return value.error ? 'Existing memory store reported an error.' : '';
}

function validateResponseCount(value, expected) {
  if (owns(value, 'count') && (!Number.isInteger(value.count) || value.count !== expected)) {
    throw new Error('Existing memory store returned a contradictory saved-fragment count.');
  }
}

function validateSuccessFlag(value) {
  if (owns(value, 'success') && typeof value.success !== 'boolean') {
    throw new Error('Existing memory store returned an invalid success flag.');
  }
}

function validateFragmentRows(rows) {
  if (!Array.isArray(rows) || !rows.every(row => (
    row && typeof row === 'object' && !Array.isArray(row) &&
    (row.category == null || typeof row.category === 'string') &&
    Array.isArray(row.triggers) &&
    row.triggers.every(trigger => typeof trigger === 'string') &&
    row.triggers.some(trigger => trigger.trim()) &&
    typeof row.definition === 'string' && Boolean(row.definition.trim())
  ))) {
    throw new Error('Existing memory store returned an invalid fragment library.');
  }
  return rows;
}

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
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Existing memory store returned invalid JSON.');
    }
    if (!response.ok) throw new Error(data?.error || `Existing memory store returned ${response.status}`);
    validateSuccessFlag(data);
    const storageError = reportedError(data);
    if (data?.success === false || storageError) {
      throw new Error(storageError || (method === 'GET'
        ? 'Existing memory store did not return the saved library.'
        : 'Existing memory store did not confirm that the library was saved.'));
    }

    if (method === 'GET') {
      const loaded = validateFragmentRows(data.fragments);
      validateResponseCount(data, loaded.length);
      return loaded;
    }

    // Some stores acknowledge a successful save without repeating the rows.
    // In that case, retain the canonical rows that were just submitted.
    if (owns(data, 'fragments')) {
      const saved = validateFragmentRows(data.fragments);
      validateResponseCount(data, saved.length);
      return saved;
    }
    if (data?.success === true) {
      validateResponseCount(data, fragments.length);
      return fragments;
    }
    throw new Error('Existing memory store did not confirm that the library was saved.');
  }

  return createLiveMemoryStore({
    loadFragments: () => request('GET'),
    saveFragments: fragments => request('POST', fragments),
    cacheTtlMs: options.cacheTtlMs,
    onLoadError: options.onLoadError
  });
}

module.exports = { createExistingHttpMemoryStore };
