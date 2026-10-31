// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { normaliseFragments } = require('../memory-fragment-utils.cjs');

function owns(value, key) {
  return Boolean(
    value && typeof value === 'object' && Object.prototype.hasOwnProperty.call(value, key)
  );
}

function reportedError(value) {
  if (!owns(value, 'error')) return '';
  if (typeof value.error === 'string') return value.error.trim();
  return value.error ? 'saveFragments() reported an error' : '';
}

function validateSavedCount(result, expected) {
  if (owns(result, 'count') && (!Number.isInteger(result.count) || result.count !== expected)) {
    throw new Error('saveFragments() returned a contradictory saved-fragment count');
  }
}

function validateSuccessFlag(value) {
  if (owns(value, 'success') && typeof value.success !== 'boolean') {
    throw new Error('saveFragments() returned an invalid success flag');
  }
}

function copyFragments(fragments) {
  return fragments.map(fragment => ({
    category: fragment.category,
    triggers: [...fragment.triggers],
    definition: fragment.definition
  }));
}

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
  let cacheRevision = 0;
  let latestLoad = 0;
  let saveQueue = Promise.resolve();

  if (typeof loadFragments !== 'function') {
    throw new Error('loadFragments() is required and must use the portal\'s existing private storage route');
  }

  return {
    async load({ force = false } = {}) {
      if (!force && Date.now() - cache.loadedAt < cacheTtlMs) return copyFragments(cache.fragments);
      const loadId = ++latestLoad;
      const startingRevision = cacheRevision;
      try {
        const fragments = normaliseStoredRows(await loadFragments(), 'loadFragments()');
        if (cacheRevision === startingRevision && loadId === latestLoad) {
          cache = { loadedAt: Date.now(), fragments: copyFragments(fragments) };
          cacheRevision += 1;
        }
        return copyFragments(cache.fragments);
      } catch (error) {
        if (typeof options.onLoadError === 'function') options.onLoadError(error);
        return copyFragments(cache.fragments);
      }
    },

    async save(fragments) {
      if (typeof saveFragments !== 'function') {
        throw new Error('This adapter is read-only because saveFragments() was not supplied');
      }
      const normalised = normaliseFragments(fragments);
      const operation = saveQueue.then(async () => {
        const result = await saveFragments(copyFragments(normalised));
        validateSuccessFlag(result);
        const saveError = reportedError(result);
        if (result?.success === false || saveError) {
          throw new Error(saveError || 'saveFragments() did not confirm that the library was saved');
        }
        let saved;
        if (owns(result, 'fragments')) {
          saved = normaliseStoredRows(result.fragments, 'saveFragments()');
          validateSavedCount(result, saved.length);
        } else if (Array.isArray(result)) {
          saved = normaliseStoredRows(result, 'saveFragments()');
        } else if (result?.success === true) {
          saved = normalised;
          validateSavedCount(result, saved.length);
        } else {
          throw new Error('saveFragments() did not confirm that the library was saved');
        }
        cache = { loadedAt: Date.now(), fragments: copyFragments(saved) };
        cacheRevision += 1;
        return copyFragments(cache.fragments);
      });
      saveQueue = operation.catch(() => {});
      return operation;
    },

    clearCache() {
      cache = { loadedAt: 0, fragments: [] };
      cacheRevision += 1;
    }
  };
}

module.exports = { createLiveMemoryStore };
