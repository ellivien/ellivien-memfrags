// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { buildMemoryFragmentContext } = require('../src/memory-fragment-utils.cjs');
const fragments = require('./fragments.example.json');

function addMemFragsToAnthropicSystem(system, messages) {
  const result = buildMemoryFragmentContext(messages, fragments);
  if (!result.used) return system;

  return [system, result.systemBlock].filter(Boolean).join('\n\n');
}

module.exports = { addMemFragsToAnthropicSystem };
