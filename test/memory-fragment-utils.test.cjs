// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildMemoryFragmentContext,
  detectKeywords,
  extractLatestUserText,
  normaliseFragments
} = require('../src/memory-fragment-utils.cjs');
const { addMemFragsToOpenAICompatibleMessages } = require('../examples/openai-compatible.cjs');
const { addMemFragsToAnthropicSystem } = require('../examples/anthropic.cjs');

test('uses only the latest non-empty user message', () => {
  const messages = [
    { role: 'user', content: 'Earlier subject' },
    { role: 'assistant', content: 'Response' },
    { role: 'user', content: [{ type: 'text', text: 'Current subject' }] }
  ];

  assert.equal(extractLatestUserText(messages), 'Current subject');
});

test('normalises object and array fragment formats', () => {
  assert.deepEqual(normaliseFragments({ Juniper: 'A small fox.' }), [
    { category: '', triggers: ['Juniper'], definition: 'A small fox.' }
  ]);

  assert.deepEqual(normaliseFragments([
    { category: 'people', triggers: [' Mum ', 'Mum'], definition: '  A definition. ' }
  ]), [
    { category: 'people', triggers: ['Mum'], definition: 'A definition.' }
  ]);
});

test('matches whole words without matching inside another word', () => {
  const fragments = [{ triggers: ['Ann'], definition: 'A person.' }];

  assert.equal(detectKeywords('Ann arrived.', fragments).length, 1);
  assert.equal(detectKeywords('It is our anniversary.', fragments).length, 0);
});

test('escapes regular-expression characters in triggers', () => {
  const fragments = [{ triggers: ['C++'], definition: 'A language.' }];
  assert.equal(detectKeywords('I use C++ today.', fragments).length, 1);
});

test('deduplicates aliases that lead to the same definition', () => {
  const result = buildMemoryFragmentContext(
    [{ role: 'user', content: 'Juniper is a little fox.' }],
    [{ triggers: ['Juniper', 'fox'], definition: 'Juniper is a fictional fox.' }]
  );

  assert.equal(result.used, true);
  assert.equal(result.matchCount, 2);
  assert.equal(result.injectedFragmentCount, 1);
  assert.equal(result.dedupedFragmentCount, 1);
  assert.equal(result.systemBlock.match(/Juniper is a fictional fox\./g).length, 1);
});

test('returns an empty result when nothing matches', () => {
  assert.deepEqual(
    buildMemoryFragmentContext(
      [{ role: 'user', content: 'No matching subject.' }],
      [{ triggers: ['Elsewhere'], definition: 'Not relevant.' }]
    ),
    {
      used: false,
      keywords: [],
      matchCount: 0,
      injectedFragmentCount: 0,
      dedupedFragmentCount: 0,
      systemBlock: ''
    }
  );
});

test('OpenAI-compatible example preserves the stable system prompt first', () => {
  const messages = [
    { role: 'system', content: 'Stable companion prompt.' },
    { role: 'user', content: 'Shall we visit the Harbour Room?' }
  ];

  const output = addMemFragsToOpenAICompatibleMessages(messages);

  assert.deepEqual(output.map(message => message.role), ['system', 'system', 'user']);
  assert.equal(output[0].content, 'Stable companion prompt.');
  assert.match(output[1].content, /Harbour Room is a quiet fictional reading room/);
  assert.equal(messages.length, 2);
});

test('Anthropic example appends matched context to the existing system text', () => {
  const output = addMemFragsToAnthropicSystem(
    'Stable companion prompt.',
    [{ role: 'user', content: 'Let us have tea.' }]
  );

  assert.match(output, /^Stable companion prompt\./);
  assert.match(output, /usually drinks tea without sugar/);
});
