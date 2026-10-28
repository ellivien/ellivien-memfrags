// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { normaliseFragments } = require('../memory-fragment-utils.cjs');

function normaliseStoredRows(rows, source) {
  if (!Array.isArray(rows) || !rows.every(row => (
    row && typeof row === 'object' && !Array.isArray(row) &&
    (row.category == null || typeof row.category === 'string') &&
    Array.isArray(row.triggers) &&
    row.triggers.every(trigger => typeof trigger === 'string') &&
    row.triggers.some(trigger => trigger.trim()) &&
    typeof row.definition === 'string' && Boolean(row.definition.trim())
  ))) {
    throw new Error(`${source} returned an invalid fragment library`);
  }
  return normaliseFragments(rows);
}

function createLiveMemoryStore(options = {}) {
  const loadFragments = options.loadFragments;
  const saveFragments = options.saveFragments;
  const cacheTtlMs = Number.isFinite(options.cacheTtlMs) ? options.cacheTtlMs : 60_000;
  let cache = { loadedAt: 0, fragments: [] };

  if (typeof loadFragments !== 'function') {
    throw new Error('loadFragments() is required and must use the portal\'s existing private storage route');
  }

  return {
    async load({ force = false } = {}) {
      if (!force && Date.now() - cache.loadedAt < cacheTtlMs) return cache.fragments;
      try {
        const fragments = normaliseStoredRows(await loadFragments(), 'loadFragments()');
        cache = { loadedAt: Date.now(), fragments };
        return fragments;
      } catch (error) {
        if (typeof options.onLoadError === 'function') options.onLoadError(error);
        return cache.fragments;
      }
    },

    async save(fragments) {
      if (typeof saveFragments !== 'function') {
        throw new Error('This adapter is read-only because saveFragments() was not supplied');
      }
      const normalised = normaliseFragments(fragments);
      const result = await saveFragments(normalised);
      if (result?.success === false) {
        throw new Error('saveFragments() did not confirm that the library was saved');
      }
      let saved;
      if (Array.isArray(result?.fragments)) {
        saved = normaliseStoredRows(result.fragments, 'saveFragments()');
      } else if (Array.isArray(result)) {
        saved = normaliseStoredRows(result, 'saveFragments()');
      } else if (result?.success === true) {
        saved = normalised;
      } else {
        throw new Error('saveFragments() did not confirm that the library was saved');
      }
      cache = { loadedAt: Date.now(), fragments: saved };
      return saved;
    },

    clearCache() {
      cache = { loadedAt: 0, fragments: [] };
    }
  };
}

module.exports = { createLiveMemoryStore };
