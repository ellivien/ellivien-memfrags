// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const { buildMemoryFragmentContext } = require('../src/memory-fragment-utils.cjs');
const fragments = require('./fragments.example.json');

function addMemFragsToOpenAICompatibleMessages(messages) {
  const result = buildMemoryFragmentContext(messages, fragments);
  if (!result.used) return messages;

  const output = [...messages];
  const firstNonSystemIndex = output.findIndex(message => message?.role !== 'system');
  const insertIndex = firstNonSystemIndex === -1 ? output.length : firstNonSystemIndex;

  output.splice(insertIndex, 0, {
    role: 'system',
    content: result.systemBlock
  });

  return output;
}

module.exports = { addMemFragsToOpenAICompatibleMessages };
