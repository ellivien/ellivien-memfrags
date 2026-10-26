// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

function normaliseContentToText(content) {
  if (typeof content === 'string') return content;

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (!part) return '';
        if (typeof part === 'string') return part;
        if (typeof part.text === 'string') return part.text;
        if (part.type === 'text' && typeof part.text === 'string') return part.text;
        return '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return String(content || '');
}

function extractLatestUserText(messages) {
  if (!Array.isArray(messages)) return '';

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== 'user') continue;
    const text = normaliseContentToText(message.content).trim();
    if (text) return text;
  }

  return '';
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normaliseFragments(fragments = []) {
  const sourceRows = Array.isArray(fragments)
    ? fragments
    : Object.entries(fragments || {}).map(([trigger, definition]) => ({
        triggers: [trigger],
        definition
      }));

  return sourceRows
    .map(fragment => ({
      category: String(fragment?.category || '').trim(),
      triggers: Array.from(new Set(
        (Array.isArray(fragment?.triggers) ? fragment.triggers : [])
          .map(trigger => String(trigger || '').trim())
          .filter(Boolean)
      )),
      definition: String(fragment?.definition || '').trim()
    }))
    .filter(fragment => fragment.triggers.length > 0 && fragment.definition);
}

function detectKeywords(userInput, fragments = []) {
  const matchedFragments = [];
  const input = String(userInput || '');

  normaliseFragments(fragments).forEach(fragment => {
    fragment.triggers.forEach(trigger => {
      // `\b` fails for useful triggers ending in punctuation, such as `C++`.
      // Treat Unicode letters, numbers and underscores as word characters and
      // accept punctuation at either edge of a trigger.
      const regex = new RegExp(
        `(?:^|[^\\p{L}\\p{N}_])${escapeRegex(trigger)}(?=$|[^\\p{L}\\p{N}_])`,
        'iu'
      );
      if (regex.test(input)) {
        matchedFragments.push({ keyword: trigger, fragment: fragment.definition });
      }
    });
  });

  return matchedFragments;
}

function dedupeMatchedFragments(matches) {
  const uniqueMatches = [];
  const seenFragments = new Set();
  const duplicateKeywords = [];

  matches.forEach(match => {
    const normalisedFragment = String(match.fragment || '').trim();
    if (!normalisedFragment) return;

    if (seenFragments.has(normalisedFragment)) {
      duplicateKeywords.push(match.keyword);
      return;
    }

    seenFragments.add(normalisedFragment);
    uniqueMatches.push(match);
  });

  return { uniqueMatches, duplicateKeywords };
}

function buildMemoryFragmentContext(messages, fragments = []) {
  const latestUserText = extractLatestUserText(messages);
  if (!latestUserText) {
    return emptyResult();
  }

  const matches = detectKeywords(latestUserText, fragments);
  if (!matches.length) {
    return emptyResult();
  }

  const deduped = dedupeMatchedFragments(matches);
  const keywords = matches.map(match => match.keyword);
  const contextBlock = deduped.uniqueMatches.map(match => match.fragment).join('\n\n');

  return {
    used: true,
    keywords,
    matchCount: matches.length,
    injectedFragmentCount: deduped.uniqueMatches.length,
    dedupedFragmentCount: matches.length - deduped.uniqueMatches.length,
    systemBlock: [
      '## Relevant Context (triggered by this conversation):',
      contextBlock,
      '',
      `Local memory fragments matched this reply: ${keywords.join(', ')}. Treat these as stable profile/context memory.`
    ].join('\n')
  };
}

function emptyResult() {
  return {
    used: false,
    keywords: [],
    matchCount: 0,
    injectedFragmentCount: 0,
    dedupedFragmentCount: 0,
    systemBlock: ''
  };
}

module.exports = {
  buildMemoryFragmentContext,
  detectKeywords,
  extractLatestUserText,
  normaliseFragments
};
