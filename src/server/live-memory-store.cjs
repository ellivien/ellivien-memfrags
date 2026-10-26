// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { normaliseFragments } = require('../memory-fragment-utils.cjs');

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
        const fragments = normaliseFragments(await loadFragments());
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
      const saved = result?.success === true && !Array.isArray(result?.fragments)
        ? normalised
        : normaliseFragments(result?.fragments ?? result);
      cache = { loadedAt: Date.now(), fragments: saved };
      return saved;
    },

    clearCache() {
      cache = { loadedAt: 0, fragments: [] };
    }
  };
}

module.exports = { createLiveMemoryStore };
