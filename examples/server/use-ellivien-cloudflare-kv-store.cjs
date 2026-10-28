// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { createExistingHttpMemoryStore } = require('./use-existing-http-store.cjs');

function createEllivienCloudflareKvMemoryStore(options = {}) {
  const workerUrl = String(
    options.workerUrl || process.env.CLOUDFLARE_SYNC_WORKER_URL || ''
  ).replace(/\/+$/, '');
  const syncToken = String(
    options.syncToken || process.env.CLOUDFLARE_SYNC_TOKEN || ''
  ).trim();

  if (!workerUrl || !syncToken) {
    throw new Error(
      'The existing Ellivien Cloudflare Worker URL and sync token are required.'
    );
  }

  return createExistingHttpMemoryStore({
    storeUrl: `${workerUrl}/api/memory-fragments`,
    getHeaders: () => ({ Authorization: `Bearer ${syncToken}` }),
    fetchImpl: options.fetchImpl,
    cacheTtlMs: options.cacheTtlMs,
    onLoadError: options.onLoadError
  });
}

module.exports = { createEllivienCloudflareKvMemoryStore };
