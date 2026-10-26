// Copyright 2026 Ellivien
// SPDX-License-Identifier: Apache-2.0
// Original project: https://github.com/ellivien/ellivien-memfrags

(function attachEllivienMemFragsEditor(global) {
  'use strict';

  function text(value) {
    return String(value || '').trim();
  }

  function uniqueTriggers(values) {
    const seen = new Set();
    return (Array.isArray(values) ? values : [])
      .map(text)
      .filter(value => {
        const key = value.toLocaleLowerCase();
        if (!value || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  function normaliseRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map(row => ({
        category: text(row?.category),
        triggers: uniqueTriggers(row?.triggers),
        definition: text(row?.definition)
      }))
      .filter(row => row.triggers.length && row.definition)
      .sort((a, b) => (
        (a.category || '\uffff').localeCompare(b.category || '\uffff') ||
        a.triggers[0].localeCompare(b.triggers[0])
      ));
  }

  function element(tag, properties = {}, style = '') {
    const node = document.createElement(tag);
    Object.assign(node, properties);
    if (style) node.style.cssText = style;
    return node;
  }

  async function show(options = {}) {
    const apiUrl = text(options.apiUrl);
    if (!apiUrl) throw new Error('MemFrags requires the portal\'s authenticated memory-fragment API URL.');
    const getHeaders = options.getHeaders || (() => ({}));
    const accent = options.accent || '#7c3aed';
    const existing = document.getElementById('ellivien-memfrags-modal');
    if (existing) existing.remove();

    const request = async (method, fragments) => {
      const submitted = method === 'POST' ? normaliseRows(fragments) : [];
      const response = await fetch(apiUrl, {
        method,
        headers: { ...getHeaders(), ...(method === 'POST' ? { 'Content-Type': 'application/json' } : {}) },
        body: method === 'POST' ? JSON.stringify({ fragments: submitted }) : undefined
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `MemFrags request failed: ${response.status}`);
      return Array.isArray(data.fragments) ? normaliseRows(data.fragments) : submitted;
    };

    const overlay = element('div', { id: 'ellivien-memfrags-modal' }, 'position:fixed;inset:0;background:rgba(0,0,0,.58);display:flex;align-items:center;justify-content:center;z-index:10000;padding:12px;box-sizing:border-box;');
    const modal = element('section', { role: 'dialog', ariaModal: 'true', ariaLabelledby: 'ellivien-memfrags-title' }, 'width:min(760px,100%);height:min(88vh,760px);background:#fff;border-radius:18px;padding:16px;box-shadow:0 20px 50px rgba(0,0,0,.28);display:flex;flex-direction:column;box-sizing:border-box;color:#1f2937;font:14px/1.4 system-ui,sans-serif;');
    const title = element('h2', { id: 'ellivien-memfrags-title', textContent: 'Ellivien MemFrags' }, 'margin:0 0 8px;font-size:20px;');
    const status = element('div', { textContent: 'Loading…', role: 'status' }, 'margin-bottom:9px;padding:9px 11px;border-radius:10px;background:#f3f4f6;color:#374151;');
    const searchRow = element('div', {}, 'display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;margin-bottom:8px;');
    const search = element('input', { type: 'search', placeholder: 'Search categories, triggers or definitions', ariaLabel: 'Search memory fragments' }, 'min-width:0;padding:10px 12px;border:1px solid #d1d5db;border-radius:10px;font-size:16px;');
    const clear = element('button', { type: 'button', textContent: 'Clear' }, 'padding:9px 12px;border:1px solid #d1d5db;border-radius:10px;background:#f9fafb;');
    const categories = element('div', {}, 'display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px;');
    const list = element('div', {}, 'display:flex;flex-direction:column;gap:8px;overflow:auto;min-height:0;flex:1;padding-right:3px;');
    const add = element('button', { type: 'button', textContent: '+ add memory fragment' }, 'width:100%;margin-top:9px;padding:10px 12px;border:0;border-radius:10px;background:#f3f4f6;font-weight:700;');
    const footer = element('div', {}, 'display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #e5e7eb;');
    const attribution = element('a', {
      href: 'https://github.com/ellivien/ellivien-memfrags',
      target: '_blank',
      rel: 'noopener noreferrer',
      textContent: 'Powered by Ellivien ✨'
    }, `align-self:center;margin-right:auto;color:${accent};font-weight:700;text-decoration:none;`);
    const close = element('button', { type: 'button', textContent: 'Close' }, 'padding:10px 14px;border:0;border-radius:10px;background:#6b7280;color:#fff;font-weight:700;');
    const save = element('button', { type: 'button', textContent: 'Save live' }, `padding:10px 16px;border:0;border-radius:10px;background:${accent};color:#fff;font-weight:800;`);
    let rows = [];
    let categoryFilter = 'all';

    function setStatus(message, kind = 'neutral') {
      status.textContent = message;
      const styles = kind === 'success'
        ? ['#ecfdf5', '#065f46']
        : kind === 'error' ? ['#fef2f2', '#991b1b'] : ['#f3f4f6', '#374151'];
      status.style.background = styles[0];
      status.style.color = styles[1];
    }

    function render() {
      list.innerHTML = '';
      categories.innerHTML = '';
      const categoryNames = [...new Set(rows.map(row => text(row.category)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
      const filters = [['All', 'all'], ...categoryNames.map(name => [name, name.toLocaleLowerCase()])];
      if (!filters.some(([, key]) => key === categoryFilter)) categoryFilter = 'all';

      filters.forEach(([label, key]) => {
        const button = element('button', { type: 'button', textContent: label }, categoryFilter === key
          ? `padding:6px 10px;border:0;border-radius:999px;background:${accent};color:#fff;font-weight:800;`
          : 'padding:6px 10px;border:1px solid #e5e7eb;border-radius:999px;background:#f9fafb;color:#374151;font-weight:700;');
        button.onclick = () => { categoryFilter = key; render(); };
        categories.appendChild(button);
      });

      const query = text(search.value).toLocaleLowerCase();
      const visible = rows.filter(row => {
        const matchesCategory = categoryFilter === 'all' || text(row.category).toLocaleLowerCase() === categoryFilter;
        const haystack = [row.category, ...(row.triggers || []), row.definition].join('\n').toLocaleLowerCase();
        return matchesCategory && (!query || haystack.includes(query));
      });

      visible.forEach(row => {
        const card = element('div', {}, 'display:grid;grid-template-columns:minmax(0,1fr) 42px;gap:7px;padding:10px;border:1px solid #e5e7eb;border-radius:12px;background:#fff;');
        const fields = element('div', {}, 'display:grid;gap:7px;min-width:0;');
        const category = element('input', { value: row.category || '', placeholder: 'Category (optional)', ariaLabel: 'Category' }, 'width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #d1d5db;border-radius:9px;font-size:16px;');
        const triggers = element('textarea', { value: (row.triggers || []).join(', '), placeholder: 'Triggers, separated by commas', rows: 1, ariaLabel: 'Triggers' }, 'width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #d1d5db;border-radius:9px;font:16px/1.35 system-ui,sans-serif;resize:vertical;');
        const definition = element('textarea', { value: row.definition || '', placeholder: 'What the companion should remember', rows: 3, ariaLabel: 'Definition' }, 'width:100%;box-sizing:border-box;padding:9px 10px;border:1px solid #d1d5db;border-radius:9px;font:16px/1.35 system-ui,sans-serif;resize:vertical;');
        const remove = element('button', { type: 'button', textContent: '×', title: 'Delete fragment', ariaLabel: 'Delete memory fragment' }, 'width:42px;height:42px;border:0;border-radius:9px;background:#fef2f2;color:#991b1b;font-size:24px;');
        category.oninput = () => { row.category = category.value; };
        triggers.oninput = () => { row.triggers = triggers.value.split(',').map(text).filter(Boolean); };
        definition.oninput = () => { row.definition = definition.value; };
        remove.onclick = () => {
          const label = row.triggers?.[0] || row.category || 'this memory fragment';
          if (global.confirm(`Delete "${label}"? It will only disappear from saved memory after you press Save live.`)) {
            rows = rows.filter(candidate => candidate !== row);
            render();
          }
        };
        fields.append(category, triggers, definition);
        card.append(fields, remove);
        list.appendChild(card);
      });

      if (!visible.length) list.appendChild(element('p', { textContent: rows.length ? 'No matching memory fragments.' : 'No memory fragments yet. Add the first one below.' }, 'color:#6b7280;text-align:center;padding:20px;'));
    }

    search.oninput = render;
    clear.onclick = () => { search.value = ''; categoryFilter = 'all'; render(); };
    add.onclick = () => { rows.push({ category: '', triggers: [], definition: '' }); categoryFilter = 'all'; search.value = ''; render(); list.scrollTop = list.scrollHeight; };
    close.onclick = () => overlay.remove();
    overlay.onclick = event => { if (event.target === overlay) overlay.remove(); };
    global.addEventListener('keydown', event => { if (event.key === 'Escape' && overlay.isConnected) overlay.remove(); }, { once: true });
    save.onclick = async () => {
      const incomplete = rows.find(row => !uniqueTriggers(row.triggers).length || !text(row.definition));
      if (incomplete) return setStatus('Each row needs at least one trigger and a definition. Complete it or delete it before saving.', 'error');
      const fragments = normaliseRows(rows);
      const seen = new Set();
      for (const fragment of fragments) {
        for (const trigger of fragment.triggers) {
          const key = `${fragment.category.toLocaleLowerCase()}::${trigger.toLocaleLowerCase()}`;
          if (seen.has(key)) return setStatus(`The trigger “${trigger}” appears more than once in the same category.`, 'error');
          seen.add(key);
        }
      }
      save.disabled = true;
      save.textContent = 'Saving…';
      try {
        rows = await request('POST', fragments);
        render();
        setStatus('Memory fragments saved live. You can keep editing or close when finished.', 'success');
        if (typeof options.onSaved === 'function') options.onSaved(rows);
      } catch (error) {
        setStatus(error.message || 'Could not save memory fragments.', 'error');
      } finally {
        save.disabled = false;
        save.textContent = 'Save live';
      }
    };

    searchRow.append(search, clear);
    footer.append(attribution, close, save);
    modal.append(title, status, searchRow, categories, list, add, footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    try {
      rows = normaliseRows(await request('GET'));
      render();
      setStatus(`${rows.length} memory fragment${rows.length === 1 ? '' : 's'} loaded.`, 'success');
    } catch (error) {
      render();
      setStatus(error.message || 'Could not load memory fragments.', 'error');
    }
    return overlay;
  }

  global.EllivienMemFragsEditor = { show };
})(window);
